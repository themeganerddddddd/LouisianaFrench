import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  leaderboardEntries,
  leaderboards
} from '../../test/fixtures/learnerProgress/learnerProgressFixtures';
import { getLeaderboard, upsertLeaderboard } from '../leaderboard';

// Characterizes Leaderboard persistence against the real AsyncStorage jest mock.

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Leaderboard', () => {
  it('defaults to an empty Leaderboard', async () => {
    expect(await getLeaderboard()).toEqual([]);
  });

  it('inserts a new entry and keeps the Leaderboard sorted descending by xp', async () => {
    await upsertLeaderboard(leaderboardEntries.marie.name, leaderboardEntries.marie.xp);
    await upsertLeaderboard(leaderboardEntries.beau.name, leaderboardEntries.beau.xp);

    expect(await getLeaderboard()).toEqual(leaderboards.sorted);
  });

  it('updates an existing entry\'s xp in place rather than duplicating it', async () => {
    await upsertLeaderboard(leaderboardEntries.marie.name, leaderboardEntries.marie.xp);
    await upsertLeaderboard(leaderboardEntries.marie.name, 100);

    const board = await getLeaderboard();
    expect(board).toEqual([{ name: 'Marie', xp: 100 }]);
  });
});

