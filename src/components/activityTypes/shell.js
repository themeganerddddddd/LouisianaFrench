import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { resolveAlternativeAudioKey } from '../../utils/alternativeAudio';
import { splitAlternativeResponses } from '../../utils/splitAlternativeResponses';
import TBoySpeechBubble from '../TBoySpeechBubble';
import styles from './styles';

const tBoyImage = require('../../../assets/images/mainscreen.png');

export function getTheme(language) {
  return language === 'kreole'
    ? {
        accent: '#08834c',
        light: '#E7F5EE',
        text: '#066B3F'
      }
    : {
        accent: '#2771CB',
        light: '#EAF3FF',
        text: '#2771CB'
      };
}

export function getCardStatusStyle(state) {
  if (state === 'correct') return styles.cardCorrect;
  if (state === 'wrong' || state === 'skipped') return styles.cardWrong;
  return null;
}

export function isLocked(state) {
  return state === 'correct' || state === 'wrong' || state === 'skipped';
}

export function shouldRevealAfterAnswer(state, attempts) {
  return state === 'correct' || state === 'skipped' || (state === 'wrong' && attempts > 1);
}

export function shouldShowIntroAddOns(activity) {
  return activity?.type === 'intro_card';
}

export function getHintText(activity) {
  if (!activity) return '';

  if (activity.type === 'typing' || activity.type === 'sentence_build') {
    const answer = String(activity.answerDisplay || activity.answer || '');
    if (!answer) return '';

    return `Starts with: ${answer.slice(0, Math.min(3, answer.length))}…`;
  }

  if (activity.english) {
    return `Hint: think about "${activity.english}"`;
  }

  return '';
}

export function getPrimaryEnglish(activity) {
  return activity?.english || '';
}

export function getPrimaryTarget(activity) {
  return activity?.answerDisplay || activity?.target || activity?.answer || '';
}

export function getPromptDisplay(activity) {
  if (!activity) return '';

  const englishText = getPrimaryEnglish(activity);

  if (activity.type === 'multiple_choice') {
    return `Choose the match for '${englishText}'`;
  }

  if (activity.type === 'typing') {
    return `Type: '${englishText}'`;
  }

  if (activity.type === 'sentence_build') {
    return `Build: '${englishText}'`;
  }

  return activity.prompt;
}

function getVariantAlternativeLabel(language) {
  return language === 'kreole'
    ? 'Creole Alternative'
    : 'Louisiana French Alternative';
}

export function QuestionScrollView({ state, children }) {
  return (
    <ScrollView
      testID="activity-scroll"
      style={styles.scrollShell}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.card, getCardStatusStyle(state)]}>
        {children}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

