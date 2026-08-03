import { act, fireEvent, screen, within } from '@testing-library/react-native';
import { AccessibilityInfo, BackHandler, LayoutAnimation } from 'react-native';

import {
  activityByCardId,
  lessonById
} from '../../test/fixtures/catalog/activities';
import { buildCardReviewState } from '../../test/fixtures/learnerProgress/cardBuilder';
import { clock } from '../../test/fixtures/clock';
import {
  completedLessons,
  lastWorkedUnits,
  pendingMistakes,
  profiles,
  reviewStates,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import * as homeProjection from '../../utils/homeProjection';
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

jest.mock('expo-status-bar', () => {
  const React = require('react');
  const { View } = require('react-native');

  return {
    StatusBar: (props) => React.createElement(View, props)
  };
});

jest.mock('../../data/lessonLoader', () =>
  require('../../test/fixtures/catalog/activities').fixtureCatalog
);

setupAppTests();

beforeEach(() => {
  jest.setSystemTime(clock.dueNow());
});

const FULL_SCREEN_PHONE_METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 38, right: 0, bottom: 24, left: 0 }
};

function projectionFixture({ language = 'cajun', title = 'Projected Unit', xp = 91 } = {}) {
  return {
    language,
    dashboard: {
      xp,
      streak: 7,
      masteredWords: 1,
      totalWords: 2,
      masteryPercent: 50,
      reviewCount: 4,
      pendingMistakeCount: 2
    },
    plan: {
      steps: [],
      completedCount: 0,
      activeAction: null,
      helperText: null,
      allDone: false
    },
    currentUnit: null,
    catalogComplete: false,
    units: [{
      unitCode: 'u99',
      unitLabel: 'Unit 99',
      title,
      masteredWords: 1,
      totalWords: 2,
      masteryPercent: 50,
      completedLessons: 1,
      totalLessons: 1,
      lessons: [{
        id: 'projected_lesson',
        title: 'Projected lesson',
        wordCount: 2,
        typeLabel: 'Core lesson',
        complete: true
      }]
    }],
    initialExpandedUnit: 'u99'
  };
}

