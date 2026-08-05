import { useCallback } from 'react';
import SpeechPractice from './SpeechPractice';
import {
  getPendingMistakes,
  getTodayPractice,
  recordPracticeCompletion
} from '../utils/storage';

export default function DictionarySpeechPracticeScreen({ route, navigation }) {
  const { language, word } = route.params;

  const handleAccept = useCallback(async () => {
    const [pending, todayPractice] = await Promise.all([
      getPendingMistakes(language),
      getTodayPractice(language)
    ]);

    if (pending.length === 0 && todayPractice === null) {
      await recordPracticeCompletion(language, 'speech');
    }

    navigation.goBack();
  }, [language, navigation]);

  return (
    <SpeechPractice
      language={language}
      words={[word]}
      advanceOnAccept={false}
      recordPracticeOnAccept={false}
      onAccept={handleAccept}
      onBack={() => navigation.goBack()}
    />
  );
}
