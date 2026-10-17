import { render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import LessonRunner from '../../screens/LessonRunner';
import {
  chooseAndCheck,
  expectFinalWrong,
  press,
  retry
} from '../../test/activityInteractions';
import { clock } from '../../test/fixtures/clock';
import { lessonActivityOutcomes } from '../../test/fixtures/learnerProgress/lessonActivityOutcomes';
import { reviewStates } from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { seedAsyncStorage } from '../../test/fixtures/learnerProgress/seedAsyncStorage';
import { renderApp } from '../../test/renderApp';
import { setupAppTests, setupUser } from '../../test/setupAppTest';
import * as spacedRepetition from '../spacedRepetition';
import {
  getLessonProgress,
  getPendingMistakes,
  getProfile,
  getWordProgress,
  markPrefaceRead
} from '../storage';

jest.mock('../../data/lessonLoader', () =>
  require('../../test/fixtures/catalog/activities').fixtureCatalog
);

setupAppTests();

beforeEach(() => {
  jest.setSystemTime(clock.dueNow());
  jest.restoreAllMocks();
});

function renderLesson(navigation, params) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 0, right: 0, bottom: 0, left: 0 }
      }}
    >
      <LessonRunner
        navigation={navigation}
        route={{ params }}
      />
    </SafeAreaProvider>
  );
}

