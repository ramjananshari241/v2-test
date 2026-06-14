import { CachedNav, Page, Title } from '@/src/types/blog'
import { DatabaseObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { formatPages } from '../blog/format/page'
import { getPages } from './getBlogData'
import { joinRichTextPlain } from './readProperty'
import { getDatabaseIcon, getDatabaseTitle } from './getDatabase'

const DEBUG_CACHING = process.env.NODE_ENV !== 'production'
const cache = new Map<string, CachedNav>()

/** ISR / 按需刷新前清空导航缓存，避免进程内旧数据 */
export function clearCachedNavFooter(): void {
  cache.clear()
}

export async function getCachedNavFooter(cacheTimeInSeconds = 60): Promise<{
  navPages: Page[]
  siteTitle: Title
  logo: DatabaseObjectResponse['icon']
}> {
  const cacheKey = 'nav'
  if (cache.has(cacheKey)) {
    // DEBUG_CACHING && console.log('Cache hit for', cacheKey)
    const cachedNav = cache.get(cacheKey)
    if (cachedNav) {
      setTimeout(() => {
        if (cachedNav.ttl < Date.now()) {
          // DEBUG_CACHING &&
          //   console.log(
          //     `Cache expired for [${cacheKey}] - revalidating. Time diff in seconds: [${
          //       Math.floor(new Date().getTime() - cachedNav.ttl) / 1000
          //     }]`
          //   )
          cache.delete(cacheKey)
        }
      }, cachedNav.ttl - Date.now())

      return {
        navPages: cachedNav.navPages,
        siteTitle: cachedNav.siteTitle,
        logo: cachedNav.logo ?? null,
      }
    }
  }

  const pages = await getPages()
  const formattedPages = formatPages(pages)
  const databaseTitle = await getDatabaseTitle()
  const databaseIcon = await getDatabaseIcon()

  const titleText = joinRichTextPlain(databaseTitle, { splitRunsWithSpace: true }).trim()
  const title = {
    text: titleText || 'PRO BLOG',
    color: databaseTitle[0]?.annotations?.color,
    slug: '/',
  }

  const cachedNav: CachedNav = {
    navPages: formattedPages,
    siteTitle: title,
    logo: databaseIcon,
    ttl: Date.now() + cacheTimeInSeconds * 1000,
  }

  // DEBUG_CACHING && console.log('Fetching & caching entry for ', cacheKey)
  try {
    cache.set(cacheKey, cachedNav)
  } catch (err) {
    console.error('Error caching nav', err)
  }

  return {
    navPages: cachedNav.navPages,
    siteTitle: cachedNav.siteTitle,
    logo: cachedNav.logo ?? null,
  }
}
