export type SetUsernameResult =
  | { ok: true; username: string | null }
  | { ok: false; reason: 'invalid' | 'reserved' | 'taken' }
  | { ok: false; reason: 'too_soon'; retryAt: string };

export type UsernameAvailability =
  | { status: 'available' }
  | { status: 'current' }
  | { status: 'taken' }
  | { status: 'invalid' }
  | { status: 'reserved' };

type RpcResult = { data: unknown; error: { message?: string } | null };
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<RpcResult>;

const SET_REASONS = new Set(['invalid', 'reserved', 'taken']);
const CHECK_STATUSES = new Set(['available', 'current', 'taken', 'invalid', 'reserved']);

function row(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function mapSetUsername(value: unknown): SetUsernameResult {
  const found = row(value);
  if (!found) return { ok: false, reason: 'invalid' };
  if (found.ok === true && (typeof found.username === 'string' || found.username === null)) {
    return { ok: true, username: found.username };
  }
  if (found.ok === false && found.reason === 'too_soon' && typeof found.retryAt === 'string') {
    return { ok: false, reason: 'too_soon', retryAt: found.retryAt };
  }
  if (found.ok === false && typeof found.reason === 'string' && SET_REASONS.has(found.reason)) {
    return { ok: false, reason: found.reason as 'invalid' | 'reserved' | 'taken' };
  }
  return { ok: false, reason: 'invalid' };
}

export function mapCheckUsername(value: unknown): UsernameAvailability {
  const found = row(value);
  if (found && typeof found.status === 'string' && CHECK_STATUSES.has(found.status)) {
    return { status: found.status as UsernameAvailability['status'] };
  }
  return { status: 'invalid' };
}

export async function setUsername(rpc: Rpc, name: string | null): Promise<SetUsernameResult> {
  const { data, error } = await rpc('set_username', { proposed: name });
  if (error) return { ok: false, reason: 'invalid' };
  return mapSetUsername(data);
}

export async function checkUsername(rpc: Rpc, candidate: string): Promise<UsernameAvailability> {
  const { data, error } = await rpc('check_username', { candidate });
  if (error) return { status: 'invalid' };
  return mapCheckUsername(data);
}
