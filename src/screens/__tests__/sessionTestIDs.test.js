import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { requestRecordingPermissionsAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { activityByCardId } from '../../test/fixtures/catalog/activities';
import { renderApp } from '../../test/renderApp';
import * as homeProjection from '../../utils/homeProjection';
import * as reviewQueue from '../../utils/reviewQueue';
import * as storage from '../../utils/storage';
import AdvancedScreen from '../AdvancedScreen';
import SpeechPracticeScreen from '../SpeechPracticeScreen';

const CHOICE = activityByCardId('fixture:cajun:greeting:choice');

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

describe('session testIDs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    requestRecordingPermissionsAsync.mockReset();
    requestRecordingPermissionsAsync.mockResolvedValue({ granted: true });
  });

  it('tags the Speech Practice hub and the Daily Speech Practice session', async () => {
    makeRecorder();
    const hub = render(<SpeechPracticeScreen language="cajun" />);

    expect(screen.getByTestId('speech-practice-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-phrase')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-record')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-progress')).toBeOnTheScreen();
    hub.unmount();

    let grantPermission;
    requestRecordingPermissionsAsync.mockImplementation(
      () => new Promise((resolve) => { grantPermission = resolve; })
    );
    render(<SpeechPracticeScreen language="cajun" />);
    fireEvent.press(screen.getByTestId('speech-practice-record'));
    expect(screen.getByTestId('speech-practice-busy')).toBeOnTheScreen();
    await act(async () => { grantPermission({ granted: true }); });
    expect(screen.getByTestId('speech-practice-stop')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('speech-practice-stop'));
    await flush();
    expect(screen.getByTestId('speech-practice-record-again')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-sounds-good')).toBeOnTheScreen();
  });

  it('tags Daily Speech Practice loading, load error, and save failures', async () => {
    makeRecorder();
    const loading = render(<SpeechPracticeScreen language="cajun" scored wordLimit={1} />);
    expect(screen.getByTestId('speech-practice-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-loading')).toBeOnTheScreen();
    loading.unmount();

    jest.spyOn(storage, 'getLessonProgress').mockRejectedValue(new Error('storage read failed'));
    const navigation = { replace: jest.fn(), goBack: jest.fn() };
    render(
      <AdvancedScreen
        navigation={navigation}
        route={{ params: { language: 'cajun', scored: true } }}
      />
    );
    expect(await screen.findByTestId('speech-practice-load-error')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-try-again')).toBeOnTheScreen();
    expect(screen.getByTestId('speech-practice-hub')).toBeOnTheScreen();
    expect(screen.getByTestId('advanced-home-button')).toBeOnTheScreen();

    jest.restoreAllMocks();
    makeRecorder();
    jest.spyOn(storage, 'recordStudyAndXp').mockRejectedValue(new Error('save failed'));
    render(<SpeechPracticeScreen language="cajun" scored wordLimit={5} />);
    fireEvent.press(await screen.findByTestId('speech-practice-record'));
    await flush();
    fireEvent.press(screen.getByTestId('speech-practice-stop'));
    await flush();
    fireEvent.press(screen.getByText('Play my recording'));
    await flush();
    fireEvent.press(screen.getByTestId('speech-practice-sounds-good'));
    await flush();
    expect(screen.getByTestId('speech-practice-save-failed')).toBeOnTheScreen();

    jest.restoreAllMocks();
    makeRecorder();
    render(
      <SpeechPracticeScreen
        language="cajun"
        scored
        wordLimit={1}
        onComplete={() => { throw new Error('next step failed'); }}
      />
    );
    fireEvent.press(await screen.findByTestId('speech-practice-record'));
    await flush();
    fireEvent.press(screen.getByTestId('speech-practice-stop'));
    await flush();
    fireEvent.press(screen.getByText('Play my recording'));
    await flush();
    fireEvent.press(screen.getByTestId('speech-practice-sounds-good'));
    await flush();
    expect(screen.getByTestId('speech-practice-saved-next-failed')).toBeOnTheScreen();
  });

  it('tags Mistake Review', async () => {
    renderApp({
      initialRouteName: 'MistakeReview',
      initialParams: {
        language: 'cajun',
        lessonTitle: 'Greetings & Check-ins — First greetings',
        mistakes: [{ ...CHOICE, userAnswer: 'Bonjour' }],
        lessonXp: 20
      }
    });

    expect(screen.getByTestId('mistake-review-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('mistake-review-progress')).toHaveTextContent('1 / 1');
    expect(screen.getByTestId('mistake-review-prompt')).toBeOnTheScreen();
    expect(screen.getByTestId('mistake-review-choice-0')).toBeOnTheScreen();
    expect(screen.getByTestId('mistake-review-choice-1')).toBeOnTheScreen();

    fireEvent.press(screen.getByTestId('mistake-review-choice-0'));
    fireEvent.press(screen.getByTestId('mistake-review-check'));
    expect(screen.getByTestId('mistake-review-feedback-incorrect')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('mistake-review-try-again'));

    fireEvent.press(screen.getByTestId('mistake-review-choice-1'));
    fireEvent.press(screen.getByTestId('mistake-review-check'));
    expect(screen.getByTestId('mistake-review-feedback-correct')).toBeOnTheScreen();
    expect(screen.getByTestId('mistake-review-next')).toBeOnTheScreen();
  });

  it('tags Daily Review', async () => {
    const empty = renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });
    expect(await screen.findByTestId('daily-review-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('daily-review-empty')).toBeOnTheScreen();
    expect(screen.getByTestId('daily-review-home')).toBeOnTheScreen();
    empty.unmount();

    jest.spyOn(reviewQueue, 'getDailyReviewQueue').mockResolvedValue([
      { ...CHOICE, isReview: true }
    ]);
    renderApp({
      initialRouteName: 'DailyReview',
      initialParams: { language: 'cajun' }
    });

    expect(await screen.findByTestId('daily-review-due-count')).toHaveTextContent('1 / 1');
    expect(screen.getByTestId('daily-review-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('daily-review-prompt')).toBeOnTheScreen();
    expect(screen.getByTestId('daily-review-choice-0')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('daily-review-choice-1'));
    fireEvent.press(screen.getByTestId('daily-review-check'));
    expect(screen.getByTestId('daily-review-feedback-correct')).toBeOnTheScreen();
    expect(screen.getByTestId('daily-review-next')).toBeOnTheScreen();
  });

  it('tags Lesson Complete', () => {
    renderApp({
      initialRouteName: 'LessonComplete',
      initialParams: {
        lessonTitle: 'Greetings & Check-ins — First greetings',
        xpEarned: 30,
        mistakesCount: 1,
        streak: 2,
        language: 'cajun'
      }
    });

    expect(screen.getByTestId('lesson-complete-screen')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-complete-scroll')).toBeOnTheScreen();
    expect(screen.getByTestId('lesson-complete-xp')).toHaveTextContent('⚡ 30');
    expect(screen.getByTestId('lesson-complete-streak')).toHaveTextContent('🔥 Streak: 2');
    expect(screen.getByTestId('lesson-complete-home')).toBeOnTheScreen();
  });

  it('keeps Home entry points for these screens', async () => {
    jest.spyOn(homeProjection, 'getHomeProjection').mockResolvedValue({
      language: 'cajun',
      dashboard: {
        xp: 40,
        streak: 2,
        masteredWords: 1,
        totalWords: 4,
        masteryPercent: 25,
        reviewCount: 3,
        pendingMistakeCount: 2,
        reviewEnabled: true
      },
      plan: {
        steps: [
          { id: 'review', label: 'Review', complete: true },
          { id: 'lesson', label: 'Lesson', complete: true },
          { id: 'practice', label: 'Speech', complete: false }
        ],
        completedCount: 2,
        totalCount: 3,
        activeAction: {
          kind: 'speech',
          label: 'Practice Speech',
          destination: 'Advanced',
          params: { language: 'cajun', scored: true }
        },
        helperText: 'No mistakes to fix — speech practice instead.',
        allDone: false
      },
      currentUnit: null,
      catalogComplete: false,
      firstDay: false,
      units: []
    });

    renderApp({ initialRouteName: 'Home', initialParams: { language: 'cajun' } });

    expect(await screen.findByTestId('home-xp')).toHaveTextContent('⚡ 40');
    expect(screen.getByTestId('home-streak')).toHaveTextContent('🔥 2');
    expect(screen.getByTestId('home-review-control')).toBeOnTheScreen();
    expect(screen.getByTestId('review-count')).toBeOnTheScreen();
    expect(screen.getByTestId('home-mistakes-control')).toBeOnTheScreen();
    expect(screen.getByTestId('mistakes-count')).toBeOnTheScreen();
    expect(screen.getByTestId('home-hub-control')).toBeOnTheScreen();
    expect(screen.getByTestId('home-plan-cta')).toHaveTextContent('Practice Speech');
  });
});
