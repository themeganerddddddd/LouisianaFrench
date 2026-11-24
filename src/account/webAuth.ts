export function authLinking(platform: string, origin: string) {
  if (platform !== 'web') return undefined
  return {
    prefixes: [origin.replace(/\/$/, '')],
    config: { screens: { AuthCallback: 'auth/callback' } }
  }
}

export function completeWebAuth(platform: string, complete: () => void) {
  if (platform === 'web') complete()
}
