// release() stops and frees the native player on iOS and Android. remove() must
// run first: release() does not take the player out of Android's player list,
// and any call after release() throws. pause() is avoided because on iOS it
// schedules an audio session shutdown that can silence the next player.
export function releaseAudioPlayer(playerRef) {
  const player = playerRef.current;
  playerRef.current = null;
  if (!player) return;

  try {
    player.remove();
  } catch (error) {
    warn('remove', error);
  }
  try {
    player.release();
  } catch (error) {
    warn('release', error);
  }
}

function warn(step, error) {
  if (__DEV__) console.warn(`Could not ${step} audio player`, error);
}
