import { createAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef } from 'react';
import { resolveAudio } from '../../data/lessonLoader';
import {
  releaseAudioPlayer,
  stopLessonAudio,
  trackLessonFxPlayer,
  trackLessonWordPlayer
} from '../../utils/audioPlayer';

const CORRECT_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAFoGTgx9EZUVUhiLGSoZNhfOEyoPkglhA/v8xfYi8W3s8ujo5nDmkec66j/uYPNM+aP//wX8CzkRYhU1GIQZOhldFwkUdA/oCb4DWP0c927xquwbOZ25wnq/O0P8/L4Rv+kBakL';

const WRONG_TONE_URI =
  'data:audio/wav;base64,UklGRtAUAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YawUAAAAAJoBMwPJBFoG5AdnCeAKTgywDQQPSRB9EaASsROtFJUVZxYiF8YXUhjGGCEZYhmLGZkZjRloGSoZ0hhhGNcXNhd9Fq4VyBTOE8ASnxFtECoP1w13DAoLkgkRCIcG9wRhA8kBLgCV/vv8';

export function useAudio(language) {
  const soundRef = useRef(null);
  const fxRef = useRef(null);

  const stopAudio = useCallback(() => {
    releaseAudioPlayer(soundRef);
  }, []);

  const stopFx = useCallback(() => {
    releaseAudioPlayer(fxRef);
  }, []);

  const playAudioKey = useCallback(
    async (audioKey) => {
      try {
        const source = resolveAudio(language, audioKey);
        if (!source) return false;

        stopAudio();
        const player = createAudioPlayer(source);
        soundRef.current = player;
        trackLessonWordPlayer(player);
        player.play();
        return true;
      } catch {
        return false;
      }
    },
    [language, stopAudio]
  );

  const playFeedback = useCallback(
    async (kind) => {
      try {
        stopFx();
        const uri = kind === 'correct' ? CORRECT_TONE_URI : WRONG_TONE_URI;
        const player = createAudioPlayer({ uri });
        fxRef.current = player;
        trackLessonFxPlayer(player);
        player.play();
      } catch {}
    },
    [stopFx]
  );

  const stopAll = useCallback(() => {
    stopAudio();
    stopFx();
    stopLessonAudio();
  }, [stopAudio, stopFx]);

  const stopThen = useCallback(
    (handler) =>
      (...args) => {
        stopAll();
        return handler?.(...args);
      },
    [stopAll]
  );

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return { playAudioKey, playFeedback, stopAll, stopThen };
}
