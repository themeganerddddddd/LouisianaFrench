import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  Animated,
  StyleSheet,
  View
} from 'react-native';

import ActivityRenderer from '../components/ActivityRenderer';
import LessonPrefaceModal from '../components/LessonPrefaceModal';
import ProgressHeader from '../components/ProgressHeader';
import SafeScreenView from '../components/SafeScreenView';

import {
  getLessonById,
  getUnitPreface
} from '../data/lessonLoader';

import { recordActivityOutcome } from '../utils/activityOutcome';

import { getDueReviewItems } from '../utils/spacedRepetition';

import {
  isPrefaceRead,
  markLessonComplete,
  markPrefaceRead,
  recordStudyAndXp,
  setLastWorkedUnit
} from '../utils/storage';

export default function LessonRunner({
  route,
  navigation
}) {
  const {
    language,
    lessonId,
    startActivityIndex,
    debugJump
  } = route.params;

  const lesson = useMemo(
    () =>
      getLessonById(
        language,
        lessonId
      ),
    [
      language,
      lessonId
    ]
  );

  const [
    activities,
    setActivities
  ] = useState([]);

  const [
    index,
    setIndex
  ] = useState(0);

  const [
    lessonXp,
    setLessonXp
  ] = useState(0);

  const [
    mistakes,
    setMistakes
  ] = useState([]);

  const [
    scoreEarned,
    setScoreEarned
  ] = useState(0);

  const [
    prefaceVisible,
    setPrefaceVisible
  ] = useState(false);

  const [
    prefaceMode,
    setPrefaceMode
  ] = useState('start');

  const appliedStartIndex =
    useRef(
      false
    );

  const unitPreface =
    useMemo(
      () =>
        getUnitPreface(
          language,
          lesson?.unit
        ),
      [
        language,
        lesson?.unit
      ]
    );

  const fadeAnim =
    useRef(
      new Animated.Value(1)
    ).current;

  const slideAnim =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    if (!lesson) {
      navigation.replace(
        'Home',
        { language }
      );

      return;
    }

    async function init() {
      await setLastWorkedUnit(
        language,
        lesson.unit
      );

      const due =
        await getDueReviewItems(
          lesson.activities || []
        );

      const dueIds =
        new Set(
          due.map(
            (d) => d.cardId
          )
        );

      const merged =
        (
          lesson.activities ||
          []
        ).map(
          (a) => ({
            ...a,
            isReview:
              dueIds.has(
                a.cardId
              )
          })
        );

      setActivities(
        merged
      );

      if (
        !appliedStartIndex.current &&
        typeof startActivityIndex ===
          'number' &&
        startActivityIndex >= 0 &&
        merged.length > 0
      ) {
        setIndex(
          Math.min(
            startActivityIndex,
            merged.length - 1
          )
        );
        appliedStartIndex.current =
          true;
      }
    }

    init();
  }, [
    lesson,
    language,
    navigation,
    startActivityIndex
  ]);

  useEffect(() => {
    if (
      !lesson ||
      !unitPreface ||
      debugJump
    ) {
      return;
    }

    if (
      lesson.lessonNumberInUnit !==
      1
    ) {
      return;
    }

    async function checkPreface() {
      const alreadyRead =
        await isPrefaceRead(
          unitPreface.id
        );

      if (!alreadyRead) {
        setPrefaceVisible(
          true
        );

        setPrefaceMode(
          'start'
        );
      }
    }

    checkPreface();
  }, [
    lesson,
    unitPreface,
    debugJump
  ]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(
        fadeAnim,
        {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }
      ),

      Animated.timing(
        slideAnim,
        {
          toValue: 0,
          duration: 220,
          useNativeDriver: true
        }
      )
    ]).start();
  }, [
    index,
    fadeAnim,
    slideAnim
  ]);

  function animateToNext(cb) {
    Animated.parallel([
      Animated.timing(
        fadeAnim,
        {
          toValue: 0,
          duration: 160,
          useNativeDriver: true
        }
      ),

      Animated.timing(
        slideAnim,
        {
          toValue: -12,
          duration: 160,
          useNativeDriver: true
        }
      )
    ]).start(() => {
      cb();

      slideAnim.setValue(
        12
      );

      fadeAnim.setValue(
        0
      );
    });
  }

  const handlePrefaceContinue =
    useCallback(
      async () => {
        if (unitPreface) {
          await markPrefaceRead(
            unitPreface.id
          );
        }

        setPrefaceVisible(
          false
        );
      },
      [unitPreface]
    );

  const handlePrefaceClose =
    useCallback(
      () => {
        setPrefaceVisible(
          false
        );
      },
      []
    );

  const handleOpenPreface =
    useCallback(
      () => {
        setPrefaceMode(
          'reference'
        );

        setPrefaceVisible(
          true
        );
      },
      []
    );

  const accentColor =
    language === 'kreole'
      ? '#6D28D9'
      : '#2771CB';

  // Only the first-open "start" preface hides the Activity. Reference mode
  // (header Unit note / T-Boy's Advice) must keep ActivityRenderer mounted so
  // answers, attempts, and reveal state survive closing the note (#267).
  const startPrefaceOpen =
    prefaceVisible &&
    prefaceMode === 'start';

  const displayProgress =
    startPrefaceOpen
      ? 0
      : index + 1;

  if (
    !lesson ||
    activities.length === 0
  ) {
    return null;
  }

  const current =
    activities[index];

  const scoredPossible =
    lesson.type === 'review'
      ? 0
      : activities.filter(
          (a) =>
            a.type !==
            'intro_card'
        ).length;

  async function applyOutcome(outcome, {
    nextMistakes,
    nextXp
  }) {
    if (outcome.countsTowardScore) {
      setScoreEarned((v) => v + 1);
    }

    setLessonXp(nextXp);

    if (outcome.nextStep === 'advance') {
      animateToNext(() => setIndex((i) => i + 1));
      return;
    }

    if (outcome.nextStep === 'mistakeReview') {
      navigation.replace('MistakeReview', {
        language,
        lessonId,
        lessonTitle: `${lesson.unitTitle} — ${lesson.lessonTitle}`,
        mistakes: nextMistakes,
        lessonXp: nextXp
      });
      return;
    }

    await finishLesson(
      nextXp,
      scoreEarned + (outcome.countsTowardScore ? 1 : 0)
    );
  }

  async function handleCorrect() {
    const outcome = await recordActivityOutcome({
      sessionKind: 'lesson',
      language,
      activity: current,
      wasCorrect: true,
      userAnswer: null,
      lessonId: lesson.id,
      lessonType: lesson.type,
      isLastActivity: index >= activities.length - 1,
      mistakeCount: mistakes.length
    });

    await applyOutcome(outcome, {
      nextMistakes: mistakes,
      nextXp: lessonXp + outcome.xpDelta
    });
  }

  async function handleWrong(userAnswer) {
    const nextMistake = {
      ...current,
      userAnswer
    };
    const nextMistakes = [...mistakes, nextMistake];

    const outcome = await recordActivityOutcome({
      sessionKind: 'lesson',
      language,
      activity: current,
      wasCorrect: false,
      userAnswer,
      lessonId: lesson.id,
      lessonType: lesson.type,
      isLastActivity: index >= activities.length - 1,
      mistakeCount: nextMistakes.length
    });

    setMistakes(nextMistakes);

    await applyOutcome(outcome, {
      nextMistakes,
      nextXp: lessonXp + outcome.xpDelta
    });
  }

  async function finishLesson(
    totalLessonXp,
    finalScoreEarned =
      scoreEarned
  ) {
    const profile =
      await recordStudyAndXp(
        language,
        totalLessonXp
      );

    await markLessonComplete(
      language,
      lesson.id
    );

    navigation.replace(
      'LessonComplete',
      {
        lessonTitle:
          `${lesson.unitTitle} — ${lesson.lessonTitle}`,

        xpEarned:
          totalLessonXp,

        mistakesCount:
          mistakes.length,

        streak:
          profile.streak,

        scoreEarned:
          lesson.type ===
            'review'
            ? null
            : finalScoreEarned,

        scorePossible:
          lesson.type ===
            'review'
            ? null
            : scoredPossible,

        language
      }
    );
  }

  return (
    <SafeScreenView
      style={
        styles.container
      }
    >
      <View
        style={
          styles.inner
        }
      >
        <ProgressHeader
          current={
            displayProgress
          }
          total={
            activities.length
          }
          xp={
            lessonXp
          }
          title={
            lesson.unitTitle
          }
          modeLabel={
            startPrefaceOpen
              ? 'Before you begin'
              : lesson.lessonTitle
          }
          language={
            language
          }
          unitPreface={
            prefaceVisible
              ? undefined
              : unitPreface
          }
          onOpenPreface={
            handleOpenPreface
          }
        />

        {!startPrefaceOpen ? (
          <Animated.View
            testID="lesson-activity-shell"
            style={[
              styles.activityShell,
              {
                opacity:
                  fadeAnim,

                transform: [
                  {
                    translateX:
                      slideAnim
                  }
                ]
              }
            ]}
          >
            <ActivityRenderer
              key={
                current?.cardId
              }
              activity={
                current
              }
              language={
                language
              }
              onCorrect={
                handleCorrect
              }
              onWrong={
                handleWrong
              }
              onOpenPreface={
                unitPreface
                  ? handleOpenPreface
                  : undefined
              }
            />
          </Animated.View>
        ) : null}
      </View>

      <LessonPrefaceModal
        preface={
          unitPreface
        }
        visible={
          prefaceVisible
        }
        mode={
          prefaceMode
        }
        onContinue={
          handlePrefaceContinue
        }
        onClose={
          handlePrefaceClose
        }
        accentColor={
          accentColor
        }
      />
    </SafeScreenView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#F7FAFC'
    },

    inner: {
      flex: 1,
      paddingHorizontal:
        18,
      paddingBottom:
        18
    },

    activityShell: {
      flex: 1
    }
  });