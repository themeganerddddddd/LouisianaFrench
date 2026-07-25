import { render, screen, userEvent } from '@testing-library/react-native';
import ActivityRenderer from '../ActivityRenderer';
import { fixtureActivities } from '../../test/fixtures/catalog/activities';

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

describe('ActivityRenderer', () => {
  describe('intro_card', () => {
    it('shows the Word and continues without checking an answer', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.intro);

      expect(screen.getByText('New word')).toBeOnTheScreen();
      expect(screen.getByText('Listen and learn')).toBeOnTheScreen();
      expect(screen.getByText('Bonjour')).toBeOnTheScreen();
      expect(screen.getByText('Hello')).toBeOnTheScreen();
      expect(screen.getByText('Tap the word to hear it again')).toBeOnTheScreen();

      await user.press(screen.getByText('Continue'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
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

      await user.press(screen.getByText('Ça va?'));
      await user.press(screen.getByText('Check'));

      expect(screen.getByText('Correct!')).toBeOnTheScreen();
      await user.press(screen.getByText('Next Question'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });

    it('offers a first-wrong retry with a hint, then shows the answer on final wrong', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.multipleChoice);

      await user.press(screen.getByText('Bonjour'));
      await user.press(screen.getByText('Check'));

      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(
        screen.getByText('Hint: think about "How’s it going?"')
      ).toBeOnTheScreen();

      await user.press(screen.getByText('Try Again'));
      expect(screen.queryByText('Not quite')).toBeNull();

      await user.press(screen.getByText('Bonjour'));
      await user.press(screen.getByText('Check'));

      expect(screen.getByText('Let’s move on')).toBeOnTheScreen();
      expect(screen.getByText('Answer: Ça va?')).toBeOnTheScreen();

      await user.press(screen.getByText('Continue'));
      expect(onWrong).toHaveBeenCalledWith('Bonjour');
    });
  });

  describe('listening_target_choice', () => {
    it('covers correct and first-wrong feedback with Audio controls', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.listening);

      expect(screen.getByText('Listening')).toBeOnTheScreen();
      expect(screen.getByText('Listen and choose the word')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await user.press(screen.getByText('Ça va?'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(screen.getByText('Hint: think about "Hello"')).toBeOnTheScreen();

      await user.press(screen.getByText('Try Again'));
      await user.press(screen.getByText('Bonjour'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Correct!')).toBeOnTheScreen();

      await user.press(screen.getByText('Next Question'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });
  });

  describe('typing', () => {
    it('accepts a typed answer and exposes progressive hints', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.typing);

      expect(screen.getByText('Typing')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await user.press(screen.getByText('Hints'));
      expect(screen.getByText('Starts with: Ça …')).toBeOnTheScreen();

      await user.press(screen.getByText('More hints'));
      expect(
        screen.getByText('Tap words to help build the answer')
      ).toBeOnTheScreen();
      expect(screen.getByText('Ça')).toBeOnTheScreen();
      expect(screen.getByText('va?')).toBeOnTheScreen();

      await user.type(screen.getByPlaceholderText('Type your answer'), 'Ça va?');
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Correct!')).toBeOnTheScreen();

      await user.press(screen.getByText('Next Question'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });

    it('records final wrong after a retry', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.typing);

      await user.type(screen.getByPlaceholderText('Type your answer'), 'Bonjour');
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(screen.getByText('Starts with: Ça …')).toBeOnTheScreen();

      await user.press(screen.getByText('Try Again'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Let’s move on')).toBeOnTheScreen();
      expect(screen.getByText('Answer: Ça va?')).toBeOnTheScreen();

      await user.press(screen.getByText('Continue'));
      expect(onWrong).toHaveBeenCalledWith('Bonjour');
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

      await user.press(screen.getByText("C'est"));
      await user.press(screen.getByText('paré'));
      await user.press(screen.getByText('Check'));

      expect(screen.getByText('Correct!')).toBeOnTheScreen();
      await user.press(screen.getByText('Next Question'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });

    it('shows answer feedback after a second wrong build', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.sentenceBuild);

      await user.press(screen.getByText('paré'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(screen.getByText("Starts with: C'e…")).toBeOnTheScreen();

      await user.press(screen.getByText('Try Again'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Let’s move on')).toBeOnTheScreen();
      expect(screen.getByText("Answer: C'est paré")).toBeOnTheScreen();

      await user.press(screen.getByText('Continue'));
      expect(onWrong).toHaveBeenCalledWith('paré');
    });
  });

  describe('match_pairs', () => {
    it('matches every pair correctly', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity(fixtureActivities.matchPairs);

      expect(screen.getByText('Match')).toBeOnTheScreen();
      expect(screen.getByText('Match the words')).toBeOnTheScreen();
      expect(screen.getByText('Check')).toBeDisabled();

      await user.press(screen.getByText('Hello'));
      await user.press(screen.getByText('Bonjour'));
      await user.press(screen.getByText('Check'));

      await user.press(screen.getByText('How’s it going?'));
      await user.press(screen.getByText('Ça va?'));
      await user.press(screen.getByText('Check'));

      expect(screen.getByText('Correct!')).toBeOnTheScreen();
      await user.press(screen.getByText('Next Question'));
      expect(onCorrect).toHaveBeenCalledTimes(1);
    });

    it('allows retry after a wrong pair, then continues after final wrong', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity(fixtureActivities.matchPairs);

      await user.press(screen.getByText('Hello'));
      await user.press(screen.getByText('Ça va?'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Not quite')).toBeOnTheScreen();

      await user.press(screen.getByText('Try Again'));
      await user.press(screen.getByText('Ça va?'));
      await user.press(screen.getByText('Check'));
      expect(screen.getByText('Let’s move on')).toBeOnTheScreen();

      await user.press(screen.getByText('Continue'));
      expect(onWrong).toHaveBeenCalledWith('Hello ↔ Ça va?');
    });
  });

  it('reports unknown Activity types without crashing', () => {
    renderActivity({ type: 'unknown_future_type', prompt: 'x' });
    expect(screen.getByText('Unknown activity type: unknown_future_type')).toBeOnTheScreen();
  });
});
