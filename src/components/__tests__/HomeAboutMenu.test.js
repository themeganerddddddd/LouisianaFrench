import { render, screen, userEvent, within } from '@testing-library/react-native';
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
        onAccount={jest.fn()}
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
        onAccount={jest.fn()}
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

  it('orders Account, About Us, then Support at the top level', () => {
    render(
      <HomeAboutMenu
        {...aboutMenuFixture}
        onAccount={jest.fn()}
        onToggle={jest.fn()}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    const labels = within(screen.getByTestId('home-about-menu'))
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel);
    expect(labels.indexOf('Account')).toBeGreaterThanOrEqual(0);
    expect(labels.indexOf('Account')).toBeLessThan(labels.indexOf('About Us'));
    expect(labels.indexOf('About Us')).toBeLessThan(labels.indexOf('Support'));
    expect(screen.queryByTestId('about-menu-leaf-support')).toBeNull();
  });

  it('calls onSelect(support) from the top-level Support row', async () => {
    const user = userEvent.setup();
    const onSelect = jest.fn();
    render(
      <HomeAboutMenu
        {...aboutMenuFixture}
        onAccount={jest.fn()}
        onToggle={jest.fn()}
        onSelect={onSelect}
        onDismiss={jest.fn()}
      />
    );

    await user.press(screen.getByTestId('about-menu-support'));
    expect(onSelect).toHaveBeenCalledWith('support');
  });

  it('shows the display name with Account when signed in', () => {
    render(
      <HomeAboutMenu
        {...aboutMenuFixture}
        accountDetail="Ada"
        onAccount={jest.fn()}
        onToggle={jest.fn()}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Account, Ada')).toBeOnTheScreen();
    expect(screen.getByText('Ada')).toBeOnTheScreen();
  });

  it('keeps the menu open after the control that opened it is pressed', async () => {
    const user = userEvent.setup();
    render(<AboutMenuHarness />);

    await user.press(screen.getByLabelText('About menu'));

    expect(screen.getByTestId('home-about-menu')).toBeOnTheScreen();
    expect(screen.getByLabelText('About Us')).toBeOnTheScreen();
  });
});
