import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import BugReportButton from '../components/BugReportButton';
import { getAllWords, getUnits } from '../data/lessonLoader';
import {
  getDailyReviewLog,
  getDefaultLanguage,
  getLessonProgress,
  getProfile,
  getTodayKey,
  getWordProgress,
  setDefaultLanguage
} from '../utils/storage';

function getTimeUntilMidnight() {
  const now = new Date();
  const nextMidnight = new Date(now);
  nextMidnight.setHours(24, 0, 0, 0);

  const diffMs = Math.max(0, nextMidnight.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return `${hh}:${mm}:${ss}`;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const [language, setLanguage] = useState(route.params?.language || 'cajun');
  const [units, setUnits] = useState([]);
  const [profile, setProfile] = useState({ xp: 0, streak: 0 });
  const [lessonProgress, setLessonProgress] = useState({});
  const [wordProgress, setWordProgress] = useState({});
  const [dailyDone, setDailyDone] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight());

  useEffect(() => {
    async function bootstrapLanguage() {
      if (route.params?.language) {
        setLanguage(route.params.language);
        return;
      }

      const savedLanguage = await getDefaultLanguage();
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    }

    bootstrapLanguage();
  }, [route.params?.language]);

  useEffect(() => {
    async function loadData() {
      setUnits(getUnits(language));
      setProfile(await getProfile());
      setLessonProgress(await getLessonProgress());
      setWordProgress(await getWordProgress());

      const reviewLog = await getDailyReviewLog();
      setDailyDone(!!reviewLog[getTodayKey()]);
      setTimeUntilReset(getTimeUntilMidnight());
    }

    loadData();
  }, [language]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  async function switchLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    await setDefaultLanguage(nextLanguage);
  }

  const theme =
    language === 'cajun'
      ? {
          topBarGrad: ['#498BDC', '#2771CB'],
          headerGrad: ['#498BDC', '#2771CB'],
          start: '#2771CB',
          done: '#1D4ED8',
          progressFill: '#7DD3FC',
          subtitle: '#DCEBFF',
          dailyDoneBg: '#1E3A8A',
          dailyTimer: '#DBEAFE'
        }
      : {
          topBarGrad: ['#7C3AED', '#5B21B6'],
          headerGrad: ['#7C3AED', '#5B21B6'],
          start: '#6D28D9',
          done: '#7C3AED',
          progressFill: '#C084FC',
          subtitle: '#EDE9FE',
          dailyDoneBg: '#4C1D95',
          dailyTimer: '#E9D5FF'
        };

  const allWords = useMemo(() => getAllWords(language), [language]);
  const totalWords = allWords.length;

  const masteredWords = allWords.filter(
    (word) => wordProgress[`${language}:${word.rowId}`]?.status === 'mastered'
  ).length;

  const overallPct = totalWords ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.topBarGrad} style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>
            {language === 'cajun' ? 'Cajun French' : 'Kouri-Vini'}
          </Text>
          <Text style={[styles.topSubtitle, { color: theme.subtitle }]}>
            {masteredWords} / {totalWords} words mastered
          </Text>
        </View>

        <View style={styles.flagRow}>
          <TouchableOpacity onPress={() => switchLanguage('cajun')}>
            <Image
              source={require('../../assets/images/cajun_flag.png')}
              style={[styles.flagImage, language === 'cajun' && styles.flagSelected]}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => switchLanguage('kreole')}>
            <Image
              source={require('../../assets/images/creole_flag.png')}
              style={[styles.flagImage, language === 'kreole' && styles.flagSelected]}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{profile.xp || 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>🔥 {profile.streak || 0}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{overallPct}%</Text>
            <Text style={styles.statLabel}>Mastered</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.dailyCard,
            dailyDone && { backgroundColor: theme.dailyDoneBg }
          ]}
          onPress={() => navigation.navigate('DailyReview', { language })}
          accessibilityRole="button"
          accessibilityLabel="Daily Review"
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>Daily Review</Text>
            <Text style={styles.dailyDesc}>
              {dailyDone
                ? 'Complete! Your daily review will renew at midnight.'
                : 'Review due words, weak cards, and mistakes.'}
            </Text>

            {dailyDone ? (
              <Text style={[styles.dailyTimer, { color: theme.dailyTimer }]}>
                Renews in {timeUntilReset}
              </Text>
            ) : null}
          </View>

          <Text style={styles.dailyStatus}>{dailyDone ? 'Complete!' : 'Start'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dictionaryBtn}
          onPress={() => navigation.navigate('Dictionary', { language })}
          accessibilityRole="button"
          accessibilityLabel="Open Dictionary"
        >
          <Text style={styles.dictionaryBtnText}>Open Dictionary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.advancedBtn}
          onPress={() => navigation.navigate('Advanced', { language })}
          accessibilityRole="button"
          accessibilityLabel="Advanced Review Hub"
        >
          <Text style={styles.advancedBtnText}>Advanced / Review Hub</Text>
        </TouchableOpacity>

        {units.map((unitObj) => {
          const uniqueWords = [];

          unitObj.lessons.forEach((lesson) => {
            (lesson.words || []).forEach((word) => {
              if (!uniqueWords.find((w) => w.rowId === word.rowId)) {
                uniqueWords.push(word);
              }
            });
          });

          const masteredInUnit = uniqueWords.filter(
            (word) => wordProgress[`${language}:${word.rowId}`]?.status === 'mastered'
          ).length;

          const completedLessons = unitObj.lessons.filter(
            (lesson) => lessonProgress[`${language}:${lesson.id}`]?.completed
          ).length;

          const pct = uniqueWords.length
            ? Math.round((masteredInUnit / uniqueWords.length) * 100)
            : 0;

          return (
            <View key={unitObj.unit} style={styles.unitCard}>
              <LinearGradient colors={theme.headerGrad} style={styles.unitHeader}>
                <Ionicons name="book" size={22} color="#fff" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitTitle}>{unitObj.unitTitle}</Text>
                  <Text style={styles.unitMeta}>
                    {masteredInUnit} / {uniqueWords.length} words mastered ·{' '}
                    {completedLessons} / {unitObj.lessons.length} lessons done
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: theme.progressFill
                    }
                  ]}
                />
              </View>

              {unitObj.lessons.map((lesson) => {
                const done = !!lessonProgress[`${language}:${lesson.id}`]?.completed;

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonRow}
                    onPress={() => navigation.navigate('Lesson', { lessonId: lesson.id, language })}
                    accessibilityRole="button"
                    accessibilityLabel={`${lesson.lessonTitle || lesson.title || 'Lesson'}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>
                        {lesson.lessonTitle || lesson.title || 'Lesson'}
                      </Text>
                      <Text style={styles.lessonDesc}>
                        {lesson.wordCount || (lesson.words || []).length || 0} words ·{' '}
                        {lesson.type === 'review' ? 'Review' : 'Core lesson'}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        done
                          ? { backgroundColor: theme.done }
                          : { backgroundColor: theme.start }
                      ]}
                    >
                      <Text style={styles.badgeText}>{done ? 'Done' : 'Start'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}

        <Image
          source={require('../../assets/images/secondline.png')}
          style={styles.bottomImage}
          resizeMode="contain"
        />

        <BugReportButton
          screenName="Home"
          language={language}
          accentColor={theme.start}
          appearance="text"
        />

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 22,
    paddingHorizontal: 20
  },
  topTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  topSubtitle: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  flagRow: { flexDirection: 'row' },
  flagImage: {
    width: 64,
    height: 40,
    marginLeft: 12,
    opacity: 0.8,
    borderRadius: 4
  },
  flagSelected: { opacity: 1, borderWidth: 2, borderColor: '#fff' },
  scroll: { paddingVertical: 16, paddingHorizontal: 14 },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center'
  },
  statNum: {
    fontSize: 20,
    fontWeight: '900',
    color: '#17324D'
  },
  statLabel: {
    marginTop: 4,
    color: '#64748B',
    fontWeight: '700'
  },
  dailyCard: {
    backgroundColor: '#102A43',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  dailyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900'
  },
  dailyDesc: {
    color: '#DCEBFF',
    marginTop: 4,
    fontWeight: '600'
  },
  dailyTimer: {
    marginTop: 8,
    fontWeight: '800',
    fontSize: 13
  },
  dailyStatus: {
    color: '#fff',
    fontWeight: '900',
    marginLeft: 12
  },
  dictionaryBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 10
  },
  dictionaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16
  },
  advancedBtn: {
    backgroundColor: '#334155',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14
  },
  advancedBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16
  },
  pelicanImage: {
    width: '100%',
    height: 180,
    marginBottom: 16,
    borderRadius: 18,
    alignSelf: 'center'
  },
  unitCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16
  },
  unitTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  unitMeta: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.88)',
    marginTop: 5,
    fontWeight: '600'
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#E2E8F0'
  },
  progressBarFill: {
    height: 10
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#102A43'
  },
  lessonDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },
  badge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  badgeText: { color: '#fff', fontWeight: '800' },
  bottomImage: {
    width: '100%',
    height: 120,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: 'center'
  }
});
