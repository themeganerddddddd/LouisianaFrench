import { createNavigationContainerRef } from '@react-navigation/native';
import { act, screen } from '@testing-library/react-native';

import { wordMastery } from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests } from '../../test/setupAppTest';
import * as learnerProgress from '../../learnerProgress';

jest.mock('../../data/lessonLoader', () =>
  require('../../test/fixtures/catalog/activities').fixtureCatalog
);

jest.mock('../../learnerProgress', () => {
  const actual = jest.requireActual('../../learnerProgress');
  return {
    ...actual,
    getWordProgress: jest.fn((...args) => actual.getWordProgress(...args))
  };
});

setupAppTests();

describe('DictionaryScreen focus race', () => {
  it('ignores a Word progress load that finishes after the screen loses focus', async () => {
    const navigationRef = createNavigationContainerRef();
    await seedAsyncStorage({ wordProgress: {} });

    renderApp({
      initialRouteName: 'Dictionary',
      initialParams: { language: 'cajun' },
      navigationRef
    });
    expect(await screen.findByText('Hello')).toBeOnTheScreen();
    await act(async () => {
      navigationRef.navigate('Advanced', { language: 'cajun' });
    });

    let resolveLateLoad;
    learnerProgress.getWordProgress.mockImplementationOnce(
      () => new Promise((resolve) => { resolveLateLoad = resolve; })
    );

    await act(async () => {
      navigationRef.goBack();
    });
    await act(async () => {
      navigationRef.navigate('Advanced', { language: 'cajun' });
    });
    expect(learnerProgress.getWordProgress).toHaveBeenCalled();
    await act(async () => {
      resolveLateLoad({ 'cajun:fixture_cajun_w01': wordMastery.mastered });
    });

    expect(screen.queryByText('Mastered', { includeHiddenElements: true })).toBeNull();
  });
});
