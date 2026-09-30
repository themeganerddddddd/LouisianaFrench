// On iOS and Android, expo-audio remove() only unregisters the player and does
// not stop it. pause() stops it now, remove() keeps Android's player list free
// of dead players, and release() frees the native player.
export function releaseAudioPlayer(playerRef) {
  const player = playerRef.current;
  playerRef.current = null;
  if (!player) return;

  try {
    player.pause();
    player.remove();
  } catch {}
  try {
    player.release();
  } catch {}
}
