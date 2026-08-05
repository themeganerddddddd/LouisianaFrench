import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import { getAllWords } from '../data/lessonLoader';
import SpeechPractice from './SpeechPractice';

export default function AdvancedScreen({ route, navigation }) {
  const { language } = route.params;
  const wordsWithAudio = useMemo(
    () => getAllWords(language).filter((word) => word.audioKey),
    [language]
  );

  return (
    <View style={styles.container}>
      <SpeechPractice language={language} words={wordsWithAudio} onBack={() => navigation.goBack()} />
      <View style={styles.bugReport}><BugReportButton screenName="Advanced" language={language} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bugReport: { position: 'absolute', right: 12, bottom: 12 }
});
