import { describe, expect, it, jest } from '@jest/globals';
import { type ComponentProps, type ComponentType } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform, StyleSheet, type TextStyle } from 'react-native';

import {
  DestructiveButton,
  Field,
  LinkButton,
  PrimaryButton,
  SecondaryButton
} from '../formControls';

const ACCENT = '#123456';
const LONG = 'Choose a username so people know you on the board, even when the type is very large';

function flat(style: TextStyle | TextStyle[] | undefined): TextStyle {
  return StyleSheet.flatten(style) ?? {};
}

function renderField(props: Partial<ComponentProps<typeof Field>> = {}) {
  return render(
    <Field
      label="Email"
      value=""
      onChangeText={() => {}}
      accentColor={ACCENT}
      testID="email"
      {...props}
    />
  );
}

describe('Field', () => {
  it('puts the label above the input and does not rely on a placeholder', () => {
    renderField();

    expect(screen.getByText('Email')).toBeOnTheScreen();
    expect(screen.getByLabelText('Email').props.placeholder).toBeUndefined();
    expect(flat(screen.getByText('Email').props.style)).toMatchObject({
      fontSize: 12,
      fontWeight: '700'
    });
    expect(flat(screen.getByLabelText('Email').props.style)).toMatchObject({
      minHeight: 48,
      borderWidth: 1,
      borderColor: '#64748B',
      borderRadius: 12,
      fontSize: 15,
      fontWeight: '600'
    });
  });

  it('uses the accent prop for a native focus border without shifting the inset', () => {
    renderField();
    const input = screen.getByLabelText('Email');
    const resting = flat(input.props.style);
    const restingInset = Number(resting.borderWidth) + Number(resting.paddingHorizontal);

    fireEvent(input, 'focus');

    const focused = flat(screen.getByLabelText('Email').props.style);
    expect(focused).toMatchObject({
      borderWidth: 2,
      borderColor: ACCENT,
      minHeight: 48
    });
    expect(Number(focused.borderWidth) + Number(focused.paddingHorizontal)).toBe(restingInset);
    expect(focused.borderColor).not.toBe('#2771CB');
    expect(focused.borderColor).not.toBe('#08834C');
  });

  it('uses an offset accent outline on web and keeps the 1px field border', () => {
    const previous = Platform.OS;
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'web' });
    try {
      renderField();
      fireEvent(screen.getByLabelText('Email'), 'focus');

      expect(flat(screen.getByLabelText('Email').props.style)).toMatchObject({
        borderWidth: 1,
        borderColor: '#64748B',
        outlineWidth: 2,
        outlineOffset: 2,
        outlineColor: ACCENT
      });
    } finally {
      Object.defineProperty(Platform, 'OS', { configurable: true, get: () => previous });
    }
  });

  it('shows an error border, icon, and message announced to screen readers', () => {
    renderField({ error: 'That email is already registered.' });

    expect(flat(screen.getByLabelText('Email').props.style)).toMatchObject({
      borderWidth: 2,
      borderColor: '#DC2626'
    });
    expect(screen.getByTestId('email-error-icon')).toBeOnTheScreen();
    const message = screen.getByRole('alert');
    expect(message).toHaveTextContent('That email is already registered.');
    expect(message.props.accessibilityLiveRegion).toBe('assertive');
    expect(flat(message.props.style)).toMatchObject({
      color: '#B91C1C',
      fontSize: 13,
      fontWeight: '700'
    });
    expect(screen.getByLabelText('Email').props.accessibilityHint).toBe(
      'That email is already registered.'
    );
  });

  it('keeps the error border when the field is also focused', () => {
    renderField({ error: 'Use at least 8 characters.' });
    fireEvent(screen.getByLabelText('Email'), 'focus');

    const style = flat(screen.getByLabelText('Email').props.style);
    expect(style.borderColor).toBe('#DC2626');
    expect(style.borderWidth).toBe(2);
    expect(style.outlineColor).not.toBe(ACCENT);
    expect(style.borderColor).not.toBe(ACCENT);
  });

  it('wraps a long label and error at large type without clipping', () => {
    const error = `${LONG}. That email is already registered.`;
    renderField({ label: LONG, error });

    for (const text of [screen.getByText(LONG), screen.getByRole('alert')]) {
      const style = flat(text.props.style);
      expect(text.props.numberOfLines).toBeUndefined();
      expect(text.props.allowFontScaling).not.toBe(false);
      expect(text.props.maxFontSizeMultiplier).toBeUndefined();
      expect(style.height).toBeUndefined();
      expect(style.maxHeight).toBeUndefined();
      expect(style.overflow).not.toBe('hidden');
    }
    expect(screen.getByRole('alert')).toHaveTextContent(error);
  });
});

