import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
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
import AboutTextModal from '../components/AboutTextModal';
import BugReportButton from '../components/BugReportButton';
import DebugCatalogModal from '../components/DebugCatalogModal';
import HomeAboutMenu from '../components/HomeAboutMenu';
import { ABOUT_TEXT } from '../data/aboutContent';
import { registerTBoyTap } from '../utils/debugCatalogUnlock';
import { getHomeProjection } from '../utils/homeProjection';
import {
  getDefaultLanguage,
  getLastWorkedUnit,
  setDefaultLanguage
} from '../utils/storage';

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

function TodaysPlan({ plan, firstDay, theme, reduceMotion, onAction }) {
  const activeIndex = plan.steps.findIndex((step) => !step.complete);
  const activeActionLabel = plan.activeAction?.kind === 'lesson' && !firstDay
    ? 'Continue to lesson'
    : plan.activeAction?.kind === 'lesson' && plan.activeAction.label !== 'Start your new lesson'
      ? 'Continue to lesson'
      : plan.activeAction?.label;

  return (
    <View
      testID="home-plan"
      style={[styles.planCard, { backgroundColor: theme.planBackground }]}
    >
      <View style={styles.planHeader}>
        <Text testID="home-plan-title" style={styles.planTitle}>{"Today's plan"}</Text>
        <Text testID="home-plan-status" style={[styles.planStatus, { color: theme.planSoft }]}>
          
        </Text>
      </View>

      <View style={styles.planStepper}>
        {plan.steps.map((step, index) => {
          const active = index === activeIndex;
          const circleStyle = step.complete
            ? [styles.planCircle, { backgroundColor: theme.planSoft }]
            : active
              ? [styles.planCircle, styles.planCircleActive]
              : [styles.planCircle, styles.planCirclePending];
          const labelStyle = step.complete || active
            ? styles.planStepLabelActive
            : styles.planStepLabelPending;

          return (
            <Fragment key={step.id}>
              <View testID={`home-plan-step-${step.id}`} style={styles.planStep}>
                <View
                  testID={`home-plan-circle-${step.id}`}
                  style={circleStyle}
                >
                  <Text style={step.complete || active
                    ? [styles.planCircleTextActive, { color: theme.planBackground }]
                    : styles.planCircleTextPending}
                  >
                    {step.complete ? '✓' : index + 1}
                  </Text>
                </View>
                <Text style={labelStyle}>{step.label}</Text>
              </View>
              {index < plan.steps.length - 1 ? (
                <View
                  testID={`home-plan-connector-${index}`}
                  style={[
                    styles.planConnector,
                    { backgroundColor: step.complete ? theme.planSoft : 'rgba(255,255,255,0.18)' }
                  ]}
                />
              ) : null}
            </Fragment>
          );
        })}
      </View>

      {plan.allDone ? (
        <Pressable
          testID="home-plan-completion"
          accessibilityRole="button"
          accessibilityLabel="All done with today's plan! Practice more in the Hub"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.planCta, styles.planCtaDisabled]}
        >
          <Text style={styles.planCtaText}>
            All done with today&apos;s plan! Practice more in the Hub
          </Text>
        </Pressable>
      ) : plan.activeAction ? (
        <>
          {plan.helperText ? (
            <Text testID="home-plan-helper" style={styles.planHelper}>
              {plan.helperText}
            </Text>
          ) : null}
          <Pressable
            testID="home-plan-cta"
            accessibilityRole="button"
            accessibilityLabel={activeActionLabel}
            onPress={onAction}
            style={({ pressed }) => [
              styles.planCta,
              firstDay && styles.firstDayPlanCta,
              { backgroundColor: theme.accent },
              pressed && (reduceMotion ? styles.planCtaPressedReduced : styles.planCtaPressed)
            ]}
          >
            <Text style={styles.planCtaText}>{activeActionLabel}</Text>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function CurrentUnit({ currentUnit, catalogComplete, hasLessons, firstDay, firstLesson, theme, onContinue }) {
  if (!currentUnit) {
    if (!catalogComplete) return null;

    return (
      <View testID="home-catalog-complete" style={[styles.unitCard, styles.catalogComplete]}>
        <Text style={styles.catalogCompleteTitle}>Catalog complete</Text>
        <Text style={styles.catalogCompleteText}>
          {hasLessons
            ? 'You completed every Lesson in this Language.'
            : 'No Lessons are available for this Language yet.'}
        </Text>
      </View>
    );
  }

  const { nextLesson } = currentUnit;

  return (
    <>
      <View style={styles.currentUnitEyebrow}>
        <Feather
          testID="home-current-unit-arrow"
          name="arrow-right"
          size={14}
          color="#64748B"
        />
        <Text style={styles.currentUnitEyebrowText}>
          {firstDay ? 'START HERE' : 'WHERE YOU LEFT OFF'}
        </Text>
      </View>
      <View testID="home-current-unit" style={styles.unitCard}>
        <LinearGradient
          testID="home-current-unit-header"
          colors={theme.headerGrad}
          style={styles.unitHeader}
        >
          <View style={styles.unitNumberPill}>
            <Text style={[styles.unitNumberText, { color: theme.accent }]}>
              {currentUnit.unitLabel}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.unitTitle, styles.currentUnitTitle]}>{currentUnit.title}</Text>
            <Text style={[styles.unitMeta, styles.currentUnitMeta]}>
              {currentUnit.masteredWords} / {currentUnit.totalWords} words ·{' '}
              {currentUnit.completedLessons} / {currentUnit.totalLessons} lessons
            </Text>
          </View>
        </LinearGradient>
        <View style={styles.progressBarBg}>
          <View
            testID="home-current-unit-progress"
            style={[
              styles.progressBarFill,
              {
                width: `${currentUnit.masteryPercent}%`,
                backgroundColor: theme.progressFill
              }
            ]}
          />
        </View>
        <View style={styles.lessonRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.lessonTitle, styles.currentLessonTitle]}>{nextLesson.title}</Text>
            <Text style={styles.lessonDesc}>
              {firstLesson
                ? `New lesson · ${nextLesson.wordCount} words`
                : `Next up · ${nextLesson.wordCount} words · ${nextLesson.typeLabel}`}
            </Text>
          </View>
          <Pressable
            testID="home-current-unit-continue"
            accessibilityRole="button"
            accessibilityLabel={`${firstLesson ? 'Start' : 'Continue'} ${nextLesson.title}`}
            hitSlop={6}
            onPress={onContinue}
            style={[styles.badge, styles.currentUnitContinue, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.badgeText, styles.currentUnitContinueText]}>
              {firstLesson ? 'Start' : 'Continue'}
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
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
  const [debugCatalogVisible, setDebugCatalogVisible] = useState(false);
  const [aboutMenuVisible, setAboutMenuVisible] = useState(false);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [aboutModal, setAboutModal] = useState(null);
  const initialExpansionLanguage = useRef(null);
  const tboyTapRef = useRef({ count: 0, lastTapAt: 0 });

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
    if (!aboutMenuVisible) return undefined;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setAboutMenuVisible(false);
      setAboutExpanded(false);
      return true;
    });

    return () => subscription.remove();
  }, [aboutMenuVisible]);

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

  function handleTBoyPress() {
    const result = registerTBoyTap(tboyTapRef.current);
    tboyTapRef.current = result.state;
    if (result.unlocked) {
      setDebugCatalogVisible(true);
    }
  }

  function handleDebugCatalogJump({ lessonId, startActivityIndex }) {
    setDebugCatalogVisible(false);
    navigation.navigate('Lesson', {
      language,
      lessonId,
      startActivityIndex,
      debugJump: true
    });
  }

  function selectAbout(kind) {
    setAboutMenuVisible(false);
    setAboutExpanded(false);
    setAboutModal({ type: 'text', content: ABOUT_TEXT[kind] });
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
          badgeText: '#102A43',
          planBackground: '#102A43',
          planSoft: '#7DD3FC'
        }
      : {
          topBarGrad: ['#0AA35F', '#066B3F'],
          headerGrad: ['#0AA35F', '#066B3F'],
          start: '#08834C',
          doneSoft: '#34D399',
          progressFill: '#6EE7B7',
          subtitle: '#E7F5EE',
          accent: '#08834C',
          badgeText: '#064E32',
          planBackground: '#064E32',
          planSoft: '#6EE7B7'
        };

  const units = projection?.units || [];
  const reviewQueueCount = projection?.dashboard.reviewCount || 0;
  const pendingMistakesCount = projection?.dashboard.pendingMistakeCount || 0;
  const reviewEnabled = projection?.dashboard.reviewEnabled ?? true;
  const plan = projection?.plan;
  const firstLesson = Boolean(
    projection?.firstDay && !plan?.steps.find((step) => step.id === 'lesson-1')?.complete
  );

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
            <Pressable
              testID="home-pelican"
              accessibilityRole="button"
              accessibilityLabel="About menu"
              accessibilityState={{ expanded: aboutMenuVisible }}
              hitSlop={6}
              onPress={() => setAboutMenuVisible((visible) => !visible)}
              style={styles.pelican}
            >
              <Image
                testID="home-pelican-image"
                source={require('../../assets/images/pelicanicon.png')}
                style={styles.pelicanImage}
              />
            </Pressable>
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
                  ? projection.firstDay
                    ? "Welcome! Let's learn new words."
                    : `⚡ ${projection.dashboard.xp} · 🔥 ${projection.dashboard.streak} · ${projection.dashboard.masteryPercent}% mastered`
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
            badge={reviewEnabled ? reviewQueueCount || null : null}
            badgeTestId="review-count"
            badgeTextColor={theme.badgeText}
            disabled={!reviewEnabled}
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
        {plan ? (
          <TodaysPlan
            plan={plan}
            firstDay={projection.firstDay}
            theme={theme}
            reduceMotion={reduceMotion}
            onAction={() => navigation.navigate(
              plan.activeAction.destination,
              plan.activeAction.params
            )}
          />
        ) : null}
        {projection ? (
          <CurrentUnit
            currentUnit={projection.currentUnit}
            catalogComplete={projection.catalogComplete}
            hasLessons={units.some((unit) => unit.totalLessons > 0)}
            firstDay={projection.firstDay}
            firstLesson={firstLesson}
            theme={theme}
            onContinue={() => navigation.navigate('Lesson', {
              language,
              lessonId: projection.currentUnit.nextLesson.id
            })}
          />
        ) : null}

        <Pressable
          testID="home-tboy"
          onPress={handleTBoyPress}
          accessibilityRole="button"
          accessibilityLabel="T-Boy"
          style={styles.bottomImagePressable}
        >
          <Image
            source={require('../../assets/images/mainscreen.png')}
            style={styles.bottomImage}
            resizeMode="contain"
          />
        </Pressable>

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
          source={require('../../assets/images/secondline2.png')}
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

      <HomeAboutMenu
        visible={aboutMenuVisible}
        anchorTop={insets.top + 68}
        anchorLeft={20}
        accentColor={theme.accent}
        expanded={aboutExpanded}
        onToggle={() => setAboutExpanded((expanded) => !expanded)}
        onSelect={selectAbout}
        onDismiss={() => {
          setAboutMenuVisible(false);
          setAboutExpanded(false);
        }}
      />

      {aboutModal?.type === 'text' ? (
        <AboutTextModal
          visible
          content={aboutModal.content}
          accentColor={theme.accent}
          reduceMotion={reduceMotion}
          onClose={() => setAboutModal(null)}
        />
      ) : null}

      <DebugCatalogModal
        visible={debugCatalogVisible}
        language={language}
        accentColor={theme.accent}
        onClose={() => setDebugCatalogVisible(false)}
        onJump={handleDebugCatalogJump}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB'
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 10
  },

  pelicanImage: {
    width: 42,
    height: 42,
    borderRadius: 12
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
    width: 60,
    height: 38,
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
    paddingVertical: 14,
    paddingHorizontal: 14
  },

  planCard: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 12
  },

  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 16
  },

  planTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900'
  },

  planStatus: {
    fontSize: 12,
    fontWeight: '700'
  },

  planStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },

  planStep: {
    flex: 1,
    alignItems: 'center',
    gap: 6
  },

  planCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center'
  },

  planCircleActive: {
    backgroundColor: '#FFFFFF'
  },

  planCirclePending: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)'
  },

  planCircleTextActive: {
    fontSize: 14,
    fontWeight: '900'
  },

  planCircleTextPending: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '900'
  },

  planStepLabelActive: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800'
  },

  planStepLabelPending: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11.5,
    fontWeight: '700'
  },

  planConnector: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    marginBottom: 20
  },

  planHelper: {
    color: 'rgba(220,235,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center'
  },

  planCta: {
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center'
  },

  firstDayPlanCta: {
    marginTop: 12
  },

  planCtaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },

  planCtaPressed: {
    transform: [{ scale: 0.97 }]
  },

  planCtaPressedReduced: {
    opacity: 0.7
  },

  planCtaDisabled: {
    backgroundColor: '#64748B'
  },

  currentUnitEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 2,
    marginTop: 2,
    marginBottom: 8
  },

  currentUnitEyebrowText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.48,
    marginLeft: 6
  },

  currentUnitTitle: {
    fontSize: 17
  },

  currentUnitMeta: {
    fontSize: 12.5
  },

  currentLessonTitle: {
    fontSize: 15
  },

  currentUnitContinue: {
    paddingHorizontal: 14
  },

  currentUnitContinueText: {
    fontSize: 13
  },

  catalogComplete: {
    padding: 18
  },

  catalogCompleteTitle: {
    color: '#102A43',
    fontSize: 17,
    fontWeight: '800'
  },

  catalogCompleteText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4
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

  bottomImagePressable: {
    alignSelf: 'center',
    width: '100%'
  },

  bottomImage: {
    width: '100%',
    height: 120,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: 'center'
  }
});
