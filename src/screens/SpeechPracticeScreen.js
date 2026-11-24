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
import { getAllWords, getLessonsByLanguage } from '../data/lessonLoader';
import { pickSpeechWords } from '../speechPractice/pickSpeechWords';
import { releaseAudioPlayer } from '../utils/audioPlayer';
import {
  getLessonProgress,
  getWordProgress,
  recordPracticeCompletion,
  recordStudyAndXp
} from '../utils/storage';

const MIN_ATTEMPT_MS = 600;
export const SPEECH_WORD_LIMIT = 5;
const INITIAL_STATUS = 'Play the speaker, then record yourself saying the same phrase.';
const SAVE_FAILED_STATUS = 'Could not save this attempt. Try again.';
const SAVED_NEXT_FAILED_STATUS = 'This attempt was saved, but the next step could not start. Try again.';
// A read that never settles used to leave Daily Speech Practice blank.
const DAILY_PROGRESS_LOAD_TIMEOUT_MS = 8000;

export default function SpeechPracticeScreen({
  language,
  scored = false,
  wordLimit = SPEECH_WORD_LIMIT,
  word,
  onComplete
}) {
  const isDailySpeechPractice = scored && !word;
  const freePracticeWords = useMemo(
    () => (word ? [word] : getAllWords(language).filter((w) => w.audioKey)),
    [language, word]
  );
  const [dailyPracticeWords, setDailyPracticeWords] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const practiceWords = isDailySpeechPractice ? dailyPracticeWords : freePracticeWords;
  const [wordIndex, setWordIndex] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const practiceWord = practiceWords?.[wordIndex % practiceWords.length];
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
  // Last-word accept saves XP, then the session. A retry must not award the XP again.
  const attemptSave = useRef({ xp: false, completion: false });

  useEffect(() => {
    setLearnerUri(null);
    setAttemptDurationMs(null);
    setHasReviewedAttempt(false);
    setStatus(INITIAL_STATUS);
  }, [practiceWord?.audioKey]);

  useEffect(() => {
    return () => releaseAudioPlayer(soundRef);
  }, []);

  useEffect(() => {
    if (!isDailySpeechPractice) return undefined;
    let settled = false;
    setLoadError(false);
    setDailyPracticeWords(null);
    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      setLoadError(true);
    }, DAILY_PROGRESS_LOAD_TIMEOUT_MS);

    Promise.all([getLessonProgress(), getWordProgress()])
      .then(([lessonProgress, wordProgress]) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setLoadError(false);
        setDailyPracticeWords(pickSpeechWords({
          lessons: getLessonsByLanguage(language),
          lessonProgress,
          wordProgress,
          limit: wordLimit
        }));
      })
      .catch(() => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        setLoadError(true);
      });
    return () => {
      settled = true;
      clearTimeout(timeoutId);
    };
  }, [isDailySpeechPractice, language, wordLimit, loadAttempt]);

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
      setStatus(
        word
          ? 'If it sounds acceptable to you, tap Sounds good to finish.'
          : 'If it sounds acceptable to you, move to the next phrase.'
      );
    } catch (error) {
      setStatus(error.message || 'Could not play your recording.');
    } finally {
      setBusy(false);
    }
  }

  async function acceptAttempt() {
    if (word) {
      onComplete?.();
      return;
    }
    setBusy(true);
    try {
      if (scored) {
        if (!attemptSave.current.xp) {
          await recordStudyAndXp(language, 1);
          attemptSave.current.xp = true;
        }
        if (acceptedCount + 1 >= wordLimit) {
          if (!attemptSave.current.completion) {
            await recordPracticeCompletion(language, 'speech');
            attemptSave.current.completion = true;
          }
          await onComplete?.();
          return;
        }
        attemptSave.current.xp = false;
        setAcceptedCount(acceptedCount + 1);
      } else {
        await recordPracticeCompletion(language, 'speech');
      }
      setLearnerUri(null);
      setAttemptDurationMs(null);
      setHasReviewedAttempt(false);
      setStatus(INITIAL_STATUS);
      setWordIndex((index) => (index + 1) % practiceWords.length);
    } catch {
      setStatus(attemptSave.current.completion ? SAVED_NEXT_FAILED_STATUS : SAVE_FAILED_STATUS);
    } finally {
      setBusy(false);
    }
  }

  const accent = language === 'kreole' ? '#08834c' : '#2771CB';
  const recordTestID = isRecording
    ? 'speech-practice-stop'
    : learnerUri
      ? 'speech-practice-record-again'
      : 'speech-practice-record';
  const statusTestID = status === SAVE_FAILED_STATUS
    ? 'speech-practice-save-failed'
    : status === SAVED_NEXT_FAILED_STATUS
      ? 'speech-practice-saved-next-failed'
      : 'speech-practice-status';

  if (loadError) {
    return (
      <View style={styles.card} testID="speech-practice-screen">
        <Text style={styles.status} testID="speech-practice-load-error">Daily Speech Practice could not be loaded.</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accent }]}
          onPress={() => setLoadAttempt((attempt) => attempt + 1)}
          accessibilityRole="button"
          accessibilityLabel="Try again"
          testID="speech-practice-try-again"
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!practiceWords) {
    return (
      <View style={styles.card} testID="speech-practice-screen">
        <Text style={styles.status} testID="speech-practice-loading">Loading Daily Speech Practice.</Text>
      </View>
    );
  }

  if (!practiceWord) {
    return (
      <Text style={styles.status} testID="speech-practice-empty">
        No Word with Audio is available for this language.
      </Text>
    );
  }

  return (
    <View style={styles.card} testID="speech-practice-screen">
      <Text style={styles.phrase} testID="speech-practice-phrase">{practiceWord.target}</Text>
      <Text style={styles.translation}>{practiceWord.english}</Text>
      {word ? null : (
        <Text style={styles.progress} testID="speech-practice-progress">
          {scored
            ? `Attempt ${acceptedCount + 1}/${wordLimit}`
            : `Phrase ${wordIndex + 1}/${practiceWords.length}`}
        </Text>
      )}
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
        testID={recordTestID}
      >
        <Text style={styles.primaryButtonText} testID={busy ? 'speech-practice-busy' : undefined}>
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
          testID="speech-practice-sounds-good"
        >
          <Text style={styles.primaryButtonText}>
            {word ? 'Sounds good' : 'Sounds good, next phrase'}
          </Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.status} testID={statusTestID}>{status}</Text>
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