describe('account buttons', () => {
  it.each<[string, ComponentType<ComponentProps<typeof SecondaryButton>>]>([
    ['primary', PrimaryButton],
    ['secondary', SecondaryButton],
    ['link', LinkButton],
    ['destructive', DestructiveButton]
  ])('gives the %s control a hit area of at least 44 by 44', (_name, Button) => {
    render(<Button label="Continue" onPress={() => {}} accentColor={ACCENT} testID="control" />);
    const style = flat(screen.getByTestId('control').props.style);
    expect(Number(style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(Number(style.minWidth)).toBeGreaterThanOrEqual(44);
  });

  it('keeps the primary label, fades, and ignores presses while loading', () => {
    const onPress = jest.fn();
    render(
      <PrimaryButton label="Sign in" onPress={onPress} accentColor={ACCENT} loading testID="sign-in" />
    );

    const button = screen.getByTestId('sign-in');
    fireEvent.press(button);
    fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByText('Sign in')).toBeOnTheScreen();
    expect(screen.getByTestId('sign-in-spinner')).toBeOnTheScreen();
    expect(flat(button.props.style).opacity).toBe(0.55);
    expect(button.props.accessibilityState).toEqual({ disabled: true, busy: true });
    expect(flat(button.props.style).backgroundColor).toBe(ACCENT);
  });

  it('locks the destructive control and marks it busy while loading', () => {
    const onPress = jest.fn();
    render(<DestructiveButton label=Delete onPress={onPress} accentColor={ACCENT} confirm loading testID=del />);
    fireEvent.press(screen.getByTestId('del'));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByTestId('del-spinner')).toBeOnTheScreen();
    expect(screen.getByTestId('del').props.accessibilityState).toEqual({ disabled: true, busy: true });
  });

  it('calls onPress once per press when the primary button is idle', () => {
    const onPress = jest.fn();
    render(<PrimaryButton label="Sign in" onPress={onPress} accentColor={ACCENT} testID="sign-in" />);

    fireEvent.press(screen.getByTestId('sign-in'));
    fireEvent.press(screen.getByTestId('sign-in'));

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('paints the link with the accent prop and no underline', () => {
    render(<LinkButton label="Forgot password?" onPress={() => {}} accentColor={ACCENT} />);
    expect(flat(screen.getByText('Forgot password?').props.style)).toMatchObject({
      color: ACCENT,
      textDecorationLine: 'none',
      fontSize: 15,
      fontWeight: '800'
    });
  });

  it('paints secondary with the field border and ink, not a Language color', () => {
    render(<SecondaryButton label="Keep my account" onPress={() => {}} accentColor={ACCENT} testID="keep" />);
    const style = flat(screen.getByTestId('keep').props.style);
    expect(style.backgroundColor).toBe('#FFFFFF');
    expect(style.borderColor).toBe('#64748B');
    expect(style.backgroundColor).not.toBe('#2771CB');
    expect(style.backgroundColor).not.toBe('#08834C');
    expect(flat(screen.getByText('Keep my account').props.style).color).toBe('#102A43');
  });

  it('uses error text for the destructive entry and danger for confirm', () => {
    const { rerender } = render(
      <DestructiveButton label="Delete account" onPress={() => {}} accentColor={ACCENT} testID="delete" />
    );
    expect(flat(screen.getByText('Delete account').props.style).color).toBe('#B91C1C');
    expect(screen.getByTestId('delete-icon')).toBeOnTheScreen();

    rerender(
      <DestructiveButton
        label="Delete account"
        onPress={() => {}}
        accentColor={ACCENT}
        testID="delete"
        confirm
      />
    );
    expect(flat(screen.getByTestId('delete').props.style).backgroundColor).toBe('#DC2626');
    expect(flat(screen.getByText('Delete account').props.style).color).toBe('#FFFFFF');
  });

  it('wraps a long button label without clipping', () => {
    render(<PrimaryButton label={LONG} onPress={() => {}} accentColor={ACCENT} testID="long" />);
    const text = screen.getByText(LONG);
    const button = flat(screen.getByTestId('long').props.style);
    expect(text.props.numberOfLines).toBeUndefined();
    expect(text.props.allowFontScaling).not.toBe(false);
    expect(flat(text.props.style).height).toBeUndefined();
    expect(button.height).toBeUndefined();
    expect(button.overflow).not.toBe('hidden');
    expect(button.minHeight).toBeGreaterThanOrEqual(44);
  });
});
