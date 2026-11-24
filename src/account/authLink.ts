const NATIVE = 'com.westleysturhan.louisianafrench://auth/callback'
const SCHEME = 'com.westleysturhan.louisianafrench:'

export type AuthLink =
  | { kind: 'oauth'; code: string }
  | { kind: 'recovery'; code: string }
  | { kind: 'confirmed'; code: string }
  | { kind: 'ignored' }
  | { kind: 'failed' }

export function resolveAuthRedirect(input?: {
  platform?: string
  origin?: string
  createURL?: (path: string) => string
  host?: string | null
}) {
  if (input?.platform === 'web') {
    return `${(input.origin || 'http://localhost').replace(/\/$/, '')}/auth/callback`
  }
  const created = input?.createURL?.('auth/callback') || NATIVE
  if (created.startsWith(SCHEME) && input?.host) {
    return `exp://${input.host.replace(/\/$/, '')}/--/auth/callback`
  }
  return created
}

export function matchesAuthRedirect(url: string | null | undefined, redirectTo: string) {
  if (!url || !url.startsWith(redirectTo)) return false
  const rest = url.slice(redirectTo.length)
  return rest === '' || rest.startsWith('?') || rest.startsWith('#')
}

function read(query: URLSearchParams, hash: URLSearchParams, name: string) {
  return query.get(name) || hash.get(name)
}

export function parseAuthUrl(url: string | null | undefined, redirectTo = NATIVE): AuthLink {
  if (!url || !matchesAuthRedirect(url, redirectTo)) return { kind: 'ignored' }
  try {
    const parsed = new URL(url)
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''))
    if (read(parsed.searchParams, hash, 'error')) return { kind: 'failed' }
    const code = read(parsed.searchParams, hash, 'code')
    if (!code) return { kind: 'ignored' }
    const type = read(parsed.searchParams, hash, 'type')
    if (type === 'recovery') return { kind: 'recovery', code }
    if (type === 'signup' || type === 'email' || type === 'magiclink' || type === 'invite') {
      return { kind: 'confirmed', code }
    }
    return { kind: 'oauth', code }
  } catch {
    return { kind: 'failed' }
  }
}
