import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler, LayoutAnimation } from 'react-native';

import {
  activityByCardId,
  lessonById
} from '../../test/fixtures/catalog/activities';
import { buildCardReviewState } from '../../test/fixtures/learnerProgress/cardBuilder';
import { clock } from '../../test/fixtures/clock';
import {
  completedLessons,
  dailyReviewLogs,
  lastWorkedUnits,
  pendingMistakes,
  profiles,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import {
  getDefaultLanguage,
  getDailyReviewLog,
  getPendingMistakes,
  getProfile,
  getLanguageDailyReviewLog,
  getLastWorkedUnit,
  getTodayPractice,
  getTodayKey,
  hasSelectedLanguage,
  markLanguageSelected,
  setDefaultLanguage
} from '../../utils/storage';

jest.mock('../../data/lessonLoader', () =>
  require('../../test/fixtures/catalog/activities').fixtureCatalog
);

setupAppTests();

const FULL_SCREEN_PHONE_METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 38, right: 0, bottom: 24, left: 0 }
};

describe('LoadingScreen', () => {
  it('routes first launch to Language selection', async () => {
    renderApp({ initialRouteName: 'Loading' });

    expect(screen.getByText('Learn')).toBeOnTheScreen();
    expect(screen.getByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report a bug')).toBeNull();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(await screen.findByText('Choose your language')).toBeOnTheScreen();
  });

  it('routes a returning learner to Home with the saved Language', async () => {
    await setDefaultLanguage('kreole');
    await markLanguageSelected();

    renderApp({ initialRouteName: 'Loading' });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
  });
});

describe('LanguageSelectScreen', () => {
  it('persists Louisiana French and opens Home', async () => {
    const user = setupUser();
    renderApp({ initialRouteName: 'LanguageSelect' });

    expect(screen.getByText('Choose your language')).toBeOnTheScreen();
    expect(screen.getByText('French')).toBeOnTheScreen();
    expect(screen.getByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();

    await user.press(screen.getByText('French'));

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(await getDefaultLanguage()).toBe('cajun');
    expect(await hasSelectedLanguage()).toBe(true);
  });
});

describe('HomeScreen', () => {
  it('positions the top bar below the device safe area', async () => {
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' },
      safeAreaMetrics: FULL_SCREEN_PHONE_METRICS
    });

    await screen.findByText('Louisiana French');

    expect(screen.getByTestId('home-top-bar')).toHaveStyle({
      paddingTop: FULL_SCREEN_PHONE_METRICS.insets.top + 16
    });
  });

  it('shows Learner Progress, Units, Lessons, and session entry points', async () => {
    await seedAsyncStorage({
      profile: profiles.established,
      lessonProgress: {
        'cajun:fixture_cajun_u01_l01': completedLessons.cajunFirst
      },
      wordProgress: {
        'cajun:fixture_cajun_w01': wordMastery.mastered
      },
      lastWorkedUnit: lastWorkedUnits.cajunUnitOne,
      dailyReviewLog: {}
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();

    expect(screen.getByText('1 / 4 words mastered')).toBeOnTheScreen();
    expect(screen.getByText('40')).toBeOnTheScreen();
    expect(screen.getByText('🔥 2')).toBeOnTheScreen();
    expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    expect(screen.getByText('Open Dictionary')).toBeOnTheScreen();
    expect(screen.getByText('Advanced / Review Hub')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins')).toBeOnTheScreen();
    expect(screen.getByText('First greetings')).toBeOnTheScreen();
    expect(screen.queryByText('Everyday phrases')).toBeNull();
    expect(screen.getByText('Done')).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();
  });

  it('reads Daily Review completion from the active scoped record', async () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    await seedAsyncStorage({ dailyReviewLogV2Cajun: dailyReviewLogs.cajun });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Complete! Your daily review will renew at midnight.'))
      .toBeOnTheScreen();
  });

  it('keeps Daily Review completion independent while switching Languages', async () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    await seedAsyncStorage({
      dailyReviewLogV2Cajun: dailyReviewLogs.cajun,
      dailyReviewLogV2Kreole: dailyReviewLogs.kreole
    });
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Complete! Your daily review will renew at midnight.'))
      .toBeOnTheScreen();
    await user.press(screen.getByLabelText('Kouri-Vini flag'));

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByText('Review due words, weak cards, and mistakes.')).toBeOnTheScreen();
    await user.press(screen.getByLabelText('Louisiana French flag'));
    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.getByText('Complete! Your daily review will renew at midnight.'))
      .toBeOnTheScreen();
  });

  it('migrates legacy Daily Review history through the rendered Home journey', async () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    await seedAsyncStorage({ dailyReviewLog: dailyReviewLogs.legacy });
    await setDefaultLanguage('cajun');

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(
      await screen.findByText('Complete! Your daily review will renew at midnight.')
    ).toBeOnTheScreen();
    expect(await AsyncStorage.getItem('lf_daily_review_log_v2_cajun')).toBe(
      JSON.stringify(dailyReviewLogs.legacy)
    );
    expect(await AsyncStorage.getItem('lf_daily_review_migrated')).toBe('true');
  });

  it('refreshes a mounted Home after focus returns from Daily Review', async () => {
    jest.setSystemTime(clock.localCalendarLateEvening());
    const user = setupUser();
    const backHandler = jest.spyOn(BackHandler, 'addEventListener');

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      const homeTitle = await screen.findByText('Louisiana French');
      await user.press(screen.getByLabelText('Daily Review'));
      expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

      await seedAsyncStorage({ dailyReviewLogV2Cajun: dailyReviewLogs.cajun });
      const backListener = backHandler.mock.calls.find(
        ([eventName]) => eventName === 'hardwareBackPress'
      )[1];
      await act(async () => {
        backListener();
      });

      expect(await screen.findByText('Complete! Your daily review will renew at midnight.'))
        .toBeOnTheScreen();
      expect(screen.getByText('Louisiana French')).toBe(homeTitle);
    } finally {
      backHandler.mockRestore();
    }
  });

  it('collapses Units by default and allows only one open Unit', async () => {
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Greetings & Check-ins')).toBeOnTheScreen();
    expect(screen.queryByText('First greetings')).toBeNull();
    expect(screen.getByTestId('unit-toggle-u01').props.accessibilityState).toEqual({
      expanded: false
    });

    await user.press(screen.getByTestId('unit-toggle-u01'));

    expect(screen.getByText('First greetings')).toBeOnTheScreen();
    expect(screen.getByTestId('unit-toggle-u01').props.accessibilityState).toEqual({
      expanded: true
    });

    await user.press(screen.getByTestId('unit-toggle-u02'));

    expect(screen.queryByText('First greetings')).toBeNull();
    expect(screen.getByText('Everyday phrases')).toBeOnTheScreen();
    expect(screen.getByTestId('unit-toggle-u01').props.accessibilityState).toEqual({
      expanded: false
    });
    expect(screen.getByTestId('unit-toggle-u02').props.accessibilityState).toEqual({
      expanded: true
    });

    await user.press(screen.getByTestId('unit-toggle-u02'));

    expect(screen.queryByText('Everyday phrases')).toBeNull();
    expect(screen.getByTestId('unit-toggle-u02').props.accessibilityState).toEqual({
      expanded: false
    });
  });

  it('schedules a layout transition when a Unit expands or collapses', async () => {
    const user = setupUser();
    const configureNext = jest
      .spyOn(LayoutAnimation, 'configureNext')
      .mockImplementation(() => {});

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByText('Greetings & Check-ins')).toBeOnTheScreen();
      expect(configureNext).not.toHaveBeenCalled();

      await user.press(screen.getByTestId('unit-toggle-u01'));

      expect(configureNext).toHaveBeenCalledWith({
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

      await user.press(screen.getByTestId('unit-toggle-u01'));

      expect(configureNext).toHaveBeenCalledTimes(2);
    } finally {
      configureNext.mockRestore();
    }
  });

  it('opens Dictionary from Home', async () => {
    const user = setupUser();
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Open Dictionary')).toBeOnTheScreen();

    await user.press(screen.getByText('Open Dictionary'));
    expect(await screen.findByText('French Dictionary')).toBeOnTheScreen();
  });

  it('opens Advanced from Home', async () => {
    const user = setupUser();
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Advanced / Review Hub')).toBeOnTheScreen();

    await user.press(screen.getByText('Advanced / Review Hub'));
    expect(await screen.findByText('Advanced French Hub')).toBeOnTheScreen();
  });

  it('shows an empty Mistakes control as disabled without a badge or navigation', async () => {
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    const control = await screen.findByTestId('home-mistakes-control');

    expect(control.props.accessibilityState).toEqual({ disabled: true });
    expect(control.props.accessibilityLabel).toBe('Mistakes, none pending');
    expect(control).toHaveStyle({ alignItems: 'center', minWidth: 48, minHeight: 48 });
    expect(screen.getByText('Mistakes')).toHaveStyle({ marginTop: 6 });
    expect(screen.queryByTestId('mistakes-count')).toBeNull();
    expect(control).toHaveStyle({ opacity: 0.55 });

    fireEvent.press(control);
    expect(screen.getByText('Louisiana French')).toBeOnTheScreen();
  });

  it('shows the active Language pending count and opens the persisted Card after remount', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
        }
      }
    });

    const firstRender = renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByTestId('mistakes-count')).toHaveTextContent('1');
    expect(screen.getByTestId('home-mistakes-control').props.accessibilityLabel)
      .toBe('Mistakes, 1 pending');
    firstRender.unmount();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    expect(await screen.findByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
  });

  it('keeps the Mistakes count and Catalog queue independent while switching Languages', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
        },
        kreole: {
          [pendingMistakes.kreole.pronounsChoice.cardId]: pendingMistakes.kreole.pronounsChoice
        }
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByTestId('mistakes-count')).toHaveTextContent('1');
    await user.press(screen.getByLabelText('Kouri-Vini flag'));

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByTestId('mistakes-count')).toHaveTextContent('1');
    expect(screen.getByTestId('home-mistakes-control').props.accessibilityLabel)
      .toBe('Mistakes, 1 pending');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    expect(await screen.findByText("Choose the match for 'we'")).toBeOnTheScreen();
  });

  it('refreshes the pending count on focus without remounting Home', async () => {
    const user = setupUser();
    const backHandler = jest.spyOn(BackHandler, 'addEventListener');

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      await screen.findByText('Louisiana French');
      await user.press(screen.getByLabelText('Daily Review'));
      expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

      await seedAsyncStorage({
        pendingMistakes: {
          cajun: {
            [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
          }
        }
      });
      const backListener = backHandler.mock.calls.find(
        ([eventName]) => eventName === 'hardwareBackPress'
      )[1];

      await act(async () => {
        backListener();
      });

      expect(await screen.findByTestId('mistakes-count')).toHaveTextContent('1');
    } finally {
      backHandler.mockRestore();
    }
  });

  it('cleans obsolete Cards silently without XP or Practice completion', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: { [pendingMistakes.obsoleteCard.cardId]: pendingMistakes.obsoleteCard }
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.queryByText('Session Complete 🎉')).toBeNull();
    expect(await getPendingMistakes('cajun')).toEqual([]);
    expect(await getTodayPractice('cajun')).toBeNull();
    expect((await getProfile()).xp).toBe(0);
  });

  it('shows pressed scale feedback and reduced-motion opacity feedback', async () => {
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
        }
      }
    });
    const initialRender = renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    const control = screen.getByTestId('home-mistakes-control');
    fireEvent(control, 'responderGrant', {
      persist: () => {},
      nativeEvent: { timestamp: Date.now() }
    });
    expect(screen.getByTestId('home-mistakes-control')).toHaveStyle({
      transform: [{ scale: 0.94 }]
    });
    initialRender.unmount();

    const reduceMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    try {
      const firstRender = renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });
      await screen.findByTestId('mistakes-count');
      firstRender.unmount();

      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });
      await screen.findByTestId('mistakes-count');
      const reducedControl = screen.getByTestId('home-mistakes-control');
      fireEvent(reducedControl, 'responderGrant', {
        persist: () => {},
        nativeEvent: { timestamp: Date.now() }
      });
      expect(screen.getByTestId('home-mistakes-control')).toHaveStyle({ opacity: 0.7 });
      expect(screen.getByTestId('home-mistakes-control')).not.toHaveStyle({
        transform: [{ scale: 0.94 }]
      });
    } finally {
      reduceMotion.mockRestore();
    }
  });
});

