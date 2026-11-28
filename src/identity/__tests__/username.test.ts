import { describe, expect, it, jest } from '@jest/globals';

import { checkUsername, loadProfileRead, loadProfileUsername, mapCheckUsername, mapSetUsername, setUsername } from '../username';

describe('username RPC mapping', () => {
  it('maps a saved username, a refusal, and a too_soon retry', () => {
    expect(mapSetUsername({ ok: true, username: 'Céline' })).toEqual({
      ok: true,
      username: 'Céline'
    });
    expect(mapSetUsername({ ok: false, reason: 'taken' })).toEqual({ ok: false, reason: 'taken' });
    expect(mapSetUsername({ ok: false, reason: 'reserved' })).toEqual({
      ok: false,
      reason: 'reserved'
    });
    expect(
      mapSetUsername({ ok: false, reason: 'too_soon', retryAt: '2026-12-24T00:00:00.000Z' })
    ).toEqual({ ok: false, reason: 'too_soon', retryAt: '2026-12-24T00:00:00.000Z' });
    expect(mapSetUsername({ ok: false, reason: 'later' })).toEqual({ ok: false, reason: 'network' });
    expect(mapSetUsername({ ok: true, username: null })).toEqual({ ok: false, reason: 'network' });
    expect(mapSetUsername(null)).toEqual({ ok: false, reason: 'network' });
  });

  it('maps each availability status and rejects an unknown one', () => {
    for (const status of ['available', 'current', 'taken', 'invalid', 'reserved'] as const) {
      expect(mapCheckUsername({ status })).toEqual({ status });
    }
    expect(mapCheckUsername({ status: 'maybe' })).toEqual({ status: 'error' });
    expect(mapCheckUsername('available')).toEqual({ status: 'error' });
  });

  it('sends the candidate to the RPC and maps the reply', async () => {
    const calls: unknown[] = [];
    const rpc = async (fn: string, args: Record<string, unknown>) => {
      calls.push([fn, args]);
      if (fn === 'check_username') return { data: { status: 'current' }, error: null };
      return { data: { ok: true, username: 'Céline' }, error: null };
    };

    await expect(setUsername(rpc, 'Céline')).resolves.toEqual({ ok: true, username: 'Céline' });
    await expect(checkUsername(rpc, 'celine')).resolves.toEqual({ status: 'current' });
    expect(calls).toEqual([
      ['set_username', { proposed: 'Céline' }],
      ['check_username', { candidate: 'celine' }]
    ]);
  });

  it('maps a transport error as network, not as an invalid name', async () => {
    const rpc = async () => ({ data: null, error: { message: 'network' } });
    await expect(setUsername(rpc, 'Céline')).resolves.toEqual({ ok: false, reason: 'network' });
    await expect(checkUsername(rpc, 'Céline')).resolves.toEqual({ status: 'error' });
  });

  it('shows the last username for that learner when the next read fails', async () => {
    let online = true;
    const client = {
      from() {
        return {
          select() {
            return {
              eq() {
                return {
                  async maybeSingle() {
                    if (!online) return { data: null, error: { message: 'network' } };
                    return { data: { username: 'Ada' }, error: null };
                  }
                };
              }
            };
          }
        };
      }
    };
    expect(await loadProfileUsername(client, 'learner-ada')).toBe('Ada');
    online = false;
    expect(await loadProfileUsername(client, 'learner-ada')).toBe('Ada');
    expect(await loadProfileUsername(client, 'learner-other')).toBeNull();
  });

  it('maps a thrown RPC rejection as a network error', async () => {
    const rpc = async () => {
      throw new Error('socket hang up');
    };
    await expect(setUsername(rpc, 'Céline')).resolves.toEqual({ ok: false, reason: 'network' });
    await expect(checkUsername(rpc, 'Céline')).resolves.toEqual({ status: 'error' });
  });

  it('reads the username with from still attached to the client', async () => {
    class ProfileReader {
      tables: Record<string, unknown> = { profiles: { username: 'Céline' } };

      from(table: string) {
        const row = this.tables[table];
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) })
        };
      }
    }
    await expect(loadProfileRead(new ProfileReader(), 'learner-1')).resolves.toEqual({ ok: true, username: 'Céline' });
  });

  it('does not wait forever when the profile read never settles', async () => {
    const client = {
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => new Promise<never>(() => {}) }) }) })
    };
    jest.useFakeTimers();
    try {
      let settled = false;
      const pending = loadProfileRead(client, 'learner-1').then((read) => {
        settled = true;
        return read;
      });
      await jest.advanceTimersByTimeAsync(5000);
      expect(settled).toBe(true);
      await expect(pending).resolves.toEqual({ ok: false, username: null });
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });

  it('clears the profile timer when the read settles', async () => {
    const client = {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { username: 'Céline' }, error: null }) }) })
      })
    };
    jest.useFakeTimers();
    try {
      await expect(loadProfileUsername(client, 'learner-1')).resolves.toBe('Céline');
      expect(jest.getTimerCount()).toBe(0);
    } finally {
      jest.useRealTimers();
    }
  });
});
