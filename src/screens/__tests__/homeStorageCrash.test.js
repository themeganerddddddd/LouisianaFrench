import { screen } from '@testing-library/react-native';
import { seedRawAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests } from '../../test/setupAppTest';

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

describe('Home with damaged Learner Progress', () => {
  it('shows the mistake count when a pending record is null or blank', async () => {
    await seedRawAsyncStorage({
      pendingMistakes: JSON.stringify({
        cajun: {
          blank: '',
          spaced: '   ',
          gone: null
        }
      })
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.getByTestId('home-stats')).toHaveTextContent(
      "Welcome! Let's learn new words."
    );
    expect(screen.getByTestId('mistakes-count')).toHaveTextContent('3');
    expect(screen.getByTestId('home-mistakes-control').props.accessibilityLabel)
      .toBe('Mistakes, 3 pending');
  });

  it('shows Home when a pending record is bad and other saved values are not JSON', async () => {
    await seedRawAsyncStorage({
      pendingMistakes: JSON.stringify({
        cajun: {
          blank: '',
          gone: null
        }
      }),
      practiceLog: 'not-json',
      profileCajun: '{',
      profileMigrated: 'true',
      lessonProgress: 'not-json',
      wordProgress: '{',
      reviewState: 'not-json',
      dailyReviewLogV2Cajun: '{',
      dailyReviewMigrated: 'true',
      lastWorkedUnit: 'not-json'
    });

    renderApp({
      initialRouteName: 'Home',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByText('Louisiana French')).toBeOnTheScreen();
    expect(screen.getByTestId('home-stats')).toHaveTextContent(
      "Welcome! Let's learn new words."
    );
    expect(screen.getByTestId('home-plan')).toBeOnTheScreen();
    expect(screen.getByTestId('mistakes-count')).toHaveTextContent('2');
  });
});
