import { createAudioPlayer } from 'expo-audio';
import {
  releaseAudioPlayer,
  stopLessonAudio,
  trackLessonFxPlayer,
  trackLessonWordPlayer
} from '../audioPlayer';

describe('releaseAudioPlayer', () => {
  function playingPlayerRef() {
    const player = createAudioPlayer(1);
    player.play();
    return { current: player };
  }

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('unregisters, stops, and frees the player without pausing it, then clears the ref', () => {
    const playerRef = playingPlayerRef();
    const player = playerRef.current;

    releaseAudioPlayer(playerRef);

    expect(player).toMatchObject({ playing: false, registered: false, released: true });
    expect(player.pause).not.toHaveBeenCalled();
    expect(playerRef.current).toBeNull();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('does nothing when there is no player', () => {
    expect(() => releaseAudioPlayer({ current: null })).not.toThrow();
  });

  it('still releases the player when remove fails, and warns', () => {
    const playerRef = playingPlayerRef();
    const player = playerRef.current;
    const error = new Error('remove failed');
    player.remove.mockImplementation(() => {
      throw error;
    });

    releaseAudioPlayer(playerRef);

    expect(player).toMatchObject({ playing: false, released: true });
    expect(console.warn).toHaveBeenCalledWith('Could not remove audio player', error);
  });

  it('warns instead of throwing when release fails', () => {
    const playerRef = playingPlayerRef();
    const error = new Error('release failed');
    playerRef.current.release.mockImplementation(() => {
      throw error;
    });

    expect(() => releaseAudioPlayer(playerRef)).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith('Could not release audio player', error);
  });

  it('does not throw for a player that was already released', () => {
    const player = createAudioPlayer(1);
    player.release();
    const playerRef = { current: player };

    expect(() => releaseAudioPlayer(playerRef)).not.toThrow();
    expect(playerRef.current).toBeNull();
  });
});

describe('stopLessonAudio (#335)', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    stopLessonAudio();
  });

  afterEach(() => {
    stopLessonAudio();
    jest.restoreAllMocks();
  });

  it('stops the tracked Word and feedback players even without a React ref', () => {
    const word = createAudioPlayer(1);
    const fx = createAudioPlayer(2);
    word.play();
    fx.play();
    trackLessonWordPlayer(word);
    trackLessonFxPlayer(fx);

    stopLessonAudio();

    expect(word).toMatchObject({ playing: false, registered: false, released: true });
    expect(fx).toMatchObject({ playing: false, registered: false, released: true });
  });

  it('replaces a previous Word player when a new one is tracked', () => {
    const first = createAudioPlayer(1);
    const second = createAudioPlayer(2);
    first.play();
    trackLessonWordPlayer(first);
    trackLessonWordPlayer(second);
    second.play();

    expect(first).toMatchObject({ playing: false, registered: false, released: true });
    expect(second).toMatchObject({ playing: true, released: false });

    stopLessonAudio();
    expect(second).toMatchObject({ playing: false, released: true });
  });
});
