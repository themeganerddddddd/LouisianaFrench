import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ActivityRenderer from '../ActivityRenderer';

const introActivity = {
  cardId: 'test:intro',
  type: 'intro_card',
  prompt: 'Say hello',
  target: 'Bonjour',
  english: 'Hello',
  extraDetails: 'T-Boy says hello.'
};

function responderEvent() {
  return {
    persist: jest.fn(),
    currentTarget: { measure: jest.fn() },
    nativeEvent: { timestamp: Date.now(), pageX: 0, pageY: 0, touches: [], changedTouches: [] }
  };
}

describe('ActivityRenderer T-Boy Unit note control', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('applies the rest style, the pressed style while pressed, and opens the Unit note', () => {
    const onOpenPreface = jest.fn();

    render(
      <ActivityRenderer
        language="cajun"
        activity={introActivity}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
        onOpenPreface={onOpenPreface}
      />
    );

    const action = () => screen.getByRole('button', { name: 'T-Boy: open Unit note' });

    expect(StyleSheet.flatten(action().props.style)).toEqual(
      expect.objectContaining({ minWidth: 106, minHeight: 130 })
    );
    expect(StyleSheet.flatten(action().props.style).backgroundColor).not.toBe('#EAF3FF');

    fireEvent(action(), 'responderGrant', responderEvent());
    act(() => jest.runOnlyPendingTimers());

    expect(StyleSheet.flatten(action().props.style)).toEqual(
      expect.objectContaining({ minWidth: 106, minHeight: 130, backgroundColor: '#EAF3FF' })
    );

    fireEvent(action(), 'responderRelease', responderEvent());
    act(() => jest.runOnlyPendingTimers());

    expect(onOpenPreface).toHaveBeenCalledTimes(1);
    expect(StyleSheet.flatten(action().props.style).backgroundColor).not.toBe('#EAF3FF');
  });
});