describe('Lesson Activity outcome characterization (#195)', () => {
  it('awards quality 4 and 10 XP on a correct new Card, then advances', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.correctNewCard;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: {
        language: case_.language,
        lessonId: case_.lessonId,
        startActivityIndex: 1,
        debugJump: true
      }
    });

    expect(await screen.findByText('Listen and choose the word')).toBeOnTheScreen();
    await chooseAndCheck(user, 'Bonjour');
    expect(screen.getByText('Correct!')).toBeOnTheScreen();
    await press(user, 'Next Question');

    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(screen.getByText(`⚡ ${case_.expected.xpDelta}`)).toBeOnTheScreen();
    expect(await screen.findByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
    expect(await getPendingMistakes('cajun')).toEqual([]);
  });

  it('awards quality 5 and 6 XP on a correct due Card, then advances', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.correctDueCard;
    await seedAsyncStorage({ reviewState: reviewStates.dueListenOnly });
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: {
        language: case_.language,
        lessonId: case_.lessonId,
        startActivityIndex: 1,
        debugJump: true
      }
    });

    expect(await screen.findByText('Listen and choose the word')).toBeOnTheScreen();
    await chooseAndCheck(user, 'Bonjour');
    expect(screen.getByText('Correct!')).toBeOnTheScreen();
    await press(user, 'Next Question');

    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(screen.getByText(`⚡ ${case_.expected.xpDelta}`)).toBeOnTheScreen();
    expect(await screen.findByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
  });

  it('records quality 2, Word wrong, and a pending Mistake on a wrong mid-Lesson answer, then advances', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.wrongMidLesson;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: {
        language: case_.language,
        lessonId: case_.lessonId,
        startActivityIndex: 2,
        debugJump: true
      }
    });

    expect(await screen.findByText("Choose the match for 'How’s it going?'")).toBeOnTheScreen();
    await chooseAndCheck(user, case_.userAnswer);
    expect(screen.getByText('Not quite')).toBeOnTheScreen();
    await retry(user);
    await chooseAndCheck(user, case_.userAnswer);
    expectFinalWrong('Ça va?');
    await press(user, 'Continue');

    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: case_.expected.pendingMistakeSource,
        sourceId: case_.lessonId,
        answer: case_.userAnswer
      })
    ]);
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 0, wrong: 1 })
    );
    expect(screen.getByText('⚡ 0')).toBeOnTheScreen();
    expect(await screen.findByText("Type: 'How’s it going?'")).toBeOnTheScreen();
  });

  it('skips Lesson score for an intro Activity while still awarding XP and advancing', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.introExcludedFromScore;
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');
    await markPrefaceRead('cajun:u03');

    renderApp({
      initialRouteName: 'Lesson',
      initialParams: {
        language: case_.language,
        lessonId: case_.lessonId,
        debugJump: true
      }
    });

    expect(await screen.findByText('Listen and learn')).toBeOnTheScreen();
    await press(user, 'Continue');

    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(screen.getByText(`⚡ ${case_.expected.xpDelta}`)).toBeOnTheScreen();
    expect(await screen.findByText("Choose the match for 'to be'")).toBeOnTheScreen();
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
  });

  it('completes a review Lesson with no score and full XP', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.reviewLessonComplete;
    const navigation = { replace: jest.fn() };
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderLesson(navigation, {
      language: case_.language,
      lessonId: case_.lessonId,
      debugJump: true
    });

    expect(await screen.findByText("Choose the match for 'we'")).toBeOnTheScreen();
    await chooseAndCheck(user, 'nouzòt');
    await press(user, 'Next Question');

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        'LessonComplete',
        expect.objectContaining({
          xpEarned: case_.expected.xpDelta,
          scoreEarned: case_.expected.scoreEarned,
          scorePossible: case_.expected.scorePossible,
          language: case_.language
        })
      );
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getLessonProgress())[`kreole:${case_.lessonId}`].completed).toBe(true);
    expect((await getProfile('kreole')).xp).toBe(case_.expected.xpDelta);
  });

  it('opens Mistake Review after a wrong final Lesson Activity', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.lastActivityWithMistakes;
    const navigation = { replace: jest.fn() };
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderLesson(navigation, {
      language: case_.language,
      lessonId: case_.lessonId
    });

    expect(await screen.findByText("Build: 'It's ready'")).toBeOnTheScreen();
    await press(user, "C'est");
    await press(user, 'Check');
    expect(screen.getByText('Not quite')).toBeOnTheScreen();
    await retry(user);
    await press(user, 'Check');
    expectFinalWrong("C'est paré");
    await press(user, 'Continue');

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        'MistakeReview',
        expect.objectContaining({
          language: case_.language,
          lessonId: case_.lessonId,
          lessonXp: 0,
          mistakes: [
            expect.objectContaining({
              cardId: case_.activity.cardId,
              userAnswer: case_.userAnswer
            })
          ]
        })
      );
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect(await getPendingMistakes('cajun')).toEqual([
      expect.objectContaining({
        cardId: case_.activity.cardId,
        source: case_.expected.pendingMistakeSource,
        sourceId: case_.lessonId
      })
    ]);
  });

  it('completes a clean Lesson with score, XP, and Lesson complete', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.lastActivityCleanComplete;
    const navigation = { replace: jest.fn() };
    const updateCardReview = jest.spyOn(spacedRepetition, 'updateCardReview');

    renderLesson(navigation, {
      language: case_.language,
      lessonId: case_.lessonId
    });

    expect(await screen.findByText("Build: 'It's ready'")).toBeOnTheScreen();
    await press(user, "C'est");
    await press(user, 'paré');
    await press(user, 'Check');
    await press(user, 'Next Question');

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        'LessonComplete',
        expect.objectContaining({
          xpEarned: case_.expected.xpDelta,
          scoreEarned: case_.expected.scoreEarned,
          scorePossible: case_.expected.scorePossible,
          language: case_.language
        })
      );
    });
    expect(updateCardReview).toHaveBeenCalledWith(
      case_.activity.cardId,
      case_.expected.cardQuality
    );
    expect((await getLessonProgress())[`cajun:${case_.lessonId}`].completed).toBe(true);
    expect((await getProfile('cajun')).xp).toBe(case_.expected.xpDelta);
    expect((await getWordProgress())[`cajun:${case_.activity.rowId}`]).toEqual(
      expect.objectContaining({ correct: 1, wrong: 0 })
    );
  });

  it('counts only scored Activities toward core Lesson score after an intro', async () => {
    const user = setupUser();
    const case_ = lessonActivityOutcomes.coreLessonScoreAfterIntroAndChoice;
    const navigation = { replace: jest.fn() };
    await markPrefaceRead('cajun:u03');

    renderLesson(navigation, {
      language: 'cajun',
      lessonId: case_.lessonId,
      debugJump: true
    });

    expect(await screen.findByText('Listen and learn')).toBeOnTheScreen();
    await press(user, 'Continue');

    expect(await screen.findByText("Choose the match for 'to be'")).toBeOnTheScreen();
    await chooseAndCheck(user, 'être');
    await press(user, 'Next Question');

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith(
        'LessonComplete',
        expect.objectContaining({
          xpEarned: case_.expected.xpDeltaTotal,
          scoreEarned: case_.expected.scoreEarned,
          scorePossible: case_.expected.scorePossible
        })
      );
    });
  });

  // Mistake Review Card/Word updates: Issue #30 closed without a product rule.
  // Do not assert those writes as desired behavior in this characterization.
});
