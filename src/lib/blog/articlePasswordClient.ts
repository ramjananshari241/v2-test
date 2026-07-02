const TOKEN_KEY_PREFIX = 'article-unlock-token-'

export function getArticleUnlockToken(slug: string) {
  if (typeof window === 'undefined' || !slug) return null
  return localStorage.getItem(`${TOKEN_KEY_PREFIX}${slug}`)
}

export function setArticleUnlockToken(slug: string, token: string) {
  if (typeof window === 'undefined' || !slug) return
  localStorage.setItem(`${TOKEN_KEY_PREFIX}${slug}`, token)
}

export function clearArticleUnlockToken(slug: string) {
  if (typeof window === 'undefined' || !slug) return
  localStorage.removeItem(`${TOKEN_KEY_PREFIX}${slug}`)
}
