import { render, screen } from '@testing-library/react-native';

import App from '../../App';
import { lessonById } from '../test/fixtures/catalog/activities';
import {
  REGISTERED_ROUTES,
  renderApp,
  routesDeclaredInAppSource
} from '../test/renderApp';
import { setupAppTests, setupUser } from '../test/setupAppTest';

jest.mock('../data/lessonLoader', () =>
  require('../test/fixtures/catalog/activities').fixtureCatalog
);

setupAppTests();

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
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Daily Review')).toBeOnTheScreen();

    await user.press(screen.getByText('Daily Review'));

    expect(
      await screen.findByText('Due cards, weak words, and review practice.')
    ).toBeOnTheScreen();
  });

  it('navigates Home → Lesson with lesson identity params', async () => {
    const user = setupUser();
    const lesson = lessonById('fixture_cajun_u01_l01');

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText(lesson.lessonTitle)).toBeOnTheScreen();

    await user.press(screen.getByText(lesson.lessonTitle));

    expect(await screen.findByText('New word')).toBeOnTheScreen();
  });

});
