import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  ContextBadge,
  FeedbackFooter,
  QuestionScrollView,
  SkipQuestionButton,
  TBoyCallout,
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { useAudio } from './useAudio';

export function SelectMultiple({
  activity,
  language,
  onCorrect,
  onWrong,
  theme,
  allowSkip,
  onOpenPreface
}) {
  const [selected, setSelected] = useState([]);
  const [state, setState] = useState('idle');
  const [attempts, setAttempts] = useState(0);

  const { playAudioKey, playFeedback, stopThen } = useAudio(language);

  const answers = Array.isArray(activity.answers)
    ? activity.answers
    : [];

  const answerDisplay =
    activity.answerDisplay || answers.join(', ');
  const revealAddOns = shouldRevealAfterAnswer(state, attempts);

  function playOption(opt) {
    const key = activity.optionAudioMap?.[opt];

    if (key) {
      playAudioKey(key);
    }
  }

  function toggleOption(opt) {
    if (isLocked(state)) return;

    setSelected((current) => {
      if (current.includes(opt)) {
        return current.filter((item) => item !== opt);
      }

      return [...current, opt];
    });

    playOption(opt);
  }

  function checkAnswer() {
    if (selected.length === 0) return;

    const selectedSet = new Set(selected);
    const answerSet = new Set(answers);

    const correct =
      selectedSet.size === answerSet.size &&
      [...answerSet].every((answer) => selectedSet.has(answer));

    if (correct) {
      playFeedback('correct');
      setState('correct');
    } else {
      playFeedback('wrong');
      setAttempts((value) => value + 1);
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
      <Text style={[styles.kicker, { color: theme.text }]}>Select all</Text>

      <ContextBadge activity={activity} language={language} />

      <Text style={styles.prompt}>{activity.prompt}</Text>

      {activity.options.map((opt) => {
        const isSelected = selected.includes(opt);

        return (
          <TouchableOpacity
            key={opt}
            disabled={isLocked(state)}
            style={[
              styles.option,
              isSelected && {
                borderColor: theme.accent,
                backgroundColor: theme.light
              },
              isLocked(state) && styles.optionLocked
            ]}
            onPress={() => toggleOption(opt)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
            accessibilityLabel={opt}
          >
            <View style={styles.promptRow}>
              <Text style={styles.optionText}>{opt}</Text>

              {isSelected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={theme.accent}
                />
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}

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
        hintText={`Select every French form that means “${activity.english || ''}”.`}
        answerDisplay={answerDisplay}
        onTryAgain={resetWrong}
        onNext={stopThen(onCorrect)}
        onIncorrect={stopThen(() =>
          onWrong(
            state === 'skipped'
              ? '__skipped__'
              : selected.join(' | ')
          )
        )}
      />
    </QuestionScrollView>
  );
}
