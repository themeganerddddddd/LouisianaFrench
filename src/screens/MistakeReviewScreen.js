import {
  useEffect,
  useState
} from 'react';

import {
  StyleSheet,
  Text,
  View
} from 'react-native';

import ActivityRenderer from '../components/ActivityRenderer';

import {
  getAllActivities
} from '../data/lessonLoader';

import SafeScreenView from '../components/SafeScreenView';

import {
  getPendingMistakes,
  recordPracticeCompletion,
  recordStudyAndXp,
  removePendingMistake
} from '../utils/storage';

export default function MistakeReviewScreen({
  route,
  navigation
}) {
  const {
    language,
    lessonTitle,
    mistakes,
    lessonXp
  } = route.params;

  const homeMode =
    route.params?.source ===
    'home';

  const initialQueue =
    homeMode
      ? []
      : mistakes || [];

  const [
    queue,
    setQueue
  ] = useState(
    () => initialQueue
  );

  const [
    resolvedCount,
    setResolvedCount
  ] = useState(0);

  const [
    initialTotal,
    setInitialTotal
  ] = useState(
    initialQueue.length
  );

  const [
    queueRevision,
    setQueueRevision
  ] = useState(0);

  const [
    loading,
    setLoading
  ] = useState(
    homeMode
  );

  useEffect(() => {
    if (!homeMode) {
      return;
    }

    async function loadPendingQueue() {
      const pending =
        await getPendingMistakes(
          language
        );

      const activities =
        new Map(
          getAllActivities(
            language
          ).map(
            (activity) => [
              activity.cardId,
              activity
            ]
          )
        );

      const resolved = [];

      for (
        const record
        of pending
      ) {
        const activity =
          activities.get(
            record.cardId
          );

        if (activity) {
          resolved.push({
            ...activity,
            userAnswer:
              record.answer
          });
        } else {
          await removePendingMistake(
            language,
            record.cardId
          );
        }
      }

      setQueue(
        resolved
      );

      setInitialTotal(
        resolved.length
      );

      setResolvedCount(
        0
      );

      setLoading(
        false
      );

      if (
        !resolved.length
      ) {
        navigation.replace(
          'Home',
          { language }
        );
      }
    }

    loadPendingQueue();
  }, [
    homeMode,
    language,
    navigation
  ]);

  if (loading) {
    return null;
  }

  if (!queue.length) {
    if (homeMode) {
      return null;
    }

    navigation.replace(
      'LessonComplete',
      {
        lessonTitle,

        xpEarned:
          lessonXp || 0,

        mistakesCount:
          0,

        streak:
          null,

        scoreEarned:
          null,

        scorePossible:
          null,

        language
      }
    );

    return null;
  }

  const current =
    queue[0];

  const totalMistakes =
    initialTotal ||
    queue.length;

  const currentMistakeNumber =
    Math.min(
      resolvedCount + 1,
      totalMistakes
    );

  const progressPct =
    totalMistakes
      ? Math.round(
          (
            currentMistakeNumber /
            totalMistakes
          ) * 100
        )
      : 0;

  async function handleCorrect() {
    await removePendingMistake(
      language,
      current.cardId
    );

    if (
      !(
        await getPendingMistakes(
          language
        )
      ).length
    ) {
      await recordPracticeCompletion(
        language,
        'mistakeReview'
      );
    }

    const remaining =
      queue.slice(1);

    if (
      remaining.length > 0
    ) {
      setQueue(
        remaining
      );

      setResolvedCount(
        (count) =>
          count + 1
      );

      setQueueRevision(
        (revision) =>
          revision + 1
      );

      return;
    }

    const updatedProfile =
      await recordStudyAndXp(
        10
      );

    if (homeMode) {
      navigation.replace(
        'Home',
        { language }
      );
    } else {
      navigation.replace(
        'LessonComplete',
        {
          lessonTitle,

          xpEarned:
            (lessonXp || 0) +
            10,

          mistakesCount:
            totalMistakes,

          streak:
            updatedProfile.streak,

          scoreEarned:
            null,

          scorePossible:
            null,

          language
        }
      );
    }
  }

  async function handleWrong(
    userAnswer
  ) {
    /*
     * Keep the card unresolved, but move it
     * to the back of the queue.
     *
     * This is the crash fix from before:
     * Continue advances to the next mistake
     * instead of leaving the renderer stranded.
     */
    setQueue(
      (currentQueue) => {
        if (
          !currentQueue.length
        ) {
          return currentQueue;
        }

        const [
          missedCard,
          ...rest
        ] = currentQueue;

        return [
          ...rest,
          {
            ...missedCard,
            userAnswer
          }
        ];
      }
    );

    setQueueRevision(
      (revision) =>
        revision + 1
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
        <View
          style={
            styles.reviewHeader
          }
        >
          <Text
            style={
              styles.header
            }
          >
            Mistake Review
          </Text>

          <Text
            style={
              styles.sub
            }
          >
            Let’s fix the questions you missed.
          </Text>

          <Text
            style={
              styles.reviewCount
            }
          >
            {
              currentMistakeNumber
            } / {
              totalMistakes
            }
          </Text>

          <View
            style={
              styles.reviewProgressBg
            }
          >
            <View
              style={[
                styles.reviewProgressFill,
                {
                  width:
                    `${progressPct}%`
                }
              ]}
            />
          </View>
        </View>

        <View style={styles.questionShell}>
          <ActivityRenderer
            key={`${current.cardId}-mistake-${queueRevision}`}
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
            allowSkip={
              false
            }
          />
        </View>
      </View>
    </SafeScreenView>
  );
}

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#FFF7ED'
    },

    inner: {
      flex: 1,
      padding: 18
    },

    questionShell: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#FED7AA',
      overflow: 'hidden'
    },

    reviewHeader: {
      backgroundColor:
        '#FFFFFF',

      borderRadius:
        22,

      paddingHorizontal:
        18,

      paddingTop:
        18,

      paddingBottom:
        16,

      marginBottom:
        4,

      borderWidth:
        1,

      borderColor:
        '#FED7AA'
    },

    header: {
      fontSize:
        28,

      fontWeight:
        '900',

      color:
        '#9A3412',

      marginBottom:
        6,

      textAlign:
        'center'
    },

    sub: {
      color:
        '#7C2D12',

      marginBottom:
        10,

      fontWeight:
        '700',

      textAlign:
        'center'
    },

    reviewCount: {
      marginTop:
        2,

      fontSize:
        14,

      fontWeight:
        '900',

      color:
        '#9A3412',

      textAlign:
        'center'
    },

    reviewProgressBg: {
      height:
        10,

      backgroundColor:
        '#FED7AA',

      borderRadius:
        999,

      marginTop:
        12,

      overflow:
        'hidden'
    },

    reviewProgressFill: {
      height:
        10,

      backgroundColor:
        '#F97316',

      borderRadius:
        999
    }
  });