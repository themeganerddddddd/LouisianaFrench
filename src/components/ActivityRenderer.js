import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { getAudioSource } from '../data/audioManifest';

const CORRECT_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAFoGTgx9EZUVUhiLGSoZNhfOEyoPkglhA/v8xfYi8W3s8ujo5nDmkec66j/uYPNM+aP//wX8CzkRYhU1GIQZOhldFwkUdA/oCb4DWP0c927xquwb6fvmbOZ25wnq/O0P8/L4Rv+kBakL';
const WRONG_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAJoBMwPJBFoG5AdnCeAKTgywDQQPSRB9EaASsROtFJUVZxYiF8YXUhjGGCEZYhmLGZkZjRloGSoZ0hhhGNcXNhd9Fq4VyBTOE8ASnxFtECoP1w13DAoLkgkRCIcG9wRhA8kBLgCV/vv8';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function normalizeText(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function makeWordBank(answer) {
  return shuffle(
    String(answer || '')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function getTheme(language) {
  return language === 'kreole'
    ? {
        accent: '#6D28D9',
        light: '#EDE9FE',
        text: '#5B21B6'
      }
    : {
        accent: '#2771CB',
        light: '#EAF3FF',
        text: '#2771CB'
      };
}

function useAudio(language) {
  const soundRef = useRef(null);
  const fxRef = useRef(null);

  async function stopAudio() {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
  }

  async function stopFx() {
    try {
      if (fxRef.current) {
        await fxRef.current.unloadAsync();
        fxRef.current = null;
      }
    } catch {}
  }

  async function playAudioKey(audioKey) {
    try {
      const source = getAudioSource(language, audioKey);
      if (!source) return false;

      await stopAudio();
      const { sound } = await Audio.Sound.createAsync(source);
      soundRef.current = sound;
      await sound.playAsync();
      return true;
    } catch {
      return false;
    }
  }

  async function playFeedback(kind) {
    try {
      await stopFx();
      const uri = kind === 'correct' ? CORRECT_TONE_URI : WRONG_TONE_URI;
      const { sound } = await Audio.Sound.createAsync({ uri });
      fxRef.current = sound;
      await sound.playAsync();
    } catch {}
  }

  useEffect(() => {
    return () => {
      stopAudio();
      stopFx();
    };
  }, []);

  return { playAudioKey, playFeedback };
}

function getHintText(activity) {
  if (!activity) return '';

  if (activity.type === 'typing' || activity.type === 'sentence_build') {
    const answer = String(activity.answerDisplay || activity.answer || '');
    if (!answer) return '';
    return `Starts with: ${answer.slice(0, Math.min(3, answer.length))}…`;
  }

  if (activity.english) {
    return `Hint: think about "${activity.english}"`;
  }

  return '';
}

function FeedbackFooter({ state, firstWrong, hintText, onTryAgain, onNext, onIncorrect, theme }) {
  if (state === 'correct') {
    return (
      <View style={[styles.footer, styles.footerGreen]}>
        <Text style={styles.footerTitle}>Correct!</Text>
        <TouchableOpacity style={styles.footerButtonGreen} onPress={onNext}>
          <Text style={styles.footerButtonText}>Next Question</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Not quite</Text>
        {hintText ? <Text style={styles.footerSub}>{hintText}</Text> : null}
        <TouchableOpacity style={styles.footerButtonRed} onPress={onTryAgain}>
          <Text style={styles.footerButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && !firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Incorrect</Text>
        {hintText ? <Text style={styles.footerSub}>{hintText}</Text> : null}
        <TouchableOpacity style={styles.footerButtonRed} onPress={onIncorrect}>
          <Text style={styles.footerButtonText}>Incorrect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

// keep your existing switch and logic, but use theme-driven colors below

export default function ActivityRenderer({ activity, onCorrect, onWrong, language }) {
  const theme = getTheme(language);

  switch (activity.type) {
    case 'intro_card':
      return <IntroCard activity={activity} language={language} onCorrect={onCorrect} theme={theme} />;
    case 'multiple_choice':
      return <MultipleChoice activity={activity} language={language} onCorrect={onCorrect} onWrong={onWrong} theme={theme} />;
    case 'listening_target_choice':
      return <ListeningTargetChoice activity={activity} language={language} onCorrect={onCorrect} onWrong={onWrong} theme={theme} />;
    case 'typing':
      return <Typing activity={activity} language={language} onCorrect={onCorrect} onWrong={onWrong} theme={theme} />;
    case 'sentence_build':
      return <SentenceBuild activity={activity} language={language} onCorrect={onCorrect} onWrong={onWrong} theme={theme} />;
    case 'match_pairs':
      return <MatchPairs activity={activity} language={language} onCorrect={onCorrect} onWrong={onWrong} theme={theme} />;
    default:
      return (
        <View style={styles.card}>
          <Text style={styles.prompt}>Unknown activity type: {activity.type}</Text>
        </View>
      );
  }
}

function IntroCard({ activity, language, onCorrect, theme }) {
  const { playAudioKey } = useAudio(language);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) playAudioKey(activity.audioKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [activity.audioKey]);

  return (
    <View style={styles.card}>
      <Text style={[styles.kicker, { color: theme.text }]}>New word</Text>
      <Text style={styles.prompt}>{activity.prompt}</Text>

      <TouchableOpacity
        style={[styles.introWordCard, { backgroundColor: theme.light }]}
        onPress={() => playAudioKey(activity.audioKey)}
      >
        <Text style={styles.introWord}>{activity.target}</Text>
        <Text style={styles.introTranslation}>{activity.english}</Text>
        <Text style={[styles.tapToHear, { color: theme.text }]}>Tap the word to hear it again</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.accent }]} onPress={onCorrect}>
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

// same logic as before, just use theme colors
function MultipleChoice({ activity, language, onCorrect, onWrong, theme }) {
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const { playAudioKey, playFeedback } = useAudio(language);

  function playOption(opt) {
    const key = activity.optionAudioMap?.[opt];
    if (key) playAudioKey(key);
  }

  function checkAnswer() {
    if (!selected) return;
    if (selected === activity.answer) {
      playFeedback('correct');
      setState('correct');
    } else {
      playFeedback('wrong');
      setAttempts((v) => v + 1);
      setState('wrong');
    }
  }

  function resetWrong() {
    setState('idle');
    setSelected(null);
  }

  return (
    <View style={[styles.card, state === 'correct' ? styles.cardCorrect : state === 'wrong' ? styles.cardWrong : null]}>
      <Text style={[styles.kicker, { color: theme.text }]}>{activity.isReview ? 'Review' : 'Practice'}</Text>
      <Text style={styles.prompt}>{activity.prompt}</Text>

      {activity.options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.option,
            selected === opt && { borderColor: theme.accent, backgroundColor: theme.light }
          ]}
          onPress={() => {
            setSelected(opt);
            playOption(opt);
          }}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, !selected && styles.primaryBtnDisabled]}
          disabled={!selected}
          onPress={checkAnswer}
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(selected)}
        theme={theme}
      />
    </View>
  );
}

