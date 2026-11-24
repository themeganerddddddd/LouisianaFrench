import { screen } from '@testing-library/react-native';

import { renderApp } from '../../test/renderApp';
import { setupAppTests } from '../../test/setupAppTest';

jest.mock('../../theme/languageAccent', () => ({
  accentFor: (language) => (language === 'kreole' ? '#11AA11' : '#BB22BB')
}));

setupAppTests();

describe('Home start accent', () => {
  it.each([
    ['cajun', '#BB22BB'],
    ['kreole', '#11AA11']
  ])('paints the %s start control from accentFor, not a copied hex', async (language, accent) => {
    renderApp({ initialRouteName: 'Home', initialParams: { language } });

    expect(await screen.findByText('Report a bug')).toHaveStyle({ color: accent });
  });
});
