// #439: Daily Speech Practice stays on screen when the progress load rejects,
// and a load that never settles still reaches that error.
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { getAllWords, getLessonsByLanguage } from '../../data/lessonLoader';
import {
  getLessonProgress,
  getWordProgress,
  recordPracticeCompletion,
  recordStudyAndXp
} from '../../utils/storage';
import AdvancedScreen from '../AdvancedScreen';
import SpeechPracticeScreen from '../SpeechPracticeScreen';

// Keep in step with DAILY_PROGRESS_LOAD_TIMEOUT_MS in SpeechPracticeScreen.js.
const LOAD_TIMEOUT_MS = 8000;

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

    expect(view.toJSON()).not.toBeNull();
    expect(screen.getByText('Daily Speech Practice could not be loaded.')).toBeOnTheScreen();
    expect(screen.getByText('Try again')).toBeOnTheScreen();
    expect(recordStudyAndXp).not.toHaveBeenCalled();
    expect(recordPracticeCompletion).not.toHaveBeenCalled();
  });

  it('lets the learner go Home from the error screen', async () => {
    makeRecorder();
    getLessonProgress.mockRejectedValueOnce(new Error('storage read failed'));
    const navigation = { replace: jest.fn(), goBack: jest.fn() };

    render(
      <AdvancedScreen
        navigation={navigation}
        route={{ params: { language: 'cajun', scored: true } }}
      />
    );
    await flush();

    expect(screen.getByText('Daily Speech Practice could not be loaded.')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('advanced-home-button'));

    expect(navigation.replace).toHaveBeenCalledWith('Home', { language: 'cajun' });
    expect(recordStudyAndXp).not.toHaveBeenCalled();
    expect(recordPracticeCompletion).not.toHaveBeenCalled();
  });

  it('shows the words after Try again when the next load works', async () => {
    makeRecorder();
    getLessonProgress
      .mockRejectedValueOnce(new Error('storage read failed'))
      .mockResolvedValueOnce({});

    render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} />);
    await flush();
    fireEvent.press(screen.getByText('Try again'));

    expect(await screen.findByText('bonjour')).toBeOnTheScreen();
    expect(screen.queryByText('Daily Speech Practice could not be loaded.')).toBeNull();
    expect(recordStudyAndXp).not.toHaveBeenCalled();
    expect(recordPracticeCompletion).not.toHaveBeenCalled();
  });

  it('shows loading, then the error, when storage never answers', async () => {
    jest.useFakeTimers();
    try {
      makeRecorder();
      getLessonProgress.mockImplementation(() => new Promise(() => {}));
      getWordProgress.mockImplementation(() => new Promise(() => {}));

      const view = render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} />);

      expect(view.toJSON()).not.toBeNull();
      expect(screen.getByText('Loading Daily Speech Practice.')).toBeOnTheScreen();
      expect(screen.queryByText('Daily Speech Practice could not be loaded.')).toBeNull();

      await act(async () => {
        jest.advanceTimersByTime(LOAD_TIMEOUT_MS - 1);
      });
      expect(screen.getByText('Loading Daily Speech Practice.')).toBeOnTheScreen();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });

      expect(screen.getByText('Daily Speech Practice could not be loaded.')).toBeOnTheScreen();
      expect(screen.getByText('Try again')).toBeOnTheScreen();
      expect(screen.queryByText('Loading Daily Speech Practice.')).toBeNull();
      expect(recordStudyAndXp).not.toHaveBeenCalled();
      expect(recordPracticeCompletion).not.toHaveBeenCalled();
    } finally {
      getLessonProgress.mockImplementation(async () => ({}));
      getWordProgress.mockImplementation(async () => ({}));
      jest.useRealTimers();
    }
  });
});
