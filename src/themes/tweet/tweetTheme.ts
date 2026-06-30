function normalize(theme?: string | null): string {
  return (theme || '').trim().toLowerCase()
}

/** 所有 Tweet 系列主题（灰 / 浅 / 暗） */
export function isTweetTheme(theme?: string | null): boolean {
  const c = normalize(theme)
  return c === 'tweet' || c === 'tweet-light' || c === 'tweet-dark'
}

/** tweet·浅色：固定浅色 */
export function isTweetLightTheme(theme?: string | null): boolean {
  return normalize(theme) === 'tweet-light'
}

/** tweet·暗：固定纯黑（X Lights Out 风格） */
export function isTweetDarkTheme(theme?: string | null): boolean {
  return normalize(theme) === 'tweet-dark'
}

/** tweet·灰色：默认可深可浅切换 */
export function isTweetGrayTheme(theme?: string | null): boolean {
  return normalize(theme) === 'tweet'
}

/** 浅色 / 纯黑变体锁定，不显示顶栏主题切换 */
export function isTweetThemeVariantLocked(theme?: string | null): boolean {
  return isTweetLightTheme(theme) || isTweetDarkTheme(theme)
}
