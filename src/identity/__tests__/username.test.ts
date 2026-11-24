import { describe, expect, it } from '@jest/globals';

import { checkUsername, mapCheckUsername, mapSetUsername, setUsername } from '../username';

describe('username RPC mapping', () => {
  it('maps a saved username, a refusal, and a too_soon retry', () => {
    expect(mapSetUsername({ ok: true, username: 'Céline' })).toEqual({
      ok: true,
      username: 'Céline'
    });
    expect(mapSetUsername({ ok: true, username: null })).toEqual({ ok: true, username: null });
    expect(mapSetUsername({ ok: false, reason: 'taken' })).toEqual({ ok: false, reason: 'taken' });
    expect(mapSetUsername({ ok: false, reason: 'reserved' })).toEqual({
      ok: false,
      reason: 'reserved'
    });
    expect(
      mapSetUsername({ ok: false, reason: 'too_soon', retryAt: '2026-12-24T00:00:00.000Z' })
    ).toEqual({ ok: false, reason: 'too_soon', retryAt: '2026-12-24T00:00:00.000Z' });
    expect(mapSetUsername({ ok: false, reason: 'later' })).toEqual({ ok: false, reason: 'invalid' });
    expect(mapSetUsername(null)).toEqual({ ok: false, reason: 'invalid' });
  });

  it('maps each availability status and rejects an unknown one', () => {
    for (const status of ['available', 'current', 'taken', 'invalid', 'reserved'] as const) {
      expect(mapCheckUsername({ status })).toEqual({ status });
    }
    expect(mapCheckUsername({ status: 'maybe' })).toEqual({ status: 'invalid' });
    expect(mapCheckUsername('available')).toEqual({ status: 'invalid' });
  });

  it('sends the candidate to the RPC and maps the reply', async () => {
    const calls: unknown[] = [];
    const rpc = async (fn: string, args: Record<string, unknown>) => {
      calls.push([fn, args]);
      if (fn === 'check_username') return { data: { status: 'current' }, error: null };
      if (args.proposed === null) return { data: { ok: true, username: null }, error: null };
      return { data: { ok: true, username: 'Céline' }, error: null };
    };

    await expect(setUsername(rpc, 'Céline')).resolves.toEqual({ ok: true, username: 'Céline' });
    await expect(checkUsername(rpc, 'celine')).resolves.toEqual({ status: 'current' });
    await expect(setUsername(rpc, null)).resolves.toEqual({ ok: true, username: null });
    expect(calls).toEqual([
      ['set_username', { proposed: 'Céline' }],
      ['check_username', { candidate: 'celine' }],
      ['set_username', { proposed: null }]
    ]);
  });

  it('maps a transport error without treating it as a saved name', async () => {
    const rpc = async () => ({ data: null, error: { message: 'network' } });
    await expect(setUsername(rpc, 'Céline')).resolves.toEqual({ ok: false, reason: 'invalid' });
    await expect(checkUsername(rpc, 'Céline')).resolves.toEqual({ status: 'invalid' });
  });
});
