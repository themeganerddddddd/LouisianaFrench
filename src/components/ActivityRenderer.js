import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { getAudioSource } from '../data/audioManifest';
import TBoySpeechBubble from './TBoySpeechBubble';

const tBoyImage = require('../../assets/images/mainscreen.png');

const CORRECT_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAFoGTgx9EZUVUhiLGSoZNhfOEyoPkglhA/v8xfYi8W3s8ujo5nDmkec66j/uYPNM+aP//wX8CzkRYhU1GIQZOhldFwkUdA/oCb4DWP0c927xquwbOZ25wnq/O0P8/L4Rv+kBakL';

const WRONG_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAJoBMwPJBFoG5AdnCeAKTgywDQQPSRB9EaASsROtFJUVZxYiF8YXUhjGGCEZYhmLGZkZjRloGSoZ0hhhGNcXNhd9Fq4VyBTOE8ASnxFtECoP1w13DAoLkgkRCIcG9wRhA8kBLgCV/vv8';

function shuffle(arr, randomFn = Math.random) {
  return [...arr].sort(() => randomFn() - 0.5);
}

function makeMatchColumns(pairs = []) {
  const safePairs = Array.isArray(pairs) ? pairs : [];

  const leftItems = shuffle(safePairs.map((p) => p.left));
  let rightItems = shuffle(safePairs.map((p) => p.right));

  function hasDirectMatch(leftList, rightList) {
    return rightList.some((rightValue, index) => {
      const leftValue = leftList[index];
      const matchingPair = safePairs.find((p) => p.left === leftValue);
      return matchingPair?.right === rightValue;
    });
  }

  if (safePairs.length > 1) {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (!hasDirectMatch(leftItems, rightItems)) {
        return { left: leftItems, right: rightItems };
      }

      rightItems = shuffle(rightItems);
    }

    for (let shift = 1; shift < rightItems.length; shift += 1) {
      const rotated = rightItems.map(
        (_, index) => rightItems[(index + shift) % rightItems.length]
      );

      if (!hasDirectMatch(leftItems, rotated)) {
        rightItems = rotated;
        break;
      }
    }
  }

  return { left: leftItems, right: rightItems };
}

function normalizeText(str) {
  return String(str || '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/[’‘`´]/g, "'")
    .replace(/…/g, ' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
        accent: '#08834c',
        light: '#E7F5EE',
        text: '#066B3F'
      }
    : {
        accent: '#2771CB',
        light: '#EAF3FF',
        text: '#2771CB'
      };
}

function getCardStatusStyle(state) {
  if (state === 'correct') return styles.cardCorrect;
  if (state === 'wrong' || state === 'skipped') return styles.cardWrong;
  return null;
}

function isLocked(state) {
  return state === 'correct' || state === 'wrong' || state === 'skipped';
}

function shouldRevealAfterAnswer(state, attempts) {
  return state === 'correct' || state === 'skipped' || (state === 'wrong' && attempts > 1);
}

function shouldShowIntroAddOns(activity) {
  return activity?.type === 'intro_card';
}

function useAudio(language) {
  const soundRef = useRef(null);
  const fxRef = useRef(null);

  const stopAudio = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {}
  }, []);

  const stopFx = useCallback(async () => {
    try {
      if (fxRef.current) {
        await fxRef.current.unloadAsync();
        fxRef.current = null;
      }
    } catch {}
  }, []);

  const playAudioKey = useCallback(
    async (audioKey) => {
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
    },
    [language, stopAudio]
  );

  const playFeedback = useCallback(
    async (kind) => {
      try {
        await stopFx();
        const uri = kind === 'correct' ? CORRECT_TONE_URI : WRONG_TONE_URI;
        const { sound } = await Audio.Sound.createAsync({ uri });
        fxRef.current = sound;
        await sound.playAsync();
      } catch {}
    },
    [stopFx]
  );

  useEffect(() => {
    return () => {
      stopAudio();
      stopFx();
    };
  }, [stopAudio, stopFx]);

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

function getEnglishDisplay(activity, showEnglishAlt) {
  if (showEnglishAlt && activity?.englishAltResponse) {
    return activity.englishAltResponse;
  }

  return activity?.english || '';
}

