import { render, screen, userEvent, within } from '@testing-library/react-native';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';

import HomeAboutMenu from '../HomeAboutMenu';
import { aboutMenuFixture } from '../../test/fixtures/about/aboutFixtures';
import { accentFor } from '../../theme/languageAccent';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Feather: ({ testID, color, name }) => React.createElement(Text, {
      testID,
      color,
      name,
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
      borderColor: '#2771CB',
      borderRadius: 14,
      borderWidth: 2
    });
    expect(screen.getByTestId('about-menu-section')).toHaveStyle({
      backgroundColor: '#FFFFFF'
    });
    expect(screen.getByText('About Us')).toHaveStyle({ color: '#102A43' });
    expect(screen.getByTestId('about-menu-disclosure').props.color).toBe('#2771CB');
  });

  it('orders About Us then Support and hides Account until Identity ships', () => {
    render(
      <HomeAboutMenu
        {...aboutMenuFixture}
        identity={{ username: 'Ada' }}
        onAccount={jest.fn()}
        onToggle={jest.fn()}
        onSelect={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    const labels = within(screen.getByTestId('home-about-menu'))
      .getAllByRole('button')
      .map((node) => node.props.accessibilityLabel);
    expect(labels.indexOf('Account')).toBe(-1);
    expect(screen.queryByTestId('about-menu-account')).toBeNull();
    expect(screen.queryByText('Ada')).toBeNull();
    expect(screen.queryByLabelText(/Ada/)).toBeNull();
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

  it('keeps the menu open after the control that opened it is pressed', async () => {
    const user = userEvent.setup();
    render(<AboutMenuHarness />);

    await user.press(screen.getByLabelText('About menu'));

    expect(screen.getByTestId('home-about-menu')).toBeOnTheScreen();
    expect(screen.getByLabelText('About Us')).toBeOnTheScreen();
  });
});

function renderAccountRow(overrides = {}) {
  const props = {
    ...aboutMenuFixture,
    showAccountEntry: true,
    identity: null,
    onAccount: jest.fn(),
    onToggle: jest.fn(),
    onSelect: jest.fn(),
    onDismiss: jest.fn(),
    ...overrides
  };
  const view = render(<HomeAboutMenu {...props} />);
  return { ...view, onAccount: props.onAccount };
}

function rowLabels() {
  return within(screen.getByTestId('home-about-menu'))
    .getAllByRole('button')
    .map((node) => node.props.accessibilityLabel);
}

describe('HomeAboutMenu account row', () => {
  it('puts a person icon and Sign in or create one first for a guest', async () => {
    const user = userEvent.setup();
    const { onAccount } = renderAccountRow({
      identity: null,
      accentColor: accentFor('cajun')
    });

    expect(rowLabels()[0]).toBe('Sign in or create one');
    expect(screen.getByText('Sign in or create one')).toBeOnTheScreen();
    expect(screen.getByTestId('about-menu-account-icon').props.name).toBe('user');
    expect(screen.getByTestId('about-menu-account-icon').props.color).toBe(accentFor('cajun'));
    expect(screen.queryByTestId('about-menu-account-avatar')).toBeNull();
    expect(screen.getByTestId('about-menu-account')).toHaveStyle({ minHeight: 48 });
    expect(screen.getByTestId('home-about-menu')).toHaveStyle({
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#E2E8F0',
      width: 236,
      overflow: 'hidden'
    });

    await user.press(screen.getByTestId('about-menu-account'));
    expect(onAccount).toHaveBeenCalledTimes(1);
  });

  it('shows Learner and an L when signed in with no username', () => {
    const identities = [
      { id: '1', username: null },
      { id: '1', username: '' },
      { id: '1', email: 'ada@example.com', displayName: 'Ada' }
    ];

    for (const identity of identities) {
      const view = renderAccountRow({ identity });
      expect(screen.getByText('Learner')).toBeOnTheScreen();
      expect(screen.getByText('L')).toBeOnTheScreen();
      expect(screen.getByLabelText(/Learner/)).toBeOnTheScreen();
      expect(screen.queryByText('Ada')).toBeNull();
      expect(screen.queryByText('Sign in or create one')).toBeNull();
      view.unmount();
    }
  });

  it('shows the username and its first character uppercased', () => {
    const cases = [
      ['élise', 'É'],
      ['Élise', 'É'],
      ['1learner', '1'],
      ['_learner', '_']
    ];

    for (const [username, initial] of cases) {
      const view = renderAccountRow({
        identity: { username },
        accentColor: accentFor('kreole')
      });
      expect(screen.getByText(username)).toBeOnTheScreen();
      expect(screen.getByText(initial)).toBeOnTheScreen();
      expect(screen.getByLabelText(new RegExp(username))).toBeOnTheScreen();
      expect(screen.getByTestId('about-menu-account-avatar')).toHaveStyle({
        backgroundColor: accentFor('kreole')
      });
      expect(rowLabels()[0]).toContain(username);
      view.unmount();
    }
  });

  it('keeps a 20-character username inside the card without truncating it', () => {
    const username = 'Abcdefghij1234567890';
    renderAccountRow({ identity: { username } });

    const label = screen.getByText(username);
    expect(label.props.numberOfLines).toBeUndefined();
    expect(label).toHaveStyle({ flexShrink: 1 });
    expect(screen.getByTestId('about-menu-account')).toHaveStyle({
      minHeight: 48,
      maxWidth: '100%'
    });
    expect(screen.getByTestId('home-about-menu')).toHaveStyle({
      width: 236,
      overflow: 'hidden',
      borderRadius: 16
    });
    expect(screen.getByLabelText(new RegExp(username))).toBeOnTheScreen();
  });
});
