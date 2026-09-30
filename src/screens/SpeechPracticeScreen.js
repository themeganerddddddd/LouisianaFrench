import {
  createAudioPlayer,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getAudioSource } from '../data/audioManifest';
import { getAllWords } from '../data/lessonLoader';
import { releaseAudioPlayer } from '../utils/audioPlayer';
import { recordPracticeCompletion, recordStudyAndXp } from '../utils/storage';

const MIN_ATTEMPT_MS = 600;
export const SPEECH_WORD_LIMIT = 5;
const INITIAL_STATUS = 'Play the speaker, then record yourself saying the same phrase.';

export default function SpeechPracticeScreen({
  language,
  scored = false,
  wordLimit = SPEECH_WORD_LIMIT,
  onComplete
}) {
  const practiceWords = useMemo(
    () => getAllWords(language).filter((word) => word.audioKey),
    [language]
  );
  const [wordIndex, setWordIndex] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const practiceWord = practiceWords[wordIndex % practiceWords.length];
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const isRecording = recorderState.isRecording;
  const durationMs = recorderState.durationMillis;
  const soundRef = useRef(null);
  const [learnerUri, setLearnerUri] = useState(null);
  const [attemptDurationMs, setAttemptDurationMs] = useState(null);
  const [hasReviewedAttempt, setHasReviewedAttempt] = useState(false);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLearnerUri(null);
    setAttemptDurationMs(null);
    setHasReviewedAttempt(false);
    setStatus(INITIAL_STATUS);
  }, [practiceWord?.audioKey]);

  useEffect(() => {
    return () => releaseAudioPlayer(soundRef);
  }, []);

  async function play(source) {
    if (!source) return;
    releaseAudioPlayer(soundRef);
    const player = createAudioPlayer(source);
    soundRef.current = player;
    player.play();
  }

  async function beginRecording() {
    setBusy(true);
    setLearnerUri(null);
    setAttemptDurationMs(null);
    setHasReviewedAttempt(false);

    try {
      if (Platform.OS === 'web' && !globalThis.isSecureContext) {
        throw new Error(
          'Microphone access requires localhost or HTTPS. Run npm run prototype -- --web --localhost and use the printed localhost URL.'
        );
      }

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        throw new Error(
          Platform.OS === 'web'
            ? 'Microphone permission is blocked. Allow it in this site\'s browser settings, reload, and try again.'
            : 'Microphone permission was denied.'
        );
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('Recording. Say the phrase, then tap Stop recording.');
    } catch (error) {
      setStatus(error.message || 'Could not start recording.');
    } finally {
      setBusy(false);
    }
  }

  async function finishRecording() {
    const recordedDurationMs = durationMs;
    setBusy(true);

    try {
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });

      if (!recorder.uri) throw new Error('No learner recording was produced.');

      setLearnerUri(recorder.uri);
      if (recordedDurationMs < MIN_ATTEMPT_MS) {
        setStatus('That attempt was too short. Record the full phrase and try again.');
        return;
      }

      setAttemptDurationMs(recordedDurationMs);
      setStatus('Listen to your recording before deciding whether to move on.');
    } catch (error) {
      setStatus(error.message || 'Could not finish recording.');
    } finally {
      setBusy(false);
    }
  }

  async function reviewAttempt() {
    setBusy(true);

    try {
      await play({ uri: learnerUri });
      setHasReviewedAttempt(true);
      setStatus('If it sounds acceptable to you, move to the next phrase.');
    } catch (error) {
      setStatus(error.message || 'Could not play your recording.');
    } finally {
      setBusy(false);
    }
  }

  async function acceptAttempt() {
    setBusy(true);
    if (scored) {
      await recordStudyAndXp(1);
      if (acceptedCount + 1 >= wordLimit) {
        await recordPracticeCompletion(language, 'speech');
        setBusy(false);
        onComplete?.();
        return;
      }
      setAcceptedCount(acceptedCount + 1);
    } else {
      await recordPracticeCompletion(language, 'speech');
    }
    setLearnerUri(null);
    setAttemptDurationMs(null);
    setHasReviewedAttempt(false);
    setStatus(INITIAL_STATUS);
    setWordIndex((index) => (index + 1) % practiceWords.length);
    setBusy(false);
  }

  const accent = language === 'kreole' ? '#08834c' : '#2771CB';

  if (!practiceWord) {
    return <Text style={styles.status}>No Word with Audio is available for this language.</Text>;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.phrase}>{practiceWord.target}</Text>
      <Text style={styles.translation}>{practiceWord.english}</Text>
      <Text style={styles.progress}>
        {scored
          ? `Attempt ${acceptedCount + 1}/${wordLimit}`
          : `Phrase ${wordIndex + 1}/${practiceWords.length}`}
      </Text>
      <Text style={styles.explanation}>
        Pronunciation is not graded. Make an attempt, listen to it, and decide when you are
        ready to continue.
      </Text>

      <TouchableOpacity
        style={[styles.secondaryButton, { borderColor: accent }]}
        onPress={() => play(getAudioSource(language, practiceWord.audioKey))}
        disabled={busy || isRecording}
      >
        <Text style={[styles.secondaryButtonText, { color: accent }]}>Play Audio</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: isRecording ? '#B91C1C' : accent }]}
        onPress={isRecording ? finishRecording : beginRecording}
        disabled={busy}
      >
        <Text style={styles.primaryButtonText}>
          {busy
            ? 'Working...'
            : isRecording
              ? `Stop recording (${(durationMs / 1000).toFixed(1)}s)`
              : learnerUri
                ? 'Record again'
                : 'Record'}
        </Text>
      </TouchableOpacity>

      {learnerUri && !isRecording ? (
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: '#64748B' }]}
          onPress={reviewAttempt}
          disabled={busy}
        >
          <Text style={[styles.secondaryButtonText, { color: '#475569' }]}>Play my recording</Text>
        </TouchableOpacity>
      ) : null}

      {attemptDurationMs ? (
        <TouchableOpacity
          style={[
            styles.approveButton,
            { backgroundColor: hasReviewedAttempt ? '#15803D' : '#94A3B8' }
          ]}
          onPress={acceptAttempt}
          disabled={!hasReviewedAttempt || busy}
        >
          <Text style={styles.primaryButtonText}>Sounds good, next phrase</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.status}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  phrase: {
    color: '#102A43',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center'
  },
  translation: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4
  },
  progress: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8
  },
  explanation: {
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 2
  },
  primaryButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  approveButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10
  },
  secondaryButtonText: { fontWeight: '900', fontSize: 15 },
  status: {
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 14
  }
});