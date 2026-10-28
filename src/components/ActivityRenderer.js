import { useRef } from 'react';
import { Text, View } from 'react-native';
import { IntroCard } from './activityTypes/introCard';
import { ListeningTargetChoice } from './activityTypes/listeningTargetChoice';
import { MatchPairs } from './activityTypes/matchPairs';
import { MultipleChoice } from './activityTypes/multipleChoice';
import { SelectMultiple } from './activityTypes/selectMultiple';
import { SentenceBuild } from './activityTypes/sentenceBuild';
import { getTheme } from './activityTypes/shell';
import styles from './activityTypes/styles';
import { Typing } from './activityTypes/typing';

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
