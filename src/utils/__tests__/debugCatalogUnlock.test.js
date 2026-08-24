import {
  TBOY_TAP_RESET_MS,
  TBOY_TAP_TARGET,
  formatActivityNavLabel,
  registerTBoyTap
} from '../debugCatalogUnlock';

describe('registerTBoyTap', () => {
  it('unlocks after ten taps within the reset window', () => {
    let state = { count: 0, lastTapAt: 0 };
    let now = 1000;

    for (let tap = 1; tap < TBOY_TAP_TARGET; tap += 1) {
      const result = registerTBoyTap(state, { now: () => now });
      expect(result.unlocked).toBe(false);
      expect(result.state.count).toBe(tap);
      state = result.state;
      now += 100;
    }

    const unlocked = registerTBoyTap(state, { now: () => now });
    expect(unlocked.unlocked).toBe(true);
    expect(unlocked.state).toEqual({ count: 0, lastTapAt: 0 });
  });

  it('resets the tap count after idle longer than the reset window', () => {
    const first = registerTBoyTap({ count: 4, lastTapAt: 1000 }, { now: 1000 });
    expect(first.state.count).toBe(5);

    const restarted = registerTBoyTap(first.state, {
      now: 1000 + TBOY_TAP_RESET_MS + 1
    });
    expect(restarted.state.count).toBe(1);
    expect(restarted.unlocked).toBe(false);
  });
});

describe('formatActivityNavLabel', () => {
  it('shows activity type and target text', () => {
    expect(
      formatActivityNavLabel(
        { type: 'multiple_choice', target: 'Bonjour' },
        2
      )
    ).toBe('3. multiple choice — Bonjour');
  });
});
