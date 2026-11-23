// Speech Practice releases the buttons when saving XP fails.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { getAllWords, getLessonsByLanguage } from '../../data/lessonLoader';
import { recordStudyAndXp } from '../../utils/storage';
import SpeechPracticeScreen from '../SpeechPracticeScreen';

jest.mock('../../data/audioManifest', () => ({ getAudioSource: jest.fn(() => 1) }));
jest.mock('../../data/lessonLoader', () => ({
  getAllWords: jest.fn(),
  getLessonsByLanguage: jest.fn()
}));
jest.mock('../../utils/storage', () => ({
  getLessonProgress: jest.fn(async () => ({})),
  getWordProgress: jest.fn(async () => ({})),
  recordPracticeCompletion: jest.fn(async () => {}),
  recordStudyAndXp: jest.fn(async () => {})
}));

const LESSONS = [{
  id: 'cajun_u01_l01',
  language: 'cajun',
  words: [
    { rowId: 'w01', target: 'bonjour', english: 'hello', audioKey: 'bonjour' },
    { rowId: 'w02', target: 'merci', english: 'thank you', audioKey: 'merci' }
  ]
}];

function makeRecorder() {
  let isRecording = false;
  useAudioRecorder.mockReturnValue({
    uri: 'file:///attempt.m4a',
    prepareToRecordAsync: jest.fn(async () => {}),
    record: jest.fn(() => { isRecording = true; }),
    stop: jest.fn(async () => { isRecording = false; })
  });
  useAudioRecorderState.mockImplementation(() => ({ isRecording, durationMillis: 1200 }));
}

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
}

beforeEach(() => {
  jest.clearAllMocks();
  getLessonsByLanguage.mockReturnValue(LESSONS);
  getAllWords.mockReturnValue(LESSONS[0].words);
});

describe('Speech Practice when the XP save fails', () => {
  it('releases the button after recordStudyAndXp rejects', async () => {
    makeRecorder();
    recordStudyAndXp.mockRejectedValueOnce(new Error('save failed'));

    render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} />);
    fireEvent.press(await screen.findByText('Record'));
    await waitFor(() => expect(screen.getByText('Stop recording (1.2s)')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Stop recording (1.2s)'));
    await waitFor(() => expect(screen.getByText('Play my recording')).toBeOnTheScreen());
    fireEvent.press(screen.getByText('Play my recording'));
    await waitFor(() => expect(screen.getByText('Sounds good, next phrase')).toBeEnabled());
    fireEvent.press(screen.getByText('Sounds good, next phrase'));
    await flush();

    expect(screen.queryByText('Working...')).toBeNull();
    expect(screen.getByText('Could not save this attempt. Try again.')).toBeOnTheScreen();
    expect(screen.getByText('Sounds good, next phrase')).toBeEnabled();
  });
});