function planProjectionFixture({
  language = 'cajun',
  steps = [
    { id: 'review', label: 'Review', complete: false },
    { id: 'lesson', label: 'Lesson', complete: false },
    { id: 'practice', label: 'Mistakes', complete: false }
  ],
  activeAction,
  helperText = null,
  allDone = false
} = {}) {
  const action = activeAction === undefined
    ? {
        kind: 'review',
        label: 'Start Daily Review · ~2 min',
        destination: 'DailyReview',
        params: { language }
      }
    : activeAction;

  return {
    ...projectionFixture({ language }),
    language,
    plan: {
      steps,
      completedCount: steps.filter((step) => step.complete).length,
      activeAction: action,
      helperText,
      allDone
    }
  };
}

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
      paddingTop: FULL_SCREEN_PHONE_METRICS.insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 20
    });
    expect(screen.getByTestId('home-status-bar').props.style).toBe('light');
  });

  it('keeps the dashboard controls available at mobile and desktop render widths', async () => {
    const mobile = renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' },
      safeAreaMetrics: {
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 }
      }
    });

    expect(await screen.findByText('Review')).toBeOnTheScreen();
    expect(screen.getByTestId('home-review-control')).toHaveStyle({
      minWidth: 48,
      minHeight: 48
    });
    mobile.unmount();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' },
      safeAreaMetrics: {
        frame: { x: 0, y: 0, width: 1440, height: 900 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 }
      }
    });

    expect(await screen.findByText('Review')).toBeOnTheScreen();
    expect(screen.getByText('Dictionary')).toBeOnTheScreen();
    expect(screen.getByText('Mistakes')).toBeOnTheScreen();
  });

  it('renders both Language identities with their gradient themes', async () => {
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
    expect(screen.getByTestId('home-top-bar').props.colors).toEqual([0xff498bdc, 0xff2771cb]);
    expect(screen.getByTestId('home-pelican')).toHaveStyle({
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: '#FFFFFF'
    });
    expect(screen.getByTestId('home-stats')).toHaveTextContent('⚡ 40 · 🔥 2 · 25% mastered');
    expect(screen.getByTestId('home-language-flag-image')).toHaveStyle({
      width: 44,
      height: 28,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: '#FFFFFF'
    });
    expect(screen.queryAllByTestId('home-language-flag-image').length).toBe(1);
    expect(screen.getByTestId('home-review-control')).toBeOnTheScreen();
    expect(screen.getByTestId('home-dictionary-control')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hub-control')).toBeOnTheScreen();
    expect(screen.getByTestId('home-mistakes-control')).toBeOnTheScreen();
    expect(screen.getByTestId('home-review-icon')).toBeOnTheScreen();
    expect(screen.getByTestId('home-dictionary-icon')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hub-icon')).toBeOnTheScreen();
    expect(screen.getByTestId('home-mistakes-icon')).toBeOnTheScreen();
    expect(screen.getByTestId('home-review-circle')).toHaveStyle({ width: 46, height: 46 });
    expect(screen.getByTestId('home-review-control')).toHaveStyle({
      minWidth: 48,
      minHeight: 48
    });
    expect(screen.getByText('Louisiana French')).toHaveStyle({
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF'
    });
    expect(screen.getByText('Dictionary')).toBeOnTheScreen();
    expect(screen.getByText('Hub')).toBeOnTheScreen();
    expect(
      within(screen.getByTestId('unit-toggle-u01')).getByText('Greetings & Check-ins')
    ).toBeOnTheScreen();
    expect(screen.getByText('First greetings')).toBeOnTheScreen();
    expect(screen.getByLabelText('Report a bug')).toBeOnTheScreen();

  });

  it('renders Catalog and Learner Progress values from one Home projection snapshot', async () => {
    const getProjection = jest
      .spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValue(projectionFixture());

    try {
      await seedAsyncStorage({ lastWorkedUnit: { cajun: 'u99' } });
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByText('Projected Unit')).toBeOnTheScreen();
      expect(screen.getByTestId('home-stats')).toHaveTextContent('⚡ 91 · 🔥 7 · 50% mastered');
      expect(screen.getByTestId('review-count')).toHaveTextContent('4');
      expect(screen.getByTestId('mistakes-count')).toHaveTextContent('2');
      expect(screen.getByText('Projected lesson')).toBeOnTheScreen();
      expect(screen.queryByText('Greetings & Check-ins')).toBeNull();
      expect(getProjection).toHaveBeenCalledWith('cajun');
    } finally {
      getProjection.mockRestore();
    }
  });

  it('renders the projected current Unit and opens its first unfinished Lesson', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      lessonProgress: {
        'cajun:fixture_cajun_u01_l01': completedLessons.cajunFirst
      },
      wordProgress: {
        'cajun:fixture_cajun_w01': wordMastery.mastered
      }
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    const currentUnit = await screen.findByTestId('home-current-unit');
    expect(screen.getByTestId('home-current-unit-arrow')).toBeOnTheScreen();
    expect(screen.getByText('WHERE YOU LEFT OFF')).toHaveStyle({
      color: '#64748B',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.48
    });
    expect(currentUnit).toHaveStyle({
      backgroundColor: '#FFFFFF',
      borderColor: '#E2E8F0',
      borderRadius: 18,
      borderWidth: 1,
      overflow: 'hidden'
    });
    expect(within(currentUnit).getByText('Unit 1')).toBeOnTheScreen();
    expect(within(currentUnit).getByText('Greetings & Check-ins')).toBeOnTheScreen();
    expect(within(currentUnit).getByText('1 / 2 words · 1 / 2 lessons')).toBeOnTheScreen();
    expect(screen.getByTestId('home-current-unit-progress')).toHaveStyle({
      width: '50%',
      height: 10,
      backgroundColor: '#7DD3FC'
    });
    expect(within(currentUnit).getByText('Greetings review')).toBeOnTheScreen();
    expect(within(currentUnit).getByText('Next up · 1 words · Review')).toBeOnTheScreen();

    await user.press(screen.getByTestId('home-current-unit-continue'));

    expect(await screen.findByText('Match the words')).toBeOnTheScreen();
  });

  it.each([
    ['cajun', [0xff498bdc, 0xff2771cb], '#2771CB', '#7DD3FC'],
    ['kreole', [0xff0aa35f, 0xff066b3f], '#08834C', '#6EE7B7']
  ])('uses the approved %s current Unit colors without changing its structure', async (
    language,
    gradient,
    accent,
    progress
  ) => {
    renderApp({ initialRouteName: 'Home', initialParams: { language } });

    const currentUnit = await screen.findByTestId('home-current-unit');
    expect(screen.getByTestId('home-current-unit-header').props.colors).toEqual(gradient);
    expect(screen.getByTestId('home-current-unit-continue')).toHaveStyle({
      backgroundColor: accent,
      borderRadius: 999
    });
    expect(screen.getByTestId('home-current-unit-progress')).toHaveStyle({
      backgroundColor: progress,
      height: 10
    });
    expect(within(currentUnit).getByText('Next up · 2 words · Core lesson')).toBeOnTheScreen();
  });

  it('renders coherent completed and zero-Lesson Catalog fallbacks', async () => {
    const completed = {
      ...planProjectionFixture({
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Speech', complete: false }
        ],
        activeAction: {
          kind: 'speech',
          label: 'Practice Speech',
          destination: 'Advanced',
          params: { language: 'cajun' }
        },
        helperText: 'No mistakes to fix — speech practice instead.'
      }),
      catalogComplete: true
    };
    const empty = {
      ...projectionFixture({ title: 'Unused Unit' }),
      catalogComplete: true,
      units: []
    };
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValueOnce(completed)
      .mockResolvedValueOnce(empty);

    try {
      const completedRender = renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(within(await screen.findByTestId('home-catalog-complete')).getByText(
        'You completed every Lesson in this Language.'
      )).toBeOnTheScreen();
      expect(screen.queryByTestId('home-current-unit')).toBeNull();
      expect(screen.getByTestId('home-plan-cta')).toHaveTextContent('Practice Speech');
      completedRender.unmount();

      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(within(await screen.findByTestId('home-catalog-complete')).getByText(
        'No Lessons are available for this Language yet.'
      )).toBeOnTheScreen();
      expect(screen.queryByTestId('home-current-unit')).toBeNull();
    } finally {
      getProjection.mockRestore();
    }
  });

  it('ignores a stale focus projection after the active Language changes', async () => {
    const user = setupUser();
    const backHandler = jest.spyOn(BackHandler, 'addEventListener');
    let resolveStaleCajun;
    let cajunCalls = 0;
    const staleCajun = new Promise((resolve) => {
      resolveStaleCajun = resolve;
    });
    const getProjection = jest
      .spyOn(homeProjection, 'getHomeProjection')
      .mockImplementation((language) => {
        if (language === 'cajun') {
          cajunCalls += 1;
          return cajunCalls === 2
            ? staleCajun
            : Promise.resolve(projectionFixture());
        }

        return Promise.resolve(projectionFixture({
          language: 'kreole',
          title: 'Kouri Projected Unit',
          xp: 73
        }));
      });

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
      await user.press(screen.getByTestId('home-review-control'));
      expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

      const backListener = backHandler.mock.calls.find(
        ([eventName]) => eventName === 'hardwareBackPress'
      )[1];
      await act(async () => {
        backListener();
      });
      await user.press(screen.getByLabelText('Louisiana French flag'));

      expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
      await act(async () => {
        resolveStaleCajun(projectionFixture({ xp: 12 }));
      });

      expect(screen.getByText('Kouri-Vini')).toBeOnTheScreen();
      expect(screen.getByTestId('home-stats')).toHaveTextContent('⚡ 73 · 🔥 7 · 50% mastered');
      expect(getProjection).toHaveBeenCalledWith('cajun');
      expect(getProjection).toHaveBeenCalledWith('kreole');
    } finally {
      backHandler.mockRestore();
      getProjection.mockRestore();
    }
  });

  it('renders the Kouri-Vini identity and theme after a saved Language switch', async () => {
    await setDefaultLanguage('kreole');

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'kreole' }
    });

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByTestId('home-top-bar').props.colors).toEqual([0xff0aa35f, 0xff066b3f]);
    expect(screen.getByText('Dictionary')).toBeOnTheScreen();
  });

  it('shows global XP and streak with active-Language mastery, including zero mastery', async () => {
    await seedAsyncStorage({
      profile: profiles.established,
      wordProgress: {}
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'kreole' }
    });

    expect(await screen.findByTestId('home-stats')).toHaveTextContent(
      '⚡ 40 · 🔥 2 · 0% mastered'
    );
  });

  it('returns zero mastery when the active Catalog has no Words', async () => {
    const catalog = require('../../test/fixtures/catalog/activities').fixtureCatalog;
    const getAllWords = jest.spyOn(catalog, 'getAllWords').mockReturnValue([]);

    try {
      await seedAsyncStorage({ profile: profiles.established });
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-stats')).toHaveTextContent(
        '⚡ 40 · 🔥 2 · 0% mastered'
      );
    } finally {
      getAllWords.mockRestore();
    }
  });

  it('toggles and persists the current Language while refreshing header badges', async () => {
    const user = setupUser();
    await seedAsyncStorage({
      profile: profiles.established,
      reviewState: {
        ...reviewStates.overlap,
        'fixture:kreole:pronouns:choice': {
          ...reviewStates.languageIsolation.kreole['fixture:kreole:pronouns:choice']
        }
      },
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

    expect(await screen.findByTestId('review-count')).toHaveTextContent('3');
    expect(screen.getByTestId('review-count')).toHaveStyle({
      backgroundColor: '#FFCD00'
    });
    expect(screen.getByTestId('mistakes-count')).toHaveTextContent('1');
    await user.press(screen.getByLabelText('Louisiana French flag'));

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByTestId('review-count')).toHaveTextContent('1');
    expect(screen.getByTestId('mistakes-count')).toHaveTextContent('1');
    expect(screen.getByTestId('home-stats')).toHaveTextContent('⚡ 40 · 🔥 2 · 0% mastered');
    expect(await getDefaultLanguage()).toBe('kreole');
  });

  it('shows only the real unique Review count and keeps Review enabled with no real queue', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.overlap });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByTestId('review-count')).toHaveTextContent('3');

    expect(screen.getByTestId('home-review-control')).toBeEnabled();
  });

  it('does not show a Review badge for all-future Cards while Daily Review keeps its fallback', async () => {
    await seedAsyncStorage({ reviewState: reviewStates.allFuture });
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.getByTestId('home-review-control')).toBeEnabled();
    expect(screen.getByTestId('home-review-circle')).toBeTruthy();
    expect(screen.queryByTestId('review-count') === null).toBe(true);
    await user.press(screen.getByTestId('home-review-control'));
    expect(await screen.findByText('1 / 5')).toBeOnTheScreen();
  });

  it('refreshes the Review badge on focus without remounting Home', async () => {
    const user = setupUser();
    const backHandler = jest.spyOn(BackHandler, 'addEventListener');

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      await screen.findByText('Louisiana French');
      await user.press(screen.getByTestId('home-review-control'));
      expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

      await seedAsyncStorage({ reviewState: reviewStates.overlap });
      const backListener = backHandler.mock.calls.find(
        ([eventName]) => eventName === 'hardwareBackPress'
      )[1];
      await act(async () => {
        backListener();
      });

      expect(await screen.findByTestId('review-count')).toHaveTextContent('3');
    } finally {
      backHandler.mockRestore();
    }
  });

  it('refreshes the focused Home header data without remounting', async () => {
    const user = setupUser();
    const backHandler = jest.spyOn(BackHandler, 'addEventListener');

    try {
      await seedAsyncStorage({ profile: profiles.fresh, wordProgress: {} });
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-stats')).toHaveTextContent(
        '⚡ 0 · 🔥 0 · 0% mastered'
      );
      await user.press(screen.getByTestId('home-review-control'));

      await seedAsyncStorage({
        profile: profiles.established,
        wordProgress: {
          'cajun:fixture_cajun_w01': wordMastery.mastered
        }
      });
      const backListener = backHandler.mock.calls.find(
        ([eventName]) => eventName === 'hardwareBackPress'
      )[1];
      await act(async () => {
        backListener();
      });

      expect(await screen.findByTestId('home-stats')).toHaveTextContent(
        '⚡ 40 · 🔥 2 · 25% mastered'
      );
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

    expect(
      within(await screen.findByTestId('unit-toggle-u01')).getByText('Greetings & Check-ins')
    ).toBeOnTheScreen();
    expect(screen.getAllByText('First greetings')).toHaveLength(1);
    expect(screen.getByTestId('unit-toggle-u01').props.accessibilityState).toEqual({
      expanded: false
    });

    await user.press(screen.getByTestId('unit-toggle-u01'));

    expect(screen.getAllByText('First greetings')).toHaveLength(2);
    expect(screen.getByTestId('unit-toggle-u01').props.accessibilityState).toEqual({
      expanded: true
    });

    await user.press(screen.getByTestId('unit-toggle-u02'));

    expect(screen.getAllByText('First greetings')).toHaveLength(1);
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

      expect(
        within(await screen.findByTestId('unit-toggle-u01')).getByText('Greetings & Check-ins')
      ).toBeOnTheScreen();
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

  it('opens Dictionary and Advanced with the active Language', async () => {
    const user = setupUser();
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Dictionary')).toBeOnTheScreen();

    await user.press(screen.getByTestId('home-dictionary-control'));
    expect(await screen.findByText('French Dictionary')).toBeOnTheScreen();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });
    await screen.findByText('Louisiana French');
    await user.press(screen.getByTestId('home-hub-control'));
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
    expect(screen.getByTestId('mistakes-count')).toHaveStyle({
      backgroundColor: '#DC2626'
    });
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
    await user.press(screen.getByLabelText('Louisiana French flag'));

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
      await user.press(screen.getByTestId('home-review-control'));
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

  it('renders the active Review action and simplified Lesson action', async () => {
    const user = setupUser();
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValueOnce(planProjectionFixture())
      .mockResolvedValueOnce(planProjectionFixture({
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: false },
          { id: 'practice', label: 'Mistakes', complete: false }
        ],
        activeAction: {
          kind: 'lesson',
          label: 'Continue lesson · First greetings',
          destination: 'Lesson',
          params: { language: 'cajun', lessonId: 'fixture_cajun_u01_l01' }
        }
      }));

    try {
      const firstRender = renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-plan-cta')).toHaveTextContent(
        'Start Daily Review · ~2 min'
      );
      await user.press(screen.getByTestId('home-plan-cta'));
      expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

      firstRender.unmount();
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-plan-cta')).toHaveTextContent(
        'Continue to lesson'
      );
      expect(screen.getByLabelText('Continue to lesson')).toBeOnTheScreen();
      await user.press(screen.getByTestId('home-plan-cta'));
      expect(await screen.findByText('New word')).toBeOnTheScreen();
    } finally {
      getProjection.mockRestore();
    }
  });

  it.each([
    [1, 'Fix 1 mistake'],
    [2, 'Fix 2 mistakes']
  ])('uses singular/plural Mistake Review CTA copy for %i pending Cards', async (count, label) => {
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValue(planProjectionFixture({
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Mistakes', complete: false }
        ],
        activeAction: {
          kind: 'mistakes',
          label,
          destination: 'MistakeReview',
          params: { language: 'cajun', source: 'home' }
        }
      }));

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-plan-cta')).toHaveTextContent(label);
    } finally {
      getProjection.mockRestore();
    }
  });

  it('keeps a later completed step done while the earlier Review step is active', async () => {
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValue(planProjectionFixture({
        steps: [
          { id: 'review', label: 'Review', complete: false },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Mistakes', complete: false }
        ]
      }));

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      await screen.findByTestId('home-plan');
      expect(screen.getByTestId('home-plan-circle-review')).toHaveStyle({
        backgroundColor: '#FFFFFF'
      });
      expect(screen.getByTestId('home-plan-circle-lesson')).toHaveStyle({
        backgroundColor: '#7DD3FC'
      });
      expect(screen.getByTestId('home-plan-circle-practice')).toHaveStyle({
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.35)'
      });
      expect(screen.getByTestId('home-plan-status')).toHaveTextContent('1 of 3 done');
    } finally {
      getProjection.mockRestore();
    }
  });

  it('substitutes Speech with the exact helper and Advanced destination', async () => {
    const user = setupUser();
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValue(planProjectionFixture({
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Speech', complete: false }
        ],
        activeAction: {
          kind: 'speech',
          label: 'Practice Speech',
          destination: 'Advanced',
          params: { language: 'cajun' }
        },
        helperText: 'No mistakes to fix — speech practice instead.'
      }));

    try {
      renderApp({
        initialRouteName: 'Home',
        initialParams: { language: 'cajun' }
      });

      expect(await screen.findByTestId('home-plan-helper')).toHaveTextContent(
        'No mistakes to fix — speech practice instead.'
      );
      expect(screen.getByText('Speech')).toBeOnTheScreen();
      await user.press(screen.getByTestId('home-plan-cta'));
      expect(await screen.findByText('Advanced French Hub')).toBeOnTheScreen();
    } finally {
      getProjection.mockRestore();
    }
  });

  it.each([
    ['cajun', '#102A43', '#2771CB', '#7DD3FC'],
    ['kreole', '#064E32', '#08834C', '#6EE7B7']
  ])('uses the approved %s plan tokens', async (
    language,
    planBackground,
    accent,
    softAccent
  ) => {
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValueOnce(planProjectionFixture({
        language,
        activeAction: {
          kind: 'review',
          label: 'Start Daily Review · ~2 min',
          destination: 'DailyReview',
          params: { language }
        }
      }))
      .mockResolvedValueOnce(planProjectionFixture({
        language,
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Speech', complete: true }
        ],
        activeAction: null,
        allDone: true
    }));

    try {
      const activeRender = renderApp({ initialRouteName: 'Home', initialParams: { language } });

      expect(await screen.findByTestId('home-plan-cta')).toHaveStyle({
        backgroundColor: accent,
        borderRadius: 12,
        paddingVertical: 13
      });
      activeRender.unmount();
      renderApp({ initialRouteName: 'Home', initialParams: { language } });

      expect(await screen.findByTestId('home-plan')).toHaveStyle({
        backgroundColor: planBackground,
        borderRadius: 18,
        padding: 18,
        marginBottom: 12
      });
      expect(screen.getByTestId('home-plan-circle-lesson')).toHaveStyle({
        backgroundColor: softAccent
      });
      expect(
        within(screen.getByTestId('home-plan-circle-lesson')).getByText('✓')
      ).toHaveStyle({ color: planBackground });
      const completion = screen.getByTestId('home-plan-completion');
      expect(completion).toBeDisabled();
      expect(completion).toHaveStyle({
        backgroundColor: '#64748B',
        borderRadius: 12,
        paddingVertical: 13
      });
      expect(screen.getByText("All done with today's plan! Practice more in the Hub")).toHaveStyle({
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
      });
      expect(screen.getByTestId('home-plan-title')).toHaveStyle({
        fontSize: 18,
        fontWeight: '900'
      });
      expect(screen.queryByTestId('home-plan-cta')).toBeNull();
    } finally {
      getProjection.mockRestore();
    }
  });

  it('uses reduced-motion opacity instead of CTA scale feedback', async () => {
    const reduceMotion = jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);
    const getProjection = jest.spyOn(homeProjection, 'getHomeProjection')
      .mockResolvedValue(planProjectionFixture());

    try {
      renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });
      const cta = await screen.findByTestId('home-plan-cta');
      fireEvent(cta, 'responderGrant', {
        persist: () => {},
        nativeEvent: { timestamp: Date.now() }
      });
      expect(screen.getByTestId('home-plan-cta')).toHaveStyle({ opacity: 0.7 });
      expect(screen.getByTestId('home-plan-cta')).not.toHaveStyle({
        transform: [{ scale: 0.97 }]
      });
    } finally {
      reduceMotion.mockRestore();
      getProjection.mockRestore();
    }
  });

  it('removes the old stats cards and full-width navigation controls', async () => {
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.queryByText('Open Dictionary')).toBeNull();
    expect(screen.queryByText('Advanced / Review Hub')).toBeNull();
    expect(screen.queryByText('Daily Review')).toBeNull();
    expect(screen.queryByText('XP')).toBeNull();
    expect(screen.queryByText('Streak')).toBeNull();
    expect(screen.queryByText('Mastered')).toBeNull();
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
