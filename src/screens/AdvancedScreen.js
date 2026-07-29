import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function AdvancedScreen({ route }) {
  const { language } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {language === 'cajun' ? 'Advanced Cajun Hub' : 'Advanced Kouri-Vini Hub'}
        </Text>
        <Text style={styles.text}>
          WIP - Future modes will go here:
        </Text>
        <Text style={styles.bullet}>• category challenge mode</Text>
        <Text style={styles.bullet}>• conversation practice</Text>
        <Text style={styles.bullet}>• speaking drills</Text>
        <Text style={styles.bullet}>• grammar notes</Text>
        <Text style={styles.bullet}>• teacher / community mode</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7FAFC', justifyContent: 'center', padding: 18 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 22 },
  title: { fontSize: 28, fontWeight: '900', color: '#17324D', marginBottom: 12 },
  text: { fontSize: 16, color: '#52667A', marginBottom: 10 },
  bullet: { fontSize: 16, color: '#334E68', marginBottom: 8, fontWeight: '700' }
});