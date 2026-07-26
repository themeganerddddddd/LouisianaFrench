import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, screen, userEvent, waitFor } from '@testing-library/react-native';

import { fixtureCatalog } from '../../test/fixtures/catalog/activities';
import {
  completedLessons,
  profiles,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import {
  getDefaultLanguage,
  hasSelectedLanguage,
  markLanguageSelected,
  setDefaultLanguage
} from '../../utils/storage';

jest.mock('../../data/lessonLoader', () => {
  const { createCatalog } = require('../../data/catalog');
  const {
    compactCatalogSource
  } = require('../../test/fixtures/catalog/compactCatalog');
  return createCatalog(compactCatalogSource);
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LoadingScreen', () => {
  it('routes first launch to Language selection', async () => {
    renderApp({ initialRouteName: 'Loading' });

    expect(screen.getByText('Learn')).toBeOnTheScreen();
    expect(screen.getByText('Louisiana French')).toBeOnTheScreen();

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText('Choose your language')).toBeOnTheScreen();
    });
  });

  it('routes a returning learner to Home with the saved Language', async () => {
    await setDefaultLanguage('kreole');
    await markLanguageSelected();

    renderApp({ initialRouteName: 'Loading' });

    await act(async () => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText('Kouri-Vini')).toBeOnTheScreen();
    });
  });
});

describe('LanguageSelectScreen', () => {
  it('persists Cajun French and opens Home', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderApp({ initialRouteName: 'LanguageSelect' });

    expect(screen.getByText('Choose your language')).toBeOnTheScreen();
    expect(screen.getByText('Cajun')).toBeOnTheScreen();
    expect(screen.getByText('Kouri-Vini')).toBeOnTheScreen();

    await user.press(screen.getByText('Cajun'));

    await waitFor(() => {
      expect(screen.getByText('Cajun French')).toBeOnTheScreen();
    });
    expect(await getDefaultLanguage()).toBe('cajun');
    expect(await hasSelectedLanguage()).toBe(true);
  });
});

describe('HomeScreen', () => {
  it('shows Learner Progress, Units, Lessons, and session entry points', async () => {
    await seedAsyncStorage({
      profile: profiles.established,
      lessonProgress: {
        'cajun:fixture_cajun_u01_l01': completedLessons.cajunFirst
      },
      wordProgress: {
        'cajun:fixture_cajun_w01': wordMastery.mastered
      },
      dailyReviewLog: {}
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('Cajun French')).toBeOnTheScreen();
    });

    expect(screen.getByText('1 / 3 words mastered')).toBeOnTheScreen();
    expect(screen.getByText('40')).toBeOnTheScreen();
    expect(screen.getByText('🔥 2')).toBeOnTheScreen();
    expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    expect(screen.getAllByText('Start').length).toBeGreaterThan(0);
    expect(screen.getByText('Open Dictionary')).toBeOnTheScreen();
    expect(screen.getByText('Advanced / Review Hub')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins')).toBeOnTheScreen();
    expect(screen.getByText('First greetings')).toBeOnTheScreen();
    expect(screen.getByText('Greetings review')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
  });

  it('opens Dictionary and Advanced from Home', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('Open Dictionary')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('Open Dictionary'));
    await waitFor(() => {
      expect(screen.getByText('Cajun Dictionary')).toBeOnTheScreen();
    });
  });

  it('opens Advanced from Home', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('Advanced / Review Hub')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('Advanced / Review Hub'));
    await waitFor(() => {
      expect(screen.getByText('Advanced Cajun Hub')).toBeOnTheScreen();
    });
  });
});

describe('LessonRunner', () => {
  it('runs the first Activity and advances on Continue', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const lesson = fixtureCatalog.getLessonById('cajun', 'fixture_cajun_u01_l01');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: { language: 'cajun', lessonId: lesson.id }
    });

    await waitFor(() => {
      expect(screen.getByText('New word')).toBeOnTheScreen();
    });
    expect(screen.getByText('1 / 4')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour')).toBeOnTheScreen();

    await user.press(screen.getByText('Continue'));

    await waitFor(() => {
      expect(screen.getByText('Listening')).toBeOnTheScreen();
    });
    expect(screen.getByText('2 / 4')).toBeOnTheScreen();
  });
});

describe('MistakeReviewScreen', () => {
  it('shows missed Activities and reaches completion after correction', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const activity = fixtureCatalog
      .getAllActivities('cajun')
      .find((item) => item.cardId === 'fixture:cajun:greeting:choice');

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

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    await waitFor(() => {
      expect(screen.getByText('Session Complete 🎉')).toBeOnTheScreen();
    });
    expect(screen.getByText('Greetings & Check-ins — First greetings')).toBeOnTheScreen();
  });
});

describe('LessonCompleteScreen', () => {
  it('shows session stats and returns Home', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderApp({
      initialRouteName: 'LessonComplete',
      initialParams: {
        lessonTitle: 'Greetings & Check-ins — First greetings',
        xpEarned: 30,
        mistakesCount: 1,
        streak: 2
      }
    });

    expect(screen.getByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins — First greetings')).toBeOnTheScreen();
    expect(screen.getByText('⚡ 30')).toBeOnTheScreen();
    expect(screen.getByText('📝 1')).toBeOnTheScreen();
    expect(screen.getByText('🔥 Streak: 2')).toBeOnTheScreen();
    expect(screen.getByText('Open Leaderboard (WIP)')).toBeOnTheScreen();

    await user.press(screen.getByText('Back to Home'));
    await waitFor(() => {
      expect(screen.getByText('Cajun French')).toBeOnTheScreen();
    });
  });
});

describe('DailyReviewScreen', () => {
  it('builds a review queue from the Catalog fixture Activities', async () => {
    renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    });
    expect(
      screen.getByText('Due cards, weak words, and review practice.')
    ).toBeOnTheScreen();
    expect(screen.getByText('1 / 5')).toBeOnTheScreen();

    const check = await screen.findByText('Check');
    expect(check).toBeDisabled();
  });
});

describe('DictionaryScreen', () => {
  it('lists Words, filters by search, and shows mastery status', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
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

    await waitFor(() => {
      expect(screen.getByText('Cajun Dictionary')).toBeOnTheScreen();
    });

    expect(screen.getByText('Hello')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour')).toBeOnTheScreen();
    expect(screen.getByText('Mastered')).toBeOnTheScreen();
    expect(screen.getByText('Learning')).toBeOnTheScreen();
    expect(screen.getByText('Play audio')).toBeOnTheScreen();

    await user.type(
      screen.getByPlaceholderText('Search English, target word, or category'),
      'ready'
    );

    await waitFor(() => {
      expect(screen.getByText("It's ready")).toBeOnTheScreen();
    });
    expect(screen.queryByText('Hello')).toBeNull();
    expect(screen.getByText("C'est paré")).toBeOnTheScreen();
  });

  it('filters by Unit tab', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderApp({
      initialRouteName: 'Dictionary',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('All Words')).toBeOnTheScreen();
    });

    await user.press(screen.getAllByText('Names & Introductions')[0]);
    await waitFor(() => {
      expect(screen.getByText("It's ready")).toBeOnTheScreen();
    });
    expect(screen.queryByText('Hello')).toBeNull();
  });
});

describe('AdvancedScreen', () => {
  it('shows the Language-specific hub placeholder', async () => {
    renderApp({
      initialRouteName: 'Advanced',
      initialParams: { language: 'kreole' }
    });

    expect(screen.getByText('Advanced Kouri-Vini Hub')).toBeOnTheScreen();
    expect(screen.getByText('Future modes can go here:')).toBeOnTheScreen();
  });
});
