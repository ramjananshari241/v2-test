/** Tweet 主题变体：tweet = 暗色默认，tweet-light = 固定浅色 */
export function isTweetTheme(theme?: string | null): boolean {
  const c = (theme || '').trim().toLowerCase()
  return c === 'tweet' || c === 'tweet-light'
}

export function isTweetLightTheme(theme?: string | null): boolean {
  return (theme || '').trim().toLowerCase() === 'tweet-light'
}
