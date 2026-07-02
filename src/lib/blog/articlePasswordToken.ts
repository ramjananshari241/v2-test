import crypto from 'crypto'
import { readArticlePasswordFromPageProperties } from '@/src/lib/notion/readProperty'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

function unlockSecret() {
  return (
    process.env.ARTICLE_UNLOCK_SECRET ||
    process.env.NOTION_KEY ||
    process.env.NOTION_TOKEN ||
    'article-unlock-dev'
  )
}

export function mintArticleUnlockToken(slug: string, password: string) {
  return crypto
    .createHmac('sha256', unlockSecret())
    .update(`${slug}\0${password}`)
    .digest('hex')
}

export function verifyArticleUnlockToken(
  slug: string,
  password: string,
  token: string | null | undefined
) {
  if (!token || !password) return false
  const expected = mintArticleUnlockToken(slug, password)
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(String(token), 'hex')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function readStoredArticlePassword(
  properties: PageObjectResponse['properties']
) {
  return readArticlePasswordFromPageProperties(properties)
}

export function verifyArticleUnlockTokenForPage(
  slug: string,
  properties: PageObjectResponse['properties'],
  token: string | null | undefined
) {
  const password = readStoredArticlePassword(properties)
  if (!password) return false
  return verifyArticleUnlockToken(slug, password, token)
}
