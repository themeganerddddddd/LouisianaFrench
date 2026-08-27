import { getAudioSource } from '../data/audioManifest';
import { getAllActivities, getAllWords } from '../data/lessonLoader';

const targetAudioLookups = new Map();

function registerTargetAudio(map, language, target, audioKey) {
  const phrase = String(target || '').trim();
  if (!phrase || !audioKey || map.has(phrase)) {
    return;
  }

  if (getAudioSource(language, audioKey)) {
    map.set(phrase, audioKey);
  }
}

export function getTargetAudioLookup(language) {
  if (targetAudioLookups.has(language)) {
    return targetAudioLookups.get(language);
  }

  const lookup = new Map();

  for (const word of getAllWords(language)) {
    registerTargetAudio(lookup, language, word.target, word.audioKey);
  }

  for (const activity of getAllActivities(language)) {
    registerTargetAudio(lookup, language, activity.target, activity.audioKey);
    registerTargetAudio(lookup, language, activity.answer, activity.audioKey);
    registerTargetAudio(
      lookup,
      language,
      activity.answerDisplay,
      activity.audioKey
    );
  }

  targetAudioLookups.set(language, lookup);
  return lookup;
}

export function resolveAlternativeAudioKey(language, phrase, activity) {
  const normalized = String(phrase || '').trim();
  if (!normalized) {
    return null;
  }

  const fromCatalog = getTargetAudioLookup(language).get(normalized);
  if (fromCatalog) {
    return fromCatalog;
  }

  const primaryTarget = String(
    activity?.target || activity?.answer || activity?.answerDisplay || ''
  ).trim();

  if (
    normalized === primaryTarget &&
    activity?.audioKey &&
    getAudioSource(language, activity.audioKey)
  ) {
    return activity.audioKey;
  }

  return null;
}

export function clearTargetAudioLookupCache() {
  targetAudioLookups.clear();
}
