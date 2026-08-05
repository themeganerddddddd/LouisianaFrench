import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { Audio } from 'expo-av';
import {
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState
} from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { recordPracticeCompletion } from '../../utils/storage';

import SpeechPractice from '../SpeechPractice';

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Ionicons = (props) => React.createElement(View, props);

  return { Ionicons };
});

jest.mock('../../data/audioManifest', () => ({
  getAudioSource: jest.fn(() => 1)
}));

jest.mock('../../utils/storage', () => ({
  recordPracticeCompletion: jest.fn(async () => {})
}));

const WORDS = [
  { target: 'bonjour', english: 'hello', audioKey: 'bonjour' },
  { target: 'merci', english: 'thank you', audioKey: 'merci' }
];

function renderPractice(props = {}) {
  return render(<SpeechPractice language="cajun" words={WORDS} {...props} />);
}

function renderAtSize(metrics, props = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <SpeechPractice language="cajun" words={WORDS} {...props} />
    </SafeAreaProvider>
  );
}

function setupRecorder({ durationMs = 1200, uri = 'file:///attempt.m4a' } = {}) {
  let isRecording = false;
  const recorder = {
    uri,
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(() => { isRecording = true; }),
    stop: jest.fn(async () => { isRecording = false; })
  };

  useAudioRecorder.mockReturnValue(recorder);
  useAudioRecorderState.mockImplementation(() => ({
    isRecording,
    durationMillis: durationMs
  }));

  return recorder;
}

async function recordTake(options = {}) {
  const durationMs = options.durationMs || 1200;
  const recorder = setupRecorder({ durationMs, uri: options.uri || 'file:///attempt.m4a' });
  const view = renderPractice(options.props);
  fireEvent.press(screen.getByLabelText('Record'));
  await waitFor(() => expect(recorder.record).toHaveBeenCalled());
  await waitFor(() => expect(screen.getByLabelText(`Stop recording · ${(durationMs / 1000).toFixed(1)}s`)).toBeEnabled());
  fireEvent.press(screen.getByLabelText(`Stop recording · ${(durationMs / 1000).toFixed(1)}s`));
  await waitFor(() => expect(durationMs < 600
    ? screen.getByText(/That attempt was too short/)
    : screen.getByText('Hear my recording')).toBeOnTheScreen());
  return { recorder, view };
}

async function recordCurrentTake(recorder, durationMs = 1200) {
  fireEvent.press(screen.getByLabelText('Record'));
  await waitFor(() => expect(recorder.record).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.getByLabelText(`Stop recording · ${(durationMs / 1000).toFixed(1)}s`)).toBeEnabled());
  fireEvent.press(screen.getByLabelText(`Stop recording · ${(durationMs / 1000).toFixed(1)}s`));
  await waitFor(() => expect(screen.getByText('Hear my recording')).toBeOnTheScreen());
  fireEvent.press(screen.getByLabelText('Hear my recording'));
  await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeEnabled());
}

async function reviewTake(options = {}) {
  const result = await recordTake(options);
  await waitFor(() => expect(screen.getByText('Hear my recording')).toBeOnTheScreen());
  fireEvent.press(screen.getByLabelText('Hear my recording'));
  await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeEnabled());
  return result;
}

