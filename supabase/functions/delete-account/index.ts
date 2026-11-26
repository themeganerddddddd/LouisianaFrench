import {
  handleDeleteAccount,
  type DeleteAccountDeps,
  type DeleteUserResult,
  type GetUserResult,
  type VerifiedIdentity
} from './handler.ts'

Deno.serve((request: Request) => handleDeleteAccount(request, deps()))

function deps(): DeleteAccountDeps {
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
    },
    revokeGoogle,
    log(entry) {
      console.log(JSON.stringify(entry))
    }
  }
}

function required(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

async function loadUser(url: string, serviceRoleKey: string, token: string): Promise<GetUserResult> {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceRoleKey }
  })
  if (!response.ok) {
    await drain(response)
    return response.status === 404 ? { kind: 'absent' } : { kind: 'invalid' }
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
    const record = item as { provider?: unknown; identity_data?: unknown }
    if (typeof record.provider !== 'string' || record.provider.length === 0) continue
    identities.push({
      provider: record.provider,
      providerToken: googleProviderToken(record.provider, record.identity_data)
    })
  }
  return identities
}

function googleProviderToken(provider: string, data: unknown): string | null {
  if (provider !== 'google' || !data || typeof data !== 'object') return null
  const token = (data as { provider_token?: unknown }).provider_token
  return typeof token === 'string' && token.length > 0 ? token : null
}

async function removeUser(url: string, serviceRoleKey: string, id: string): Promise<DeleteUserResult> {
  const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey }
  })
  await drain(response)
  if (response.status === 404) return { ok: false, absent: true }
  if (!response.ok) return { ok: false }
  return { ok: true }
}

async function revokeGoogle(token: string): Promise<boolean> {
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token })
  })
  const ok = response.ok
  await drain(response)
  return ok
}

function drain(response: Response) {
  return response.body?.cancel().catch(() => undefined)
}
