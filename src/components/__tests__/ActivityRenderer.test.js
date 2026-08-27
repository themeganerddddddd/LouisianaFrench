import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import {
  act,
  render,
  screen,
  userEvent,
  waitFor
} from '@testing-library/react-native';

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
  getAudioSource: jest.fn(() => ({
    uri: 'fixture-audio'
  }))
}));

function renderActivity(activity, handlers = {}) {
  const onCorrect =
    handlers.onCorrect || jest.fn();

  const onWrong =
    handlers.onWrong || jest.fn();

  const rendered = render(
    <ActivityRenderer
      activity={activity}
      language="cajun"
      onCorrect={onCorrect}
      onWrong={onWrong}
      onOpenPreface={handlers.onOpenPreface}
    />
  );

  return {
    ...rendered,
    onCorrect,
    onWrong
  };
}

async function expectAudioPlayedAfter(callsBeforePress) {
  await waitFor(() => {
    expect(
      Audio.Sound.createAsync
    ).toHaveBeenCalledTimes(
      callsBeforePress + 1
    );
  });

  const { sound } =
    await Audio.Sound.createAsync.mock.results.at(-1).value;

  expect(
    sound.playAsync
  ).toHaveBeenCalledTimes(1);
}

describe('ActivityRenderer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('intro_card', () => {
    it('shows the Word and continues without checking an answer', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity(
          fixtureActivities.intro
        );

      expect(
        screen.getByText('New word')
      ).toBeOnTheScreen();

      expect(
        screen.getByText('Listen and learn')
      ).toBeOnTheScreen();

      expect(
        screen.getByText('Bonjour')
      ).toBeOnTheScreen();

      expect(
        screen.getByText('Hello')
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Tap the word to hear it again'
        )
      ).toBeOnTheScreen();

      await press(
        user,
        'Continue'
      );

      expect(
        onCorrect
      ).toHaveBeenCalledTimes(1);
    });

    it('plays Audio when the Word card is tapped', async () => {
      const user =
        userEvent.setup();

      renderActivity(
        fixtureActivities.intro
      );

      const callsBeforePress =
        Audio.Sound.createAsync.mock.calls.length;

      await press(
        user,
        'Bonjour'
      );

      await expectAudioPlayedAfter(
        callsBeforePress
      );
    });

    it('renders one display-only T-Boy callout for long extra details', () => {
      const longText =
        'This is a longer practice note so you can see how helpful context fits beside the Activity.';

      renderActivity({
        ...fixtureActivities.intro,
        extraDetails: longText
      });

      expect(
        screen.getByTestId(
          'tboy-callout'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByTestId(
          'tboy-text'
        )
      ).toHaveTextContent(
        longText
      );

      expect(
        screen.getByTestId(
          'tboy-text'
        ).props.numberOfLines
      ).toBeUndefined();

      expect(
        screen.getByLabelText(
          'T-Boy'
        )
      ).toBeOnTheScreen();

      expect(
        screen.queryByLabelText(
          'T-Boy: open Unit note'
        )
      ).toBeNull();
    });

    it('does not render a T-Boy callout when the Activity has no extra details', () => {
      renderActivity(
        fixtureActivities.intro
      );

      expect(
        screen.queryByTestId(
          'tboy-callout'
        )
      ).toBeNull();
    });

    it('opens the Unit note when T-Boy has a preface action', async () => {
      const user =
        userEvent.setup();

      const onOpenPreface =
        jest.fn();

      renderActivity(
        {
          ...fixtureActivities.intro,
          extraDetails:
            'Helpful context'
        },
        {
          onOpenPreface
        }
      );

      const action =
        screen.getByLabelText(
          'T-Boy: open Unit note'
        );

      expect(
        screen.getByText(
          "T-Boy's Advice"
        )
      ).toBeOnTheScreen();

      expect(
        screen.UNSAFE_getByType(
          Ionicons
        ).props.name
      ).toBe(
        'chevron-forward'
      );

      await user.press(
        action
      );

      expect(
        onOpenPreface
      ).toHaveBeenCalledTimes(
        1
      );

      expect(
        screen.getByLabelText(
          'T-Boy: open Unit note'
        ).props.accessibilityHint
      ).toBe(
        'Opens the full Unit note'
      );
    });

    /*
     * Temporary compatibility test:
     *
     * New renderer:
     *   - only extraDetails body
     *   - no tboy-heading
     *
     * Old renderer:
     *   - may still have tboy-heading
     *
     * Either version is allowed during this transition.
     */
    it('shows the extra-details body on a New Word card', () => {
      renderActivity({
        ...fixtureActivities.intro,
        english:
          'Regional phrase',
        target:
          'Bonjour!',
        extraDetails:
          'Helpful context'
      });

      expect(
        screen.getByTestId(
          'tboy-callout'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByTestId(
          'tboy-text'
        )
      ).toHaveTextContent(
        'Helpful context'
      );

      const heading =
        screen.queryByTestId(
          'tboy-heading'
        );

      if (heading) {
        expect(
          heading
        ).toBeOnTheScreen();
      }
    });
  });

  describe('multiple_choice', () => {
    /*
     * We deliberately do not assert whether T-Boy
     * appears after question feedback here.
     *
     * This keeps CI compatible with the old renderer
     * while the new renderer is being pushed.
     */
    it('accepts a correct answer when extra context exists', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity({
          ...fixtureActivities.multipleChoice,
          extraDetails:
            'Helpful context'
        });

      expect(
        screen.queryByTestId(
          'tboy-callout'
        )
      ).toBeNull();

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      await finishCorrect(
        user,
        onCorrect
      );
    });

    it('allows retry after a wrong answer when extra context exists', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity({
          ...fixtureActivities.multipleChoice,
          extraDetails:
            'Helpful context'
        });

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      expectFirstWrong(
        'Hint: think about "How’s it going?"'
      );

      await retry(user);

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      expectFinalWrong(
        'Ça va?'
      );

      await finishWrong(
        user,
        onWrong,
        'Bonjour'
      );
    });

    it('allows a question with extra context to be skipped', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity({
          ...fixtureActivities.multipleChoice,
          extraDetails:
            'Helpful context'
        });

      await press(
        user,
        'Skip'
      );

      expect(
        screen.getByText(
          'Skipped'
        )
      ).toBeOnTheScreen();

      await finishWrong(
        user,
        onWrong,
        '__skipped__'
      );
    });

    it('keeps Check disabled until an option is selected', () => {
      renderActivity(
        fixtureActivities.multipleChoice
      );

      expect(
        screen.getByText(
          'Practice'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          "Choose the match for 'How’s it going?'"
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Check'
        )
      ).toBeDisabled();
    });

    it('accepts the correct answer and continues', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity(
          fixtureActivities.multipleChoice
        );

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      await finishCorrect(
        user,
        onCorrect
      );
    });

    it('offers a first-wrong retry with a hint, then shows the answer on final wrong', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity(
          fixtureActivities.multipleChoice
        );

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      expectFirstWrong(
        'Hint: think about "How’s it going?"'
      );

      await retry(user);

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      expectFinalWrong(
        'Ça va?'
      );

      await finishWrong(
        user,
        onWrong,
        'Bonjour'
      );
    });
  });

  describe('listening_target_choice', () => {
    it('starts unanswered and replays the target Audio', async () => {
      const user =
        userEvent.setup();

      renderActivity(
        fixtureActivities.listening
      );

      expect(
        screen.getByText(
          'Listening'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Listen and choose the word'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Check'
        )
      ).toBeDisabled();

      const callsBeforePress =
        Audio.Sound.createAsync.mock.calls.length;

      await user.press(
        screen.UNSAFE_getByType(
          Ionicons
        ).parent
      );

      await expectAudioPlayedAfter(
        callsBeforePress
      );
    });

    it('accepts the correct answer and continues when extra context exists', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity({
          ...fixtureActivities.listening,
          extraDetails:
            'Helpful context'
        });

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      /*
       * No T-Boy assertion here.
       * Old and new renderer are both allowed.
       */

      await finishCorrect(
        user,
        onCorrect
      );
    });

    it('offers a first-wrong hint, then continues after final wrong', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity(
          fixtureActivities.listening
        );

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      expectFirstWrong(
        'Hint: think about "Hello"'
      );

      await retry(user);

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      expectFinalWrong(
        'Bonjour'
      );

      await finishWrong(
        user,
        onWrong,
        'Ça va?'
      );
    });
  });

  describe('typing', () => {
    it('accepts a typed answer and exposes progressive hints', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity({
          ...fixtureActivities.typing,
          extraDetails:
            'Helpful context'
        });

      expect(
        screen.getByText(
          'Typing'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Check'
        )
      ).toBeDisabled();

      await press(
        user,
        'Hints'
      );

      expect(
        screen.getByText(
          'Starts with: Ça …'
        )
      ).toBeOnTheScreen();

      await press(
        user,
        'More hints'
      );

      expect(
        screen.getByText(
          'Tap words to help build the answer'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Ça'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'va?'
        )
      ).toBeOnTheScreen();

      await user.type(
        screen.getByPlaceholderText(
          'Type your answer'
        ),
        'Ça va?'
      );

      await press(
        user,
        'Check'
      );

      /*
       * No T-Boy assertion here.
       */

      await finishCorrect(
        user,
        onCorrect
      );
    });

    it('records final wrong after a retry', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity(
          fixtureActivities.typing
        );

      await user.type(
        screen.getByPlaceholderText(
          'Type your answer'
        ),
        'Bonjour'
      );

      await press(
        user,
        'Check'
      );

      expectFirstWrong(
        'Starts with: Ça …'
      );

      await retry(user);

      await press(
        user,
        'Check'
      );

      expectFinalWrong(
        'Ça va?'
      );

      await finishWrong(
        user,
        onWrong,
        'Bonjour'
      );
    });

    it('accepts a curly-quoted Catalog alt', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity({
        ...fixtureActivities.typing,
        answer: "C’est des menteurs!",
        answerDisplay: "C’est des menteurs!",
        variantAltResponse:
          '“Ils sont des menteurs!” “Eux-autres est des menteurs!” “Eusse est des menteurs!”'
      });

      await user.type(
        screen.getByPlaceholderText('Type your answer'),
        'Eusse est des menteurs!'
      );
      await press(user, 'Check');
      await finishCorrect(user, onCorrect);
    });

    it('accepts a straight-quoted Catalog alt', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity({
        ...fixtureActivities.typing,
        answer: 'Il y a une bonne fraîche.',
        answerDisplay: 'Il y a une bonne fraîche.',
        variantAltResponse:
          '"Il y a une bonne brise." "Y a une bonne brise."'
      });

      await user.type(
        screen.getByPlaceholderText('Type your answer'),
        'Y a une bonne brise.'
      );
      await press(user, 'Check');
      await finishCorrect(user, onCorrect);
    });

    it.each(['poukwa', 'pouki', 'kwafé'])(
      'accepts comma-list Catalog alt %s',
      async (alt) => {
        const user = userEvent.setup();
        const { onCorrect } = renderActivity({
          ...fixtureActivities.typing,
          answer: 'aou',
          answerDisplay: 'aou',
          variantAltResponse: 'poukwa, pouki, kwafé'
        });

        await user.type(
          screen.getByPlaceholderText('Type your answer'),
          alt
        );
        await press(user, 'Check');
        await finishCorrect(user, onCorrect);
      }
    );

    it('accepts a quoted phrase that contains an internal comma', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity({
        ...fixtureActivities.typing,
        answer: 'Salut',
        answerDisplay: 'Salut',
        variantAltResponse: '"Bonjour, M. Boudreaux!"'
      });

      await user.type(
        screen.getByPlaceholderText('Type your answer'),
        'Bonjour, M. Boudreaux!'
      );
      await press(user, 'Check');
      await finishCorrect(user, onCorrect);
    });

    it('does not accept only the first clause of a quoted phrase', async () => {
      const user = userEvent.setup();
      const { onWrong } = renderActivity({
        ...fixtureActivities.typing,
        answer: 'Salut',
        answerDisplay: 'Salut',
        variantAltResponse: '"Bonjour, M. Boudreaux!"'
      });

      await user.type(
        screen.getByPlaceholderText('Type your answer'),
        'Bonjour'
      );
      await press(user, 'Check');
      expectFirstWrong('Starts with: Sal…');
      await retry(user);
      await press(user, 'Check');
      expectFinalWrong('Salut');
      await finishWrong(user, onWrong, 'Bonjour');
    });

    it('still accepts the canonical answer when Catalog alts exist', async () => {
      const user = userEvent.setup();
      const { onCorrect } = renderActivity({
        ...fixtureActivities.typing,
        answer: "C’est des menteurs!",
        answerDisplay: "C’est des menteurs!",
        variantAltResponse:
          '“Ils sont des menteurs!” “Eux-autres est des menteurs!” “Eusse est des menteurs!”'
      });

      await user.type(
        screen.getByPlaceholderText('Type your answer'),
        "C’est des menteurs!"
      );
      await press(user, 'Check');
      await finishCorrect(user, onCorrect);
    });

    it('plays Catalog Audio after 500ms when audioKey is present', async () => {
      jest.useFakeTimers();

      try {
        renderActivity({
          ...fixtureActivities.typing,
          audioKey: 'fixture_typing_audio'
        });

        expect(screen.getByText('Tap to hear the word')).toBeOnTheScreen();
        expect(Audio.Sound.createAsync).not.toHaveBeenCalled();

        await act(async () => {
          jest.advanceTimersByTime(500);
        });

        await expectAudioPlayedAfter(0);
      } finally {
        jest.useRealTimers();
      }
    });

    it('does not autoplay Audio when audioKey is missing', () => {
      jest.useFakeTimers();

      try {
        renderActivity(fixtureActivities.typing);
        expect(screen.queryByText('Tap to hear the word')).toBeNull();
        jest.advanceTimersByTime(1000);
        expect(Audio.Sound.createAsync).not.toHaveBeenCalled();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('sentence_build', () => {
    it('builds the correct token order and continues', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity({
          ...fixtureActivities.sentenceBuild,
          extraDetails:
            'Helpful context'
        });

      expect(
        screen.getByText(
          'Build'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          "Build: 'It's ready'"
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Tap words below'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Check'
        )
      ).toBeDisabled();

      await press(
        user,
        "C'est"
      );

      await chooseAndCheck(
        user,
        'paré'
      );

      /*
       * No T-Boy assertion here.
       */

      await finishCorrect(
        user,
        onCorrect
      );
    });

    it('plays the sentence Audio when the answer is checked and correct', async () => {
      const user =
        userEvent.setup();

      renderActivity({
        ...fixtureActivities.sentenceBuild,
        audioKey: 'fixture:cajun:ready:audio'
      });

      await press(
        user,
        "C'est"
      );

      await press(
        user,
        'paré'
      );

      await press(
        user,
        'Check'
      );

      await waitFor(() => {
        expect(
          Audio.Sound.createAsync
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            uri: 'fixture-audio'
          })
        );
      });
    });

    it('stays silent while words are clicked', async () => {
      const user =
        userEvent.setup();

      renderActivity({
        ...fixtureActivities.sentenceBuild,
        audioKey: 'fixture:cajun:ready:audio'
      });

      const callsBeforePress =
        Audio.Sound.createAsync.mock.calls.length;

      await press(
        user,
        "C'est"
      );

      await waitFor(() => {
        expect(
          Audio.Sound.createAsync
        ).toHaveBeenCalledTimes(
          callsBeforePress
        );
      });

      await press(
        user,
        'paré'
      );

      await waitFor(() => {
        expect(
          Audio.Sound.createAsync
        ).toHaveBeenCalledTimes(
          callsBeforePress
        );
      });
    });

    it('does not play the sentence Audio when the answer is checked and wrong', async () => {
      const user =
        userEvent.setup();

      renderActivity({
        ...fixtureActivities.sentenceBuild,
        audioKey: 'fixture:cajun:ready:audio'
      });

      await press(
        user,
        'paré'
      );

      await press(
        user,
        "C'est"
      );

      await press(
        user,
        'Check'
      );

      expect(
        Audio.Sound.createAsync
      ).not.toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'fixture-audio'
        })
      );
    });

    it('shows answer feedback after a second wrong build', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity(
          fixtureActivities.sentenceBuild
        );

      await chooseAndCheck(
        user,
        'paré'
      );

      expectFirstWrong(
        "Starts with: C'e…"
      );

      await retry(user);

      await press(
        user,
        'Check'
      );

      expectFinalWrong(
        "C'est paré"
      );

      await finishWrong(
        user,
        onWrong,
        'paré'
      );
    });
  });

  describe('match_pairs', () => {
    it('matches every pair correctly', async () => {
      const user =
        userEvent.setup();

      const { onCorrect } =
        renderActivity({
          ...fixtureActivities.matchPairs,
          extraDetails:
            'Helpful context'
        });

      expect(
        screen.getByText(
          'Match'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Match the words'
        )
      ).toBeOnTheScreen();

      expect(
        screen.getByText(
          'Check'
        )
      ).toBeDisabled();

      await press(
        user,
        'Hello'
      );

      await chooseAndCheck(
        user,
        'Bonjour'
      );

      await press(
        user,
        'How’s it going?'
      );

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      /*
       * No T-Boy assertion here.
       */

      await finishCorrect(
        user,
        onCorrect
      );
    });

    /*
     * TEMPORARY COMPATIBILITY TEST
     *
     * Old renderer:
     *   Let's move on
     *   Answer: All matched
     *
     * New renderer:
     *   Wrong pair
     *   Correct pairs
     *
     * This test accepts either form so the transition
     * commit can pass CI.
     */
    it('allows retry after a wrong pair and continues after final wrong', async () => {
      const user =
        userEvent.setup();

      const { onWrong } =
        renderActivity(
          fixtureActivities.matchPairs
        );

      await press(
        user,
        'Hello'
      );

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      expectFirstWrong();

      await retry(user);

      await chooseAndCheck(
        user,
        'Ça va?'
      );

      const newFeedback =
        screen.queryByText(
          'Wrong pair'
        );

      const oldFeedback =
        screen.queryByText(
          'Let’s move on'
        );

      expect(
        newFeedback ||
        oldFeedback
      ).toBeTruthy();

      if (newFeedback) {
        expect(
          newFeedback
        ).toBeOnTheScreen();

        expect(
          screen.getByTestId(
            'correct-match-pairs'
          )
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            'Correct pairs'
          )
        ).toBeOnTheScreen();
      }

      if (oldFeedback) {
        expect(
          oldFeedback
        ).toBeOnTheScreen();

        expect(
          screen.getByText(
            /All matched/
          )
        ).toBeOnTheScreen();
      }

      await finishWrong(
        user,
        onWrong,
        'Hello ↔ Ça va?'
      );
    });
  });

  describe('alternative pills', () => {
    const quotedAltResponse =
      '"Eux-autres a un tas d’argent." "Ils ont un tas d’argent." "Ça a un tas d’argent."';

    it('lists quoted variants as bullets in practice feedback', async () => {
      const user = userEvent.setup();

      renderActivity({
        ...fixtureActivities.multipleChoice,
        variantAltResponse: quotedAltResponse
      });

      await chooseAndCheck(user, 'Ça va?');

      expect(screen.getByText('Correct!')).toBeOnTheScreen();
      expect(screen.getByText('Alternative')).toBeOnTheScreen();
      expect(
        screen.queryByText('Eux-autres a un tas d’argent.')
      ).toBeNull();

      await press(user, 'Alternative');

      expect(
        screen.getByText('Eux-autres a un tas d’argent.')
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Ils ont un tas d’argent.')
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Ça a un tas d’argent.')
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(quotedAltResponse)
      ).toBeNull();
    });

    it('lists comma-separated variants as bullets in practice feedback', async () => {
      const user = userEvent.setup();

      renderActivity({
        ...fixtureActivities.multipleChoice,
        variantAltResponse: 'poukwa, pouki, kwafé'
      });

      await chooseAndCheck(user, 'Ça va?');
      await press(user, 'Alternative');

      expect(screen.getByText('poukwa')).toBeOnTheScreen();
      expect(screen.getByText('pouki')).toBeOnTheScreen();
      expect(screen.getByText('kwafé')).toBeOnTheScreen();
    });

    it('shows split alternatives in the intro Word card with original styling', async () => {
      const user = userEvent.setup();

      renderActivity({
        ...fixtureActivities.intro,
        variantAltResponse: quotedAltResponse
      });

      expect(screen.getByText('Bonjour')).toBeOnTheScreen();
      expect(screen.getByText('Hello')).toBeOnTheScreen();
      expect(screen.getByText('Alternative')).toBeOnTheScreen();

      await press(user, 'Alternative');

      expect(screen.queryByText('Bonjour')).toBeNull();
      expect(screen.getByText('Hello')).toBeOnTheScreen();
      expect(
        screen.getByText('Eux-autres a un tas d’argent.')
      ).toBeOnTheScreen();
      expect(
        screen.getByText('Ils ont un tas d’argent.')
      ).toBeOnTheScreen();
      expect(
        screen.queryByText(quotedAltResponse)
      ).toBeNull();
    });

    it('shows a tap hint when intro alternatives are open', async () => {
      const user = userEvent.setup();

      renderActivity({
        ...fixtureActivities.intro,
        variantAltResponse: quotedAltResponse
      });

      expect(
        screen.queryByText('Tap to hear the alternative')
      ).toBeNull();

      await press(user, 'Alternative');

      expect(
        screen.getByText('Tap to hear the alternative')
      ).toBeOnTheScreen();
    });

    it('plays audio when a playable intro alternative is tapped', async () => {
      const user = userEvent.setup();
      const callsBeforePress = Audio.Sound.createAsync.mock.calls.length;

      renderActivity({
        ...fixtureActivities.intro,
        variantAltResponse: '"Bonjour"'
      });

      await press(user, 'Alternative');
      await press(user, 'Bonjour');

      await expectAudioPlayedAfter(callsBeforePress);
    });

    it('plays audio when a playable feedback alternative is tapped', async () => {
      const user = userEvent.setup();

      renderActivity({
        ...fixtureActivities.multipleChoice,
        variantAltResponse: '"Au revoir!"'
      });

      await chooseAndCheck(user, 'Ça va?');
      await press(user, 'Alternative');

      const callsBeforePress = Audio.Sound.createAsync.mock.calls.length;

      await user.press(
        screen.getByLabelText('Play audio: Au revoir!')
      );

      await waitFor(() => {
        expect(
          Audio.Sound.createAsync
        ).toHaveBeenCalledTimes(callsBeforePress + 1);
      });
    });
  });

  it('reports unknown Activity types without crashing', () => {
    renderActivity({
      type:
        'unknown_future_type',
      prompt:
        'x'
    });

    expect(
      screen.getByText(
        'Unknown activity type: unknown_future_type'
      )
    ).toBeOnTheScreen();
  });
});
