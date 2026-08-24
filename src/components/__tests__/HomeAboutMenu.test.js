import { render, screen } from '@testing-library/react-native';

import HomeAboutMenu from '../HomeAboutMenu';
import { aboutMenuFixture } from '../../test/fixtures/about/aboutFixtures';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Feather: ({ testID, color }) => React.createElement(Text, {
      testID,
      color,
      style: { color }
    })
  };
});

describe('HomeAboutMenu', () => {
  it('keeps the initial About Us panel white with readable controls', () => {
    render(
      <HomeAboutMenu
        {...aboutMenuFixture}
        onToggle={jest.fn()}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByTestId('home-about-menu')).toHaveStyle({
      backgroundColor: '#FFFFFF',
      borderColor: '#2771CB'
    });
    expect(screen.getByTestId('about-menu-section')).toHaveStyle({
      backgroundColor: '#FFFFFF'
    });
    expect(screen.getByText('About Us')).toHaveStyle({ color: '#102A43' });
    expect(screen.getByTestId('about-menu-disclosure').props.color).toBe('#2771CB');
  });
});
