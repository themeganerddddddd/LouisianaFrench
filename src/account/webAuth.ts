export function completeWebAuth(platform: string, complete: () => void) {
  if (platform === 'web') complete()
}
