import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
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
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { isTextAnswerCorrect, shuffle } from './textAnswer';
import { useAudio } from './useAudio';

function makeWordBank(answer) {
  return shuffle(
    String(answer || '')
      .split(/\s+/)
      .filter(Boolean)
  );
}

export function Typing({
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
