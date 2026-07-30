import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';

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

describe('self-reviewed speech practice', () => {
  it('requires playback before the learner can move to the next phrase', async () => {
    let isRecording = true;
    const recorder = {
      isRecording: true,
      uri: 'file:///attempt.m4a',
      stop: jest.fn(async () => {
        isRecording = false;
      })
    };
    useAudioRecorder.mockReturnValue(recorder);
    useAudioRecorderState.mockImplementation(() => ({
      isRecording,
      durationMillis: 1200
    }));

    render(<SpeechPracticePrototype language="cajun" />);

    fireEvent.press(screen.getByText('Stop recording (1.2s)'));

    expect(await screen.findByText('Play my recording')).toBeOnTheScreen();
    expect(screen.getByText('Sounds good, next phrase')).toBeDisabled();

    fireEvent.press(screen.getByText('Play my recording'));

    await waitFor(() => {
      expect(screen.getByText('Sounds good, next phrase')).toBeEnabled();
    });

    fireEvent.press(screen.getByText('Sounds good, next phrase'));

    expect(await screen.findByText('merci')).toBeOnTheScreen();
    expect(screen.queryByText('Play my recording')).toBeNull();
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
