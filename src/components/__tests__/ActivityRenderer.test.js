import { render, screen, userEvent } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import ActivityRenderer from '../ActivityRenderer';

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

  it('does not play typing audio while word-bank buttons are pressed and plays it only after a correct answer', async () => {
    const user = userEvent.setup();

    render(
      <ActivityRenderer
        language="cajun"
        activity={{
          cardId: 'test:typing-audio',
          type: 'typing',
          prompt: "Type: 'hello friend'",
          english: 'hello friend',
          answer: 'Bonjour ami',
          answerDisplay: 'Bonjour ami',
          audioKey: 'u01_w0001_lf'
        }}
        onCorrect={jest.fn()}
        onWrong={jest.fn()}
      />
    );

    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

    await user.press(screen.getByText('Hints'));
    await user.press(screen.getByText('More hints'));

    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('ami'));

    // Pressing word-bank buttons should not play audio.
    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();

    // One call is the correct-answer tone.
    // The second is the completed answer's audio.
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(2);
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

    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

    await user.press(screen.getByText('Bonjour'));
    await user.press(screen.getByText('ami'));

    // Selecting sentence-builder words should stay silent.
    expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

    await user.press(screen.getByText('Check'));

    expect(await screen.findByText('Correct!')).toBeOnTheScreen();

    // One call is the correct-answer tone.
    // The second is the completed sentence's audio.
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(2);
  });
});