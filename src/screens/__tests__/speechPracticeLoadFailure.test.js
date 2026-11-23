// #439: Daily Speech Practice stays on screen when the progress load rejects.
import { act, render, screen } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { getAllWords, getLessonsByLanguage } from '../../data/lessonLoader';
import {
  getLessonProgress,
  recordPracticeCompletion,
  recordStudyAndXp
} from '../../utils/storage';
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

describe('repro #439: Daily Speech Practice when the progress load fails', () => {
  it('shows the learner something instead of a blank screen', async () => {
    makeRecorder();
    getLessonProgress.mockRejectedValueOnce(new Error('storage read failed'));

    const view = render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} />);
    await flush();

    // Bug: the rejected Promise.all is never caught, dailyPracticeWords stays null,
    // and the screen returns null (SpeechPracticeScreen.js:68-76, :192).
    expect(view.toJSON()).not.toBeNull();
    expect(screen.getByText('Daily Speech Practice could not be loaded.')).toBeOnTheScreen();
    expect(screen.getByText('Try again')).toBeOnTheScreen();
    expect(recordStudyAndXp).not.toHaveBeenCalled();
    expect(recordPracticeCompletion).not.toHaveBeenCalled();
  });
});
