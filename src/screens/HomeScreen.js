import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Image,
  LayoutAnimation,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AboutTextModal from '../components/AboutTextModal';
import AccountIntroModal from '../components/AccountIntroModal';
import SignInModal from '../components/SignInModal';
import { createSupabaseIdentityConnector } from '../identity/connector';
import BugReportButton from '../components/BugReportButton';
import DebugCatalogModal from '../components/DebugCatalogModal';
import HomeAboutMenu from '../components/HomeAboutMenu';
import { ABOUT_TEXT } from '../data/aboutContent';
import {
  CurrentUnit,
  DashboardControl,
  TodaysPlan,
  UnitCatalogList
} from '../home';
import { registerTBoyTap } from '../utils/debugCatalogUnlock';
import { getHomeProjection } from '../utils/homeProjection';
import {
  getDefaultLanguage,
  getLastWorkedUnit,
  hasSeenAccountIntro,
  markAccountIntroSeen,
  setDefaultLanguage
} from '../utils/storage';

// About menu uses a fade Modal. Opening the bug-report sheet in the same turn can
// leave Android's mail app with a bare address and no subject or Device block.
const ABOUT_MENU_EXIT_MS = 200;

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
  const [bugReportVisible, setBugReportVisible] = useState(false);
  const bugReportOpenTimerRef = useRef(null);
  const [identity, setIdentity] = useState(null);
  const [signInVisible, setSignInVisible] = useState(false);
  const [accountIntroVisible, setAccountIntroVisible] = useState(false);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const connectorRef = useRef(null);
  if (!connectorRef.current) {
    connectorRef.current = createSupabaseIdentityConnector();
  }
  const initialExpansionLanguage = useRef(null);
  const tboyTapRef = useRef({ count: 0, lastTapAt: 0 });

  useEffect(() => {
    let live = true;
    hasSeenAccountIntro().then((seen) => {
      if (live && !seen) setAccountIntroVisible(true);
    });
    return () => {
      live = false;
    };
  }, []);

  async function dismissAccountIntro() {
    await markAccountIntroSeen();
    setAccountIntroVisible(false);
  }

  useEffect(() => {
    let live = true;
    const connector = connectorRef.current;
    connector.getIdentity().then((next) => {
      if (live) setIdentity(next);
    });
    const unsubscribe = connector.subscribe((next) => {
      if (live) setIdentity(next);
    });

    async function openRecovery(url) {
      const result = await connector.handleAuthUrl(url);
      if (!live || result.kind !== 'recovery') return;
      setRecoveryActive(true);
      setSignInVisible(true);
    }

    Linking.getInitialURL().then((url) => {
      if (url) openRecovery(url);
    });
    const linking = Linking.addEventListener('url', ({ url }) => {
      openRecovery(url);
    });

    return () => {
      live = false;
      unsubscribe();
      linking.remove();
    };
  }, []);

  useEffect(
    () => () => {
      clearTimeout(bugReportOpenTimerRef.current);
    },
    []
  );

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

  const identityId = identity?.id ?? null;
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    async function loadHome() {
      const expansionKey = `${language}:${identityId || 'guest'}`;
      const needsInitialExpansion = initialExpansionLanguage.current !== expansionKey;
      const [loadedProjection, lastWorkedUnit] = await Promise.all([
        getHomeProjection(language),
        needsInitialExpansion ? getLastWorkedUnit(language) : Promise.resolve(null)
      ]);

      if (cancelled) return;

      setProjection(loadedProjection);
      if (needsInitialExpansion) {
        initialExpansionLanguage.current = expansionKey;
        setExpandedUnit(
          loadedProjection.units.some((unit) => unit.unitCode === lastWorkedUnit)
            ? lastWorkedUnit
            : null
        );
      }
    }

    loadHome();
    return () => { cancelled = true; };
  }, [language, identityId]));

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
    if (kind === 'support') {
      clearTimeout(bugReportOpenTimerRef.current);
      bugReportOpenTimerRef.current = setTimeout(
        () => setBugReportVisible(true),
        ABOUT_MENU_EXIT_MS
      );
      return;
    }
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

  const loadedProjection = projection?.language === language ? projection : null;
  const units = loadedProjection?.units || [];
  const reviewQueueCount = loadedProjection?.dashboard.reviewCount || 0;
  const pendingMistakesCount = loadedProjection?.dashboard.pendingMistakeCount || 0;
  const reviewEnabled = loadedProjection?.dashboard.reviewEnabled ?? true;
  const plan = loadedProjection?.plan;
  const firstLesson = Boolean(
    loadedProjection?.firstDay && !plan?.steps.find((step) => step.id === 'lesson-1')?.complete
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
                pointerEvents="none"
                source={
                  language === 'kreole'
                    ? require('../../assets/images/kreolelogo.png')
                    : require('../../assets/images/pelicanicon.png')
                }
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
                {loadedProjection
                  ? loadedProjection.firstDay
                    ? "Welcome! Let's learn new words."
                    : `⚡ ${loadedProjection.dashboard.xp} · 🔥 ${loadedProjection.dashboard.streak} · ${loadedProjection.dashboard.masteryPercent}% mastered`
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

      <ScrollView
        testID="home-scroll"
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 14 }]}
      >
        {plan ? (
          <TodaysPlan
            plan={plan}
            firstDay={loadedProjection.firstDay}
            theme={theme}
            reduceMotion={reduceMotion}
            onAction={() => navigation.navigate(
              plan.activeAction.destination,
              plan.activeAction.params
            )}
          />
        ) : null}
        {loadedProjection ? (
          <CurrentUnit
            currentUnit={loadedProjection.currentUnit}
            catalogComplete={loadedProjection.catalogComplete}
            hasLessons={units.some((unit) => unit.totalLessons > 0)}
            firstDay={loadedProjection.firstDay}
            firstLesson={firstLesson}
            theme={theme}
            onContinue={() => navigation.navigate('Lesson', {
              language,
              lessonId: loadedProjection.currentUnit.nextLesson.id
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

        <UnitCatalogList
          units={units}
          expandedUnit={expandedUnit}
          theme={theme}
          onToggleUnit={toggleUnit}
          onOpenLesson={(lessonId) =>
            navigation.navigate('Lesson', {
              lessonId,
              language
            })
          }
        />

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
          flowVisible={bugReportVisible}
          onFlowOpen={() => setBugReportVisible(true)}
          onFlowClose={() => setBugReportVisible(false)}
        />

        <View style={{ height: 30 }} />
      </ScrollView>

      <HomeAboutMenu
        visible={aboutMenuVisible}
        anchorTop={insets.top + 68}
        anchorLeft={20}
        accentColor={theme.accent}
        accountDetail={identity?.displayName || ''}
        expanded={aboutExpanded}
        onAccount={() => {
          setAboutMenuVisible(false);
          setAboutExpanded(false);
          setSignInVisible(true);
        }}
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

      <AccountIntroModal
        visible={accountIntroVisible}
        accentColor={theme.accent}
        subtitleColor={theme.subtitle}
        onDismiss={dismissAccountIntro}
      />

      <SignInModal
        visible={signInVisible}
        identity={identity}
        connector={connectorRef.current}
        accentColor={theme.accent}
        subtitleColor={theme.subtitle}
        recoveryActive={recoveryActive}
        onRecoveryFinished={() => setRecoveryActive(false)}
        onClose={() => {
          setSignInVisible(false);
          setRecoveryActive(false);
        }}
      />

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
    borderWidth: 1,
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
    borderWidth: 1,
    borderColor: '#FFFFFF'
  },

  dashboard: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16
  },

  scroll: {
    paddingVertical: 14,
    paddingHorizontal: 14
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
