import { act, screen } from '@testing-library/react-native';

import {
  activityByCardId,
  lessonById
} from '../../test/fixtures/catalog/activities';
import { buildCardReviewState } from '../../test/fixtures/learnerProgress/cardBuilder';
import { clock } from '../../test/fixtures/clock';
import {
  completedLessons,
  profiles,
  wordMastery
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import {
  getDefaultLanguage,
  hasSelectedLanguage,
  markLanguageSelected,
  setDefaultLanguage
} from '../../utils/storage';

jest.mock('../../data/lessonLoader', () =>
  require('../../test/fixtures/catalog/activities').fixtureCatalog
);

setupAppTests();

describe('LoadingScreen', () => {
  it('routes first launch to Language selection', async () => {
    renderApp({ initialRouteName: 'Loading' });

    expect(screen.getByText('Learn')).toBeOnTheScreen();
    expect(screen.getByText('Louisiana French')).toBeOnTheScreen();

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
  it('persists Cajun French and opens Home', async () => {
    const user = setupUser();
    renderApp({ initialRouteName: 'LanguageSelect' });

    expect(screen.getByText('Choose your language')).toBeOnTheScreen();
    expect(screen.getByText('Cajun')).toBeOnTheScreen();
    expect(screen.getByText('Kouri-Vini')).toBeOnTheScreen();

    await user.press(screen.getByText('Cajun'));

    expect(await screen.findByText('Cajun French')).toBeOnTheScreen();
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

    expect(await screen.findByText('Cajun French')).toBeOnTheScreen();

    expect(screen.getByText('1 / 3 words mastered')).toBeOnTheScreen();
    expect(screen.getByText('40')).toBeOnTheScreen();
    expect(screen.getByText('🔥 2')).toBeOnTheScreen();
    expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    expect(screen.getByText('Open Dictionary')).toBeOnTheScreen();
    expect(screen.getByText('Advanced / Review Hub')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins')).toBeOnTheScreen();
    expect(screen.getByText('First greetings')).toBeOnTheScreen();
    expect(screen.getByText('Done')).toBeOnTheScreen();
  });

  it('opens Dictionary from Home', async () => {
    const user = setupUser();
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Open Dictionary')).toBeOnTheScreen();

    await user.press(screen.getByText('Open Dictionary'));
    expect(await screen.findByText('Cajun Dictionary')).toBeOnTheScreen();
  });

  it('opens Advanced from Home', async () => {
    const user = setupUser();
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Advanced / Review Hub')).toBeOnTheScreen();

    await user.press(screen.getByText('Advanced / Review Hub'));
    expect(await screen.findByText('Advanced Cajun Hub')).toBeOnTheScreen();
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
    expect(screen.getByText('1 / 4')).toBeOnTheScreen();
    expect(screen.getByText('Bonjour')).toBeOnTheScreen();

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

    await user.press(screen.getByText("C'est"));
    await user.press(screen.getByText('paré'));
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Correct!')).toBeOnTheScreen();

    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText(/Everyday phrases/)).toBeOnTheScreen();
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

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Session Complete 🎉')).toBeOnTheScreen();
    expect(screen.getByText('Greetings & Check-ins — First greetings')).toBeOnTheScreen();
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
    expect(await screen.findByText('Cajun French')).toBeOnTheScreen();
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
  });
});

describe('DictionaryScreen', () => {
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

    expect(await screen.findByText('Cajun Dictionary')).toBeOnTheScreen();

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

    expect(screen.getByText('Advanced Kouri-Vini Hub')).toBeOnTheScreen();
    expect(screen.getByText('Future modes can go here:')).toBeOnTheScreen();
  });
});
