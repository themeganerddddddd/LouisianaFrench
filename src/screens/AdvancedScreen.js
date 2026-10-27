import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import SafeScreenView from '../components/SafeScreenView';
import SpeechPracticeScreen, { SPEECH_WORD_LIMIT } from './SpeechPracticeScreen';

export default function AdvancedScreen({ route, navigation }) {
  const { language, scored, word } = route.params ?? {};
  const goHome = () => navigation.replace('Home', { language });
  const leave = () => (word ? navigation.goBack() : goHome());
  const accent = language === 'kreole' ? '#066B3F' : '#2771CB';
  const buttonFill = language === 'kreole' ? '#E7F5EE' : '#EAF3FF';

  return (
    <SafeScreenView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.homeButton, { backgroundColor: buttonFill }]}
            onPress={goHome}
            accessibilityRole="button"
            accessibilityLabel="Back to Home"
            testID="advanced-home-button"
          >
            <Ionicons name="home" size={20} color={accent} />
            <Text style={[styles.homeButtonLabel, { color: accent }]}>Home</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {language === 'cajun' ? 'Advanced French Hub' : 'Advanced Kouri-Vini Hub'}
          </Text>
          {word ? (
            <TouchableOpacity
              style={[styles.homeButton, { backgroundColor: buttonFill }]}
              onPress={leave}
              accessibilityRole="button"
              accessibilityLabel="Back to Dictionary"
              testID="advanced-back-button"
            >
              <Ionicons name="arrow-back" size={20} color={accent} />
              <Text style={[styles.homeButtonLabel, { color: accent }]}>Back</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <ScrollView testID="advanced-practice-scroll" style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SpeechPracticeScreen
          language={language}
          scored={scored}
          wordLimit={SPEECH_WORD_LIMIT}
          word={word}
          onComplete={leave}
        />
      </ScrollView>
      <BugReportButton screenName="Advanced" language={language} />
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', padding: 18 },
  scroll: { flex: 1 },
  content: { paddingBottom: 100 },
  header: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  homeButton: {
    minWidth: 44,
    minHeight: 44,
    flexShrink: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2
  },
  homeButtonLabel: {
    fontSize: 12,
    fontWeight: '800'
  },
  title: {
    flex: 1,
    minWidth: 0,
    fontSize: 23,
    lineHeight: 28,
    flexWrap: 'wrap',
    fontWeight: '900',
    color: '#17324D',
    textAlign: 'center'
  }
});
