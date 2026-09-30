import { render, screen, userEvent } from '@testing-library/react-native';
import ActivityRenderer from '../ActivityRenderer';
import { fixtureActivities } from '../../test/fixtures/catalog/activities';
import { chooseAndCheck, press, retry } from '../../test/activityInteractions';

jest.mock('../../data/audioManifest', () => ({
  getAudioSource: jest.fn(() => ({ uri: 'fixture-audio' }))
}));

const EXTRA_DETAILS = 'Helpful context';

async function matchPair(user, left, right) {
  await press(user, left);
  await press(user, right);
}

async function typeAndCheck(user, value) {
  await user.type(screen.getByPlaceholderText('Type your answer'), value);
  await press(user, 'Check');
}

const selectMultiple = {
  ...fixtureActivities.multipleChoice,
  cardId: 'fixture:cajun:greeting:select',
  type: 'select_multiple',
  prompt: "Select every form of 'Hello'",
  options: ['Bonjour', 'Ça va?'],
  answers: ['Bonjour'],
  answerDisplay: 'Bonjour'
};

const practiceActivities = [
  {
    name: 'multiple_choice',
    activity: fixtureActivities.multipleChoice,
    answerCorrectly: (user) => chooseAndCheck(user, 'Ça va?'),
    answerWrong: (user) => chooseAndCheck(user, 'Bonjour'),
    answerWrongAgain: (user) => chooseAndCheck(user, 'Bonjour')
  },
  {
    name: 'select_multiple',
    activity: selectMultiple,
    answerCorrectly: (user) => chooseAndCheck(user, 'Bonjour'),
    answerWrong: (user) => chooseAndCheck(user, 'Ça va?'),
    answerWrongAgain: (user) => press(user, 'Check')
  },
  {
    name: 'listening_target_choice',
    activity: fixtureActivities.listening,
    answerCorrectly: (user) => chooseAndCheck(user, 'Bonjour'),
    answerWrong: (user) => chooseAndCheck(user, 'Ça va?'),
    answerWrongAgain: (user) => chooseAndCheck(user, 'Ça va?')
  },
  {
    name: 'typing',
    activity: fixtureActivities.typing,
    answerCorrectly: (user) => typeAndCheck(user, 'Ça va?'),
    answerWrong: (user) => typeAndCheck(user, 'Nope'),
    answerWrongAgain: (user) => press(user, 'Check')
  },
  {
    name: 'sentence_build',
    activity: fixtureActivities.sentenceBuild,
    answerCorrectly: async (user) => {
      await press(user, "C'est");
      await press(user, 'paré');
      await press(user, 'Check');
    },
    answerWrong: async (user) => {
      await press(user, 'paré');
      await press(user, "C'est");
      await press(user, 'Check');
    },
    answerWrongAgain: (user) => press(user, 'Check')
  },
  {
    name: 'match_pairs',
    activity: fixtureActivities.matchPairs,
    answerCorrectly: async (user) => {
      await matchPair(user, 'Hello', 'Bonjour');
      await matchPair(user, 'How’s it going?', 'Ça va?');
    },
    answerWrong: (user) => matchPair(user, 'Hello', 'Ça va?'),
    answerWrongAgain: (user) => matchPair(user, 'Hello', 'Ça va?')
  }
];

function renderActivity(activity, { onOpenPreface } = {}) {
  return render(
    <ActivityRenderer
      activity={activity}
      language="cajun"
      onCorrect={jest.fn()}
      onWrong={jest.fn()}
      onOpenPreface={onOpenPreface}
    />
  );
}

function expectOneTBoyCallout() {
  expect(screen.getAllByTestId('tboy-callout')).toHaveLength(1);
  expect(screen.getByTestId('tboy-text')).toHaveTextContent(EXTRA_DETAILS);
}

describe('ActivityRenderer T-Boy Extra details on practice Activities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe.each(practiceActivities)('$name', ({ activity, answerCorrectly, answerWrong, answerWrongAgain }) => {
    const withDetails = { ...activity, extraDetails: EXTRA_DETAILS };

    it('reveals T-Boy after a correct answer', async () => {
      const user = userEvent.setup();
      renderActivity(withDetails);

      expect(screen.queryByTestId('tboy-callout')).toBeNull();
      await answerCorrectly(user);

      expect(await screen.findByText('Correct!')).toBeOnTheScreen();
      expectOneTBoyCallout();
    });

    it('reveals T-Boy only after a final wrong answer', async () => {
      const user = userEvent.setup();
      renderActivity(withDetails);

      await answerWrong(user);
      expect(screen.getByText('Not quite')).toBeOnTheScreen();
      expect(screen.queryByTestId('tboy-callout')).toBeNull();

      await retry(user);
      expect(screen.queryByTestId('tboy-callout')).toBeNull();

      await answerWrongAgain(user);
      expect(screen.queryByText('Not quite')).toBeNull();
      expectOneTBoyCallout();
    });

    it('reveals T-Boy after a skip', async () => {
      const user = userEvent.setup();
      renderActivity(withDetails);

      await press(user, 'Skip');

      expectOneTBoyCallout();
    });

    it('never shows T-Boy when the Activity has no Extra details', async () => {
      const user = userEvent.setup();
      renderActivity(activity);

      await press(user, 'Skip');

      expect(screen.getByText('Skipped')).toBeOnTheScreen();
      expect(screen.queryByTestId('tboy-callout')).toBeNull();
    });

    it('opens the Unit note from T-Boy', async () => {
      const user = userEvent.setup();
      const onOpenPreface = jest.fn();
      renderActivity(withDetails, { onOpenPreface });

      await press(user, 'Skip');
      await user.press(screen.getByLabelText('T-Boy: open Unit note'));

      expect(onOpenPreface).toHaveBeenCalledTimes(1);
    });
  });

  describe('speech bubble heading', () => {
    async function skipWith(activityOverrides) {
      const user = userEvent.setup();
      renderActivity({
        ...fixtureActivities.multipleChoice,
        extraDetails: EXTRA_DETAILS,
        ...activityOverrides
      });
      await press(user, 'Skip');
    }

    it('uses the English phrase as the heading', async () => {
      await skipWith({});

      expect(screen.getByTestId('tboy-heading')).toHaveTextContent('How’s it going?');
    });

    it('falls back to the target phrase when English is missing', async () => {
      await skipWith({ english: '' });

      expect(screen.getByTestId('tboy-heading')).toHaveTextContent('Ça va?');
    });

    it('falls back to Context when both phrases are missing', async () => {
      await skipWith({ english: '', target: '' });

      expect(screen.getByTestId('tboy-heading')).toHaveTextContent('Context');
    });
  });
});
