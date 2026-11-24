import { screen } from '@testing-library/react-native';

import { renderApp } from '../../test/renderApp';
import { setupAppTests } from '../../test/setupAppTest';
import { setDefaultLanguage } from '../../utils/storage';

// Profile storage rejects an unknown Language. This test is about the Home theme.
jest.mock('../../utils/homeProjection', () => ({
  getHomeProjection: async (language) => ({
    language,
    units: [],
    dashboard: { reviewCount: 0, pendingMistakeCount: 0, reviewEnabled: false },
    plan: { steps: [] },
    firstDay: false
  })
}));

setupAppTests();

describe('Home start accent fallback', () => {
  it('renders an unknown stored language with the Kouri-Vini start colour', async () => {
    await setDefaultLanguage('spanish');
    renderApp({ initialRouteName: 'Home' });

    expect(await screen.findByText('Kouri-Vini')).toBeOnTheScreen();
    expect(screen.getByText('Report a bug')).toHaveStyle({ color: '#08834C' });
  });
});
