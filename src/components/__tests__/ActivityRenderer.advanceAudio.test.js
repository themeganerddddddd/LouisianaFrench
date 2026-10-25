import { createAudioPlayer } from 'expo-audio';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import ActivityRenderer from '../ActivityRenderer';

/**
 * Feedback loop for #335: advancing while Word Audio is still playing must
 * stop that clip before the next Activity can mount/play. Today Audio is only
 * released on unmount or replay, so Continue leaves it playing through the
 * LessonRunner outcome + transition delay — the Android silence symptom.
 */
describe('ActivityRenderer advance while Word Audio is playing (#335)', () => {
  const introActivity = {
    cardId: 'test:intro-advance-audio',
    type: 'intro_card',
    target: 'Bonjour',
    english: 'Hello',
    audioKey: 'u01_w0001_lf'
  };

  function players() {
    return createAudioPlayer.mock.results.map((result) => result.value);
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stops and releases autoplaying Word Audio as soon as Continue is pressed', () => {
    const onCorrect = jest.fn();
    render(
      <ActivityRenderer
        language="cajun"
        activity={introActivity}
        onCorrect={onCorrect}
        onWrong={jest.fn()}
      />
    );
    act(() => jest.advanceTimersByTime(500));

    const [autoplay] = players();
    expect(autoplay).toMatchObject({ playing: true, released: false });

    fireEvent.press(screen.getByText('Continue'));

    expect(onCorrect).toHaveBeenCalled();
    // Bug today: still playing until unmount. Fix: released on Continue.
    expect(autoplay).toMatchObject({
      playing: false,
      registered: false,
      released: true
    });
  });

  it('stops and releases Word Audio when Next Question is pressed after a correct answer', async () => {
    const onCorrect = jest.fn();
    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:mc-advance-audio',
          type: 'multiple_choice',
          prompt: "Choose the match for 'Hello'",
          english: 'Hello',
          answer: 'Bonjour',
          options: ['Bonjour', 'Merci'],
          audioKey: 'u01_w0001_lf'
        }}
        onCorrect={onCorrect}
        onWrong={jest.fn()}
      />
    );

    fireEvent.press(screen.getByText('Bonjour'));
    fireEvent.press(screen.getByText('Check'));
    expect(await screen.findByText('Correct!')).toBeOnTheScreen();

    // Replay / play the word while the correct footer is up, then advance.
    const hear = screen.queryByLabelText(/Play audio|Play the word|Tap/i);
    if (hear) {
      fireEvent.press(hear);
    } else {
      // Some MC layouts expose the target as a play control after reveal.
      const playable = screen.queryByLabelText('Play audio: Bonjour');
      if (playable) fireEvent.press(playable);
    }

    const beforeAdvance = players().filter((p) => p.playing && !p.released);
    fireEvent.press(screen.getByText('Next Question'));

    expect(onCorrect).toHaveBeenCalled();
    for (const player of beforeAdvance) {
      expect(player).toMatchObject({
        playing: false,
        registered: false,
        released: true
      });
    }
    // Feedback tone and any word clip that were live must be released.
    expect(players().every((p) => p.released || !p.playing)).toBe(true);
  });
});
