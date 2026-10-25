import { act, fireEvent, render, screen, userEvent, waitFor } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';
import ActivityRenderer from '../ActivityRenderer';
import { chooseAndCheck, retry } from '../../test/activityInteractions';
import { fixtureActivities } from '../../test/fixtures/catalog/activities';

function renderActivity(activity) {
  const onCorrect = jest.fn();
  const onWrong = jest.fn();

  render(
    <ActivityRenderer
      language="cajun"
      activity={activity}
      onCorrect={onCorrect}
      onWrong={onWrong}
    />
  );

  return { onCorrect, onWrong };
}

function doublePress(label) {
  const button = screen.getByText(label);

  fireEvent.press(button);
  expect(screen.getByText(label)).toBeDisabled();
  fireEvent.press(button);
}

describe('ActivityRenderer submission', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ignores a rapid double press on Continue', () => {
    const { onCorrect } = renderActivity(fixtureActivities.intro);

    doublePress('Continue');

    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it('ignores a rapid double press on Next Question', async () => {
    const user = userEvent.setup();
    const { onCorrect } = renderActivity(fixtureActivities.multipleChoice);

    await chooseAndCheck(user, 'Ça va?');
    doublePress('Next Question');

    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it('ignores a rapid double press on final wrong Continue', async () => {
    const user = userEvent.setup();
    const { onWrong } = renderActivity(fixtureActivities.multipleChoice);

    await chooseAndCheck(user, 'Bonjour');
    await retry(user);
    await chooseAndCheck(user, 'Bonjour');
    doublePress('Continue');

    expect(onWrong).toHaveBeenCalledTimes(1);
    expect(onWrong).toHaveBeenCalledWith('Bonjour');
  });

  it('ignores two presses on Next Question in the same frame', async () => {
    const user = userEvent.setup();
    const { onCorrect } = renderActivity(fixtureActivities.multipleChoice);

    await chooseAndCheck(user, 'Ça va?');
    const nextButton = screen.getByText('Next Question');

    act(() => {
      fireEvent.press(nextButton);
      fireEvent.press(nextButton);
    });

    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  // #330: FeedbackFooter / submitOnce one-shot must not leave Next Question dead
  // when the session advance (recordActivityOutcome) rejects.
  it('re-enables Next Question when onCorrect rejects so the learner can retry', async () => {
    const user = userEvent.setup();
    const onCorrect = jest
      .fn()
      .mockRejectedValueOnce(new Error('storage unavailable'))
      .mockResolvedValueOnce(undefined);
    const onWrong = jest.fn();

    render(
      <ActivityRenderer
        language="kreole"
        activity={{
          ...fixtureActivities.typing,
          cardId: 'fixture:kreole:going:typing',
          english: 'How is it going?',
          answer: "Komen ç'apé kouri?",
          answerDisplay: "Komen ç'apé kouri?",
          target: "Komen ç'apé kouri?"
        }}
        onCorrect={onCorrect}
        onWrong={onWrong}
      />
    );

    expect(screen.getByText("Type: 'How is it going?'")).toBeOnTheScreen();
    await user.type(screen.getByPlaceholderText('Type your answer'), "Komen ç'apé kouri?");
    await user.press(screen.getByText('Check'));
    expect(screen.getByText('Correct!')).toBeOnTheScreen();

    await user.press(screen.getByText('Next Question'));

    await waitFor(() => expect(onCorrect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('Next Question')).not.toBeDisabled());

    await user.press(screen.getByText('Next Question'));
    await waitFor(() => expect(onCorrect).toHaveBeenCalledTimes(2));
  });
});

describe('ActivityRenderer requested interaction behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks matching pairs immediately after one item from each column is selected', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:match',
          type: 'match_pairs',
          prompt: 'Match the words',
          pairs: [
            { left: 'Hello', right: 'Bonjour' },
            { left: 'Thanks', right: 'Merci' }
          ]
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    // Matching no longer uses a separate Check button.
    expect(screen.queryByText('Check')).toBeNull();

    await user.press(screen.getByText('Hello'));
    await user.press(screen.getByText('Bonjour'));

    // The first correct pair is accepted immediately, but the activity is not
    // finished until every pair has been matched.
    expect(screen.queryByText('Correct!')).toBeNull();

    await user.press(screen.getByText('Thanks'));
    await user.press(screen.getByText('Merci'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();
  });

  it('shows feedback immediately when a matching pair is wrong', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:match-wrong',
          type: 'match_pairs',
          prompt: 'Match the words',
          pairs: [
            { left: 'Hello', right: 'Bonjour' },
            { left: 'Thanks', right: 'Merci' }
          ]
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    await user.press(screen.getByText('Hello'));
    await user.press(screen.getByText('Merci'));

    expect(await screen.findByText('Not quite')).toBeOnTheScreen();
  });

  it('accepts alt_variant_text as a correct spelling', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="kreole"
        activity={{
          cardId: 'test:typing-alt',
          type: 'typing',
          prompt: "Type: 'I'",
          english: 'I',
          answer: 'mo',
          answerDisplay: 'mo',
          alt_variant_text: 'mwen'
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText('Type your answer'),
      'mwen'
    );

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();
  });

  it('accepts Je suis as a correct spelling of j’sus', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:typing-je-suis',
          type: 'typing',
          prompt: "Type: 'I am'",
          english: 'I am',
          answer: 'j’sus',
          answerDisplay: 'j’sus'
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText('Type your answer'),
      'Je suis'
    );

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();
  });

  it('accepts Je suis inside a sentence whose answer uses j’sus', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:typing-je-suis-sentence',
          type: 'typing',
          prompt: "Type: 'I’m free Saturday.'",
          english: 'I’m free Saturday.',
          answer: 'J’sus libre samedi.',
          answerDisplay: 'J’sus libre samedi.'
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    await user.type(
      screen.getByPlaceholderText('Type your answer'),
      'Je suis libre samedi.'
    );

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();
  });

  describe('Typing Audio', () => {
    const typingActivity = {
      cardId: 'test:typing-audio',
      type: 'typing',
      prompt: "Type: 'hello friend'",
      english: 'hello friend',
      answer: 'Bonjour ami',
      answerDisplay: 'Bonjour ami',
      audioKey: 'u01_w0001_lf'
    };

    const wordAudioPlayers = () =>
      createAudioPlayer.mock.results
        .filter((_, index) => !createAudioPlayer.mock.calls[index][0]?.uri)
        .map(({ value }) => value);

    function renderTyping(activity = typingActivity) {
      return render(
        <ActivityRenderer
          key={activity.cardId}
          language="cajun"
          activity={activity}
          onCorrect={jest.fn()}
          onWrong={jest.fn()}
        />
      );
    }

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('plays the Word Audio 500ms after the Activity appears', async () => {
      renderTyping();

      expect(screen.getByText('Tap to hear the word')).toBeOnTheScreen();
      await jest.advanceTimersByTimeAsync(499);
      expect(wordAudioPlayers()).toHaveLength(0);

      await jest.advanceTimersByTimeAsync(1);
      expect(wordAudioPlayers()).toHaveLength(1);
    });

    it('does not autoplay or offer tap to hear when the Activity has no audioKey', async () => {
      renderTyping({ ...typingActivity, audioKey: undefined });

      expect(screen.queryByText('Tap to hear the word')).toBeNull();
      await jest.advanceTimersByTimeAsync(1000);
      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('replays the Word Audio when the learner taps Tap to hear the word', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderTyping();
      await jest.advanceTimersByTimeAsync(500);

      await user.press(screen.getByRole('button', { name: 'Play the word' }));

      expect(wordAudioPlayers()).toHaveLength(2);
    });

    it('keeps word-bank taps silent and does not play the Word Audio again after a correct answer', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderTyping();
      await jest.advanceTimersByTimeAsync(500);
      expect(wordAudioPlayers()).toHaveLength(1);

      await user.press(screen.getByText('Hints'));
      await user.press(screen.getByText('More hints'));
      await user.press(screen.getByText('Bonjour'));
      await user.press(screen.getByText('ami'));
      expect(wordAudioPlayers()).toHaveLength(1);

      await user.press(screen.getByText('Check'));

      expect(await screen.findByText('Correct!')).toBeOnTheScreen();
      await jest.advanceTimersByTimeAsync(1000);
      expect(createAudioPlayer).toHaveBeenCalledTimes(2);
      expect(wordAudioPlayers()).toHaveLength(1);
      expect(wordAudioPlayers()[0].remove).not.toHaveBeenCalled();
    });

    it('does not autoplay again after Try Again', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderTyping();
      await jest.advanceTimersByTimeAsync(500);

      await user.type(screen.getByPlaceholderText('Type your answer'), 'nope');
      await user.press(screen.getByText('Check'));
      await user.press(await screen.findByText('Try Again'));
      await jest.advanceTimersByTimeAsync(1000);

      expect(wordAudioPlayers()).toHaveLength(1);
    });

    it('cancels autoplay when the Activity changes before 500ms', async () => {
      const { rerender } = renderTyping();
      await jest.advanceTimersByTimeAsync(300);

      rerender(
        <ActivityRenderer
          key="test:typing-audio-next"
          language="cajun"
          activity={{ ...typingActivity, cardId: 'test:typing-audio-next', audioKey: undefined }}
          onCorrect={jest.fn()}
          onWrong={jest.fn()}
        />
      );
      await jest.advanceTimersByTimeAsync(1000);

      expect(createAudioPlayer).not.toHaveBeenCalled();
    });

    it('releases the Word Audio when the Activity unmounts', async () => {
      const { unmount } = renderTyping();
      await jest.advanceTimersByTimeAsync(500);
      const [player] = wordAudioPlayers();

      unmount();

      expect(player.remove).toHaveBeenCalled();
    });

    it('releases Word Audio that is still loading when the Activity unmounts and plays nothing later', async () => {
      const { unmount } = renderTyping();
      await jest.advanceTimersByTimeAsync(500);
      const [player] = wordAudioPlayers();

      unmount();
      await jest.advanceTimersByTimeAsync(1000);

      expect(player.remove).toHaveBeenCalledTimes(1);
      expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    });

    it('plays one sound when the learner taps Tap to hear the word while the autoplay is still loading', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const { unmount } = renderTyping();
      await jest.advanceTimersByTimeAsync(500);

      await user.press(screen.getByRole('button', { name: 'Play the word' }));
      const [autoplay, tap] = wordAudioPlayers();

      expect(autoplay.remove).toHaveBeenCalledTimes(1);
      expect(autoplay.remove.mock.invocationCallOrder[0])
        .toBeLessThan(tap.play.mock.invocationCallOrder[0]);
      expect(tap.play).toHaveBeenCalledTimes(1);
      expect(tap.remove).not.toHaveBeenCalled();

      unmount();

      expect(tap.remove).toHaveBeenCalledTimes(1);
    });

    it('does not autoplay when the learner answers before 500ms', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderTyping();

      await user.type(screen.getByPlaceholderText('Type your answer'), 'Bonjour ami');
      await user.press(screen.getByText('Check'));
      expect(await screen.findByText('Correct!')).toBeOnTheScreen();
      await jest.advanceTimersByTimeAsync(1000);

      expect(wordAudioPlayers()).toHaveLength(0);
    });
  });

  it('does not play sentence-builder audio while word buttons are pressed and plays it only after a correct answer', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:sentence-build-audio',
          type: 'sentence_build',
          prompt: "Build: 'hello friend'",
          english: 'hello friend',
          answer: 'Bonjour ami',
          answerDisplay: 'Bonjour ami',
          answerTokens: ['Bonjour', 'ami'],
          words: ['Bonjour', 'ami'],
          audioKey: 'u01_w0001_lf'
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    expect(createAudioPlayer).not.toHaveBeenCalled();

    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('ami'));

    // Selecting sentence-builder words should stay silent.
    expect(createAudioPlayer).not.toHaveBeenCalled();

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();

    // One call is the correct-answer tone.
    // The second is the completed sentence's audio.
    expect(createAudioPlayer).toHaveBeenCalledTimes(2);
  });
});

describe('ActivityRenderer Word Audio playback', () => {
  const introActivity = {
    cardId: 'test:intro-audio',
    type: 'intro_card',
    target: 'Bonjour',
    english: 'Hello',
    audioKey: 'u01_w0001_lf'
  };

  function renderIntro() {
    return render(
      <ActivityRenderer
        language="cajun"
        activity={introActivity}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );
  }

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

  it('stops and releases the autoplaying Word Audio when the learner replays it', () => {
    renderIntro();
    act(() => jest.advanceTimersByTime(500));

    fireEvent.press(screen.getByLabelText('Play audio: Bonjour'));

    const [autoplay, replay] = players();
    expect(autoplay).toMatchObject({ playing: false, registered: false, released: true });
    expect(replay).toMatchObject({ playing: true, released: false });
  });

  it('stops and releases the Word Audio when the Activity unmounts', () => {
    const { unmount } = renderIntro();
    act(() => jest.advanceTimersByTime(500));

    unmount();

    expect(players()).toEqual([expect.objectContaining({ playing: false, registered: false, released: true })]);
  });
});