function getTargetDisplay(activity, showVariantAlt) {
  if (showVariantAlt && activity?.variantAltResponse) {
    return activity.variantAltResponse;
  }

  return activity?.answerDisplay || activity?.target || activity?.answer || '';
}

function getPromptDisplay(activity, englishText) {
  if (!activity) return '';

  if (activity.type === 'multiple_choice') {
    return `Choose the match for '${englishText}'`;
  }

  if (activity.type === 'typing') {
    return `Type: '${englishText}'`;
  }

  if (activity.type === 'sentence_build') {
    return `Build: '${englishText}'`;
  }

  return activity.prompt;
}

function isTextAnswerCorrect(value, activity) {
  const normalizedValue = normalizeText(value);
  const normalizedMain = normalizeText(activity?.answer);
  const normalizedAlt = normalizeText(activity?.variantAltResponse);

  return (
    normalizedValue === normalizedMain ||
    (!!normalizedAlt && normalizedValue === normalizedAlt)
  );
}

function QuestionScrollView({ state, children }) {
  return (
    <ScrollView
      style={styles.scrollShell}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.card, getCardStatusStyle(state)]}>
        {children}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function AltToggleButtons({
  activity,
  showEnglishAlt,
  setShowEnglishAlt,
  showVariantAlt,
  setShowVariantAlt,
  theme,
  visible
}) {
  const hasEnglishAlt = !!activity?.englishAltResponse;
  const hasVariantAlt = !!activity?.variantAltResponse;

  if (!visible || (!hasEnglishAlt && !hasVariantAlt)) return null;

  return (
    <View style={styles.altButtonRow}>
      {hasEnglishAlt ? (
        <TouchableOpacity
          style={[styles.altButton, { backgroundColor: theme.light }]}
          onPress={() => setShowEnglishAlt((v) => !v)}
        >
          <Text style={[styles.altButtonText, { color: theme.text }]}>
            Translation alternative
          </Text>
        </TouchableOpacity>
      ) : null}

      {hasVariantAlt ? (
        <TouchableOpacity
          style={[styles.altButton, { backgroundColor: theme.light }]}
          onPress={() => setShowVariantAlt((v) => !v)}
        >
          <Text style={[styles.altButtonText, { color: theme.text }]}>
            French alternative
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AnswerAltButtons({ activity, visible, theme }) {
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const hasEnglishAlt = !!activity?.englishAltResponse;
  const hasVariantAlt = !!activity?.variantAltResponse;

  if (!visible || (!hasEnglishAlt && !hasVariantAlt)) return null;

  return (
    <View style={styles.answerAltWrap}>
      {hasEnglishAlt ? (
        <View style={styles.answerAltBlock}>
          <TouchableOpacity
            style={[styles.altButton, { backgroundColor: theme.light }]}
            onPress={() => setShowEnglishAlt((v) => !v)}
          >
            <Text style={[styles.altButtonText, { color: theme.text }]}>
              Translation alternative
            </Text>
          </TouchableOpacity>

          {showEnglishAlt ? (
            <Text style={styles.answerAltText}>{activity.englishAltResponse}</Text>
          ) : null}
        </View>
      ) : null}

      {hasVariantAlt ? (
        <View style={styles.answerAltBlock}>
          <TouchableOpacity
            style={[styles.altButton, { backgroundColor: theme.light }]}
            onPress={() => setShowVariantAlt((v) => !v)}
          >
            <Text style={[styles.altButtonText, { color: theme.text }]}>
              French alternative
            </Text>
          </TouchableOpacity>

          {showVariantAlt ? (
            <Text style={styles.answerAltText}>{activity.variantAltResponse}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function ContextBadge({ activity, language }) {
  const theme = getTheme(language);

  if (!activity?.contextBadge) return null;

  return (
    <View
      style={[
        styles.contextBadge,
        {
          backgroundColor: theme.light,
          borderColor: theme.accent
        }
      ]}
    >
      <Text style={[styles.contextBadgeText, { color: theme.text }]}>
        {activity.contextBadge}
      </Text>
    </View>
  );
}

function TBoyCallout({ activity, language, visible, onOpenPreface }) {
  const theme = getTheme(language);
  const heading = activity?.english || activity?.target || 'Context';
  const canOpenPreface = typeof onOpenPreface === 'function';

  if (!visible || !activity?.extraDetails) return null;

  return (
    <View style={styles.tBoyWrap} testID="tboy-callout">
      <View style={styles.tBoyStage}>
        <TBoySpeechBubble
          heading={heading}
          body={activity.extraDetails}
          accentColor={theme.accent}
          testID="tboy-speech-bubble"
          headingTestID="tboy-heading"
          bodyTestID="tboy-text"
        />

        {canOpenPreface ? (
          <TouchableOpacity
            style={({ pressed }) => [
              styles.tBoyAction,
              pressed && styles.tBoyActionPressed
            ]}
            onPress={onOpenPreface}
            accessibilityRole="button"
            accessibilityLabel="T-Boy: open Unit note"
            accessibilityHint="Opens the full Unit note"
          >
            <View style={styles.tBoyArtPocket}>
              <Image
                source={tBoyImage}
                style={styles.tBoyImage}
                resizeMode="contain"
                testID="tboy-image"
                accessible={false}
              />
            </View>
            <View style={styles.tBoyActionLabel}>
              <Text style={[styles.tBoyActionText, { color: theme.accent }]}>T-Boy&apos;s Advice</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.accent} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.tBoyArtPocket}>
            <Image
              source={tBoyImage}
              style={styles.tBoyImage}
              resizeMode="contain"
              testID="tboy-image"
              accessibilityRole="image"
              accessibilityLabel="T-Boy"
            />
          </View>
        )}
      </View>
    </View>
  );
}

function SkipQuestionButton({ onSkip, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.skipButton, disabled && styles.disabledButton]}
      onPress={onSkip}
      disabled={disabled}
    >
      <Text style={styles.skipButtonText}>Skip</Text>
    </TouchableOpacity>
  );
}

function FeedbackFooter({
  state,
  firstWrong,
  hintText,
  answerDisplay,
  onTryAgain,
  onNext,
  onIncorrect,
  altContent
}) {
  const [submitted, setSubmitted] = useState(false);

  function submit(handler) {
    setSubmitted(true);
    handler();
  }

  if (state === 'correct') {
    return (
      <View style={[styles.footer, styles.footerGreen]}>
        <Text style={styles.footerTitle}>Correct!</Text>

        {altContent}

        <TouchableOpacity style={[styles.footerButtonGreen, submitted && styles.disabledButton]} onPress={() => submit(onNext)} disabled={submitted}>
          <Text style={styles.footerButtonText}>Next Question</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'skipped') {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Skipped</Text>

        {answerDisplay ? (
          <Text style={styles.footerSub}>Answer: {answerDisplay}</Text>
        ) : null}

        {altContent}

        <TouchableOpacity style={[styles.footerButtonRed, submitted && styles.disabledButton]} onPress={() => submit(onIncorrect)} disabled={submitted}>
          <Text style={styles.footerButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Not quite</Text>

        {hintText ? <Text style={styles.footerSub}>{hintText}</Text> : null}

        <TouchableOpacity
          style={styles.footerButtonRed}
          onPress={onTryAgain}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.footerButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && !firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Let’s move on</Text>

        {answerDisplay ? (
          <Text style={styles.footerSub}>Answer: {answerDisplay}</Text>
        ) : hintText ? (
          <Text style={styles.footerSub}>{hintText}</Text>
        ) : null}

        {altContent}

        <TouchableOpacity style={[styles.footerButtonRed, submitted && styles.disabledButton]} onPress={() => submit(onIncorrect)} disabled={submitted}>
          <Text style={styles.footerButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

export default function ActivityRenderer({
  activity,
  onCorrect,
  onWrong,
  language,
  allowSkip = true,
  onOpenPreface
}) {
  const theme = getTheme(language);
  const submittedRef = useRef(false);

  function submitOnce(handler, ...args) {
    if (submittedRef.current) return;

    submittedRef.current = true;
    handler(...args);
  }

  const correctSubmission = { onCorrect: () => submitOnce(onCorrect) };
  const feedbackSubmission = {
    ...correctSubmission,
    onWrong: (answer) => submitOnce(onWrong, answer)
  };

  switch (activity.type) {
    case 'intro_card':
      return (
        <IntroCard
          activity={activity}
          language={language}
          {...correctSubmission}
          theme={theme}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'multiple_choice':
      return (
        <MultipleChoice
          activity={activity}
          language={language}
          {...feedbackSubmission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'listening_target_choice':
      return (
        <ListeningTargetChoice
          activity={activity}
          language={language}
          {...feedbackSubmission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'typing':
      return (
        <Typing
          activity={activity}
          language={language}
          {...feedbackSubmission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'sentence_build':
      return (
        <SentenceBuild
          activity={activity}
          language={language}
          {...feedbackSubmission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'match_pairs':
      return (
        <MatchPairs
          activity={activity}
          language={language}
          {...feedbackSubmission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    default:
      return (
        <View style={styles.card}>
          <Text style={styles.prompt}>Unknown activity type: {activity.type}</Text>
        </View>
      );
  }
}

function IntroCard({ activity, language, onCorrect, theme, onOpenPreface }) {
  const { playAudioKey } = useAudio(language);
  const [submitted, setSubmitted] = useState(false);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  function submit() {
    setSubmitted(true);
    onCorrect();
  }

  const englishText = getEnglishDisplay(activity, showEnglishAlt);
  const targetText = getTargetDisplay(activity, showVariantAlt);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) playAudioKey(activity.audioKey);
    }, 500);

    return () => clearTimeout(timer);
  }, [activity.audioKey, playAudioKey]);

  return (
    <QuestionScrollView>
      <Text style={[styles.kicker, { color: theme.text }]}>New word</Text>
      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{activity.prompt}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={shouldShowIntroAddOns(activity)}
      />

      <TouchableOpacity
        style={[styles.introWordCard, { backgroundColor: theme.light }]}
        onPress={() => playAudioKey(activity.audioKey)}
        accessibilityRole="button"
        accessibilityLabel={`Play audio: ${activity.target}`}
      >
        <Text style={styles.introWord}>{targetText}</Text>
        <Text style={styles.introTranslation}>{englishText}</Text>
        <Text style={[styles.tapToHear, { color: theme.text }]}>
          Tap the word to hear it again
        </Text>
      </TouchableOpacity>

      <TBoyCallout
        activity={activity}
        language={language}
        visible={shouldShowIntroAddOns(activity)}
        onOpenPreface={onOpenPreface}
      />

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: theme.accent }, submitted && styles.primaryBtnDisabled]}
        onPress={submit} disabled={submitted}
      >
        <Text style={styles.primaryBtnText}>Continue</Text>
      </TouchableOpacity>
    </QuestionScrollView>
  );
}

function MultipleChoice({ activity, language, onCorrect, onWrong, theme, allowSkip, onOpenPreface }) {
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const { playAudioKey, playFeedback } = useAudio(language);

  const englishText = getEnglishDisplay(activity, showEnglishAlt);
  const targetText = getTargetDisplay(activity, showVariantAlt);
  const promptText = getPromptDisplay(activity, englishText);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function playOption(opt) {
    const key = activity.optionAudioMap?.[opt];

    if (key) {
      playAudioKey(key);
    }
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

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>
        {activity.isReview ? 'Review' : 'Practice'}
      </Text>
      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{promptText}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={false}
      />

      {activity.options.map((opt) => (
        <TouchableOpacity
          key={opt}
          disabled={isLocked(state)}
          style={[
            styles.option,
            selected === opt && {
              borderColor: theme.accent,
              backgroundColor: theme.light
            },
            isLocked(state) && styles.optionLocked
          ]}
          onPress={() => {
            setSelected(opt);
            playOption(opt);
          }}
          accessibilityRole="button"
          accessibilityLabel={opt}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            !selected && styles.primaryBtnDisabled
          ]}
          disabled={!selected}
          onPress={checkAnswer}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton onSkip={skipQuestion} disabled={false} />
      ) : null}

      <TBoyCallout
        activity={activity}
        language={language}
        visible={revealAddOns}
        onOpenPreface={onOpenPreface}
      />

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        answerDisplay={targetText}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(state === 'skipped' ? '__skipped__' : selected)}
        altContent={<AnswerAltButtons activity={activity} visible={revealAddOns} theme={theme} />}
      />
    </QuestionScrollView>
  );
}

function ListeningTargetChoice({
  activity,
  language,
  onCorrect,
  onWrong,
  theme,
  allowSkip,
  onOpenPreface
}) {
  const [selected, setSelected] = useState(null);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const { playAudioKey, playFeedback } = useAudio(language);

  const targetText = getTargetDisplay(activity, showVariantAlt);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) playAudioKey(activity.audioKey);
    }, 500);

    return () => clearTimeout(timer);
  }, [activity.audioKey, playAudioKey]);

  function playOption(opt) {
    const key = activity.optionAudioMap?.[opt];

    if (key) {
      playAudioKey(key);
    }
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

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  return (
    <QuestionScrollView state={state}>
      <View style={styles.promptRow}>
        <Text style={[styles.kicker, { color: theme.text }]}>Listening</Text>
        <TouchableOpacity
          style={[styles.speakerBtn, { backgroundColor: theme.light }]}
          onPress={() => playAudioKey(activity.audioKey)}
          accessibilityRole="button"
          accessibilityLabel="Play audio"
        >
          <Ionicons name="volume-high" size={20} color={theme.accent} />
        </TouchableOpacity>
      </View>

      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{activity.prompt}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={false}
      />

      {activity.options.map((opt) => (
        <TouchableOpacity
          key={opt}
          disabled={isLocked(state)}
          style={[
            styles.option,
            selected === opt && {
              borderColor: theme.accent,
              backgroundColor: theme.light
            },
            isLocked(state) && styles.optionLocked
          ]}
          onPress={() => {
            setSelected(opt);
            playOption(opt);
          }}
          accessibilityRole="button"
          accessibilityLabel={opt}
        >
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            !selected && styles.primaryBtnDisabled
          ]}
          disabled={!selected}
          onPress={checkAnswer}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton onSkip={skipQuestion} disabled={false} />
      ) : null}

      <TBoyCallout
        activity={activity}
        language={language}
        visible={revealAddOns}
        onOpenPreface={onOpenPreface}
      />

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        answerDisplay={targetText}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(state === 'skipped' ? '__skipped__' : selected)}
        altContent={<AnswerAltButtons activity={activity} visible={revealAddOns} theme={theme} />}
      />
    </QuestionScrollView>
  );
}

function Typing({ activity, language, onCorrect, onWrong, theme, allowSkip, onOpenPreface }) {
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const { playAudioKey, playFeedback } = useAudio(language);
  const wordBank = useMemo(() => makeWordBank(activity.answer), [activity.answer]);

  const englishText = getEnglishDisplay(activity, showEnglishAlt);
  const targetText = getTargetDisplay(activity, showVariantAlt);
  const promptText = getPromptDisplay(activity, englishText);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function addWord(word) {
    setValue((prev) => (prev.trim() ? `${prev.trim()} ${word}` : word));

    if (activity.audioKey) {
      playAudioKey(activity.audioKey);
    }
  }

  function checkAnswer() {
    if (!value.trim()) return;

    if (isTextAnswerCorrect(value, activity)) {
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

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  const answer = String(activity.answer || '');
  const firstHint = `Starts with: ${answer.slice(0, Math.min(3, answer.length))}…`;

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>Typing</Text>
      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{promptText}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={false}
      />

      {activity.audioKey ? (
        <TouchableOpacity
          style={[styles.targetTapCard, { backgroundColor: theme.light }]}
          onPress={() => playAudioKey(activity.audioKey)}
        >
          <Text style={[styles.targetTapText, { color: theme.text }]}>
            Tap to hear the word
          </Text>
          <Text style={styles.targetTapSub}>{englishText}</Text>
        </TouchableOpacity>
      ) : null}

      <TextInput
        placeholder="Type your answer"
        value={value}
        onChangeText={setValue}
        style={styles.input}
        autoCapitalize="none"
        editable={!isLocked(state)}
      />

      {hintLevel === 0 && state === 'idle' ? (
        <TouchableOpacity
          style={[styles.secondarySmallBtn, { backgroundColor: theme.light }]}
          onPress={() => setHintLevel(1)}
        >
          <Text style={[styles.secondarySmallBtnText, { color: theme.text }]}>
            Hints
          </Text>
        </TouchableOpacity>
      ) : null}

      {hintLevel >= 1 ? (
        <>
          <Text style={styles.hintText}>{firstHint}</Text>

          {hintLevel === 1 && state === 'idle' ? (
            <TouchableOpacity
              style={[styles.secondarySmallBtn, { backgroundColor: theme.light }]}
              onPress={() => setHintLevel(2)}
            >
              <Text style={[styles.secondarySmallBtnText, { color: theme.text }]}>
                More hints
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      ) : null}

      {hintLevel >= 2 ? (
        <>
          <Text style={styles.wordBankLabel}>
            Tap words to help build the answer
          </Text>

          <View style={styles.wordWrap}>
            {wordBank.map((word, idx) => (
              <TouchableOpacity
                key={`${word}-${idx}`}
                disabled={isLocked(state)}
                style={[
                  styles.wordChip,
                  { backgroundColor: theme.light },
                  isLocked(state) && styles.optionLocked
                ]}
                onPress={() => addWord(word)}
              >
                <Text style={styles.wordChipText}>{word}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            !value.trim() && styles.primaryBtnDisabled
          ]}
          disabled={!value.trim()}
          onPress={checkAnswer}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton onSkip={skipQuestion} disabled={false} />
      ) : null}

      <TBoyCallout
        activity={activity}
        language={language}
        visible={revealAddOns}
        onOpenPreface={onOpenPreface}
      />

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        answerDisplay={targetText}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() => onWrong(state === 'skipped' ? '__skipped__' : value)}
        altContent={<AnswerAltButtons activity={activity} visible={revealAddOns} theme={theme} />}
      />
    </QuestionScrollView>
  );
}

const SENTENCE_PUNCT = new Set(['.', '?', '!', ',']);

function SentenceBuild({ activity, language, onCorrect, onWrong, theme, allowSkip, onOpenPreface }) {
  const words = activity.words || [];
  const contentWords = words.filter((w) => !SENTENCE_PUNCT.has(w));
  const trailingPunct = words.filter((w) => SENTENCE_PUNCT.has(w));

  const [selected, setSelected] = useState([]);
  const [pool, setPool] = useState(() => shuffle(contentWords));
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const { playAudioKey, playFeedback } = useAudio(language);

  const englishText = getEnglishDisplay(activity, showEnglishAlt);
  const targetText = getTargetDisplay(activity, showVariantAlt);
  const promptText = getPromptDisplay(activity, englishText);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function pick(word, index) {
    if (isLocked(state)) return;

    const nextPool = [...pool];
    nextPool.splice(index, 1);

    setPool(nextPool);
    setSelected([...selected, word]);

    if (activity.audioKey && nextPool.length === 0) {
      playAudioKey(activity.audioKey);
    }
  }

  function removeWord(word, index) {
    if (isLocked(state)) return;

    const nextSelected = [...selected];
    nextSelected.splice(index, 1);

    setSelected(nextSelected);
    setPool([...pool, word]);
  }

  function checkAnswer() {
    const fullSelected = [...selected, ...trailingPunct];
    const selectedText = fullSelected.join(' ');
    const ok =
      JSON.stringify(fullSelected) === JSON.stringify(activity.answerTokens || []) ||
      isTextAnswerCorrect(selectedText, activity);

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

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>Build</Text>
      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{promptText}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={false}
      />

      <View style={styles.selectedBox}>
        {selected.length === 0 ? (
          <Text style={styles.placeholder}>Tap words below</Text>
        ) : null}

        <View style={styles.wordWrap}>
          {selected.map((word, idx) => (
            <TouchableOpacity
              key={`${word}-${idx}`}
              disabled={isLocked(state)}
              style={[
                styles.wordChipSelected,
                { backgroundColor: theme.light },
                isLocked(state) && styles.optionLocked
              ]}
              onPress={() => removeWord(word, idx)}
            >
              <Text style={styles.wordChipText}>{word}</Text>
            </TouchableOpacity>
          ))}
          {trailingPunct.map((p, idx) => (
            <Text key={`punct-${idx}`} style={[styles.wordChipText, { lineHeight: undefined, paddingVertical: 8 }]}>{p}</Text>
          ))}
        </View>
      </View>

      <View style={styles.wordWrap}>
        {pool.map((word, idx) => (
          <TouchableOpacity
            key={`${word}-${idx}`}
            disabled={isLocked(state)}
            style={[
              styles.wordChip,
              { backgroundColor: theme.light },
              isLocked(state) && styles.optionLocked
            ]}
            onPress={() => pick(word, idx)}
          >
            <Text style={styles.wordChipText}>{word}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            selected.length === 0 && styles.primaryBtnDisabled
          ]}
          disabled={selected.length === 0}
          onPress={checkAnswer}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton onSkip={skipQuestion} disabled={false} />
      ) : null}

      <TBoyCallout
        activity={activity}
        language={language}
        visible={revealAddOns}
        onOpenPreface={onOpenPreface}
      />

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        answerDisplay={targetText}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() =>
          onWrong(state === 'skipped' ? '__skipped__' : [...selected, ...trailingPunct].join(' '))
        }
        altContent={<AnswerAltButtons activity={activity} visible={revealAddOns} theme={theme} />}
      />
    </QuestionScrollView>
  );
}

function MatchPairs({ activity, language, onCorrect, onWrong, theme, allowSkip, onOpenPreface }) {
  const { left, right } = useMemo(
    () => makeMatchColumns(activity.pairs || []),
    [activity]
  );

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState([]);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const { playAudioKey, playFeedback } = useAudio(language);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function isMatchedLeft(item) {
    return matches.some((m) => m.left === item);
  }

  function isMatchedRight(item) {
    return matches.some((m) => m.right === item);
  }

  function rightAudioKey(item) {
    return activity.pairs?.find((p) => p.right === item)?.audioKey;
  }

  function checkPair() {
    if (!selectedLeft || !selectedRight) return;

    const pair = activity.pairs?.find((p) => p.left === selectedLeft);

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

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>Match</Text>
      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{activity.prompt}</Text>

      <AltToggleButtons
        activity={activity}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={false}
      />

      <View style={styles.matchGrid}>
        <View style={styles.matchColumn}>
          {left.map((item) => {
            const matched = isMatchedLeft(item);
            const active = selectedLeft === item;

            return (
              <TouchableOpacity
                key={item}
                disabled={matched || isLocked(state)}
                style={[
                  styles.matchItem,
                  active && {
                    borderColor: theme.accent,
                    backgroundColor: theme.light
                  },
                  matched && styles.matchedItem,
                  isLocked(state) && !matched && styles.optionLocked
                ]}
                onPress={() => setSelectedLeft(item)}
              >
                <Text style={styles.matchText}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.matchColumn}>
          {right.map((item) => {
            const matched = isMatchedRight(item);
            const active = selectedRight === item;

            return (
              <TouchableOpacity
                key={item}
                disabled={matched || isLocked(state)}
                style={[
                  styles.matchItem,
                  active && {
                    borderColor: theme.accent,
                    backgroundColor: theme.light
                  },
                  matched && styles.matchedItem,
                  isLocked(state) && !matched && styles.optionLocked
                ]}
                onPress={() => {
                  setSelectedRight(item);

                  const key = rightAudioKey(item);
                  if (key) playAudioKey(key);
                }}
              >
                <Text style={styles.matchText}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            (!selectedLeft || !selectedRight) && styles.primaryBtnDisabled
          ]}
          disabled={!selectedLeft || !selectedRight}
          onPress={checkPair}
          accessibilityRole="button"
          accessibilityLabel="Check matches"
        >
          <Text style={styles.primaryBtnText}>Check</Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton onSkip={skipQuestion} disabled={false} />
      ) : null}

      <TBoyCallout
        activity={activity}
        language={language}
        visible={revealAddOns}
        onOpenPreface={onOpenPreface}
      />

      <FeedbackFooter
        state={state}
        firstWrong={attempts === 1}
        hintText={getHintText(activity)}
        answerDisplay={activity.answerDisplay || 'Match the correct pairs'}
        onTryAgain={resetWrong}
        onNext={onCorrect}
        onIncorrect={() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : `${selectedLeft || ''} ↔ ${selectedRight || ''}`
          )
        }
        altContent={<AnswerAltButtons activity={activity} visible={revealAddOns} theme={theme} />}
      />
    </QuestionScrollView>
  );
}

const styles = StyleSheet.create({
  scrollShell: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent'
  },

  scrollContent: {
    paddingTop: 0,
    paddingBottom: 0
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingBottom: 36,
    overflow: 'visible'
  },

  bottomSpacer: {
    height: 120
  },
  cardCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#86EFAC'
  },

  cardWrong: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA'
  },

  kicker: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    textAlign: 'center'
  },

  contextBadge: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14
  },

  contextBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
    textTransform: 'uppercase'
  },

  prompt: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '900',
    color: '#102A43',
    textAlign: 'center',
    marginBottom: 20
  },

  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4
  },

  speakerBtn: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center'
  },

  introWordCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 18
  },

  introWord: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center'
  },

  introTranslation: {
    marginTop: 10,
    fontSize: 18,
    color: '#475569',
    fontWeight: '700',
    textAlign: 'center'
  },

  tapToHear: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '800'
  },

  option: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 10
  },

  optionLocked: {
    opacity: 0.72
  },

  optionText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#102A43',
    textAlign: 'center'
  },

  primaryBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12
  },

  primaryBtnDisabled: {
    opacity: 0.45
  },

  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900'
  },

  secondarySmallBtn: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 8,
    marginBottom: 8
  },

  secondarySmallBtnText: {
    fontSize: 14,
    fontWeight: '900'
  },

  input: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 16,
    padding: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#102A43',
    backgroundColor: '#FFFFFF'
  },

  targetTapCard: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14
  },

  targetTapText: {
    fontSize: 16,
    fontWeight: '900'
  },

  targetTapSub: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700'
  },

  hintText: {
    textAlign: 'center',
    color: '#475569',
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 8
  },

  wordBankLabel: {
    textAlign: 'center',
    color: '#64748B',
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 10
  },

  wordWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginVertical: 10
  },

  wordChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10
  },

  wordChipSelected: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },

  wordChipText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A43'
  },

  selectedBox: {
    minHeight: 78,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    justifyContent: 'center'
  },

  placeholder: {
    textAlign: 'center',
    color: '#94A3B8',
    fontWeight: '800'
  },

  matchGrid: {
    flexDirection: 'row',
    gap: 10
  },

  matchColumn: {
    flex: 1
  },

  matchItem: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#FFFFFF'
  },

  matchedItem: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
    opacity: 0.8
  },

  matchText: {
    textAlign: 'center',
    color: '#102A43',
    fontWeight: '800'
  },

  tBoyWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 12,
    overflow: 'visible'
  },

  tBoyStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    position: 'relative'
  },
  tBoyImage: {
    width: 106,
    height: 106,
    alignSelf: 'center',
    marginTop: 2,
    zIndex: 1,
    transform: [{ scaleX: -1 }]
  },

  tBoyAction: {
    alignItems: 'center',
    minWidth: 106,
    minHeight: 130,
    borderRadius: 40
  },

  tBoyActionPressed: {
    backgroundColor: '#EAF3FF'
  },

  tBoyArtPocket: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center'
  },

  tBoyActionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4
  },

  tBoyActionText: {
    maxWidth: 112,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center'
  },

  altButtonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 16
  },

  altButton: {
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    maxWidth: '100%'
  },

  altButtonText: {
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center'
  },

  answerAltWrap: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 14
  },

  answerAltBlock: {
    alignItems: 'center',
    width: '100%'
  },

  answerAltText: {
    marginTop: 8,
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center'
  },

  skipButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC'
  },

  skipButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '900'
  },

  disabledButton: {
    opacity: 0.45
  },

  footer: {
    borderRadius: 20,
    padding: 16,
    marginTop: 18,
    marginBottom: 22
  },

  footerGreen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC'
  },

  footerRed: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },

  footerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#102A43',
    textAlign: 'center',
    marginBottom: 8
  },

  footerSub: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12
  },

  footerButtonGreen: {
    backgroundColor: '#16A34A',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center'
  },

  footerButtonRed: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center'
  },

  footerButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16
  }
});