describe('LessonRunner', () => {
  it('runs the first Activity and advances on Continue', async () => {
    const user = setupUser();
    const lesson = lessonById('fixture_cajun_u01_l01');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: { language: 'cajun', lessonId: lesson.id }
    });

    expect(await screen.findByText('New word')).toBeOnTheScreen();
    expect(await getLastWorkedUnit('cajun')).toBe('u01');
    expect(screen.getByText('1 / 4')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report a bug')).toBeNull();

    await user.press(screen.getByText('Continue'));

    expect(await screen.findByText('Listening')).toBeOnTheScreen();
    expect(screen.getByText('2 / 4')).toBeOnTheScreen();
  });

  it('reaches MistakeReview after two wrong answers and completes after correction', async () => {
    const user = setupUser();
    const lesson = lessonById('fixture_cajun_u02_l01');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: { language: 'cajun', lessonId: lesson.id }
    });

    expect(await screen.findByText("Build: 'It's ready'")).toBeOnTheScreen();

    await user.press(screen.getByText("C'est"));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Not quite')).toBeOnTheScreen();

    await user.press(screen.getByText('Try Again'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Let’s move on')).toBeOnTheScreen();

    await user.press(screen.getByText('Continue'));

    expect(await screen.findByText('Mistake Review')).toBeOnTheScreen();
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: 'fixture:cajun:ready:build',
        source: 'lesson',
        sourceId: 'fixture_cajun_u02_l01',
        answer: "C'est"
      })
    ]);

    await user.press(screen.getByText("C'est"));
    await user.press(screen.getByText('paré'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Correct!')).toBeOnTheScreen();

    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText(/Everyday phrases/)).toBeOnTheScreen();
  });

  it('redirects to Home when the lesson is not found (KD-06)', async () => {
    renderApp({
      initialRouteName: 'Lesson',
      initialParams: { language: 'cajun', lessonId: 'nonexistent' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
  });

  describe('Unit preface', () => {
    it('shows the preface Modal when Lesson 1 of a Unit with a preface is rendered', async () => {
      renderApp({
        initialRouteName: 'Lesson',
        initialParams: { language: 'cajun', lessonId: 'fixture_cajun_u03_l01' }
      });

      expect(await screen.findByText('A note before you begin')).toBeOnTheScreen();
      expect(screen.getByText('0 / 1')).toBeOnTheScreen();
      expect(screen.getByText('Before you begin')).toBeOnTheScreen();
    });

    it('dismisses the preface and renders the first Activity on "Start lesson"', async () => {
      const user = setupUser();

      renderApp({
        initialRouteName: 'Lesson',
        initialParams: { language: 'cajun', lessonId: 'fixture_cajun_u03_l01' }
      });

      expect(await screen.findByText('A note before you begin')).toBeOnTheScreen();

      await user.press(screen.getByText('Start lesson'));

      expect(await screen.findByText('Listen and learn')).toBeOnTheScreen();
      expect(screen.getByText('1 / 1')).toBeOnTheScreen();
      expect(screen.queryByText('A note before you begin')).toBeNull();
    });

    it('skips the preface for a Unit without a preface', async () => {
      renderApp({
        initialRouteName: 'Lesson',
        initialParams: { language: 'cajun', lessonId: 'fixture_cajun_u01_l01' }
      });

      expect(await screen.findByText('New word')).toBeOnTheScreen();
      expect(screen.queryByText('A note before you begin')).toBeNull();
      expect(screen.queryByLabelText('T-Boy: open Unit note')).toBeNull();
    });

    it('does not show the preface when it was previously read', async () => {
      const { markPrefaceRead } = require('../../utils/storage');
      await markPrefaceRead('cajun:u03');

      renderApp({
        initialRouteName: 'Lesson',
        initialParams: { language: 'cajun', lessonId: 'fixture_cajun_u03_l01' }
      });

      expect(await screen.findByText('Listen and learn')).toBeOnTheScreen();
      expect(screen.queryByText('A note before you begin')).toBeNull();
    });

    it('shows "Unit note" button on ProgressHeader and opens preface in reference mode', async () => {
      const user = setupUser();

      renderApp({
        initialRouteName: 'Lesson',
        initialParams: { language: 'cajun', lessonId: 'fixture_cajun_u03_l01' }
      });

      // Dismiss the initial preface
      expect(await screen.findByText('A note before you begin')).toBeOnTheScreen();
      await user.press(screen.getByText('Start lesson'));

      // Activity should now be visible
      expect(await screen.findByText('Listen and learn')).toBeOnTheScreen();
      expect(screen.getByLabelText('T-Boy: open Unit note')).toBeOnTheScreen();
      expect(screen.getByText('1 / 1')).toBeOnTheScreen();

      // T-Boy should open the same reference-mode Unit note without changing progress.
      await user.press(screen.getByLabelText('T-Boy: open Unit note'));
      expect(await screen.findByText('Back to lesson')).toBeOnTheScreen();

      await user.press(screen.getByText('Back to lesson'));
      expect(screen.getByText('1 / 1')).toBeOnTheScreen();

      // "Unit note" button should be visible in ProgressHeader
      expect(screen.getByText('Unit note')).toBeOnTheScreen();

      // Tap "Unit note" to reopen the preface in reference mode
      await user.press(screen.getByText('Unit note'));

      // Modal should show "Back to lesson" (reference mode) instead of "Start lesson"
      expect(await screen.findByText('Back to lesson')).toBeOnTheScreen();
      expect(screen.queryByText('Start lesson')).toBeNull();
    });
  });
});

describe('MistakeReviewScreen', () => {
  it('shows missed Activities and reaches completion after correction', async () => {
    const user = setupUser();
    const activity = activityByCardId('fixture:cajun:greeting:choice');

    renderApp({
      initialRouteName: 'MistakeReview',
      initialParams: {
        language: 'cajun',
        lessonId: 'fixture_cajun_u01_l01',
        lessonTitle: 'Greetings & Check-ins — First greetings',
        mistakes: [{ ...activity, userAnswer: 'Bonjour' }],
        lessonXp: 20
      }
    });

    expect(screen.getByText('Mistake Review')).toBeOnTheScreen();
    expect(screen.getByText('Let’s fix the questions you missed.')).toBeOnTheScreen();
    expect(screen.getByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report a bug')).toBeNull();

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins — First greetings')).toBeOnTheScreen();
  });

  it('removes only the corrected Card while the next pending Card remains', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice,
          [pendingMistakes.cajun.greetingListen.cardId]: pendingMistakes.cajun.greetingListen
        }
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    expect(await screen.findByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Listen and choose the word')).toBeOnTheScreen();
    expect(await getPendingMistakes('cajun')).toEqual([pendingMistakes.cajun.greetingListen]);
    expect(await getTodayPractice('cajun')).toBeNull();
  });

  it('keeps a Home-launched Card visible after another wrong answer', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
        }
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    await screen.findByText("Choose the match for 'How’s it going?'");
    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('Check'));

    expect(screen.getByText('Not quite')).toBeOnTheScreen();
    expect(screen.getByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    expect(await getPendingMistakes('cajun')).toHaveLength(1);
  });

  it('clears the final Home Card, records Practice, awards 10 XP, and returns Home', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      pendingMistakes: {
        cajun: {
          [pendingMistakes.cajun.greetingChoice.cardId]: pendingMistakes.cajun.greetingChoice
        },
        kreole: {
          [pendingMistakes.kreole.pronounsChoice.cardId]: pendingMistakes.kreole.pronounsChoice
        }
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByTestId('mistakes-count');
    fireEvent.press(screen.getByTestId('home-mistakes-control'));
    await screen.findByText("Choose the match for 'How’s it going?'");
    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(await getPendingMistakes('cajun')).toEqual([]);
    expect(await getPendingMistakes('kreole')).toEqual([
      pendingMistakes.kreole.pronounsChoice
    ]);
    expect((await getProfile()).xp).toBe(10);
    expect(await getTodayPractice('cajun')).toEqual({
      type: 'mistakeReview',
      completedAt: expect.any(String)
    });
  });
});

