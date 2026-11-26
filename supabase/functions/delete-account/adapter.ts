import { type DeleteAccountDeps, type GetUserResult } from './handler.ts'

export function accountDeps(): DeleteAccountDeps {
  const url = required('SUPABASE_URL')
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY')
  return {
    authAdmin: {
      getUser: (token) => loadUser(url, serviceRoleKey, token),
      deleteUser: (id) => removeUser(url, serviceRoleKey, id)
    },
    db: {
      async deleteCallerRows() {
        // public.profiles and auth.identities cascade from auth.users.
      }
    }
  }
}

export function classifyGetUserStatus(
  status: number,
  errorCode: string | null
): 'invalid' | 'absent' | 'unavailable' {
  if (status === 403 && errorCode === 'user_not_found') return 'absent'
  if (status === 401 || status === 403) return 'invalid'
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
    const errorCode = response.status === 403 ? await errorCodeOf(response) : null
    if (response.status !== 403) await drain(response)
    return { kind: classifyGetUserStatus(response.status, errorCode) }
  }
  const body = await response.json() as { id?: unknown }
  if (typeof body.id !== 'string' || body.id.length === 0) return { kind: 'invalid' }
  return { kind: 'user', user: { id: body.id } }
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

async function errorCodeOf(response: Response): Promise<string | null> {
  try {
    const body = await response.json()
    if (!body || typeof body !== 'object') return null
    const code = (body as { error_code?: unknown }).error_code
    return typeof code === 'string' ? code : null
  } catch {
    return null
  }
}

function drain(response: Response) {
  return response.body?.cancel().catch(() => undefined)
}
