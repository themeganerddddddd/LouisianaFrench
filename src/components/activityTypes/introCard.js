import { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  AltToggleButtons,
  AlternativeList,
  ContextBadge,
  QuestionScrollView,
  TBoyCallout,
  getPrimaryEnglish,
  getPrimaryTarget,
  shouldShowIntroAddOns
} from './shell';
import styles from './styles';
import { useAudio } from './useAudio';

export function IntroCard({
  activity,
  language,
  onCorrect,
  theme,
  onOpenPreface
}) {
  const { playAudioKey, stopAll } = useAudio(language);

  const [submitted, setSubmitted] = useState(false);
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const showAddOns = shouldShowIntroAddOns(activity);

  function submit() {
    stopAll();
    setSubmitted(true);
    onCorrect();
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activity.audioKey) {
        playAudioKey(activity.audioKey);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activity.audioKey, playAudioKey]);

  return (
    <QuestionScrollView>
      <Text style={[styles.kicker, { color: theme.text }]}>
        New word
      </Text>

      <ContextBadge
        activity={activity}
        language={language}
      />

      <Text style={styles.prompt}>
        {activity.prompt}
      </Text>

      <AltToggleButtons
        activity={activity}
        language={language}
        showEnglishAlt={showEnglishAlt}
        setShowEnglishAlt={setShowEnglishAlt}
        showVariantAlt={showVariantAlt}
        setShowVariantAlt={setShowVariantAlt}
        theme={theme}
        visible={showAddOns}
      />

      <View
        style={[
          styles.introWordCard,
          { backgroundColor: theme.light }
        ]}
      >
        {showVariantAlt && activity.variantAltResponse ? (
          <>
            <Text style={styles.tapToHearAlternative}>
              Tap to hear the alternative
            </Text>

            <AlternativeList
              text={activity.variantAltResponse}
              textStyle={styles.introWord}
              containerStyle={styles.introAltList}
              language={language}
              activity={activity}
              onPlayAudioKey={playAudioKey}
              playableColor={theme.text}
            />
          </>
        ) : (
          <TouchableOpacity
            onPress={() => playAudioKey(activity.audioKey)}
            disabled={!activity.audioKey}
            accessibilityRole="button"
            accessibilityLabel={`Play audio: ${activity.target}`}
          >
            <Text style={styles.introWord}>
              {getPrimaryTarget(activity)}
            </Text>
          </TouchableOpacity>
        )}

        {showEnglishAlt && activity.englishAltResponse ? (
          <AlternativeList
            text={activity.englishAltResponse}
            textStyle={styles.introTranslation}
            containerStyle={styles.introAltListTranslation}
          />
        ) : (
          <Text style={styles.introTranslation}>
            {getPrimaryEnglish(activity)}
          </Text>
        )}

        {!showVariantAlt && !showEnglishAlt ? (
          <Text style={[styles.tapToHear, { color: theme.text }]}>
            Tap the word to hear it again
          </Text>
        ) : null}
      </View>

      <TBoyCallout
        activity={activity}
        language={language}
        visible={showAddOns}
        onOpenPreface={onOpenPreface}
      />

      <TouchableOpacity
        style={[
          styles.primaryBtn,
          { backgroundColor: theme.accent },
          submitted && styles.primaryBtnDisabled
        ]}
        onPress={submit}
        disabled={submitted}
      >
        <Text style={styles.primaryBtnText}>
          Continue
        </Text>
      </TouchableOpacity>
    </QuestionScrollView>
  );
}
