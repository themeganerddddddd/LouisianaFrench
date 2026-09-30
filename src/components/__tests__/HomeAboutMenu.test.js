import { render, screen, userEvent } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

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

function AboutMenuHarness() {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="About menu"
        onPress={() => setVisible((open) => !open)}
      >
        <Text>Open</Text>
      </Pressable>
      <HomeAboutMenu
        {...aboutMenuFixture}
        visible={visible}
        onToggle={jest.fn()}
        onSelect={jest.fn()}
        onDismiss={() => setVisible(false)}
      />
    </>
  );
}

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

  it('keeps the menu open after the control that opened it is pressed', async () => {
    const user = userEvent.setup();
    render(<AboutMenuHarness />);

    await user.press(screen.getByLabelText('About menu'));

    expect(screen.getByTestId('home-about-menu')).toBeOnTheScreen();
    expect(screen.getByLabelText('About Us')).toBeOnTheScreen();
  });
});
