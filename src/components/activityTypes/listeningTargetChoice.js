import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  AnswerAltButtons,
  ContextBadge,
  FeedbackFooter,
  QuestionScrollView,
  SkipQuestionButton,
  TBoyCallout,
  getHintText,
  getPrimaryTarget,
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { useAudio } from './useAudio';

export function ListeningTargetChoice({
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