// apply same theme treatment to the other renderers
function ListeningTargetChoice({ activity, language, onCorrect, onWrong, theme }) {
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const { playAudioKey, playFeedback } = useAudio(language);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) playAudioKey(activity.audioKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [activity.audioKey]);

  function playOption(opt) {
    const key = activity.optionAudioMap?.[opt];
    if (key) playAudioKey(key);
  }

  function checkAnswer() {
    if (!selected) return;
    if (selected === activity.answer) {
      playFeedback('correct');
      setState('correct');
    } else {
      playFeedback('wrong');
      setAttempts((v) => v + 1);
      setState('wrong');
    }
  }

  function resetWrong() {
    setState('idle');
    setSelected(null);
  }

  return (
    <View style={[styles.card, state === 'correct' ? styles.cardCorrect : state === 'wrong' ? styles.cardWrong : null]}>
      <View style={styles.promptRow}>
        <Text style={[styles.kicker, { color: theme.text }]}>Listening</Text>
        <TouchableOpacity style={[styles.speakerBtn, { backgroundColor: theme.light }]} onPress={() => playAudioKey(activity.audioKey)}>
          <Ionicons name="volume-high" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <Text style={styles.prompt}>{activity.prompt}</Text>

      {activity.options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[
            styles.option,
            selected === opt && { borderColor: theme.accent, backgroundColor: theme.light }
          ]}
          onPress={() => {
            setSelected(opt);
            playOption(opt);
          }}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, !selected && styles.primaryBtnDisabled]}
          disabled={!selected}
          onPress={checkAnswer}
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(selected)}
        theme={theme}
      />
    </View>
  );
}

