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

  it('quarantines the unregistered Leaderboard contract pending Issue #27', () => {
    expect(routesDeclaredInAppSource()).not.toContain('Leaderboard');
  });

  it('navigates Home → Daily Review with Language params', async () => {
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Review')).toBeOnTheScreen();

    await user.press(screen.getByTestId('home-review-control'));

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

    expect(await screen.findByText('Greetings & Check-ins')).toBeOnTheScreen();

    await user.press(screen.getByTestId('unit-toggle-u01'));
    await user.press(screen.getByText(lesson.lessonTitle));

    expect(await screen.findByText('New word')).toBeOnTheScreen();
  });

  it('navigates Dictionary and Hub with the active Language params', async () => {
    const user = setupUser();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'kreole' }
    });

    await screen.findByText('Kouri-Vini');
    await user.press(screen.getByTestId('home-dictionary-control'));
    expect(await screen.findByText('Kouri-Vini Dictionary')).toBeOnTheScreen();

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'kreole' }
    });
    await screen.findByText('Kouri-Vini');
    await user.press(screen.getByTestId('home-hub-control'));
    expect(await screen.findByText('Advanced Kouri-Vini Hub')).toBeOnTheScreen();
  });

  it('keeps an empty Mistakes control disabled', async () => {
    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    await screen.findByText('Louisiana French');
    expect(screen.getByTestId('home-mistakes-control')).toBeDisabled();
  });

});
