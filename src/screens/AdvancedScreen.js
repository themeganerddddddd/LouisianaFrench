import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import SafeScreenView from '../components/SafeScreenView';
import SpeechPracticeScreen, { SPEECH_WORD_LIMIT } from './SpeechPracticeScreen';

export default function AdvancedScreen({ route, navigation }) {
  const { language, scored } = route.params ?? {};

  return (
    <SafeScreenView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={[
                styles.homeButton,
                { backgroundColor: language === 'kreole' ? '#E7F5EE' : '#EAF3FF' }
              ]}
              onPress={() => navigation.replace('Home', { language })}
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
              testID="advanced-home-button"
            >
              <Ionicons
                name="home"
                size={21}
                color={language === 'kreole' ? '#066B3F' : '#2771CB'}
              />
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
          onComplete={() => navigation.replace('Home', { language })}
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
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    flex: 1,
    fontSize: 28,
    fontWeight: '900',
    color: '#17324D',
    textAlign: 'center'
  }
});
