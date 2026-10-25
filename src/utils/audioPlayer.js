// release() stops and frees the native player on iOS and Android. remove() must
// run first: release() does not take the player out of Android's player list,
// and any call after release() throws. pause() is avoided because on iOS it
// schedules an audio session shutdown that can silence the next player.

// Module-level lesson Audio slot: one Word clip and one feedback tone at a time.
// Continue / Next release through the Activity's ref; this slot also lets the
// Lesson session stop Audio that would otherwise keep playing until unmount
// (Android can then block the next Activity's play) — #335.
let activeWordPlayer = null;
let activeFxPlayer = null;

export function releaseAudioPlayer(playerRef) {
  const player = playerRef.current;
  playerRef.current = null;
  if (!player) return;

  clearActive(player);
  tearDown(player);
}

export function trackLessonWordPlayer(player) {
  if (activeWordPlayer && activeWordPlayer !== player) {
    tearDown(activeWordPlayer);
  }
  activeWordPlayer = player;
}

export function trackLessonFxPlayer(player) {
  if (activeFxPlayer && activeFxPlayer !== player) {
    tearDown(activeFxPlayer);
  }
  activeFxPlayer = player;
}

export function stopLessonAudio() {
  const word = activeWordPlayer;
  const fx = activeFxPlayer;
  activeWordPlayer = null;
  activeFxPlayer = null;
  if (word) tearDown(word);
  if (fx) tearDown(fx);
}

function clearActive(player) {
  if (activeWordPlayer === player) activeWordPlayer = null;
  if (activeFxPlayer === player) activeFxPlayer = null;
}

function tearDown(player) {
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
