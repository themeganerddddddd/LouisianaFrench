import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { IntroCard } from './activityTypes/introCard';
import { MultipleChoice } from './activityTypes/multipleChoice';
import { SelectMultiple } from './activityTypes/selectMultiple';
import {
  AnswerAltButtons,
  ContextBadge,
  FeedbackFooter,
  QuestionScrollView,
  SkipQuestionButton,
  TBoyCallout,
  getHintText,
  getPrimaryEnglish,
  getPrimaryTarget,
  getPromptDisplay,
  getTheme,
  isLocked,
  shouldRevealAfterAnswer
} from './activityTypes/shell';
import styles from './activityTypes/styles';
import { useAudio } from './activityTypes/useAudio';

function shuffle(arr, randomFn = Math.random) {
  return [...arr].sort(() => randomFn() - 0.5);
}

function makeMatchColumns(pairs = []) {
  const safePairs = Array.isArray(pairs) ? pairs : [];

  const leftItems = shuffle(
    safePairs.map((pair, pairIndex) => ({
      id: `left:${pairIndex}`,
      value: pair.left,
      pairIndex
    }))
  );
  let rightItems = shuffle(
    safePairs.map((pair, pairIndex) => ({
      id: `right:${pairIndex}`,
      value: pair.right,
      pairIndex
    }))
  );

  function hasDirectMatch(leftList, rightList) {
    return rightList.some(
      (rightItem, index) => leftList[index]?.pairIndex === rightItem.pairIndex
    );
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

function canonicalizeTextAnswer(str) {
  return normalizeText(str)
    .replace(/\bje suis\b/g, 'jsus')
    .replace(/\bje sus\b/g, 'jsus');
}

function makeWordBank(answer) {
  return shuffle(
    String(answer || '')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function parseVariantAlts(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];

  const quoted = [];
  const quotePattern = /[“"]([^”"]+)[”"]/g;
  let match = quotePattern.exec(text);

  while (match) {
    const form = match[1].trim();
    if (form) quoted.push(form);
    match = quotePattern.exec(text);
  }

  if (quoted.length > 0) {
    return quoted;
  }

  return text
    .split(/\s*(?:,|;|\||\/|\n)\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAcceptedVariantAlts(activity) {
  return [
    activity?.variantAltResponse,
    activity?.altVariantText,
    activity?.altVariant,
    activity?.variant_alt_response,
    activity?.alt_variant_text,
    activity?.alt_variant
  ]
    .flatMap(parseVariantAlts)
    .filter(Boolean);
}

function isTextAnswerCorrect(value, activity) {
  const normalizedValue = canonicalizeTextAnswer(value);
  const normalizedMain = canonicalizeTextAnswer(activity?.answer);

  if (normalizedValue === normalizedMain) {
    return true;
  }

  return getAcceptedVariantAlts(activity).some(
    (alt) => canonicalizeTextAnswer(alt) === normalizedValue
  );
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
    try {
      const result = handler(...args);
      if (result != null && typeof result.then === 'function') {
        return result.catch((error) => {
          submittedRef.current = false;
          throw error;
        });
      }
      return result;
    } catch (error) {
      submittedRef.current = false;
      throw error;
    }
  }

  const submission = {
    onCorrect: () => submitOnce(onCorrect),
    onWrong: (answer) => submitOnce(onWrong, answer)
  };

  switch (activity.type) {
    case 'intro_card':
      return (
        <IntroCard
          activity={activity}
          language={language}
          onCorrect={submission.onCorrect}
          theme={theme}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'multiple_choice':
      return (
        <MultipleChoice
          activity={activity}
          language={language}
          {...submission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    case 'select_multiple':
      return (
        <SelectMultiple
          activity={activity}
          language={language}
          {...submission}
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
          {...submission}
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
          {...submission}
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
          {...submission}
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
          {...submission}
          theme={theme}
          allowSkip={allowSkip}
          onOpenPreface={onOpenPreface}
        />
      );

    default:
      return (
        <View style={styles.card}>
          <Text style={styles.prompt}>
            Unknown activity type: {activity.type}
          </Text>
        </View>
      );
  }
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

  const { playAudioKey, playFeedback, stopThen } = useAudio(language);

  const targetText = getPrimaryTarget(activity);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) {
        playAudioKey(activity.audioKey);
      }
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
        <Text style={[styles.kicker, { color: theme.text }]}>
          Listening
        </Text>

        <TouchableOpacity
          style={[
            styles.speakerBtn,
            { backgroundColor: theme.light }
          ]}
          onPress={() => playAudioKey(activity.audioKey)}
          accessibilityRole="button"
          accessibilityLabel="Play audio"
        >
          <Ionicons
            name="volume-high"
            size={20}
            color={theme.accent}
          />
        </TouchableOpacity>
      </View>

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {activity.prompt}
      </Text>

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
          <Text style={styles.optionText}>
            {opt}
          </Text>
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
          <Text style={styles.primaryBtnText}>
            Check
          </Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton
          onSkip={skipQuestion}
          disabled={false}
        />
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
        onNext={stopThen(onCorrect)}
        onIncorrect={stopThen(() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : selected
          )
        )}
        altContent={
          <AnswerAltButtons
            activity={activity}
            language={language}
            visible={revealAddOns}
            theme={theme}
            onPlayAudioKey={playAudioKey}
          />
        }
      />
    </QuestionScrollView>
  );
}

function Typing({
  activity,
  language,
  onCorrect,
  onWrong,
  theme,
  allowSkip,
  onOpenPreface
}) {
  const [value, setValue] = useState('');
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);

  const { playAudioKey, playFeedback, stopThen } = useAudio(language);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!activity.audioKey) return undefined;

    const timer = setTimeout(() => {
      if (stateRef.current === 'idle') playAudioKey(activity.audioKey);
    }, 500);
    return () => clearTimeout(timer);
  }, [activity.audioKey, playAudioKey]);

  const wordBank = useMemo(
    () => makeWordBank(activity.answer),
    [activity.answer]
  );

  const englishText = getPrimaryEnglish(activity);
  const targetText = getPrimaryTarget(activity);
  const promptText = getPromptDisplay(activity);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function addWord(word) {
    setValue((prev) =>
      prev.trim()
        ? `${prev.trim()} ${word}`
        : word
    );
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

  const firstHint =
    `Starts with: ${answer.slice(
      0,
      Math.min(3, answer.length)
    )}…`;

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>
        Typing
      </Text>

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {promptText}
      </Text>

      {activity.audioKey ? (
        <TouchableOpacity
          style={[
            styles.targetTapCard,
            { backgroundColor: theme.light }
          ]}
          onPress={() => playAudioKey(activity.audioKey)}
          accessibilityRole="button"
          accessibilityLabel="Play the word"
        >
          <Text
            style={[
              styles.targetTapText,
              { color: theme.text }
            ]}
          >
            Tap to hear the word
          </Text>

          <Text style={styles.targetTapSub}>
            {englishText}
          </Text>
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
          style={[
            styles.secondarySmallBtn,
            { backgroundColor: theme.light }
          ]}
          onPress={() => setHintLevel(1)}
        >
          <Text
            style={[
              styles.secondarySmallBtnText,
              { color: theme.text }
            ]}
          >
            Hints
          </Text>
        </TouchableOpacity>
      ) : null}

      {hintLevel >= 1 ? (
        <>
          <Text style={styles.hintText}>
            {firstHint}
          </Text>

          {hintLevel === 1 && state === 'idle' ? (
            <TouchableOpacity
              style={[
                styles.secondarySmallBtn,
                { backgroundColor: theme.light }
              ]}
              onPress={() => setHintLevel(2)}
            >
              <Text
                style={[
                  styles.secondarySmallBtnText,
                  { color: theme.text }
                ]}
              >
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
                <Text style={styles.wordChipText}>
                  {word}
                </Text>
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
          <Text style={styles.primaryBtnText}>
            Check
          </Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton
          onSkip={skipQuestion}
          disabled={false}
        />
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
        onNext={stopThen(onCorrect)}
        onIncorrect={stopThen(() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : value
          )
        )}
        altContent={
          <AnswerAltButtons
            activity={activity}
            language={language}
            visible={revealAddOns}
            theme={theme}
            onPlayAudioKey={playAudioKey}
          />
        }
      />
    </QuestionScrollView>
  );
}

function SentenceBuild({
  activity,
  language,
  onCorrect,
  onWrong,
  theme,
  allowSkip,
  onOpenPreface
}) {
  const [selected, setSelected] = useState([]);
  const [pool, setPool] = useState(
    () => shuffle(activity.words || [])
  );
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);

  const { playAudioKey, playFeedback, stopThen } = useAudio(language);

  const targetText = getPrimaryTarget(activity);
  const promptText = getPromptDisplay(activity);
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function pick(word, index) {
    if (isLocked(state)) return;

    const nextPool = [...pool];
    nextPool.splice(index, 1);

    setPool(nextPool);
    setSelected([...selected, word]);
  }

  function removeWord(word, index) {
    if (isLocked(state)) return;

    const nextSelected = [...selected];
    nextSelected.splice(index, 1);

    setSelected(nextSelected);
    setPool([...pool, word]);
  }

  function checkAnswer() {
    const selectedText = selected.join(' ');
    const ok =
      JSON.stringify(selected) === JSON.stringify(activity.answerTokens || []) ||
      isTextAnswerCorrect(selectedText, activity);

    if (ok) {
      playFeedback('correct');
      if (activity.audioKey) {
        playAudioKey(activity.audioKey);
      }
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
      <Text style={[styles.kicker, { color: theme.text }]}>
        Build
      </Text>

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {promptText}
      </Text>

      <View style={styles.selectedBox}>
        {selected.length === 0 ? (
          <Text style={styles.placeholder}>
            Tap words below
          </Text>
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
              <Text style={styles.wordChipText}>
                {word}
              </Text>
            </TouchableOpacity>
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
            <Text style={styles.wordChipText}>
              {word}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {state === 'idle' ? (
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.accent },
            selected.length === 0 &&
              styles.primaryBtnDisabled
          ]}
          disabled={selected.length === 0}
          onPress={checkAnswer}
          accessibilityRole="button"
          accessibilityLabel="Check answer"
        >
          <Text style={styles.primaryBtnText}>
            Check
          </Text>
        </TouchableOpacity>
      ) : null}

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton
          onSkip={skipQuestion}
          disabled={false}
        />
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
        onNext={stopThen(onCorrect)}
        onIncorrect={stopThen(() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : selected.join(' ')
          )
        )}
        altContent={
          <AnswerAltButtons
            activity={activity}
            language={language}
            visible={revealAddOns}
            theme={theme}
            onPlayAudioKey={playAudioKey}
          />
        }
      />
    </QuestionScrollView>
  );
}

const MATCH_ANSWER_COLORS = [
  {
    backgroundColor: '#DBEAFE',
    borderColor: '#60A5FA'
  },
  {
    backgroundColor: '#DCFCE7',
    borderColor: '#4ADE80'
  },
  {
    backgroundColor: '#FEF3C7',
    borderColor: '#FBBF24'
  },
  {
    backgroundColor: '#F3E8FF',
    borderColor: '#C084FC'
  },
  {
    backgroundColor: '#FFE4E6',
    borderColor: '#FB7185'
  },
  {
    backgroundColor: '#CFFAFE',
    borderColor: '#22D3EE'
  }
];

function CorrectMatchPairs({ pairs = [] }) {
  return (
    <View
      style={styles.correctPairAnswer}
      testID="correct-match-pairs"
    >
      <Text style={styles.correctPairLabel}>
        Correct pairs
      </Text>

      {pairs.map((pair, index) => {
        const pairColor =
          MATCH_ANSWER_COLORS[
            index % MATCH_ANSWER_COLORS.length
          ];

        return (
          <View
            style={styles.correctPairRow}
            key={`${pair.left}-${pair.right}`}
          >
            <View
              style={[
                styles.correctPairChip,
                pairColor
              ]}
            >
              <Text style={styles.correctPairText}>
                {pair.left}
              </Text>
            </View>

            <Text style={styles.correctPairArrow}>
              ↔
            </Text>

            <View
              style={[
                styles.correctPairChip,
                pairColor
              ]}
            >
              <Text style={styles.correctPairText}>
                {pair.right}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function MatchPairs({
  activity,
  language,
  onCorrect,
  onWrong,
  theme,
  allowSkip,
  onOpenPreface
}) {
  const { left, right } = useMemo(
    () => makeMatchColumns(activity.pairs || []),
    [activity.pairs]
  );

  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matches, setMatches] = useState([]);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);

  const { playAudioKey, playFeedback, stopThen } = useAudio(language);

  const revealAddOns =
    shouldRevealAfterAnswer(
      state,
      attempts
    );

  function isMatchedLeft(item) {
    return matches.some(
      (m) => m.leftId === item.id
    );
  }

  function isMatchedRight(item) {
    return matches.some(
      (m) => m.rightId === item.id
    );
  }

  function valueForId(items, id) {
    return items.find((item) => item.id === id)?.value;
  }

  function rightAudioKey(item) {
    return activity.pairs?.[item.pairIndex]?.audioKey;
  }

  // Rows with the same text look identical, so a pairing is graded by
  // text: it is correct while that text pair still has unmatched copies.
  // Same-text rows share partners, so the Activity can always be finished.
  function evaluatePair(leftId, rightId) {
    if (!leftId || !rightId || state !== 'idle') {
      return;
    }

    const leftValue = valueForId(left, leftId);
    const rightValue = valueForId(right, rightId);
    const isSamePair = (l, r) => l === leftValue && r === rightValue;
    const pairCount = (activity.pairs || []).filter(
      (p) => isSamePair(p.left, p.right)
    ).length;
    const matchedCount = matches.filter((m) =>
      isSamePair(valueForId(left, m.leftId), valueForId(right, m.rightId))
    ).length;

    if (matchedCount < pairCount) {
      const nextMatches = [...matches, { leftId, rightId }];

      setMatches(nextMatches);
      setSelectedLeft(null);
      setSelectedRight(null);

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

  function selectLeft(item) {
    if (isMatchedLeft(item) || isLocked(state)) return;

    setSelectedLeft(item.id);

    if (selectedRight) {
      evaluatePair(item.id, selectedRight);
    }
  }

  function selectRight(item) {
    if (isMatchedRight(item) || isLocked(state)) return;

    setSelectedRight(item.id);

    const key = rightAudioKey(item);
    if (key) {
      playAudioKey(key);
    }

    if (selectedLeft) {
      evaluatePair(selectedLeft, item.id);
    }
  }

  function resetWrong() {
    setState('idle');
    setSelectedLeft(null);
    setSelectedRight(null);
  }

  function skipQuestion() {
    playFeedback('wrong');
    setState('skipped');
  }

  return (
    <QuestionScrollView state={state}>
      <Text style={[styles.kicker, { color: theme.text }]}>
        Match
      </Text>

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {activity.prompt}
      </Text>

      <Text style={styles.matchInstruction}>
        Tap one item in each column. Each pair checks immediately.
      </Text>

      <View style={styles.matchGrid}>
        {left.map((leftItem, rowIndex) => {
          const rightItem =
            right[rowIndex];

          const leftMatched =
            isMatchedLeft(leftItem);

          const rightMatched =
            isMatchedRight(rightItem);

          const leftActive =
            selectedLeft === leftItem.id;

          const rightActive =
            selectedRight === rightItem.id;

          return (
            <View
              style={styles.matchRow}
              key={`${leftItem.id}-${rightItem.id}`}
            >
              <TouchableOpacity
                disabled={
                  leftMatched ||
                  isLocked(state)
                }
                style={[
                  styles.matchItem,
                  leftActive && {
                    borderColor: theme.accent,
                    backgroundColor: theme.light
                  },
                  leftMatched &&
                    styles.matchedItem,
                  isLocked(state) &&
                    !leftMatched &&
                    styles.optionLocked
                ]}
                onPress={() => selectLeft(leftItem)}
                accessibilityRole="button"
                accessibilityLabel={leftItem.value}
                accessibilityState={{ selected: leftActive }}
              >
                <Text style={styles.matchText}>
                  {leftItem.value}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={
                  rightMatched ||
                  isLocked(state)
                }
                style={[
                  styles.matchItem,
                  rightActive && {
                    borderColor: theme.accent,
                    backgroundColor: theme.light
                  },
                  rightMatched &&
                    styles.matchedItem,
                  isLocked(state) &&
                    !rightMatched &&
                    styles.optionLocked
                ]}
                onPress={() => selectRight(rightItem)}
                accessibilityRole="button"
                accessibilityLabel={rightItem.value}
                accessibilityState={{ selected: rightActive }}
              >
                <Text style={styles.matchText}>
                  {rightItem.value}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {allowSkip && state === 'idle' ? (
        <SkipQuestionButton
          onSkip={skipQuestion}
          disabled={false}
        />
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
        answerDisplay={null}
        wrongTitle="Wrong pair"
        answerContent={
          <CorrectMatchPairs
            pairs={activity.pairs || []}
          />
        }
        onTryAgain={resetWrong}
        onNext={stopThen(onCorrect)}
        onIncorrect={stopThen(() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : `${valueForId(left, selectedLeft) || ''} ↔ ${valueForId(right, selectedRight) || ''}`
          )
        )}
        altContent={
          <AnswerAltButtons
            activity={activity}
            language={language}
            visible={revealAddOns}
            theme={theme}
            onPlayAudioKey={playAudioKey}
          />
        }
      />
    </QuestionScrollView>
  );
}
