#!/usr/bin/env python3
"""Normalize bundled Word Audio to a consistent spoken-word loudness."""

import argparse
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile

AUDIO_DIRS = (
    "assets/audio/cajun",
    "assets/audio/kreole",
)

# Spoken-word / mobile target. Broadcast is -23 LUFS; this keeps short
# Word clips clearly audible on a phone without clipping.
TARGET_I = -16.0
LOUDNESS_MIN_I = -17.0
LOUDNESS_MAX_I = -16.0
TARGET_TP = -1.5
TARGET_LRA = 11.0
TOLERANCE_LU = 1.0
# Lossy MP3 wrapping can land a hair above TARGET_TP; treat only
# true peaks hotter than this as clipping risk.
TRUE_PEAK_LIMIT = TARGET_TP + 0.5

COMMON_MP3_RATES_K = (128, 160, 192, 224, 256, 320)
LOUDNORM_JSON_RE = re.compile(r"\{[^{}]*\}", re.DOTALL)
MAX_VOLUME_RE = re.compile(r"max_volume:\s+(-?[\d.]+)\s+dB")
# Used only when linear loudnorm cannot reach TARGET_I without clipping.
SPEECH_COMPRESSOR = "acompressor=threshold=-24dB:ratio=4:attack=5:release=50"
# About -3 dBFS; leaves MP3 true-peak overshoot margin without pulling
# already-on-target clips outside TOLERANCE_LU.
TRUE_PEAK_LIMITER = "alimiter=limit=0.71:level=false"


class NormalizationError(RuntimeError):
    pass


def parse_loudnorm_number(value):
    if value in (None, "-inf", "+inf", "inf", "nan"):
        return None
    return float(value)


def extract_loudnorm_measurement(ffmpeg_stderr):
    match = None
    for match in LOUDNORM_JSON_RE.finditer(ffmpeg_stderr):
        pass
    if match is None:
        raise NormalizationError("ffmpeg loudnorm did not print measurement JSON")
    raw = json.loads(match.group(0))
    return {
        "input_i": parse_loudnorm_number(raw.get("input_i")),
        "input_tp": parse_loudnorm_number(raw.get("input_tp")),
        "input_lra": parse_loudnorm_number(raw.get("input_lra")),
        "input_thresh": parse_loudnorm_number(raw.get("input_thresh")),
        "target_offset": parse_loudnorm_number(raw.get("target_offset")),
        "raw": raw,
    }


def needs_normalization(
    measurement,
    target_i=TARGET_I,
    target_tp=TARGET_TP,
    tolerance_lu=TOLERANCE_LU,
):
    integrated = measurement.get("input_i")
    true_peak = measurement.get("input_tp")
    if true_peak is not None and true_peak > target_tp + 0.5:
        return True
    if integrated is None:
        if true_peak is None:
            return True
        return (target_tp - true_peak) > tolerance_lu
    if integrated < LOUDNESS_MIN_I or integrated > LOUDNESS_MAX_I:
        return True
    return False


def loudness_error(measurement, target_i=TARGET_I):
    integrated = measurement.get("input_i")
    if integrated is None:
        return None
    return abs(integrated - target_i)


def is_closer_to_target(candidate, baseline, target_i=TARGET_I, target_tp=TARGET_TP, tolerance_lu=TOLERANCE_LU):
    candidate_ok = not needs_normalization(
        candidate, target_i=target_i, target_tp=target_tp, tolerance_lu=tolerance_lu
    )
    baseline_ok = not needs_normalization(
        baseline, target_i=target_i, target_tp=target_tp, tolerance_lu=tolerance_lu
    )
    if candidate_ok and not baseline_ok:
        return True
    if baseline_ok and not candidate_ok:
        return False
    candidate_error = loudness_error(candidate, target_i)
    baseline_error = loudness_error(baseline, target_i)
    if candidate_error is None:
        return False
    if baseline_error is None:
        return True
    return candidate_error < baseline_error


def choose_mp3_bitrate_k(source_bps):
    source_k = 128 if source_bps is None else max(128, math.ceil(source_bps / 1000))
    for rate in COMMON_MP3_RATES_K:
        if rate >= source_k:
            return rate
    return 320


def build_loudnorm_filter(
    measurement,
    target_i=TARGET_I,
    target_tp=TARGET_TP,
    target_lra=TARGET_LRA,
    compress=False,
):
    if measurement.get("input_i") is None:
        raise NormalizationError("cannot build two-pass loudnorm without measured integrated loudness")
    raw = measurement["raw"]
    loudnorm = (
        f"loudnorm=I={target_i}:TP={target_tp}:LRA={target_lra}:"
        f"measured_I={raw['input_i']}:"
        f"measured_LRA={raw['input_lra']}:"
        f"measured_TP={raw['input_tp']}:"
        f"measured_thresh={raw['input_thresh']}:"
        f"offset={raw['target_offset']}:"
        f"linear=true"
    )
    if compress:
        return f"{SPEECH_COMPRESSOR},{loudnorm}"
    return loudnorm


def build_peak_normalize_filter(max_volume_db, target_tp=TARGET_TP):
    gain = target_tp - max_volume_db
    return f"volume={gain:.2f}dB"


def extract_max_volume(ffmpeg_stderr):
    matches = MAX_VOLUME_RE.findall(ffmpeg_stderr)
    if not matches:
        raise NormalizationError("ffmpeg volumedetect did not print max_volume")
    return float(matches[-1])


def run_ffmpeg(args, *, capture=True):
    result = subprocess.run(
        args,
        check=False,
        capture_output=capture,
        text=True,
    )
    if result.returncode != 0:
        stderr = (result.stderr or "").strip()
        raise NormalizationError(stderr or f"ffmpeg exited {result.returncode}")
    return result