export function AlternativeList({
  text,
  textStyle,
  containerStyle,
  language,
  activity,
  onPlayAudioKey,
  playableColor
}) {
  const items = splitAlternativeResponses(text);

  if (items.length === 0) return null;

  return (
    <View style={containerStyle}>
      {items.map((item, index) => {
        const audioKey =
          language && activity && onPlayAudioKey
            ? resolveAlternativeAudioKey(language, item, activity)
            : null;

        if (audioKey) {
          return (
            <TouchableOpacity
              key={`${index}-${item}`}
              onPress={() => onPlayAudioKey(audioKey)}
              accessibilityRole="button"
              accessibilityLabel={`Play audio: ${item}`}
            >
              <Text
                style={[
                  textStyle,
                  styles.alternativeListItem,
                  playableColor ? { color: playableColor } : null
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <Text
            key={`${index}-${item}`}
            style={[textStyle, styles.alternativeListItem]}
          >
            {item}
          </Text>
        );
      })}
    </View>
  );
}

export function AltToggleButtons({
  activity,
  language,
  showEnglishAlt,
  setShowEnglishAlt,
  showVariantAlt,
  setShowVariantAlt,
  theme,
  visible
}) {
  const hasEnglishAlt = !!activity?.englishAltResponse;
  const hasVariantAlt = !!activity?.variantAltResponse;

  if (!visible || (!hasEnglishAlt && !hasVariantAlt)) return null;

  return (
    <View style={styles.altButtonRow}>
      {hasEnglishAlt ? (
        <TouchableOpacity
          style={[styles.altButton, { backgroundColor: theme.light }]}
          onPress={() => setShowEnglishAlt((v) => !v)}
        >
          <Text style={[styles.altButtonText, { color: theme.text }]}>
            Translation alternative
          </Text>
        </TouchableOpacity>
      ) : null}

      {hasVariantAlt ? (
        <TouchableOpacity
          style={[styles.altButton, { backgroundColor: theme.light }]}
          onPress={() => setShowVariantAlt((v) => !v)}
        >
          <Text style={[styles.altButtonText, { color: theme.text }]}>
            {getVariantAlternativeLabel(language)}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function AnswerAltButtons({
  activity,
  visible,
  theme,
  language,
  onPlayAudioKey
}) {
  const [showEnglishAlt, setShowEnglishAlt] = useState(false);
  const [showVariantAlt, setShowVariantAlt] = useState(false);

  const hasEnglishAlt = !!activity?.englishAltResponse;
  const hasVariantAlt = !!activity?.variantAltResponse;

  if (!visible || (!hasEnglishAlt && !hasVariantAlt)) return null;

  return (
    <View style={styles.answerAltWrap}>
      {hasEnglishAlt ? (
        <View style={styles.answerAltBlock}>
          <TouchableOpacity
            style={[styles.altButton, { backgroundColor: theme.light }]}
            onPress={() => setShowEnglishAlt((v) => !v)}
          >
            <Text style={[styles.altButtonText, { color: theme.text }]}>
              Translation alternative
            </Text>
          </TouchableOpacity>

          {showEnglishAlt ? (
            <AlternativeList
              text={activity.englishAltResponse}
              textStyle={styles.answerAltText}
              containerStyle={styles.answerAltList}
            />
          ) : null}
        </View>
      ) : null}

      {hasVariantAlt ? (
        <View style={styles.answerAltBlock}>
          <TouchableOpacity
            style={[styles.altButton, { backgroundColor: theme.light }]}
            onPress={() => setShowVariantAlt((v) => !v)}
          >
            <Text style={[styles.altButtonText, { color: theme.text }]}>
              {getVariantAlternativeLabel(language)}
            </Text>
          </TouchableOpacity>

          {showVariantAlt ? (
            <AlternativeList
              text={activity.variantAltResponse}
              textStyle={styles.answerAltText}
              containerStyle={styles.answerAltList}
              language={language}
              activity={activity}
              onPlayAudioKey={onPlayAudioKey}
              playableColor={theme.text}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function ContextBadge({ activity, language }) {
  const theme = getTheme(language);

  if (!activity?.contextBadge) return null;

  return (
    <View
      style={[
        styles.contextBadge,
        {
          backgroundColor: theme.light,
          borderColor: theme.accent
        }
      ]}
    >
      <Text style={[styles.contextBadgeText, { color: theme.text }]}>
        {activity.contextBadge}
      </Text>
    </View>
  );
}

export function TBoyCallout({ activity, language, visible, onOpenPreface }) {
  const theme = getTheme(language);
  const heading = activity?.english || activity?.target || 'Context';
  const canOpenPreface = typeof onOpenPreface === 'function';

  if (!visible || !activity?.extraDetails) return null;

  return (
    <View style={styles.tBoyWrap} testID="tboy-callout">
      <View style={styles.tBoyStage}>
        <TBoySpeechBubble
          heading={heading}
          body={activity.extraDetails}
          accentColor={theme.accent}
          testID="tboy-speech-bubble"
          headingTestID="tboy-heading"
          bodyTestID="tboy-text"
        />

        {canOpenPreface ? (
          <Pressable
            style={({ pressed }) => [
              styles.tBoyAction,
              pressed && styles.tBoyActionPressed
            ]}
            onPress={onOpenPreface}
            accessibilityRole="button"
            accessibilityLabel="T-Boy: open Unit note"
            accessibilityHint="Opens the full Unit note"
          >
            <View style={styles.tBoyArtPocket}>
              <Image
                source={tBoyImage}
                style={styles.tBoyImage}
                resizeMode="contain"
                testID="tboy-image"
                accessible={false}
              />
            </View>

            <View style={styles.tBoyActionLabel}>
              <Text style={[styles.tBoyActionText, { color: theme.accent }]}>
                T-Boy&apos;s Advice
              </Text>
              <Ionicons name="chevron-forward" size={14} color={theme.accent} />
            </View>
          </Pressable>
        ) : (
          <View style={styles.tBoyArtPocket}>
            <Image
              source={tBoyImage}
              style={styles.tBoyImage}
              resizeMode="contain"
              testID="tboy-image"
              accessibilityRole="image"
              accessibilityLabel="T-Boy"
            />
          </View>
        )}
      </View>
    </View>
  );
}

export function SkipQuestionButton({ onSkip, disabled }) {
  return (
    <TouchableOpacity
      style={[styles.skipButton, disabled && styles.disabledButton]}
      onPress={onSkip}
      disabled={disabled}
    >
      <Text style={styles.skipButtonText}>Skip</Text>
    </TouchableOpacity>
  );
}

export function FeedbackFooter({
  state,
  firstWrong,
  hintText,
  answerDisplay,
  onTryAgain,
  onNext,
  onIncorrect,
  altContent,
  wrongTitle = 'Let’s move on',
  answerContent
}) {
  const [submitted, setSubmitted] = useState(false);

  async function submit(handler) {
    setSubmitted(true);
    try {
      await handler?.();
    } catch (error) {
      setSubmitted(false);
      if (__DEV__ && process.env.NODE_ENV !== 'test') {
        console.warn('Activity advance failed; re-enabling footer', error);
      }
    }
  }

  if (state === 'correct') {
    return (
      <View style={[styles.footer, styles.footerGreen]}>
        <Text style={styles.footerTitle}>Correct!</Text>

        {altContent}

        <TouchableOpacity
          style={[styles.footerButtonGreen, submitted && styles.disabledButton]}
          onPress={() => {
            void submit(onNext);
          }}
          disabled={submitted}
        >
          <Text style={styles.footerButtonText}>Next Question</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'skipped') {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Skipped</Text>

        {answerContent ||
          (answerDisplay ? (
            <Text style={styles.footerSub}>Answer: {answerDisplay}</Text>
          ) : null)}

        {altContent}

        <TouchableOpacity
          style={[styles.footerButtonRed, submitted && styles.disabledButton]}
          onPress={() => {
            void submit(onIncorrect);
          }}
          disabled={submitted}
        >
          <Text style={styles.footerButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>Not quite</Text>

        {hintText ? <Text style={styles.footerSub}>{hintText}</Text> : null}

        <TouchableOpacity
          style={styles.footerButtonRed}
          onPress={onTryAgain}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.footerButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (state === 'wrong' && !firstWrong) {
    return (
      <View style={[styles.footer, styles.footerRed]}>
        <Text style={styles.footerTitle}>{wrongTitle}</Text>

        {answerContent ||
          (answerDisplay ? (
            <Text style={styles.footerSub}>Answer: {answerDisplay}</Text>
          ) : hintText ? (
            <Text style={styles.footerSub}>{hintText}</Text>
          ) : null)}

        {altContent}

        <TouchableOpacity
          style={[styles.footerButtonRed, submitted && styles.disabledButton]}
          onPress={() => {
            void submit(onIncorrect);
          }}
          disabled={submitted}
        >
          <Text style={styles.footerButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}
