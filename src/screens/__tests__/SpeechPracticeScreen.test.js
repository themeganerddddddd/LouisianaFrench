import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createAudioPlayer, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { getAllWords } from '../../data/lessonLoader';
import { recordPracticeCompletion, recordStudyAndXp } from '../../utils/storage';

import SpeechPracticeScreen from '../SpeechPracticeScreen';

jest.mock('../../data/audioManifest', () => ({
  getAudioSource: jest.fn(() => 1)
}));

const TWO_AUDIO_WORDS = [
  { target: 'bonjour', english: 'hello', audioKey: 'bonjour' },
  { target: 'merci', english: 'thank you', audioKey: 'merci' }
];

jest.mock('../../data/lessonLoader', () => ({
  getAllWords: jest.fn(() => TWO_AUDIO_WORDS)
}));

jest.mock('../../utils/storage', () => ({
  recordPracticeCompletion: jest.fn(async () => {}),
  recordStudyAndXp: jest.fn(async () => {})
}));

function makeRecorder() {
  let isRecording = false;
  const recorder = {
    uri: 'file:///attempt.m4a',
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(() => { isRecording = true; }),
    stop: jest.fn(async () => { isRecording = false; })
  };
  useAudioRecorder.mockReturnValue(recorder);
  useAudioRecorderState.mockImplementation(() => ({
    isRecording,
    durationMillis: 1200
  }));
  return recorder;
}

async function completeOneAttempt({ expectReset = true } = {}) {
  fireEvent.press(screen.getByText('Record'));
  await waitFor(() => expect(screen.getByText('Stop recording (1.2s)')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Stop recording (1.2s)'));
  await waitFor(() => expect(screen.getByText('Play my recording')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Play my recording'));
  await waitFor(() => expect(screen.getByText('Sounds good, next phrase')).toBeEnabled());
  fireEvent.press(screen.getByText('Sounds good, next phrase'));
  if (expectReset) {
    await waitFor(() => expect(screen.getByText('Record')).toBeOnTheScreen());
  }
}

describe('speech practice screen', () => {
  beforeEach(() => {
    getAllWords.mockImplementation(() => TWO_AUDIO_WORDS);
    recordPracticeCompletion.mockClear();
    recordStudyAndXp.mockClear();
  });

  describe('scored mode', () => {
    it('awards 1 XP per accepted attempt and stops after 5 accepts', async () => {
      makeRecorder();
      const onComplete = jest.fn();
      render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} onComplete={onComplete} />);

      expect(recordStudyAndXp).not.toHaveBeenCalled();

      for (let i = 0; i < 4; i += 1) {
        await completeOneAttempt();
        expect(recordStudyAndXp).toHaveBeenCalledTimes(i + 1);
        expect(recordStudyAndXp).toHaveBeenLastCalledWith(1);
      }

      await completeOneAttempt({ expectReset: false });

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(recordStudyAndXp).toHaveBeenCalledTimes(5);
      expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
      expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
    });

    it('cycles a single audio word through 5 accepts', async () => {
      getAllWords.mockReturnValue([
        { target: 'bonjour', english: 'hello', audioKey: 'bonjour' }
      ]);

      makeRecorder();
      const onComplete = jest.fn();
      render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} onComplete={onComplete} />);

      expect(screen.getByText('bonjour')).toBeOnTheScreen();

      for (let i = 0; i < 4; i += 1) {
        await completeOneAttempt();
      }

      await completeOneAttempt({ expectReset: false });

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(recordStudyAndXp).toHaveBeenCalledTimes(5);
      expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
      expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
    });

    it('shows a message when no audio words exist', () => {
      getAllWords.mockReturnValue([]);

      render(<SpeechPracticeScreen language="cajun" scored />);

      expect(screen.getByText(/No Word with Audio is available/i)).toBeOnTheScreen();
      expect(recordStudyAndXp).not.toHaveBeenCalled();
    });
  });

  describe('free mode (default)', () => {
    it('calls recordPracticeCompletion on each accept without calling recordStudyAndXp', async () => {
      makeRecorder();
      render(<SpeechPracticeScreen language="cajun" />);

      await completeOneAttempt();

      expect(recordStudyAndXp).not.toHaveBeenCalled();
      expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
      expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
    });
  });

  describe('shared recording gates', () => {
    it('disables accept while write is in flight', async () => {
      let resolveWrite;
      recordPracticeCompletion.mockImplementationOnce(
        () => new Promise((r) => { resolveWrite = r; })
      );

      makeRecorder();
      render(<SpeechPracticeScreen language="cajun" />);

      await completeOneAttempt({ expectReset: false });

      expect(screen.getByText('Sounds good, next phrase')).toBeDisabled();
      resolveWrite();
      await waitFor(() => expect(screen.getByText('merci')).toBeOnTheScreen());
    });

    it('leaves recorder disposal to useAudioRecorder', () => {
      const stop = jest.fn();
      useAudioRecorder.mockReturnValue({ isRecording: true, stop });
      useAudioRecorderState.mockReturnValue({ isRecording: true, durationMillis: 800 });

      const { unmount } = render(<SpeechPracticeScreen language="cajun" />);
      unmount();

      expect(stop).not.toHaveBeenCalled();
    });
  });

  describe('Audio playback', () => {
    function players() {
      return createAudioPlayer.mock.results.map((result) => result.value);
    }

    beforeEach(() => {
      createAudioPlayer.mockClear();
      makeRecorder();
    });

    it('stops and releases the previous Audio when the learner plays it again', () => {
      render(<SpeechPracticeScreen language="cajun" />);

      fireEvent.press(screen.getByText('Play Audio'));
      fireEvent.press(screen.getByText('Play Audio'));

      const [first, second] = players();
      expect(first).toMatchObject({ playing: false, registered: false, released: true });
      expect(second).toMatchObject({ playing: true, released: false });
    });

    it('stops and releases the Audio when the screen unmounts', () => {
      const { unmount } = render(<SpeechPracticeScreen language="cajun" />);
      fireEvent.press(screen.getByText('Play Audio'));

      unmount();

      expect(players()).toEqual([expect.objectContaining({ playing: false, registered: false, released: true })]);
    });
  });
});