def measure_file(path):
    result = run_ffmpeg(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            path,
            "-af",
            f"loudnorm=I={TARGET_I}:TP={TARGET_TP}:LRA={TARGET_LRA}:print_format=json",
            "-f",
            "null",
            "-",
        ]
    )
    return extract_loudnorm_measurement(result.stderr)


def measure_max_volume(path):
    result = run_ffmpeg(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            path,
            "-af",
            "volumedetect",
            "-f",
            "null",
            "-",
        ]
    )
    return extract_max_volume(result.stderr)


def probe_stream(path):
    result = run_ffmpeg(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "a:0",
            "-show_entries",
            "stream=sample_rate,channels,bit_rate",
            "-of",
            "json",
            path,
        ]
    )
    streams = json.loads(result.stdout).get("streams") or []
    if not streams:
        raise NormalizationError(f"no audio stream in {path}")
    stream = streams[0]
    bit_rate = stream.get("bit_rate")
    return {
        "sample_rate": int(stream["sample_rate"]),
        "channels": int(stream["channels"]),
        "bit_rate": int(bit_rate) if bit_rate not in (None, "N/A") else None,
    }


def normalize_file(path, audio_filter, stream):
    bitrate_k = choose_mp3_bitrate_k(stream["bit_rate"])
    directory = os.path.dirname(path) or "."
    fd, temp_path = tempfile.mkstemp(prefix=".norm-", suffix=".mp3", dir=directory)
    os.close(fd)
    try:
        run_ffmpeg(
            [
                "ffmpeg",
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                path,
                "-af",
                audio_filter,
                "-ar",
                str(stream["sample_rate"]),
                "-ac",
                str(stream["channels"]),
                "-c:a",
                "libmp3lame",
                "-b:a",
                f"{bitrate_k}k",
                temp_path,
            ]
        )
        os.replace(temp_path, path)
    except Exception:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise


def audio_filter_for(path, measurement, compress=False):
    if measurement.get("input_i") is None:
        return build_peak_normalize_filter(measure_max_volume(path))
    return build_loudnorm_filter(measurement, compress=compress)


def collect_mp3_paths(roots):
    paths = []
    for root in roots:
        if os.path.isfile(root) and root.endswith(".mp3"):
            paths.append(root)
            continue
        if not os.path.isdir(root):
            raise NormalizationError(f"Audio directory not found: {root}")
        for name in sorted(os.listdir(root)):
            if name.endswith(".mp3"):
                paths.append(os.path.join(root, name))
    return paths


def format_lufs(value):
    return "n/a" if value is None else f"{value:.2f}"


def process_paths(paths, dry_run=False):
    changed = 0
    skipped = 0
    for path in paths:
        measurement = measure_file(path)
        integrated = measurement["input_i"]
        if not needs_normalization(measurement):
            skipped += 1
            print(f"skip  {path}  {format_lufs(integrated)} LUFS", flush=True)
            continue
        if dry_run:
            print(
                f"need  {path}  {format_lufs(integrated)} LUFS "
                f"(target {TARGET_I:.1f})",
                flush=True,
            )
            changed += 1
            continue
        stream = probe_stream(path)
        source_fd, source_backup = tempfile.mkstemp(
            prefix=".norm-src-", suffix=".mp3", dir=os.path.dirname(path) or "."
        )
        os.close(source_fd)
        shutil.copy2(path, source_backup)
        original = measurement
        after = original
        try:
            normalize_file(path, audio_filter_for(path, measurement), stream)
            after = measure_file(path)
            if original.get("input_i") is None:
                pass
            elif is_closer_to_target(after, original):
                shutil.copy2(path, source_backup)
            else:
                shutil.copy2(source_backup, path)
                after = original
            if (
                after.get("input_i") is not None
                and after["input_i"] < TARGET_I - TOLERANCE_LU
            ):
                normalize_file(
                    path,
                    audio_filter_for(path, after, compress=True),
                    stream,
                )
                compressed = measure_file(path)
                if is_closer_to_target(compressed, after):
                    after = compressed
                    shutil.copy2(path, source_backup)
                else:
                    shutil.copy2(source_backup, path)
            if (
                needs_normalization(after)
                and after.get("input_tp") is not None
                and after["input_tp"] > TRUE_PEAK_LIMIT
            ):
                normalize_file(
                    path,
                    TRUE_PEAK_LIMITER,
                    stream,
                )
                limited = measure_file(path)
                if is_closer_to_target(limited, after):
                    after = limited
                else:
                    shutil.copy2(source_backup, path)
        finally:
            if os.path.exists(source_backup):
                os.remove(source_backup)
        print(
            f"norm  {path}  {format_lufs(integrated)} -> "
            f"{format_lufs(after['input_i'])} LUFS",
            flush=True,
        )
        changed += 1
    return changed, skipped


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="Normalize bundled Word Audio with ffmpeg loudnorm."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=list(AUDIO_DIRS),
        help="MP3 files or directories (default: bundled Cajun and Kouri-Vini Audio)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Measure and report files that need normalization without writing",
    )
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv if argv is not None else sys.argv[1:])
    paths = collect_mp3_paths(args.paths)
    if not paths:
        raise NormalizationError("no MP3 files found")
    changed, skipped = process_paths(paths, dry_run=args.dry_run)
    action = "would normalize" if args.dry_run else "normalized"
    print(f"{action} {changed}, skipped {skipped}, total {len(paths)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except NormalizationError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
    except FileNotFoundError as error:
        print(
            f"missing dependency: {error.filename}. Install ffmpeg to normalize Audio.",
            file=sys.stderr,
        )
        raise SystemExit(1)
