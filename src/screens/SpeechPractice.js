import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SafeScreenView from '../components/SafeScreenView';
import { getAudioSource } from '../data/audioManifest';
import { recordPracticeCompletion } from '../utils/storage';
import { getLanguageTokens } from './speechTheme';
import useSpeechRecorder, { MIC_PERMISSION_DENIED } from './useSpeechRecorder';

const INITIAL_STATUS = 'Play the speaker, then record yourself saying the same phrase.';
const REVIEWED_STATUS = 'Sound good to you? Move on, or record another take.';
const DENIED_STATUS =
  'Microphone access is off. Enable it in Settings → Privacy → Microphone to practice speaking.';

export default function SpeechPractice({
  language,
  words,
  advanceOnAccept = true,
  recordPracticeOnAccept = true,
  onAccept,
  onBack
}) {
  const practiceWords = Array.isArray(words) ? words : [];
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState('idle');
  const [learnerUri, setLearnerUri] = useState(null);
  const [attemptDurationMs, setAttemptDurationMs] = useState(null);
  const [hasReviewedTake, setHasReviewedTake] = useState(false);
  const [status, setStatus] = useState(INITIAL_STATUS);
  const [busy, setBusy] = useState(false);
  const soundRef = useRef(null);
  const wordsMountedRef = useRef(false);
  const tokens = useMemo(() => getLanguageTokens(language), [language]);
  const currentWord = practiceWords[wordIndex];
  const audioSource = useMemo(
    () => getAudioSource(language, currentWord?.audioKey),
    [currentWord?.audioKey, language]
  );
  const {
    isRecording,
    elapsedSec,
    beginRecording: startRecording,
    finishRecording
  } = useSpeechRecorder();

  const unloadSound = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (_error) {}
  }, []);

  const resetTake = useCallback(() => {
    setLearnerUri(null);
    setAttemptDurationMs(null);
    setHasReviewedTake(false);
    setPhase('idle');
    setStatus(INITIAL_STATUS);
  }, []);

  useEffect(() => () => { unloadSound(); }, [unloadSound]);

  useEffect(() => {
    if (!wordsMountedRef.current) {
      wordsMountedRef.current = true;
      return;
    }
    resetTake();
    setWordIndex((index) => (
      practiceWords.length && index >= practiceWords.length ? 0 : index
    ));
  }, [practiceWords.length, resetTake]);

  const start = async () => {
    if (busy || phase === 'recording' || !currentWord) return;
    setBusy(true);
    await unloadSound();
    resetTake();
    try {
      await startRecording();
      setPhase('recording');
      setStatus('Recording. Say the phrase, then tap Stop recording.');
    } catch (error) {
      setPhase(error.code === MIC_PERMISSION_DENIED ? 'denied' : 'idle');
      setStatus(error.code === MIC_PERMISSION_DENIED ? DENIED_STATUS : error.message || 'Could not start recording.');
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (busy || phase !== 'recording') return;
    setBusy(true);
    try {
      const result = await finishRecording();
      setLearnerUri(result.uri);
      setAttemptDurationMs(result.durationMs);
      if (result.tooShort) {
        setPhase('too-short');
        setStatus('That attempt was too short — keep recording while you say the whole phrase.');
      } else {
        setPhase('recorded');
        setStatus('Listen to your recording before deciding whether to move on.');
      }
    } catch (error) {
      setPhase('idle');
      setStatus(error.message || 'Could not finish recording.');
    } finally {
      setBusy(false);
    }
  };

  const play = async (source, review = false) => {
    if (!source || busy || isRecording) return;
    setBusy(true);
    try {
      await unloadSound();
      const { sound } = await Audio.Sound.createAsync(source);
      soundRef.current = sound;
      await sound.playAsync();
      if (review) {
        setHasReviewedTake(true);
        setPhase('reviewed');
        setStatus(REVIEWED_STATUS);
      }
    } catch (error) {
      setPhase('idle');
      setStatus(error.message || 'Could not play this audio.');
    } finally {
      setBusy(false);
    }
  };

  const accept = async () => {
    if (busy || phase !== 'reviewed' || !hasReviewedTake || !attemptDurationMs) return;
    setBusy(true);
    try {
      if (recordPracticeOnAccept) await recordPracticeCompletion(language, 'speech');
      const nextIndex = advanceOnAccept
        ? wordIndex + 1 >= practiceWords.length ? 0 : wordIndex + 1
        : wordIndex;
      resetTake();
      setWordIndex(nextIndex);
      if (onAccept) await onAccept();
    } catch (error) {
      setStatus(error.message || 'Could not save this Practice.');
    } finally {
      setBusy(false);
    }
  };

  const statusTone = phase === 'recording' || phase === 'denied'
    ? tokens.rec
    : phase === 'too-short' ? tokens.warn
      : phase === 'reviewed' ? tokens.ready : tokens.info;
  const speakerDisabled = !audioSource || busy || isRecording || phase === 'recording';
  const acceptReady = phase === 'reviewed' && hasReviewedTake && !!attemptDurationMs;
  const primaryLabel = phase === 'recording'
    ? `Stop recording · ${elapsedSec.toFixed(1)}s`
    : phase === 'recorded' ? 'Hear my recording' : 'Record';
  const primaryIcon = phase === 'recording' ? 'stop' : phase === 'recorded' ? 'play' : 'mic';
  const primaryPress = phase === 'recording' ? stop : phase === 'recorded' ? () => play({ uri: learnerUri }, true) : start;
  const flagLabel = language === 'kreole' ? 'Kouri-Vini' : 'Louisiana French';
  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={styles.backButton}
      >
        <Ionicons name="chevron-back" size={22} color={tokens.ink} />
      </TouchableOpacity>
      <Text style={styles.eyebrow}>SPEECH PRACTICE</Text>
      {practiceWords.length > 1 ? (
        <Text style={styles.counter}>Phrase {wordIndex + 1} / {practiceWords.length}</Text>
      ) : null}
      <Image accessibilityLabel={`${flagLabel} flag`} source={tokens.flag} style={styles.flag} />
    </View>
  );

  if (!currentWord) {
    return (
      <SafeScreenView style={styles.container}>
        {header}
        <View style={styles.content}>
          <Text style={styles.empty}>No words available for practice.</Text>
        </View>
      </SafeScreenView>
    );
  }

  return (
    <SafeScreenView style={styles.container}>
      {header}
      <View style={styles.content}>
        <View style={styles.phraseCard}>
          <Text style={styles.target}>{currentWord.target}</Text>
          <Text style={styles.english}>{currentWord.english}</Text>
          <Text style={styles.reassurance}>Not graded — you decide when it sounds right.</Text>
        </View>
        <View testID="speech-status" style={[styles.status, {
          backgroundColor: statusTone.background,
          borderColor: statusTone.border
        }]}>
          <Text style={[styles.statusText, { color: statusTone.text }]}>{status}</Text>
        </View>
        <View testID="speech-controls" style={styles.controls}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Hear the speaker"
            disabled={speakerDisabled}
            onPress={() => play(audioSource)}
            style={[styles.speaker, speakerDisabled && styles.disabledPill, !speakerDisabled && { borderColor: tokens.accent }]}
          >
            <Ionicons name="volume-high" size={16} color={speakerDisabled ? tokens.disabled.text : tokens.accent} />
            <Text style={[styles.pillText, { color: speakerDisabled ? tokens.disabled.text : tokens.accent }]}>Hear the speaker</Text>
          </TouchableOpacity>

          {phase !== 'reviewed' ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
              disabled={busy || phase === 'denied'}
              onPress={primaryPress}
              style={[styles.primary, { backgroundColor: phase === 'recording' ? tokens.danger : phase === 'denied' ? tokens.disabled.background : tokens.accent }]}
            >
              <Ionicons name={primaryIcon} size={18} color="#FFFFFF" />
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.pills}>
            {phase === 'recorded' || phase === 'reviewed' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Record again"
                disabled={busy || isRecording}
                onPress={start}
                style={[styles.pill, { borderColor: tokens.accent }]}
              >
                <Ionicons name="mic" size={15} color={tokens.accent} />
                <Text style={[styles.pillText, { color: tokens.accent }]}>Record again</Text>
              </TouchableOpacity>
            ) : null}
            {phase === 'reviewed' ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Hear my recording"
                disabled={busy || isRecording}
                onPress={() => play({ uri: learnerUri }, true)}
                style={[styles.pill, { backgroundColor: tokens.mine, borderColor: tokens.mine }]}
              >
                <Ionicons name="play" size={15} color={tokens.accent} />
                <Text style={[styles.pillText, { color: tokens.accent }]}>Hear my recording</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Sounds good"
            disabled={!acceptReady || busy}
            onPress={accept}
            style={[styles.accept, { backgroundColor: acceptReady ? tokens.accept : tokens.disabled.background }, !acceptReady && styles.notReady]}
          >
            {acceptReady ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
            <Text style={styles.primaryText}>Sounds good</Text>
          </TouchableOpacity>
          {!acceptReady ? (
            <Text style={styles.hint}>
              {phase === 'denied' ? 'You can still listen to the speaker' : phase === 'recorded' ? 'Listen back at least once to finish' : 'Record and listen back to finish'}
            </Text>
          ) : null}
        </View>
      </View>
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', padding: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginLeft: -6 },
  eyebrow: { flex: 1, color: '#64748B', fontSize: 11, fontWeight: '800', letterSpacing: 0.66 },
  counter: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  flag: { width: 30, height: 19, borderRadius: 3 },
  content: { padding: 14 },
  phraseCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 18, padding: 24, alignItems: 'center' },
  target: { color: '#102A43', fontSize: 28, lineHeight: 35, fontWeight: '900', textAlign: 'center' },
  english: { color: '#64748B', fontSize: 15, fontWeight: '600', marginTop: 6, textAlign: 'center' },
  reassurance: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 14, textAlign: 'center' },
  status: { borderWidth: 1, borderRadius: 12, padding: 11, paddingHorizontal: 14, marginTop: 12 },
  statusText: { fontSize: 13, fontWeight: '700', lineHeight: 18, textAlign: 'center' },
  controls: { gap: 10, marginTop: 14, alignItems: 'stretch' },
  speaker: { alignSelf: 'center', borderWidth: 1.5, borderRadius: 999, padding: 11, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  disabledPill: { borderColor: '#CBD5E1' },
  primary: { borderRadius: 14, minHeight: 52, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  pills: { minHeight: 0, flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' },
  pill: { borderWidth: 1.5, borderRadius: 999, padding: 11, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 7 },
  pillText: { fontSize: 13, fontWeight: '800' },
  accept: { borderRadius: 14, minHeight: 52, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  notReady: { opacity: 0.7 },
  hint: { color: '#94A3B8', fontSize: 11.5, fontWeight: '600', textAlign: 'center' },
  empty: { color: '#64748B', fontSize: 15, fontWeight: '700', textAlign: 'center', padding: 24 }
});
