import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import {
  AnswerAltButtons,
  ContextBadge,
  FeedbackFooter,
  QuestionScrollView,
  SkipQuestionButton,
  TBoyCallout,
  getHintText,
  getPrimaryTarget,
  getPromptDisplay,
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { useAudio } from './useAudio';

export function MultipleChoice({
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
  const promptText = getPromptDisplay(activity);
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

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {promptText}
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
