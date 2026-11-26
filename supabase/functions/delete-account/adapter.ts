import {
  type DeleteAccountDeps,
  type GetUserResult,
  type LookupResult,
  type VerifiedIdentity
} from './handler.ts'

export function accountDeps(): DeleteAccountDeps {
  const url = required('SUPABASE_URL')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
  return {
    authAdmin: {
      getUser: (token) => loadUser(url, serviceRoleKey, token),
      lookupUser: (id) => lookupAccount(url, serviceRoleKey, id),
      deleteUser: (id) => removeUser(url, serviceRoleKey, id)
    },
    db: {
      async deleteCallerRows() {
        // public.profiles and auth.identities cascade from auth.users.
      }
    },
    async revokeGoogle() {
      return false
    },
    log(entry) {
      console.log(JSON.stringify(entry))
    }
  }
}

export function classifyGetUserStatus(status: number): 'invalid' | 'absent' | 'unavailable' {
  if (status === 401 || status === 403) return 'invalid'
  if (status === 404) return 'absent'
  return 'unavailable'
}

export async function loadUser(
  url: string,
  serviceRoleKey: string,
  token: string,
  fetchImpl: typeof fetch = fetch
): Promise<GetUserResult> {
  const response = await fetchImpl(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceRoleKey }
  })
  if (!response.ok) {
    await drain(response)
    return { kind: classifyGetUserStatus(response.status) }
  }
  const body = await response.json() as { id?: unknown; identities?: unknown }
  if (typeof body.id !== 'string' || body.id.length === 0) return { kind: 'invalid' }
  return { kind: 'user', user: { id: body.id, identities: identitiesOf(body.identities) } }
}

function identitiesOf(value: unknown): VerifiedIdentity[] {
  if (!Array.isArray(value)) return []
  const identities: VerifiedIdentity[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') continue
    const provider = (item as { provider?: unknown }).provider
    if (typeof provider !== 'string' || provider.length === 0) continue
    identities.push({ provider, providerToken: null })
  }
  return identities
}

export async function lookupAccount(
  url: string,
  serviceRoleKey: string,
  id: string,
  fetchImpl: typeof fetch = fetch
): Promise<LookupResult> {
  const response = await fetchImpl(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey }
  })
  await drain(response)
  if (response.status === 404) return 'absent'
  if (response.ok) return 'present'
  return 'unavailable'
}

async function removeUser(url: string, serviceRoleKey: string, id: string) {
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey }
  })
  await drain(response)
  if (response.status === 404) return { ok: false as const, absent: true }
  if (!response.ok) return { ok: false as const }
  return { ok: true as const }
}

function required(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

function drain(response: Response) {
  return response.body?.cancel().catch(() => undefined)
}