function Typing({ activity, language, onCorrect, onWrong, theme }) {
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const { playAudioKey, playFeedback } = useAudio(language);
  const wordBank = useMemo(() => makeWordBank(activity.answer), [activity.answer]);

  function addWord(word) {
    setValue((prev) => (prev.trim() ? `${prev.trim()} ${word}` : word));
    if (activity.audioKey) playAudioKey(activity.audioKey);
  }

  function checkAnswer() {
    if (!value.trim()) return;
    if (normalizeText(value) === normalizeText(activity.answer)) {
      playFeedback('correct');
      setState('correct');
    } else {
      playFeedback('wrong');
      setAttempts((v) => v + 1);
      setState('wrong');
    }
  }

  function resetWrong() {
    setState('idle');
  }

  const answer = String(activity.answer || '');
  const firstHint = `Starts with: ${answer.slice(0, Math.min(3, answer.length))}…`;

  return (
    <ScrollView contentContainerStyle={[styles.card, state === 'correct' ? styles.cardCorrect : state === 'wrong' ? styles.cardWrong : null]}>
      <Text style={[styles.kicker, { color: theme.text }]}>Typing</Text>
      <Text style={styles.prompt}>{activity.prompt}</Text>

      {activity.audioKey ? (
        <TouchableOpacity style={[styles.targetTapCard, { backgroundColor: theme.light }]} onPress={() => playAudioKey(activity.audioKey)}>
          <Text style={[styles.targetTapText, { color: theme.text }]}>Tap to hear the word</Text>
          <Text style={styles.targetTapSub}>{activity.english}</Text>
        </TouchableOpacity>
      ) : null}

      <TextInput
        placeholder="Type your answer"
        value={value}
        onChangeText={setValue}
        style={styles.input}
        autoCapitalize="none"
      />

      {hintLevel === 0 ? (
        <TouchableOpacity style={[styles.secondarySmallBtn, { backgroundColor: theme.light }]} onPress={() => setHintLevel(1)}>
          <Text style={[styles.secondarySmallBtnText, { color: theme.text }]}>Hints</Text>
        </TouchableOpacity>
      ) : null}

      {hintLevel >= 1 ? (
        <>
          <Text style={styles.hintText}>{firstHint}</Text>
          {hintLevel === 1 ? (
            <TouchableOpacity style={[styles.secondarySmallBtn, { backgroundColor: theme.light }]} onPress={() => setHintLevel(2)}>
              <Text style={[styles.secondarySmallBtnText, { color: theme.text }]}>More hints</Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      {hintLevel >= 2 ? (
        <>
          <Text style={styles.wordBankLabel}>Tap words to help build the answer</Text>
          <View style={styles.wordWrap}>
            {wordBank.map((word, idx) => (
              <TouchableOpacity key={`${word}-${idx}`} style={[styles.wordChip, { backgroundColor: theme.light }]} onPress={() => addWord(word)}>
                <Text style={styles.wordChipText}>{word}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, !value.trim() && styles.primaryBtnDisabled]}
          disabled={!value.trim()}
          onPress={checkAnswer}
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(value)}
        theme={theme}
      />
    </ScrollView>
  );
}

function SentenceBuild({ activity, language, onCorrect, onWrong, theme }) {
  const [selected, setSelected] = useState([]);
  const [pool, setPool] = useState(() => shuffle(activity.words));
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const { playAudioKey, playFeedback } = useAudio(language);

  function pick(word, index) {
    const nextPool = [...pool];
    nextPool.splice(index, 1);
    setPool(nextPool);
    setSelected([...selected, word]);
    if (activity.audioKey) playAudioKey(activity.audioKey);
  }

  function removeWord(word, index) {
    const nextSelected = [...selected];
    nextSelected.splice(index, 1);
    setSelected(nextSelected);
    setPool([...pool, word]);
  }

  function checkAnswer() {
    const ok = JSON.stringify(selected) === JSON.stringify(activity.answerTokens);
    if (ok) {
      playFeedback('correct');
      setState('correct');
    } else {
      playFeedback('wrong');
      setAttempts((v) => v + 1);
      setState('wrong');
    }
  }

  function resetWrong() {
    setState('idle');
  }

  return (
    <ScrollView contentContainerStyle={[styles.card, state === 'correct' ? styles.cardCorrect : state === 'wrong' ? styles.cardWrong : null]}>
      <Text style={[styles.kicker, { color: theme.text }]}>Build</Text>
      <Text style={styles.prompt}>{activity.prompt}</Text>

      <View style={styles.selectedBox}>
        {selected.length === 0 ? <Text style={styles.placeholder}>Tap words below</Text> : null}
        <View style={styles.wordWrap}>
          {selected.map((word, idx) => (
            <TouchableOpacity key={`${word}-${idx}`} style={[styles.wordChipSelected, { backgroundColor: theme.light }]} onPress={() => removeWord(word, idx)}>
              <Text style={styles.wordChipText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.wordWrap}>
        {pool.map((word, idx) => (
          <TouchableOpacity key={`${word}-${idx}`} style={[styles.wordChip, { backgroundColor: theme.light }]} onPress={() => pick(word, idx)}>
            <Text style={styles.wordChipText}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {state === 'idle' ? (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, selected.length === 0 && styles.primaryBtnDisabled]}
          disabled={selected.length === 0}
          onPress={checkAnswer}
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(selected.join(' '))}
        theme={theme}
      />
    </ScrollView>
  );
}

function MatchPairs({ activity, language, onCorrect, onWrong, theme }) {
  const left = useMemo(() => shuffle(activity.pairs.map((p) => p.left)), [activity]);
  const right = useMemo(() => shuffle(activity.pairs.map((p) => p.right)), [activity]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState([]);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const { playAudioKey, playFeedback } = useAudio(language);

  function isMatchedLeft(item) {
    return matches.some((m) => m.left === item);
  }

  function isMatchedRight(item) {
    return matches.some((m) => m.right === item);
  }

  function rightAudioKey(item) {
    return activity.pairs.find((p) => p.right === item)?.audioKey;
  }

  function checkPair() {
    if (!selectedLeft || !selectedRight) return;

    const pair = activity.pairs.find((p) => p.left === selectedLeft);

    if (pair?.right === selectedRight) {
      const nextMatches = [...matches, { left: selectedLeft, right: selectedRight }];
      setMatches(nextMatches);
      setSelectedLeft(null);
      setSelectedRight(null);
      setState('idle');

      if (nextMatches.length === activity.pairs.length) {
        playFeedback('correct');
        setState('correct');
      }
    } else {
      playFeedback('wrong');
      setAttempts((v) => v + 1);
      setState('wrong');
    }
  }

  function resetWrong() {
    setState('idle');
    setSelectedRight(null);
  }

  return (
    <View style={[styles.card, state === 'correct' ? styles.cardCorrect : state === 'wrong' ? styles.cardWrong : null]}>
      <Text style={[styles.kicker, { color: theme.text }]}>Match</Text>
      <Text style={styles.prompt}>{activity.prompt}</Text>

      <View style={styles.matchRow}>
        <View style={styles.matchCol}>
          {left.map((item) => (
            <TouchableOpacity
              key={item}
              disabled={isMatchedLeft(item)}
              style={[
                styles.option,
                isMatchedLeft(item) && styles.optionDone,
                selectedLeft === item && { borderColor: theme.accent, backgroundColor: theme.light }
              ]}
              onPress={() => setSelectedLeft(item)}
            >
              <Text style={styles.optionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.matchCol}>
          {right.map((item) => (
            <TouchableOpacity
              key={item}
              disabled={isMatchedRight(item)}
              style={[
                styles.option,
                isMatchedRight(item) && styles.optionDone,
                selectedRight === item && { borderColor: theme.accent, backgroundColor: theme.light }
              ]}
              onPress={() => {
                setSelectedRight(item);
                const key = rightAudioKey(item);
                if (key) playAudioKey(key);
              }}
            >
              <Text style={styles.optionText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {state !== 'correct' ? (
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.accent }, (!selectedLeft || !selectedRight) && styles.primaryBtnDisabled]}
          disabled={!selectedLeft || !selectedRight}
          onPress={checkPair}
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(`${selectedLeft} ↔ ${selectedRight}`)}
        theme={theme}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3
  },
  cardCorrect: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC'
  },
  cardWrong: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  promptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  kicker: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  prompt: {
    fontSize: 24,
    fontWeight: '800',
    color: '#102A43',
    marginBottom: 18
  },
  introWordCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 18
  },
  introWord: {
    fontSize: 30,
    fontWeight: '900',
    color: '#17324D'
  },
  introTranslation: {
    marginTop: 8,
    fontSize: 18,
    color: '#475569',
    fontWeight: '700'
  },
  tapToHear: {
    marginTop: 10,
    fontWeight: '800'
  },
  speakerBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },
  option: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10
  },
  optionDone: {
    opacity: 0.45
  },
  optionText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1E293B'
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 14,
    fontSize: 17,
    marginBottom: 12,
    backgroundColor: '#fff'
  },
  targetTapCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12
  },
  targetTapText: {
    fontWeight: '900'
  },
  targetTapSub: {
    color: '#475569',
    fontWeight: '700',
    marginTop: 4
  },
  secondarySmallBtn: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    marginBottom: 8
  },
  secondarySmallBtnText: {
    fontWeight: '800'
  },
  hintText: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 10
  },
  wordBankLabel: {
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8
  },
  primaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12
  },
  primaryBtnDisabled: {
    opacity: 0.45
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800'
  },
  selectedBox: {
    minHeight: 72,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16
  },
  placeholder: {
    color: '#94A3B8',
    fontStyle: 'italic'
  },
  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  wordChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8
  },
  wordChipSelected: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 8
  },
  wordChipText: {
    color: '#17324D',
    fontWeight: '700'
  },
  matchRow: {
    flexDirection: 'row',
    gap: 10
  },
  matchCol: {
    flex: 1
  },
  footer: {
    marginTop: 16,
    borderRadius: 16,
    padding: 14
  },
  footerGreen: {
    backgroundColor: '#DCFCE7'
  },
  footerRed: {
    backgroundColor: '#FEE2E2'
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#102A43',
    marginBottom: 6
  },
  footerSub: {
    color: '#475569',
    fontWeight: '700',
    marginBottom: 10
  },
  footerButtonGreen: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  footerButtonRed: {
    backgroundColor: '#DC2626',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center'
  },
  footerButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16
  }
});