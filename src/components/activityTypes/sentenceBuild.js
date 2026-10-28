import { useState } from 'react';
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
  getPromptDisplay,
  isLocked,
  shouldRevealAfterAnswer
} from './shell';
import styles from './styles';
import { isTextAnswerCorrect, shuffle } from './textAnswer';
import { useAudio } from './useAudio';

export function SentenceBuild({
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