describe('LessonCompleteScreen', () => {
  it('shows session stats and returns Home', async () => {
    const user = setupUser();

    renderApp({
      initialRouteName: 'LessonComplete',
      initialParams: {
        lessonTitle: 'Greetings & Check-ins — First greetings',
        xpEarned: 30,
        mistakesCount: 1,
        streak: 2,
        language: 'cajun'
      }
    });

    expect(screen.getByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins — First greetings')).toBeOnTheScreen();
    expect(screen.getByText('⚡ 30')).toBeOnTheScreen();
    expect(screen.getByText('📝 1')).toBeOnTheScreen();
    expect(screen.getByText('🔥 Streak: 2')).toBeOnTheScreen();
    expect(screen.getByText('Open Leaderboard (WIP)')).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();

    await user.press(screen.getByText('Back to Home'));
    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
  });
});

describe('DailyReviewScreen', () => {
  it('builds a review queue from the Catalog fixture Activities', async () => {
    renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Daily Review')).toBeOnTheScreen();
    expect(
      screen.getByText('Due cards, weak words, and review practice.')
    ).toBeOnTheScreen();
    expect(screen.getByText('1 / 5')).toBeOnTheScreen();
    expect(screen.getByText("Build: 'It's ready'")).toBeOnTheScreen();
    expect(screen.queryByLabelText('Report a bug')).toBeNull();

    const check = await screen.findByText('Check');
    expect(check).toBeDisabled();
  });

  it('completes when the sole due Card is answered correctly', async () => {
    jest.setSystemTime(clock.pastDue());

    await seedAsyncStorage({
      reviewState: {
        'fixture:cajun:greeting:choice': buildCardReviewState({
          nextReviewAt: clock.reviewStart().toISOString()
        })
      }
    });

    const user = setupUser();

    renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('1 / 1')).toBeOnTheScreen();

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Correct!')).toBeOnTheScreen();

    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    expect(await getLanguageDailyReviewLog('cajun')).toEqual({
      [getTodayKey()]: true
    });
    expect(await getLanguageDailyReviewLog('kreole')).toEqual({});
    expect(await getDailyReviewLog()).toEqual({ [getTodayKey()]: true });
  });

  it('completes after a final wrong answer without double-scoring (KD-01)', async () => {
    jest.setSystemTime(clock.pastDue());

    await seedAsyncStorage({
      reviewState: {
        'fixture:cajun:greeting:choice': buildCardReviewState({
          nextReviewAt: clock.reviewStart().toISOString()
        })
      }
    });

    const user = setupUser();

    renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('1 / 1')).toBeOnTheScreen();

    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Not quite')).toBeOnTheScreen();

    await user.press(screen.getByText('Try Again'));
    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Let’s move on')).toBeOnTheScreen();

    await user.press(screen.getByText('Continue'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    expect(screen.getByText('⚡ 0')).toBeOnTheScreen();
    expect(screen.getByText('📝 1')).toBeOnTheScreen();
    expect(await getLanguageDailyReviewLog('cajun')).toEqual({
      [getTodayKey()]: true
    });
    expect(await getLanguageDailyReviewLog('kreole')).toEqual({});
    expect(await getDailyReviewLog()).toEqual({ [getTodayKey()]: true });
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: 'fixture:cajun:greeting:choice',
        answer: 'Bonjour',
        source: 'dailyReview',
        sourceId: null
      })
    ]);
  });
});