describe('SpeechPractice', () => {
  const defaultRecorder = useAudioRecorder.getMockImplementation();
  const defaultRecorderState = useAudioRecorderState.getMockImplementation();
  const defaultCreateSound = Audio.Sound.createAsync.getMockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    useAudioRecorder.mockImplementation(defaultRecorder);
    useAudioRecorderState.mockImplementation(defaultRecorderState);
    Audio.Sound.createAsync.mockImplementation(defaultCreateSound);
    requestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
    recordPracticeCompletion.mockResolvedValue(undefined);
  });

  it('renders the Speech Practice header and current Word', () => {
    renderPractice();

    expect(screen.getByText('SPEECH PRACTICE')).toBeOnTheScreen();
    expect(screen.getByLabelText('Louisiana French flag')).toBeOnTheScreen();
    expect(screen.getByText('bonjour')).toBeOnTheScreen();
    expect(screen.getByText('hello')).toBeOnTheScreen();
  });

  it('renders the phrase card reassurance and hides the counter for one Word', () => {
    renderPractice({ words: [WORDS[0]] });

    expect(screen.getByText('Not graded — you decide when it sounds right.')).toBeOnTheScreen();
    expect(screen.queryByText('Phrase 1 / 1')).toBeNull();
  });

  it('renders the phrase counter for a multi-Word session', () => {
    renderPractice();

    expect(screen.getByText('Phrase 1 / 2')).toBeOnTheScreen();
  });

  it('keeps controls in the listen, record, accept order', () => {
    renderPractice({ words: [WORDS[0]] });

    const labels = within(screen.getByTestId('speech-controls'))
      .getAllByRole('button')
      .map((button) => button.props.accessibilityLabel);
    expect(labels).toEqual(['Hear the speaker', 'Record', 'Sounds good']);
  });

  it.each([
    ['mobile', { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }],
    ['desktop', { frame: { x: 0, y: 0, width: 1440, height: 900 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }]
  ])('keeps named controls accessible at %s size', (_size, metrics) => {
    renderAtSize(metrics);

    expect(screen.getByLabelText('Hear the speaker')).toBeOnTheScreen();
    expect(screen.getByLabelText('Record')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sounds good')).toBeOnTheScreen();
  });

  it('starts idle with Record and a disabled Sounds good action', () => {
    renderPractice({ words: [WORDS[0]] });

    expect(screen.getByLabelText('Record')).toBeEnabled();
    expect(screen.getByLabelText('Sounds good')).toBeDisabled();
    expect(screen.getByText('Record and listen back to finish')).toBeOnTheScreen();
  });

  it('shows recording state with red status, elapsed time, and a disabled speaker', async () => {
    const recorder = setupRecorder();
    renderPractice({ words: [WORDS[0]] });

    fireEvent.press(screen.getByLabelText('Record'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalled());

    expect(screen.getByText('Recording. Say the phrase, then tap Stop recording.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Stop recording · 1.2s')).toBeOnTheScreen();
    expect(screen.getByLabelText('Hear the speaker')).toBeDisabled();
    expect(screen.getByTestId('speech-status')).toHaveStyle({ backgroundColor: '#FEF2F2' });
  });

  it('shows a recorded take before it has been reviewed', async () => {
    await recordTake();

    expect(await screen.findByText('Hear my recording')).toBeOnTheScreen();
    expect(screen.getByLabelText('Record again')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sounds good')).toBeDisabled();
    expect(screen.getByText('Listen back at least once to finish')).toBeOnTheScreen();
  });

  it('enables Sounds good only in the reviewed state', async () => {
    await reviewTake();

    expect(screen.getByText('Sound good to you? Move on, or record another take.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Record again')).toBeOnTheScreen();
    expect(screen.getByLabelText('Hear my recording')).toBeOnTheScreen();
    expect(screen.getByLabelText('Sounds good')).toBeEnabled();
    expect(screen.getByTestId('speech-status')).toHaveStyle({ backgroundColor: '#F0FDF4' });
  });

  it('returns to record controls with an amber status for a too-short take', async () => {
    await recordTake({ durationMs: 500 });

    expect(screen.getByLabelText('Record')).toBeOnTheScreen();
    expect(screen.getByText('That attempt was too short — keep recording while you say the whole phrase.'))
      .toBeOnTheScreen();
    expect(screen.getByLabelText('Sounds good')).toBeDisabled();
    expect(screen.getByTestId('speech-status')).toHaveStyle({ backgroundColor: '#FFFBEB' });
  });

  it('shows a denied microphone as a red status with a disabled Record action', async () => {
    requestRecordingPermissionsAsync.mockResolvedValueOnce({ granted: false });
    renderPractice({ words: [WORDS[0]] });

    fireEvent.press(screen.getByLabelText('Record'));

    expect(await screen.findByText('Microphone access is off. Enable it in Settings → Privacy → Microphone to practice speaking.'))
      .toBeOnTheScreen();
    expect(screen.getByLabelText('Record')).toBeDisabled();
    expect(screen.getByLabelText('Hear the speaker')).toBeEnabled();
    expect(screen.getByTestId('speech-status')).toHaveStyle({ backgroundColor: '#FEF2F2' });
  });

  it('places Hear the speaker above the primary control', () => {
    renderPractice({ words: [WORDS[0]] });

    const buttons = within(screen.getByTestId('speech-controls')).getAllByRole('button');
    expect(buttons[0].props.accessibilityLabel).toBe('Hear the speaker');
    expect(buttons[1].props.accessibilityLabel).toBe('Record');
  });

  it('disables Hear the speaker while playback is busy', async () => {
    setupRecorder();
    let resolvePlayback;
    const playback = new Promise((resolve) => { resolvePlayback = resolve; });
    Audio.Sound.createAsync.mockImplementationOnce(async () => ({
      sound: { playAsync: () => playback, unloadAsync: jest.fn(async () => {}) }
    }));
    renderPractice({ words: [WORDS[0]] });

    fireEvent.press(screen.getByLabelText('Hear the speaker'));
    await waitFor(() => expect(screen.getByLabelText('Hear the speaker')).toBeDisabled());

    resolvePlayback();
    await waitFor(() => expect(screen.getByLabelText('Hear the speaker')).toBeEnabled());
  });

  it('keeps Sounds good disabled until the latest take is replayed', async () => {
    await recordTake();

    expect(screen.getByLabelText('Sounds good')).toBeDisabled();
    fireEvent.press(screen.getByLabelText('Hear my recording'));
    await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeEnabled());
  });

  it('disables Sounds good again after recording another take', async () => {
    const { recorder } = await reviewTake();

    fireEvent.press(screen.getByLabelText('Record again'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Stop recording · 1.2s')).toBeEnabled());
    fireEvent.press(screen.getByLabelText('Stop recording · 1.2s'));

    await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeDisabled());
  });

  it('uses the same accept and disabled colors for both Languages', async () => {
    const cajun = renderPractice({ words: [WORDS[0]] });
    expect(screen.getByLabelText('Record')).toHaveStyle({ backgroundColor: '#2771CB' });
    expect(screen.getByText('Play the speaker, then record yourself saying the same phrase.'))
      .toHaveStyle({ color: '#1D5FB0' });
    expect(screen.getByLabelText('Sounds good')).toHaveStyle({ backgroundColor: '#94A3B8' });
    cajun.unmount();

    renderPractice({ language: 'kreole', words: [WORDS[0]] });
    expect(screen.getByLabelText('Kouri-Vini flag')).toBeOnTheScreen();
    expect(screen.getByLabelText('Record')).toHaveStyle({ backgroundColor: '#08834C' });
    expect(screen.getByText('Play the speaker, then record yourself saying the same phrase.'))
      .toHaveStyle({ color: '#066B3F' });
    expect(screen.getByLabelText('Sounds good')).toHaveStyle({ backgroundColor: '#94A3B8' });

    const recorder = setupRecorder();
    renderPractice({ language: 'kreole', words: [WORDS[0]] });
    fireEvent.press(screen.getByLabelText('Record'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalled());
    fireEvent.press(screen.getByLabelText('Stop recording · 1.2s'));
    await waitFor(() => expect(screen.getByLabelText('Hear my recording')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Hear my recording'));
    await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeEnabled());
    expect(screen.getByLabelText('Sounds good')).toHaveStyle({ backgroundColor: '#15803D' });
  });

  it('uses only the approved Ionicons for the control states', async () => {
    const recorder = setupRecorder();
    renderPractice({ words: [WORDS[0]] });
    expect(screen.UNSAFE_getAllByType(Ionicons).map((icon) => icon.props.name))
      .toEqual(expect.arrayContaining(['chevron-back', 'volume-high', 'mic']));
    fireEvent.press(screen.getByLabelText('Record'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalled());
    expect(screen.UNSAFE_getAllByType(Ionicons).map((icon) => icon.props.name))
      .toEqual(expect.arrayContaining(['chevron-back', 'volume-high', 'stop']));

    fireEvent.press(screen.getByLabelText('Stop recording · 1.2s'));
    await waitFor(() => expect(screen.getByLabelText('Hear my recording')).toBeOnTheScreen());
    fireEvent.press(screen.getByLabelText('Hear my recording'));
    await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeEnabled());

    const allowed = new Set(['mic', 'play', 'stop', 'volume-high', 'checkmark', 'chevron-back']);
    const names = screen.UNSAFE_getAllByType(Ionicons).map((icon) => icon.props.name);
    expect(names).toEqual(expect.arrayContaining(['play', 'checkmark']));
    expect(names.every((name) => allowed.has(name))).toBe(true);
  });

  it('writes Practice only after accepting a replayed take', async () => {
    await reviewTake();

    expect(recordPracticeCompletion).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText('Sounds good'));
    await waitFor(() => expect(recordPracticeCompletion).toHaveBeenCalledTimes(1));
    expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
  });

  it('skips the Practice write when the host disables accept recording', async () => {
    const onAccept = jest.fn();
    await reviewTake({ props: {
      words: [WORDS[0]],
      recordPracticeOnAccept: false,
      onAccept
    } });

    fireEvent.press(screen.getByLabelText('Sounds good'));

    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
    expect(recordPracticeCompletion).not.toHaveBeenCalled();
  });

  it('advances a default multi-Word session after accept', async () => {
    await reviewTake();
    fireEvent.press(screen.getByLabelText('Sounds good'));

    expect(await screen.findByText('merci')).toBeOnTheScreen();
    expect(screen.getByText('Phrase 2 / 2')).toBeOnTheScreen();
  });

  it('loops a single-Word session after accept', async () => {
    await reviewTake({ props: { words: [WORDS[0]] } });
    fireEvent.press(screen.getByLabelText('Sounds good'));

    await waitFor(() => expect(screen.getByText('bonjour')).toBeOnTheScreen());
    expect(screen.getByLabelText('Sounds good')).toBeDisabled();
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
  });

  it('clamps the next Word to the first after the last accept', async () => {
    const { recorder } = await reviewTake();
    fireEvent.press(screen.getByLabelText('Sounds good'));
    await screen.findByText('merci');

    await recordCurrentTake(recorder);
    fireEvent.press(screen.getByLabelText('Sounds good'));

    expect(await screen.findByText('bonjour')).toBeOnTheScreen();
    expect(screen.getByText('Phrase 1 / 2')).toBeOnTheScreen();
  });

  it('allows a host to keep the session on the current Word', async () => {
    await reviewTake({ props: { advanceOnAccept: false } });
    fireEvent.press(screen.getByLabelText('Sounds good'));

    await waitFor(() => expect(screen.getByText('bonjour')).toBeOnTheScreen());
    expect(screen.getByText('Phrase 1 / 2')).toBeOnTheScreen();
  });

  it('honors host back and accept callbacks at the module interface', async () => {
    const onBack = jest.fn();
    const onAccept = jest.fn();
    await reviewTake({ props: { onBack, onAccept } });

    fireEvent.press(screen.getByLabelText('Back'));
    expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByLabelText('Sounds good'));

    await waitFor(() => expect(onAccept).toHaveBeenCalledTimes(1));
    expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
  });

  it('allows only one Practice write while accept is in flight', async () => {
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => { resolveWrite = resolve; });
    recordPracticeCompletion.mockImplementation(() => pendingWrite);
    await reviewTake();

    fireEvent.press(screen.getByLabelText('Sounds good'));
    await waitFor(() => expect(screen.getByLabelText('Sounds good')).toBeDisabled());
    fireEvent.press(screen.getByLabelText('Sounds good'));
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);

    resolveWrite();
    expect(await screen.findByText('merci')).toBeOnTheScreen();
  });

  it('does not force-stop the recorder when unmounted', () => {
    const stop = jest.fn();
    const recorder = { stop, uri: 'file:///attempt.m4a' };
    useAudioRecorder.mockReturnValue(recorder);
    useAudioRecorderState.mockReturnValue({ isRecording: true, durationMillis: 800 });

    const view = renderPractice({ words: [WORDS[0]] });
    view.unmount();

    expect(stop).not.toHaveBeenCalled();
  });

  it('renders a safe fallback without controls when no Words are supplied', () => {
    renderPractice({ words: [] });

    expect(screen.getByText('No words available for practice.')).toBeOnTheScreen();
    expect(screen.queryByTestId('speech-controls')).toBeNull();
  });
});
