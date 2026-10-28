import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  LEADERBOARD: 'lf_leaderboard'
};

export async function getLeaderboard() {
  const raw = await AsyncStorage.getItem(KEYS.LEADERBOARD);
  return raw ? JSON.parse(raw) : [];
}

export async function upsertLeaderboard(name, xp) {
  const board = await getLeaderboard();

  const idx = board.findIndex((r) => r.name === name);

  if (idx >= 0) {
    board[idx].xp = xp;
  } else {
    board.push({
      name,
      xp
    });
  }

  board.sort((a, b) => b.xp - a.xp);

  await AsyncStorage.setItem(KEYS.LEADERBOARD, JSON.stringify(board));
}
