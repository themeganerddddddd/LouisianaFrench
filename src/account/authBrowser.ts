import { matchesAuthRedirect } from './authLink'

type BrowserResult = { type: string; url?: string }

export type AuthBrowserDeps = {
  platform: string
  browser: {
    openAuthSessionAsync(url: string, redirectTo: string): Promise<BrowserResult>
    dismissBrowser(): void
  }
  linking: {
    addEventListener(event: 'url', listener: (event: { url: string }) => void): { remove(): void }
  }
}

export function openAuthBrowser(oauthUrl: string, redirectTo: string, deps: AuthBrowserDeps) {
  if (deps.platform !== 'android') return finishBrowser(oauthUrl, redirectTo, deps)
  return new Promise<{ url: string } | null>((resolve, reject) => {
    let settled = false
    const finish = (value: { url: string } | null) => {
      if (settled) return
      settled = true
      subscription.remove()
      try { deps.browser.dismissBrowser() } catch { /* The browser may already be closed. */ }
      resolve(value)
    }
    const subscription = deps.linking.addEventListener('url', ({ url }) => {
      if (matchesAuthRedirect(url, redirectTo)) finish({ url })
    })
    deps.browser.openAuthSessionAsync(oauthUrl, redirectTo).then((result) => {
      if (result?.type === 'success' && result.url && matchesAuthRedirect(result.url, redirectTo)) {
        finish({ url: result.url })
        return
      }
      finish(null)
    }).catch((error: unknown) => {
      if (settled) return
      settled = true
      subscription.remove()
      reject(error)
    })
  })
}

function finishBrowser(oauthUrl: string, redirectTo: string, deps: AuthBrowserDeps) {
  return deps.browser.openAuthSessionAsync(oauthUrl, redirectTo).then((result) => {
    if (result.type !== 'success' || !result.url || !matchesAuthRedirect(result.url, redirectTo)) return null
    return { url: result.url }
  })
}
