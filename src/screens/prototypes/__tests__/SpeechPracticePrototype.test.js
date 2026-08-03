import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { recordPracticeCompletion } from '../../../utils/storage';

import SpeechPracticePrototype from '../SpeechPracticePrototype';

jest.mock('../../../data/audioManifest', () => ({
  getAudioSource: jest.fn(() => 1)
}));

jest.mock('../../../data/lessonLoader', () => ({
  getAllWords: jest.fn(() => [
    { target: 'bonjour', english: 'hello', audioKey: 'bonjour' },
    { target: 'merci', english: 'thank you', audioKey: 'merci' }
  ])
}));

jest.mock('../../../utils/storage', () => ({
  recordPracticeCompletion: jest.fn(async () => {})
}));

describe('self-reviewed speech practice', () => {
  beforeEach(() => {
    recordPracticeCompletion.mockClear();
  });

  it('records Practice only after the learner accepts a replayed attempt', async () => {
    let isRecording = false;
    const recorder = {
      isRecording: false,
      uri: 'file:///attempt.m4a',
      prepareToRecordAsync: jest.fn(async () => {}),
      record: jest.fn(() => {
        isRecording = true;
      }),
      stop: jest.fn(async () => {
        isRecording = false;
      })
    };
    useAudioRecorder.mockReturnValue(recorder);
    useAudioRecorderState.mockImplementation(() => ({
      isRecording,
      durationMillis: 1200
    }));

    const { rerender } = render(<SpeechPracticePrototype language="cajun" />);

    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Play Audio'));
    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Record'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalled());
    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    rerender(<SpeechPracticePrototype language="cajun" />);

    fireEvent.press(screen.getByText('Stop recording (1.2s)'));

    expect(await screen.findByText('Play my recording')).toBeOnTheScreen();
    expect(screen.getByText('Sounds good, next phrase')).toBeDisabled();
    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Play my recording'));

    await waitFor(() => {
      expect(screen.getByText('Sounds good, next phrase')).toBeEnabled();
    });
    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Sounds good, next phrase'));

    await waitFor(() => {
      expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
    });
    expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
    expect(await screen.findByText('merci')).toBeOnTheScreen();
    expect(screen.queryByText('Play my recording')).toBeNull();
  });

  it('disables the accept button while the Practice write is in flight and writes only once', async () => {
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    recordPracticeCompletion.mockImplementationOnce(() => pendingWrite);

    let isRecording = false;
    const recorder = {
      isRecording: false,
      uri: 'file:///attempt.m4a',
      prepareToRecordAsync: jest.fn(async () => {}),
      record: jest.fn(() => {
        isRecording = true;
      }),
      stop: jest.fn(async () => {
        isRecording = false;
      })
    };
    useAudioRecorder.mockReturnValue(recorder);
    useAudioRecorderState.mockImplementation(() => ({
      isRecording,
      durationMillis: 1200
    }));

    const { rerender } = render(<SpeechPracticePrototype language="cajun" />);

    fireEvent.press(screen.getByText('Record'));
    await waitFor(() => expect(recorder.record).toHaveBeenCalled());
    rerender(<SpeechPracticePrototype language="cajun" />);

    fireEvent.press(screen.getByText('Stop recording (1.2s)'));
    expect(await screen.findByText('Play my recording')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('Play my recording'));
    await waitFor(() => {
      expect(screen.getByText('Sounds good, next phrase')).toBeEnabled();
    });

    fireEvent.press(screen.getByText('Sounds good, next phrase'));
    await waitFor(() => {
      expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
    });

    // Busy gate prevents a second press from reaching onPress.
    expect(screen.getByText('Sounds good, next phrase')).toBeDisabled();

    resolveWrite();
    await waitFor(() => {
      expect(screen.getByText('merci')).toBeOnTheScreen();
    });

    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
    expect(recordPracticeCompletion).toHaveBeenCalledWith('cajun', 'speech');
  });

  it('leaves recorder disposal to useAudioRecorder when unmounted', () => {
    const stop = jest.fn();
    useAudioRecorder.mockReturnValue({ isRecording: true, stop });
    useAudioRecorderState.mockReturnValue({ isRecording: true, durationMillis: 800 });

    const { unmount } = render(<SpeechPracticePrototype language="cajun" />);
    unmount();

    expect(stop).not.toHaveBeenCalled();
  });
});
