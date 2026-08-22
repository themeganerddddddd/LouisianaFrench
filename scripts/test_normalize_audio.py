#!/usr/bin/env python3
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))

from normalize_audio import (
    LOUDNESS_MAX_I,
    LOUDNESS_MIN_I,
    TARGET_I,
    TARGET_TP,
    SPEECH_COMPRESSOR,
    build_loudnorm_filter,
    build_peak_normalize_filter,
    choose_mp3_bitrate_k,
    extract_loudnorm_measurement,
    extract_max_volume,
    is_closer_to_target,
    needs_normalization,
    parse_loudnorm_number,
)


FFMPEG_LOUDNORM_STDERR = """
[Parsed_loudnorm_0 @ 0x7f] 
{
	"input_i" : "-22.20",
	"input_tp" : "-9.24",
	"input_lra" : "0.00",
	"input_thresh" : "-32.20",
	"output_i" : "-16.01",
	"output_tp" : "-1.50",
	"output_lra" : "0.00",
	"output_thresh" : "-26.21",
	"normalization_type" : "dynamic",
	"target_offset" : "0.14"
}
"""


def measurement(input_i, input_tp=-2.0):
    return {"input_i": input_i, "input_tp": input_tp}


class ParseLoudnormTests(unittest.TestCase):
    def test_extracts_integrated_loudness_from_ffmpeg_stderr(self):
        parsed = extract_loudnorm_measurement(FFMPEG_LOUDNORM_STDERR)
        self.assertEqual(parsed["input_i"], -22.20)
        self.assertEqual(parsed["input_tp"], -9.24)
        self.assertEqual(parsed["target_offset"], 0.14)

    def test_treats_unmeasurable_loudness_as_missing(self):
        self.assertIsNone(parse_loudnorm_number("-inf"))
        self.assertIsNone(parse_loudnorm_number("nan"))

    def test_reads_unmeasurable_integrated_loudness_from_json(self):
        stderr = FFMPEG_LOUDNORM_STDERR.replace("-22.20", "-inf")
        parsed = extract_loudnorm_measurement(stderr)
        self.assertIsNone(parsed["input_i"])
        self.assertEqual(parsed["input_tp"], -9.24)


class NeedsNormalizationTests(unittest.TestCase):
    def test_quiet_clip_needs_gain(self):
        self.assertTrue(needs_normalization(measurement(-22.20)))

    def test_clip_already_on_target_is_left_alone(self):
        self.assertFalse(needs_normalization(measurement(-16.40, input_tp=-2.0)))

    def test_peaky_on_target_clip_is_left_alone(self):
        # Peaky speech can sound quiet, but we avoid heavy compression.
        peaky = measurement(-16.44, input_tp=-5.50)
        self.assertFalse(needs_normalization(peaky))

    def test_clip_hotter_than_max_band_needs_work(self):
        self.assertTrue(needs_normalization(measurement(-14.76, input_tp=-1.94)))

    def test_acceptance_band_is_minus_17_to_minus_16(self):
        self.assertEqual(LOUDNESS_MIN_I, -17.0)
        self.assertEqual(LOUDNESS_MAX_I, -16.0)

    def test_true_peak_just_above_minus_1_5_is_tolerated(self):
        self.assertFalse(needs_normalization(measurement(-16.12, input_tp=-1.20)))

    def test_hot_true_peak_is_normalized_even_when_loudness_is_close(self):
        self.assertTrue(
            needs_normalization(measurement(TARGET_I, input_tp=-0.40))
        )

    def test_unmeasurable_quiet_peak_needs_peak_gain(self):
        self.assertTrue(needs_normalization(measurement(None, input_tp=-4.36)))

    def test_unmeasurable_clip_already_at_true_peak_target_is_left_alone(self):
        self.assertFalse(needs_normalization(measurement(None, input_tp=-1.55)))

    def test_compressor_result_is_kept_only_when_closer_to_target(self):
        linear = measurement(-17.53)
        compressed_worse = measurement(-20.78)
        compressed_better = measurement(-16.45)
        self.assertFalse(is_closer_to_target(compressed_worse, linear))
        self.assertTrue(is_closer_to_target(compressed_better, linear))

    def test_hot_peak_fix_is_kept_even_if_lufs_error_grows_slightly(self):
        original = measurement(-15.78, input_tp=-0.40)
        processed = measurement(-16.44, input_tp=-1.55)
        self.assertTrue(is_closer_to_target(processed, original))


class EncoderPolicyTests(unittest.TestCase):
    def test_cajun_ish_bitrate_snaps_up_to_128k(self):
        self.assertEqual(choose_mp3_bitrate_k(108647), 128)

    def test_kreole_320k_is_preserved(self):
        self.assertEqual(choose_mp3_bitrate_k(320000), 320)

    def test_two_pass_filter_reuses_measured_values(self):
        parsed = extract_loudnorm_measurement(FFMPEG_LOUDNORM_STDERR)
        filt = build_loudnorm_filter(parsed)
        self.assertIn(f"I={TARGET_I}", filt)
        self.assertIn(f"TP={TARGET_TP}", filt)
        self.assertIn("measured_I=-22.20", filt)
        self.assertIn("linear=true", filt)

    def test_compressed_filter_prepends_speech_compressor(self):
        parsed = extract_loudnorm_measurement(FFMPEG_LOUDNORM_STDERR)
        filt = build_loudnorm_filter(parsed, compress=True)
        self.assertTrue(filt.startswith(SPEECH_COMPRESSOR + ","))
        self.assertIn("measured_I=-22.20", filt)

    def test_peak_gain_raises_true_peak_to_target(self):
        self.assertEqual(build_peak_normalize_filter(-4.36), "volume=2.86dB")

    def test_hot_true_peak_is_reduced_to_target(self):
        self.assertEqual(build_peak_normalize_filter(-0.40), "volume=-1.10dB")

    def test_reads_last_volumedetect_max(self):
        stderr = (
            "[Parsed_volumedetect_0 @ 0x1] n_samples: 0\n"
            "[Parsed_volumedetect_0 @ 0x2] n_samples: 30086\n"
            "[Parsed_volumedetect_0 @ 0x2] mean_volume: -17.8 dB\n"
            "[Parsed_volumedetect_0 @ 0x2] max_volume: -4.4 dB\n"
        )
        self.assertEqual(extract_max_volume(stderr), -4.4)


if __name__ == "__main__":
    unittest.main()
