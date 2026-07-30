import { ScrollView, StyleSheet, Text, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import SafeScreenView from '../components/SafeScreenView';
import SpeechPracticePrototype from './prototypes/SpeechPracticePrototype';

export default function AdvancedScreen({ route }) {
  const { language } = route.params;

  return (
    <SafeScreenView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'cajun' ? 'Advanced Cajun Hub' : 'Advanced Kouri-Vini Hub'}
          </Text>
          <Text style={styles.text}>Experimental speaking drills</Text>
        </View>
        <SpeechPracticePrototype language={language} />
      </ScrollView>
      <BugReportButton screenName="Advanced" language={language} />
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', padding: 18 },
  content: { paddingBottom: 100 },
  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '900', color: '#17324D', marginBottom: 6 },
  text: { fontSize: 16, color: '#52667A' }
});
