import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

import App from '../../App';
import { fixtureCatalog } from '../test/fixtures/catalog/activities';
import {
  REGISTERED_ROUTES,
  renderApp,
  routesDeclaredInAppSource
} from '../test/renderApp';

jest.mock('../data/lessonLoader', () => {
  const { createCatalog } = require('../data/catalog');
  const {
    compactCatalogSource
  } = require('../test/fixtures/catalog/compactCatalog');
  return createCatalog(compactCatalogSource);
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('navigation graph', () => {
  it('registers test routes that match the real App.js navigator', () => {
    expect(REGISTERED_ROUTES).toEqual(routesDeclaredInAppSource());
  });

  it('starts the real App on Loading', () => {
    render(<App />);
    expect(screen.getByText('Learn')).toBeOnTheScreen();
    expect(screen.getByText('Louisiana French')).toBeOnTheScreen();
  });

  it('marks Leaderboard as a known unregistered outgoing contract (KD-02)', () => {
    expect(routesDeclaredInAppSource()).not.toContain('Leaderboard');
  });

  it('navigates Home → Daily Review with Language params', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText('Daily Review')).toBeOnTheScreen();
    });

    await user.press(screen.getByText('Daily Review'));

    await waitFor(() => {
      expect(
        screen.getByText('Due cards, weak words, and review practice.')
      ).toBeOnTheScreen();
    });
  });

  it('navigates Home → Lesson with lesson identity params', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const lesson = fixtureCatalog.getLessonById('cajun', 'fixture_cajun_u01_l01');

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await waitFor(() => {
      expect(screen.getByText(lesson.lessonTitle)).toBeOnTheScreen();
    });

    await user.press(screen.getByText(lesson.lessonTitle));

    await waitFor(() => {
      expect(screen.getByText('New word')).toBeOnTheScreen();
    });
  });

  it('reaches LessonComplete from MistakeReview with required params', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const activity = fixtureCatalog
      .getAllActivities('cajun')
      .find((item) => item.cardId === 'fixture:cajun:greeting:choice');

    renderApp({
      initialRouteName: 'MistakeReview',
      initialParams: {
        language: 'cajun',
        lessonId: 'fixture_cajun_u01_l01',
        lessonTitle: 'Fixture Lesson',
        mistakes: [activity],
        lessonXp: 10
      }
    });

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    await waitFor(() => {
      expect(screen.getByText('Session Complete 🎉')).toBeOnTheScreen();
    });
    expect(screen.getByText('Fixture Lesson')).toBeOnTheScreen();
  });

});
