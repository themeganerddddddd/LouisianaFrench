import { useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  AnswerAltButtons,
  ContextBadge,
  FeedbackFooter,
  QuestionScrollView,
  SkipQuestionButton,
  TBoyCallout,
  getHintText,
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { shuffle } from './typeHelpers';
import { useAudio } from './useAudio';

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

export function MatchPairs({
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
