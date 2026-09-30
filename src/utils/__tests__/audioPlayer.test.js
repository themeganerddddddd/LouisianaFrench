import { createAudioPlayer } from 'expo-audio';
import { releaseAudioPlayer } from '../audioPlayer';

describe('releaseAudioPlayer', () => {
  it('stops, unregisters, and frees the player, then clears the ref', () => {
    const player = createAudioPlayer(1);
    player.play();
    const playerRef = { current: player };

    releaseAudioPlayer(playerRef);

    expect(player).toMatchObject({ playing: false, released: true });
    expect(player.pause).toHaveBeenCalled();
    expect(player.remove).toHaveBeenCalled();
    expect(playerRef.current).toBeNull();
  });

  it('does nothing when there is no player', () => {
    expect(() => releaseAudioPlayer({ current: null })).not.toThrow();
  });

  it('does not throw for a player that was already released', () => {
    const player = createAudioPlayer(1);
    player.release();
    const playerRef = { current: player };

    expect(() => releaseAudioPlayer(playerRef)).not.toThrow();
    expect(playerRef.current).toBeNull();
  });
});
