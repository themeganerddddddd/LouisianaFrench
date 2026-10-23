import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import SafeScreenView from '../components/SafeScreenView';
import SpeechPracticeScreen, { SPEECH_WORD_LIMIT } from './SpeechPracticeScreen';

export default function AdvancedScreen({ route, navigation }) {
  const { language, scored, word } = route.params ?? {};
  const leave = () => (word ? navigation.goBack() : navigation.replace('Home', { language }));
  const leaveLabel = word ? 'Back' : 'Home';
  const accent = language === 'kreole' ? '#066B3F' : '#2771CB';
  const buttonFill = language === 'kreole' ? '#E7F5EE' : '#EAF3FF';

  return (
    <SafeScreenView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[styles.homeButton, { backgroundColor: buttonFill }]}
              onPress={leave}
              accessibilityRole="button"
              accessibilityLabel={word ? 'Back' : 'Back to Home'}
              testID="advanced-home-button"
            >
              <Ionicons
                name={word ? 'arrow-back' : 'home'}
                size={20}
                color={accent}
              />
              <Text style={[styles.homeButtonLabel, { color: accent }]}>{leaveLabel}</Text>
            </TouchableOpacity>
            <Text style={styles.title}>
              {language === 'cajun' ? 'Advanced French Hub' : 'Advanced Kouri-Vini Hub'}
            </Text>
          </View>
        </View>
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
  content: { paddingBottom: 100 },
  header: { marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  homeButton: {
    minWidth: 44,
    minHeight: 44,
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
    fontSize: 28,
    fontWeight: '900',
    color: '#17324D',
    textAlign: 'center'
  }
});
