// Speech Practice releases the buttons when saving XP fails.
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { getAllWords, getLessonsByLanguage } from '../../data/lessonLoader';
import { recordPracticeCompletion, recordStudyAndXp } from '../../utils/storage';
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

async function acceptCurrentPhrase() {
  fireEvent.press(await screen.findByText('Record'));
  await waitFor(() => expect(screen.getByText('Stop recording (1.2s)')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Stop recording (1.2s)'));
  await waitFor(() => expect(screen.getByText('Play my recording')).toBeOnTheScreen());
  fireEvent.press(screen.getByText('Play my recording'));
  await waitFor(() => expect(screen.getByText('Sounds good, next phrase')).toBeEnabled());
  fireEvent.press(screen.getByText('Sounds good, next phrase'));
  await flush();
}

describe('Speech Practice last-word save retry', () => {
  it('does not award XP or rewrite the streak again when completion fails and the learner retries', async () => {
    makeRecorder();
    recordPracticeCompletion
      .mockRejectedValueOnce(new Error('completion failed'))
      .mockResolvedValueOnce(undefined);
    const onComplete = jest.fn();

    render(<SpeechPracticeScreen language="cajun" scored wordLimit={2} onComplete={onComplete} />);

    await acceptCurrentPhrase();
    expect(recordStudyAndXp).toHaveBeenCalledTimes(1);
    expect(recordPracticeCompletion).not.toHaveBeenCalled();

    await acceptCurrentPhrase();

    expect(screen.getByText('Could not save this attempt. Try again.')).toBeOnTheScreen();
    expect(recordStudyAndXp).toHaveBeenCalledTimes(2);
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Sounds good, next phrase'));
    await flush();

    expect(recordStudyAndXp).toHaveBeenCalledTimes(2);
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(2);
    expect(recordPracticeCompletion).toHaveBeenLastCalledWith('cajun', 'speech');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('says the attempt was saved when onComplete throws after a good save', async () => {
    makeRecorder();
    const onComplete = jest.fn(() => {
      throw new Error('next step failed');
    });

    render(<SpeechPracticeScreen language="cajun" scored wordLimit={1} onComplete={onComplete} />);
    await acceptCurrentPhrase();

    expect(screen.queryByText('Could not save this attempt. Try again.')).toBeNull();
    expect(screen.getByText(
      'This attempt was saved, but the next step could not start. Try again.'
    )).toBeOnTheScreen();
    expect(recordStudyAndXp).toHaveBeenCalledTimes(1);
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);

    fireEvent.press(screen.getByText('Sounds good, next phrase'));
    await flush();

    expect(recordStudyAndXp).toHaveBeenCalledTimes(1);
    expect(recordPracticeCompletion).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
