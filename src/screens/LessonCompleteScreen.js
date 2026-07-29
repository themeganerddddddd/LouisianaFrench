import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BugReportButton from '../components/BugReportButton';
import SafeScreenView from '../components/SafeScreenView';

export default function LessonCompleteScreen({ route, navigation }) {
  const { lessonTitle, xpEarned, mistakesCount, streak, language } = route.params;

  return (
    <SafeScreenView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Image
            source={require('../../assets/images/cooloutline.png')}
            style={styles.topImage}
            resizeMode="contain"
          />

          <Text style={styles.title}>Session Complete 🎉</Text>
          <Text style={styles.lesson}>{lessonTitle}</Text>

          <View style={styles.row}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>⚡ {xpEarned}</Text>
              <Text style={styles.statLabel}>XP earned</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNum}>📝 {mistakesCount}</Text>
              <Text style={styles.statLabel}>Mistakes reviewed</Text>
            </View>
          </View>

          {streak ? <Text style={styles.streak}>🔥 Streak: {streak}</Text> : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.replace('Home', language ? { language } : undefined)}
          >
            <Text style={styles.primaryText}>Back to Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('Leaderboard')}
          >
            <Text style={styles.secondaryText}>Open Leaderboard (WIP)</Text>
          </TouchableOpacity>
        </View>
      </View>
      <BugReportButton screenName="LessonComplete" language={language} />
    </SafeScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    padding: 20
  },
  content: {
    flex: 1,
    justifyContent: 'center'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center'
  },
  topImage: {
    width: 180,
    height: 110,
    marginBottom: 12
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#17324D',
    textAlign: 'center'
  },
  lesson: {
    marginTop: 8,
    fontSize: 18,
    color: '#486581',
    fontWeight: '700',
    textAlign: 'center'
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22
  },
  stat: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 18,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#102A43'
  },
  statLabel: {
    marginTop: 6,
    color: '#52667A',
    fontWeight: '700',
    textAlign: 'center'
  },
  streak: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: '900',
    color: '#EA580C'
  },
  primaryBtn: {
    marginTop: 22,
    backgroundColor: '#2771CB',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center'
  },
  primaryText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16
  },
  secondaryBtn: {
    marginTop: 12,
    backgroundColor: '#EAF3FF',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 22,
    width: '100%',
    alignItems: 'center'
  },
  secondaryText: {
    color: '#2771CB',
    fontWeight: '900',
    fontSize: 16,
    textAlign: 'center'
  }
});
