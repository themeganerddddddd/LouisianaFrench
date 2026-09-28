import { render, screen, userEvent } from '@testing-library/react-native';
import { createAudioPlayer } from 'expo-audio';
import ActivityRenderer from '../ActivityRenderer';
import { getAudioSource } from '../../data/audioManifest';
import { fixtureActivities } from '../../test/fixtures/catalog/activities';
import {
  finishCorrect,
  finishWrong,
  press,
  retry
} from '../../test/activityInteractions';

const duplicateLeftMatchPairsActivity = Object.freeze({
  ...fixtureActivities.matchPairs,
  pairs: [
    { left: 'Hello', right: 'Bonjour' },
    { left: 'Hello', right: 'Ça va?' }
  ]
});

const duplicateRightMatchPairsActivity = Object.freeze({
  ...fixtureActivities.matchPairs,
  pairs: [
    { left: 'Hello', right: 'Bonjour' },
    { left: 'Hi', right: 'Bonjour', audioKey: 'u01_w0001_lf' }
  ]
});

function renderMatchPairs(activity) {
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

describe('ActivityRenderer match_pairs with repeated labels', () => {
  let random;

  beforeEach(() => {
    jest.clearAllMocks();
    random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    random.mockRestore();
  });

  it('keeps duplicate left labels independently matchable', async () => {
    const user = userEvent.setup();
    const { onCorrect } = renderMatchPairs(duplicateLeftMatchPairsActivity);

    await user.press(screen.getAllByText('Hello')[1]);
    await press(user, 'Ça va?');
    await user.press(screen.getAllByText('Hello')[0]);
    await press(user, 'Bonjour');

    await finishCorrect(user, onCorrect);
  });

  it('reports a wrong pair with its labels', async () => {
    const user = userEvent.setup();
    const { onWrong } = renderMatchPairs(duplicateLeftMatchPairsActivity);

    await user.press(screen.getAllByText('Hello')[0]);
    await press(user, 'Ça va?');
    await retry(user);
    await user.press(screen.getAllByText('Hello')[0]);
    await press(user, 'Ça va?');

    await finishWrong(user, onWrong, 'Hello ↔ Ça va?');
  });

  it('plays right-side Audio from the pressed row’s own pair', async () => {
    const user = userEvent.setup();
    renderMatchPairs(duplicateRightMatchPairsActivity);

    // A pair's two sides never share a row, so the Bonjour beside Hello
    // belongs to the Hi pair, the only pair with Audio.
    const cells = screen.getAllByRole('button', { name: /^(Hello|Hi|Bonjour)$/ });
    const rightCellBeside = (leftLabel) =>
      cells[cells.indexOf(screen.getByRole('button', { name: leftLabel })) + 1];

    await user.press(rightCellBeside('Hi'));
    expect(createAudioPlayer).not.toHaveBeenCalled();

    await user.press(rightCellBeside('Hello'));
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(createAudioPlayer).toHaveBeenCalledWith(
      getAudioSource('cajun', 'u01_w0001_lf')
    );
  });
});
