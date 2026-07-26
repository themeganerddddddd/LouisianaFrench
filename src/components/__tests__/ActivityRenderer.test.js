import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
import ActivityRenderer from '../ActivityRenderer';
import { fixtureActivities } from '../../test/fixtures/catalog/activities';
import {
  chooseAndCheck,
  expectFinalWrong,
  expectFirstWrong,
  finishCorrect,
  finishWrong,
  press,
  retry
} from '../../test/activityInteractions';

jest.mock('../../data/audioManifest', () => ({
  getAudioSource: jest.fn(() => ({ uri: 'fixture-audio' }))
}));

function renderActivity(activity, handlers = {}) {
  const onCorrect = handlers.onCorrect || jest.fn();
  const onWrong = handlers.onWrong || jest.fn();

  render(
    <ActivityRenderer
      activity={activity}
      language="cajun"
      onCorrect={onCorrect}
      onWrong={onWrong}
    />
  );

  return { onCorrect, onWrong };
}

async function expectAudioPlayedAfter(callsBeforePress) {
  await waitFor(() => {
    expect(Audio.Sound.createAsync).toHaveBeenCalledTimes(callsBeforePress + 1);
  });
  const { sound } = await Audio.Sound.createAsync.mock.results.at(-1).value;
  expect(sound.playAsync).toHaveBeenCalledTimes(1);
}

describe('ActivityRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('intro_card', () => {
    it('shows the Word and continues without checking an answer', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.intro);

      expect(screen.getByText('New word')).toBeOnTheScreen();
      expect(screen.getByText('Listen and learn')).toBeOnTheScreen();
      expect(screen.getByText('Bonjour')).toBeOnTheScreen();
      expect(screen.getByText('Hello')).toBeOnTheScreen();
      expect(screen.getByText('Tap the word to hear it again')).toBeOnTheScreen();

      await press(user, 'Continue');
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });

    it('plays Audio when the Word card is tapped', async () => {
      const user = userEvent.setup();
      renderActivity(fixtureActivities.intro);
      const callsBeforePress = Audio.Sound.createAsync.mock.calls.length;

      await press(user, 'Bonjour');
      await expectAudioPlayedAfter(callsBeforePress);
    });
  });

  describe('multiple_choice', () => {
    it('keeps Check disabled until an option is selected', () => {
      renderActivity(fixtureActivities.multipleChoice);

      expect(screen.getByText('Practice')).toBeOnTheScreen();
      expect(screen.getByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();
    });

    it('accepts the correct answer and continues', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.multipleChoice);

      await chooseAndCheck(user, 'Ça va?');
      await finishCorrect(user, onCorrect);
    });

    it('offers a first-wrong retry with a hint, then shows the answer on final wrong', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.multipleChoice);

      await chooseAndCheck(user, 'Bonjour');
      expectFirstWrong('Hint: think about "How’s it going?"');
      await retry(user);
      await chooseAndCheck(user, 'Bonjour');
      expectFinalWrong('Ça va?');
      await finishWrong(user, onWrong, 'Bonjour');
    });
  });

  describe('listening_target_choice', () => {
    it('starts unanswered and replays the target Audio', async () => {
      const user = userEvent.setup();
      renderActivity(fixtureActivities.listening);

      expect(screen.getByText('Listening')).toBeOnTheScreen();
      expect(screen.getByText('Listen and choose the word')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();
      const callsBeforePress = Audio.Sound.createAsync.mock.calls.length;

      await user.press(screen.UNSAFE_getByType(Ionicons).parent);
      await expectAudioPlayedAfter(callsBeforePress);
    });

    it('accepts the correct answer and continues', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.listening);

      await chooseAndCheck(user, 'Bonjour');
      await finishCorrect(user, onCorrect);
    });

    it('offers a first-wrong hint, then continues after final wrong', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.listening);

      await chooseAndCheck(user, 'Ça va?');
      expectFirstWrong('Hint: think about "Hello"');
      await retry(user);
      await chooseAndCheck(user, 'Ça va?');
      expectFinalWrong('Bonjour');
      await finishWrong(user, onWrong, 'Ça va?');
    });
  });

  describe('typing', () => {
    it('accepts a typed answer and exposes progressive hints', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.typing);

      expect(screen.getByText('Typing')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await press(user, 'Hints');
      expect(screen.getByText('Starts with: Ça …')).toBeOnTheScreen();

      await press(user, 'More hints');
      expect(
        screen.getByText('Tap words to help build the answer')
      ).toBeOnTheScreen();
      expect(screen.getByText('Ça')).toBeOnTheScreen();
      expect(screen.getByText('va?')).toBeOnTheScreen();

      await user.type(screen.getByPlaceholderText('Type your answer'), 'Ça va?');
      await press(user, 'Check');
      await finishCorrect(user, onCorrect);
    });

    it('records final wrong after a retry', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.typing);

      await user.type(screen.getByPlaceholderText('Type your answer'), 'Bonjour');
      await press(user, 'Check');
      expectFirstWrong('Starts with: Ça …');
      await retry(user);
      await press(user, 'Check');
      expectFinalWrong('Ça va?');
      await finishWrong(user, onWrong, 'Bonjour');
    });
  });

  describe('sentence_build', () => {
    it('builds the correct token order and continues', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.sentenceBuild);

      expect(screen.getByText('Build')).toBeOnTheScreen();
      expect(screen.getByText("Build: 'It's ready'")).toBeOnTheScreen();
      expect(screen.getByText('Tap words below')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await press(user, "C'est");
      await chooseAndCheck(user, 'paré');
      await finishCorrect(user, onCorrect);
    });

    it('shows answer feedback after a second wrong build', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.sentenceBuild);

      await chooseAndCheck(user, 'paré');
      expectFirstWrong("Starts with: C'e…");
      await retry(user);
      await press(user, 'Check');
      expectFinalWrong("C'est paré");
      await finishWrong(user, onWrong, 'paré');
    });
  });

  describe('match_pairs', () => {
    it('matches every pair correctly', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.matchPairs);

      expect(screen.getByText('Match')).toBeOnTheScreen();
      expect(screen.getByText('Match the words')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await press(user, 'Hello');
      await chooseAndCheck(user, 'Bonjour');
      await press(user, 'How’s it going?');
      await chooseAndCheck(user, 'Ça va?');
      await finishCorrect(user, onCorrect);
    });

    it('allows retry after a wrong pair, then continues after final wrong', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.matchPairs);

      await press(user, 'Hello');
      await chooseAndCheck(user, 'Ça va?');
      expectFirstWrong();
      await retry(user);
      await chooseAndCheck(user, 'Ça va?');
      expectFinalWrong();
      await finishWrong(user, onWrong, 'Hello ↔ Ça va?');
    });
  });

  it('reports unknown Activity types without crashing', () => {
    renderActivity({ type: 'unknown_future_type', prompt: 'x' });
    expect(screen.getByText('Unknown activity type: unknown_future_type')).toBeOnTheScreen();
  });
});
