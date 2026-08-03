import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BugReportButton from '../components/BugReportButton';
import {
  getDefaultLanguage,
  getLastWorkedUnit,
  setDefaultLanguage
} from '../utils/storage';
import { getHomeProjection } from '../utils/homeProjection';

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

function DashboardControl({
  controlId,
  iconId,
  icon,
  label,
  accessibilityLabel,
  badge,
  badgeBackgroundColor = '#FFCD00',
  badgeTestId,
  badgeTextColor,
  disabled = false,
  reduceMotion,
  onPress
}) {
  return (
    <Pressable
      testID={controlId}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dashboardControl,
        disabled && styles.controlDisabled,
        pressed && (reduceMotion ? styles.controlPressedReduced : styles.controlPressed)
      ]}
    >
      <View testID={`${controlId.replace('-control', '')}-circle`} style={styles.dashboardCircle}>
        <Feather testID={iconId} name={icon} size={21} color="#FFFFFF" />
        {badge ? (
          <View
            testID={badgeTestId}
            style={[styles.reviewBadge, { backgroundColor: badgeBackgroundColor }]}
          >
            <Text style={[styles.reviewBadgeText, { color: badgeTextColor }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.dashboardLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();

  const [language, setLanguage] = useState(route.params?.language || 'cajun');
  const [projection, setProjection] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [expandedUnit, setExpandedUnit] = useState(null);
  const initialExpansionLanguage = useRef(null);

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

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    async function loadHome() {
      const needsInitialExpansion = initialExpansionLanguage.current !== language;
      const [loadedProjection, lastWorkedUnit] = await Promise.all([
        getHomeProjection(language),
        needsInitialExpansion ? getLastWorkedUnit(language) : Promise.resolve(null)
      ]);

      if (cancelled) return;

      setProjection(loadedProjection);
      if (needsInitialExpansion) {
        initialExpansionLanguage.current = language;
        setExpandedUnit(
          loadedProjection.units.some((unit) => unit.unitCode === lastWorkedUnit)
            ? lastWorkedUnit
            : null
        );
      }
    }

    loadHome();
    return () => { cancelled = true; };
  }, [language]));

  useEffect(() => {
    const preference = AccessibilityInfo.isReduceMotionEnabled?.();
    preference?.then(setReduceMotion);
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
          doneSoft: '#3B82F6',
          progressFill: '#7DD3FC',
          subtitle: '#DCEBFF',
          accent: '#2771CB',
          badgeText: '#102A43'
        }
      : {
          topBarGrad: ['#0AA35F', '#066B3F'],
          headerGrad: ['#0AA35F', '#066B3F'],
          start: '#08834C',
          doneSoft: '#34D399',
          progressFill: '#6EE7B7',
          subtitle: '#E7F5EE',
          accent: '#08834C',
          badgeText: '#064E32'
        };

  const units = projection?.units || [];
  const reviewQueueCount = projection?.dashboard.reviewCount || 0;
  const pendingMistakesCount = projection?.dashboard.pendingMistakeCount || 0;

  return (
    <View style={styles.container}>
      <StatusBar style={isFocused ? 'light' : 'dark'} testID="home-status-bar" />
      <LinearGradient
        colors={theme.topBarGrad}
        style={[styles.topBar, { paddingTop: insets.top + 16 }]}
        testID="home-top-bar"
      >
        <View style={styles.identityRow}>
          <View style={styles.identityDetails}>
            <Image
              testID="home-pelican"
              source={require('../../assets/images/pelicanicon.png')}
              style={styles.pelican}
            />
            <View style={styles.identityText}>
              <Text style={styles.topTitle}>
                {language === 'cajun' ? 'Louisiana French' : 'Kouri-Vini'}
              </Text>
              <Text
                testID="home-stats"
                numberOfLines={1}
                style={[styles.topSubtitle, { color: theme.subtitle }]}
              >
                {projection
                  ? `⚡ ${projection.dashboard.xp} · 🔥 ${projection.dashboard.streak} · ${projection.dashboard.masteryPercent}% mastered`
                  : null}
              </Text>
            </View>
          </View>

          <Pressable
            testID="home-language-flag"
            onPress={() => switchLanguage(language === 'cajun' ? 'kreole' : 'cajun')}
            accessibilityRole="button"
            accessibilityLabel={`${language === 'cajun' ? 'Louisiana French' : 'Kouri-Vini'} flag`}
            style={styles.flagControl}
          >
            <Image
              testID="home-language-flag-image"
              source={
                language === 'cajun'
                  ? require('../../assets/images/cajun_flag.png')
                  : require('../../assets/images/creole_flag.png')
              }
              style={styles.flagImage}
            />
          </Pressable>
        </View>

        <View style={styles.dashboard}>
          <DashboardControl
            controlId="home-review-control"
            iconId="home-review-icon"
            icon="refresh-cw"
            label="Review"
            accessibilityLabel={reviewQueueCount ? `Review, ${reviewQueueCount} due` : 'Review'}
            badge={reviewQueueCount || null}
            badgeTestId="review-count"
            badgeTextColor={theme.badgeText}
            reduceMotion={reduceMotion}
            onPress={() => navigation.navigate('DailyReview', { language })}
          />
          <DashboardControl
            controlId="home-dictionary-control"
            iconId="home-dictionary-icon"
            icon="book-open"
            label="Dictionary"
            accessibilityLabel="Dictionary"
            reduceMotion={reduceMotion}
            onPress={() => navigation.navigate('Dictionary', { language })}
          />
          <DashboardControl
            controlId="home-hub-control"
            iconId="home-hub-icon"
            icon="layers"
            label="Hub"
            accessibilityLabel="Hub"
            reduceMotion={reduceMotion}
            onPress={() => navigation.navigate('Advanced', { language })}
          />
          <DashboardControl
            controlId="home-mistakes-control"
            iconId="home-mistakes-icon"
            icon="alert-triangle"
            label="Mistakes"
            accessibilityLabel={
              pendingMistakesCount
                ? `Mistakes, ${pendingMistakesCount} pending`
                : 'Mistakes, none pending'
            }
            badge={pendingMistakesCount || null}
            badgeBackgroundColor="#DC2626"
            badgeTestId="mistakes-count"
            badgeTextColor="#FFFFFF"
            disabled={!pendingMistakesCount}
            reduceMotion={reduceMotion}
            onPress={() =>
              navigation.navigate('MistakeReview', { language, source: 'home' })
            }
          />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {units.map((unitObj) => {
          return (
            <View key={unitObj.unitCode} style={styles.unitCard}>
              <TouchableOpacity
                testID={`unit-toggle-${unitObj.unitCode}`}
                onPress={() => toggleUnit(unitObj.unitCode)}
                accessibilityRole="button"
                accessibilityLabel={`Toggle ${unitObj.title}`}
                accessibilityState={{ expanded: expandedUnit === unitObj.unitCode }}
              >
                <LinearGradient colors={theme.headerGrad} style={styles.unitHeader}>
                  <View style={styles.unitNumberPill}>
                    <Text style={[styles.unitNumberText, { color: theme.accent }]}>
                      {getUnitNumber(unitObj.unitCode)}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.unitTitle}>{unitObj.title}</Text>

                    <Text style={styles.unitMeta}>
                      {unitObj.masteredWords} / {unitObj.totalWords} words mastered ·{' '}
                      {unitObj.completedLessons} / {unitObj.totalLessons} lessons done
                    </Text>
                  </View>

                  <View style={styles.unitToggleIcon}>
                    <Text style={styles.unitToggleIconText}>
                      {expandedUnit === unitObj.unitCode ? '-' : '+'}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${unitObj.masteryPercent}%`,
                      backgroundColor: theme.progressFill
                    }
                  ]}
                />
              </View>

              {expandedUnit === unitObj.unitCode
                ? unitObj.lessons.map((lesson) => {
                    const done = lesson.complete;
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
                        accessibilityLabel={lesson.title}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.lessonTitle,
                              done && styles.lessonTitleDone
                            ]}
                          >
                            {lesson.title}
                          </Text>

                          <Text
                            style={[
                              styles.lessonDesc,
                              done && styles.lessonDescDone
                            ]}
                          >
                            {lesson.wordCount} words · {lesson.typeLabel}
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
    paddingBottom: 20,
    paddingHorizontal: 20
  },

  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },

  identityDetails: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8
  },

  identityText: {
    flex: 1,
    minWidth: 0
  },

  pelican: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginRight: 10
  },

  topTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800'
  },

  topSubtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 3
  },

  flagControl: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center'
  },

  flagImage: {
    width: 44,
    height: 28,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF'
  },

  dashboard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16
  },

  dashboardControl: {
    flex: 1,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    position: 'relative'
  },

  dashboardCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },

  dashboardLabel: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6
  },

  controlDisabled: {
    opacity: 0.55
  },

  controlPressed: {
    transform: [{ scale: 0.94 }]
  },

  controlPressedReduced: {
    opacity: 0.7
  },

  reviewBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },

  reviewBadgeText: {
    fontSize: 10,
    fontWeight: '900'
  },

  scroll: {
    paddingVertical: 16,
    paddingHorizontal: 14
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
