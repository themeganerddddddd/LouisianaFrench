import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BugReportButton from '../components/BugReportButton';
import { getAllWords, getUnits } from '../data/lessonLoader';
import {
  getLanguageDailyReviewLog,
  getDefaultLanguage,
  getLastWorkedUnit,
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

function getLessonButtonText(done, locked = false) {
  if (done) return 'Done';
  if (locked) return 'Locked';
  return 'Start';
}

function getUnitNumber(unitCode) {
  const match = String(unitCode || '').match(/u(\d+)/i);

  if (!match) return 'Unit';

  return `Unit ${Number(match[1])}`;
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const [language, setLanguage] = useState(route.params?.language || 'cajun');
  const [units, setUnits] = useState([]);
  const [profile, setProfile] = useState({ xp: 0, streak: 0 });
  const [lessonProgress, setLessonProgress] = useState({});
  const [wordProgress, setWordProgress] = useState({});
  const [dailyDone, setDailyDone] = useState(false);
  const [timeUntilReset, setTimeUntilReset] = useState(getTimeUntilMidnight());
  const [expandedUnit, setExpandedUnit] = useState(null);

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
      const loadedUnits = getUnits(language);
      const loadedProfile = await getProfile();
      const loadedLessonProgress = await getLessonProgress();
      const loadedWordProgress = await getWordProgress();

      const lastWorkedUnit = await getLastWorkedUnit(language);

      setUnits(loadedUnits);
      setProfile(loadedProfile);
      setLessonProgress(loadedLessonProgress);
      setWordProgress(loadedWordProgress);
      setTimeUntilReset(getTimeUntilMidnight());
      setExpandedUnit(
        loadedUnits.some((unitObj) => unitObj.unit === lastWorkedUnit)
          ? lastWorkedUnit
          : null
      );
    }

    loadData();
  }, [language]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    getLanguageDailyReviewLog(language).then((reviewLog) => {
      if (!cancelled) setDailyDone(!!reviewLog[getTodayKey()]);
    });
    return () => { cancelled = true; };
  }, [language]));
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilReset(getTimeUntilMidnight());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  async function switchLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    await setDefaultLanguage(nextLanguage);
  }

  function toggleUnit(unitCode) {
    LayoutAnimation.configureNext({
      duration: 220,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleY
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.scaleY
      }
    });

    setExpandedUnit((currentUnit) => (currentUnit === unitCode ? null : unitCode));
  }

  const theme =
    language === 'cajun'
      ? {
          topBarGrad: ['#498BDC', '#2771CB'],
          headerGrad: ['#498BDC', '#2771CB'],
          start: '#2771CB',
          done: '#3B82F6',
          doneSoft: '#3B82F6',
          progressFill: '#7DD3FC',
          subtitle: '#DCEBFF',
          dailyDoneBg: '#1E3A8A',
          dailyTimer: '#DBEAFE',
          accent: '#2771CB',
          stat: '#17324D'
        }
      : {
          topBarGrad: ['#0AA35F', '#066B3F'],
          headerGrad: ['#0AA35F', '#066B3F'],
          start: '#08834C',
          done: '#10B981',
          doneSoft: '#34D399',
          progressFill: '#6EE7B7',
          subtitle: '#E7F5EE',
          dailyDoneBg: '#064E32',
          dailyTimer: '#D1FAE5',
          accent: '#08834C',
          stat: '#066B3F'
        };

  const allWords = useMemo(() => getAllWords(language), [language]);
  const totalWords = allWords.length;

  const masteredWords = allWords.filter(
    (word) => wordProgress[`${language}:${word.rowId}`]?.status === 'mastered'
  ).length;

  const overallPct = totalWords ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.topBarGrad}
        style={[styles.topBar, { paddingTop: insets.top + 16 }]}
        testID="home-top-bar"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle}>
            {language === 'cajun' ? 'Louisiana French' : 'Kouri-Vini'}
          </Text>

          <Text style={[styles.topSubtitle, { color: theme.subtitle }]}>
            {masteredWords} / {totalWords} words mastered
          </Text>
        </View>

        <View style={styles.flagRow}>
          <TouchableOpacity onPress={() => switchLanguage('cajun')} accessibilityLabel="Louisiana French flag">
            <Image
              source={require('../../assets/images/cajun_flag.png')}
              style={[
                styles.flagImage,
                language === 'cajun' && styles.flagSelected
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => switchLanguage('kreole')} accessibilityLabel="Kouri-Vini flag">
            <Image
              source={require('../../assets/images/creole_flag.png')}
              style={[
                styles.flagImage,
                language === 'kreole' && styles.flagSelected
              ]}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: theme.stat }]}>{profile.xp || 0}</Text>
            <Text style={styles.statLabel}>XP</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: theme.stat }]}>
              🔥 {profile.streak || 0}
            </Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: theme.stat }]}>{overallPct}%</Text>
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

          <Text style={styles.dailyStatus}>{dailyDone ? 'Done' : 'Start'}</Text>
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
              <TouchableOpacity
                testID={`unit-toggle-${unitObj.unit}`}
                onPress={() => toggleUnit(unitObj.unit)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${unitObj.unitTitle}`}
                accessibilityState={{ expanded: expandedUnit === unitObj.unit }}
              >
                <LinearGradient colors={theme.headerGrad} style={styles.unitHeader}>
                  <View style={styles.unitNumberPill}>
                    <Text style={[styles.unitNumberText, { color: theme.accent }]}>
                      {getUnitNumber(unitObj.unit)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitTitle}>{unitObj.unitTitle}</Text>

                    <Text style={styles.unitMeta}>
                      {masteredInUnit} / {uniqueWords.length} words mastered ·{' '}
                      {completedLessons} / {unitObj.lessons.length} lessons done
                    </Text>
                  </View>

                  <View style={styles.unitToggleIcon}>
                    <Text style={styles.unitToggleIconText}>
                      {expandedUnit === unitObj.unit ? '-' : '+'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

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

              {expandedUnit === unitObj.unit
                ? unitObj.lessons.map((lesson) => {
                    const done = !!lessonProgress[`${language}:${lesson.id}`]?.completed;
                    const buttonText = getLessonButtonText(done);

                    return (
                      <TouchableOpacity
                        key={lesson.id}
                        style={[
                          styles.lessonRow,
                          done && {
                            backgroundColor: theme.doneSoft,
                            borderTopColor: theme.doneSoft
                          }
                        ]}
                        onPress={() =>
                          navigation.navigate('Lesson', {
                            lessonId: lesson.id,
                            language
                          })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`${lesson.lessonTitle || lesson.title || 'Lesson'}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.lessonTitle,
                              done && styles.lessonTitleDone
                            ]}
                          >
                            {lesson.lessonTitle || lesson.title || 'Lesson'}
                          </Text>

                          <Text
                            style={[
                              styles.lessonDesc,
                              done && styles.lessonDescDone
                            ]}
                          >
                            {lesson.wordCount || (lesson.words || []).length || 0} words ·{' '}
                            {lesson.type === 'review' ? 'Review' : 'Core lesson'}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.badge,
                            done
                              ? styles.badgeDone
                              : { backgroundColor: theme.start }
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              done && styles.badgeTextDone
                            ]}
                          >
                            {buttonText}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                : null}
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
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },

  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 22,
    paddingHorizontal: 20
  },

  topTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800'
  },

  topSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6
  },

  flagRow: {
    flexDirection: 'row'
  },

  flagImage: {
    width: 64,
    height: 40,
    marginLeft: 12,
    opacity: 0.8,
    borderRadius: 4
  },

  flagSelected: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },

  scroll: {
    paddingVertical: 16,
    paddingHorizontal: 14
  },

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
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },

  statNum: {
    fontSize: 20,
    fontWeight: '900'
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
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
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16
  },

  unitCard: {
    backgroundColor: '#FFFFFF',
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

  unitToggleIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },

  unitToggleIconText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 22
  },

  unitNumberPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 10
  },

  unitNumberText: {
    fontSize: 12,
    fontWeight: '900'
  },

  unitTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF'
  },

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

  lessonTitleDone: {
    color: '#FFFFFF'
  },

  lessonDesc: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4
  },

  lessonDescDone: {
    color: 'rgba(255,255,255,0.88)'
  },

  badge: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12
  },

  badgeDone: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)'
  },

  badgeText: {
    color: '#FFFFFF',
    fontWeight: '800'
  },

  badgeTextDone: {
    color: '#FFFFFF'
  },

  bottomImage: {
    width: '100%',
    height: 120,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: 'center'
  }
});