describe('DictionaryScreen', () => {
  it('applies the final top inset on the first render', async () => {
    renderApp({
      initialRouteName: 'Dictionary',
      initialParams: { language: 'cajun' },
      safeAreaMetrics: FULL_SCREEN_PHONE_METRICS
    });

    expect(screen.getByText('French Dictionary')).toBeOnTheScreen();

    expect(screen.getByTestId('dictionary-screen')).toHaveStyle({
      paddingTop: FULL_SCREEN_PHONE_METRICS.insets.top,
      paddingBottom: FULL_SCREEN_PHONE_METRICS.insets.bottom
    });
    expect(await screen.findByText('Hello')).toBeOnTheScreen();
  });

  it('lists Words, filters by search, and shows mastery status', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      wordProgress: {
        'cajun:fixture_cajun_w01': wordMastery.mastered,
        'cajun:fixture_cajun_w02': wordMastery.learningAfterWrong
      }
    });

    renderApp({
      initialRouteName: 'Dictionary',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('French Dictionary')).toBeOnTheScreen();

    expect(screen.getByText('Hello')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour')).toBeOnTheScreen();
    expect(screen.getByText('Mastered')).toBeOnTheScreen();
    expect(screen.getByText('Learning')).toBeOnTheScreen();
    expect(screen.getByText('Play audio')).toBeOnTheScreen();

    await user.type(
      screen.getByPlaceholderText('Search English, target word, or category'),
      'ready'
    );

    expect(await screen.findByText("It's ready")).toBeOnTheScreen();
    expect(screen.queryByText('Hello')).toBeNull();
    expect(screen.getByText("C'est paré")).toBeOnTheScreen();
  });

  it('filters by Unit tab', async () => {
    const user = setupUser();

    renderApp({
      initialRouteName: 'Dictionary',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('All Words')).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();

    await user.press(screen.getAllByText('Names & Introductions')[0]);
    expect(await screen.findByText("It's ready")).toBeOnTheScreen();
    expect(screen.queryByText('Hello')).toBeNull();
  });
});

describe('AdvancedScreen', () => {
  it('shows the Language-specific hub placeholder', async () => {
    renderApp({
      initialRouteName: 'Advanced',
      initialParams: { language: 'kreole' }
    });

    expect(screen.getByText('Advanced Kouri-Vini Hub')).toHaveStyle({ textAlign: 'center' });
    expect(screen.queryByText('Experimental speaking drills')).toBeNull();
    expect(screen.queryByText('Self-reviewed speech practice prototype')).toBeNull();
    expect(screen.getByText('Play Audio')).toBeOnTheScreen();
    expect(screen.getByText('Record')).toBeOnTheScreen();
    expect(screen.getByText(/Pronunciation is not graded/)).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();
  });
});
