import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { useCallback } from 'react';

export const MIN_ATTEMPT_MS = 600;
export const MIC_PERMISSION_DENIED = 'MIC_PERMISSION_DENIED';

export default function useSpeechRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const durationMs = recorderState?.durationMillis || 0;

  const beginRecording = useCallback(async () => {
    const permission = await requestRecordingPermissionsAsync();
    if (!permission.granted) {
      const error = new Error('Microphone permission was denied.');
      error.code = MIC_PERMISSION_DENIED;
      throw error;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
  }, [recorder]);

  const finishRecording = useCallback(async () => {
    const recordedDurationMs = durationMs;
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    if (!recorder.uri) throw new Error('No learner recording was produced.');

    return {
      uri: recorder.uri,
      durationMs: recordedDurationMs,
      tooShort: recordedDurationMs < MIN_ATTEMPT_MS
    };
  }, [durationMs, recorder]);

  return {
    recorder,
    isRecording: !!recorderState?.isRecording,
    durationMs,
    elapsedSec: durationMs / 1000,
    beginRecording,
    finishRecording
  };
}
