import { screen } from '@testing-library/react-native';
import { seedRawAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { pendingMistakes } from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';

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

describe('Mistake Review with a blank pending record', () => {
  it('skips null and blank records and shows the valid mistakes', async () => {
    const user = setupUser();
    const choice = pendingMistakes.cajun.greetingChoice;
    const listen = pendingMistakes.cajun.greetingListen;

    await seedRawAsyncStorage({
      pendingMistakes: JSON.stringify({
        cajun: {
          blank: '',
          [choice.cardId]: choice,
          spaced: '   ',
          gone: null,
          [listen.cardId]: listen
        }
      })
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByTestId('mistakes-count')).toHaveTextContent('5');
    await user.press(screen.getByTestId('home-mistakes-control'));

    expect(await screen.findByText('Mistake Review')).toBeOnTheScreen();
    expect(screen.getByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    expect(screen.getByText('1 / 2')).toBeOnTheScreen();

    await user.press(screen.getByText('Ça va?'));
    await user.press(screen.getByText('Check'));
    await user.press(screen.getByText('Next Question'));

    expect(await screen.findByText('Listen and choose the word')).toBeOnTheScreen();
    expect(screen.getByText('2 / 2')).toBeOnTheScreen();
    expect(screen.queryByText("Choose the match for 'How’s it going?'")).toBeNull();
  });
});
