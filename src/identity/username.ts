export type SetUsernameResult =
  | { ok: true; username: string }
  | { ok: false; reason: 'invalid' | 'reserved' | 'taken' | 'network' }
  | { ok: false; reason: 'too_soon'; retryAt: string };

export type UsernameAvailability =
  | { status: 'available' }
  | { status: 'current' }
  | { status: 'taken' }
  | { status: 'invalid' }
  | { status: 'reserved' }
  | { status: 'error' };

type RpcResult = { data: unknown; error: { message?: string } | null };
type Rpc = (fn: string, args: Record<string, unknown>) => Promise<RpcResult>;
type ProfileClient = {
  from?: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => Promise<{ data: unknown; error?: unknown }>;
      };
    };
  };
};

function row(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value));
}

function setReason(value: unknown): 'invalid' | 'reserved' | 'taken' | null {
  if (value === 'invalid' || value === 'reserved' || value === 'taken') return value;
  return null;
}

function checkStatus(value: unknown): Exclude<UsernameAvailability['status'], 'error'> | null {
  if (
    value === 'available' ||
    value === 'current' ||
    value === 'taken' ||
    value === 'invalid' ||
    value === 'reserved'
  ) {
    return value;
  }
  return null;
}

export function mapSetUsername(value: unknown): SetUsernameResult {
  const found = row(value);
  if (!found) return { ok: false, reason: 'network' };
  if (found.ok === true && typeof found.username === 'string') {
    return { ok: true, username: found.username };
  }
  if (found.ok === false && found.reason === 'too_soon' && typeof found.retryAt === 'string') {
    return { ok: false, reason: 'too_soon', retryAt: found.retryAt };
  }
  const reason = setReason(found.reason);
  if (found.ok === false && reason) return { ok: false, reason };
  return { ok: false, reason: 'network' };
}

export function mapCheckUsername(value: unknown): UsernameAvailability {
  const found = row(value);
  const status = found ? checkStatus(found.status) : null;
  if (status) return { status };
  return { status: 'error' };
}

async function invoke(rpc: Rpc, fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  try {
    return await rpc(fn, args);
  } catch {
    return { data: null, error: { message: 'network' } };
  }
}

export async function setUsername(rpc: Rpc, name: string): Promise<SetUsernameResult> {
  const { data, error } = await invoke(rpc, 'set_username', { proposed: name });
  if (error) return { ok: false, reason: 'network' };
  return mapSetUsername(data);
}

export async function checkUsername(rpc: Rpc, candidate: string): Promise<UsernameAvailability> {
  const { data, error } = await invoke(rpc, 'check_username', { candidate });
  if (error) return { status: 'error' };
  return mapCheckUsername(data);
}

export function usernameFromProfile(value: unknown): string | null {
  const found = row(value);
  if (!found || typeof found.username !== 'string' || found.username.length === 0) return null;
  return found.username;
}

export function accountName(username: string | null | undefined): string {
  return usernameFromProfile({ username }) ?? 'Learner';
}

const PROFILE_READ_MS = 5000;
const rememberedUsernames = new WeakMap<ProfileClient, Map<string, string>>();
type ProfileRead = { ok: true; username: string | null } | { ok: false };

function namesFor(client: ProfileClient): Map<string, string> {
  const found = rememberedUsernames.get(client);
  if (found) return found;
  const created = new Map<string, string>();
  rememberedUsernames.set(client, created);
  return created;
}

async function readProfileUsername(client: ProfileClient, id: string): Promise<ProfileRead> {
  if (!client.from) return { ok: false };
  try {
    const { data, error } = await client.from('profiles').select('username').eq('id', id).maybeSingle();
    if (error) return { ok: false };
    return { ok: true, username: usernameFromProfile(data) };
  } catch {
    return { ok: false };
  }
}

function remember(client: ProfileClient, id: string, read: ProfileRead): string | null {
  const names = namesFor(client);
  if (!read.ok) return names.get(id) ?? null;
  if (read.username) names.set(id, read.username);
  else names.delete(id);
  return read.username;
}

export async function loadProfileUsername(client: ProfileClient, id: string): Promise<string | null> {
  if (!client.from) return namesFor(client).get(id) ?? null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const read = await Promise.race([
      readProfileUsername(client, id),
      new Promise<ProfileRead>((resolve) => {
        timer = setTimeout(() => resolve({ ok: false }), PROFILE_READ_MS);
      })
    ]);
    return remember(client, id, read);
  } finally {
    clearTimeout(timer);
  }
}
