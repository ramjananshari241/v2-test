import { ApiScope } from '@/src/types/notion'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getAll } from './getDatabase'
import { readRichTextPlain } from './readProperty'

const THEME_CONFIG_SLUG = 'theme-config'

/** 按需刷新期间强制每次从数据源读取主题（避免 Serverless 进程内旧缓存） */
let revalidateFreshTheme = false

export function setRevalidateFreshTheme(enabled: boolean): void {
  revalidateFreshTheme = enabled
}

export function isRevalidateFreshTheme(): boolean {
  return revalidateFreshTheme
}

let remoteThemeCached: string | null | undefined
let remoteThemeInflight: Promise<string | null> | null = null

function findThemeConfigPage(
  pages: PageObjectResponse[]
): PageObjectResponse | undefined {
  return pages.find(
    (page) => readRichTextPlain(page.properties['slug']) === THEME_CONFIG_SLUG
  )
}

function filterPagesByType(
  objects: PageObjectResponse[],
  typeName: string
): PageObjectResponse[] {
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === typeName
  )
}

async function fetchRemoteThemeFromNotion(): Promise<string | null> {
  const scopes: ApiScope[] = [
    ApiScope.Archive,
    ApiScope.Draft,
    ApiScope.Home,
    ApiScope.Page,
  ]

  for (const scope of scopes) {
    const objects = await getAll(scope)
    let themeConfigPage: PageObjectResponse | undefined

    if (scope === ApiScope.Page) {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Page'))
      if (!themeConfigPage) {
        themeConfigPage = findThemeConfigPage(objects)
      }
    } else if (scope === ApiScope.Home) {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Widget'))
    } else {
      themeConfigPage = findThemeConfigPage(filterPagesByType(objects, 'Post'))
    }

    if (themeConfigPage) {
      const excerpt = readRichTextPlain(themeConfigPage.properties['excerpt'])
      return excerpt || null
    }
  }

  return null
}

/**
 * 读取 Notion 中 slug=theme-config 页面的 excerpt（v1 / v2 / gallery 等原始代号）。
 * 同一次 next build 内只请求 Notion 一次（Promise 去重）；失败时缓存 null，避免重试风暴。
 */
export const getRemoteTheme = async (): Promise<string | null> => {
  if (
    revalidateFreshTheme ||
    process.env.DISABLE_REMOTE_THEME_CACHE === '1'
  ) {
    try {
      return await fetchRemoteThemeFromNotion()
    } catch (e) {
      console.error('获取远程主题配置失败:', e)
      return null
    }
  }

  if (remoteThemeCached !== undefined) {
    return remoteThemeCached
  }

  if (!remoteThemeInflight) {
    remoteThemeInflight = fetchRemoteThemeFromNotion()
      .then((value) => {
        remoteThemeCached = value
        return value
      })
      .catch((e) => {
        console.error('获取远程主题配置失败:', e)
        remoteThemeCached = null
        return null
      })
      .finally(() => {
        remoteThemeInflight = null
      })
  }

  return remoteThemeInflight
}

/** 仅用于调试或测试；正常部署勿调用 */
export function clearRemoteThemeCache(): void {
  remoteThemeCached = undefined
  remoteThemeInflight = null
}

export const getPageBySlug = async (slug: string) => {
  const pages = await getPages()
  return (
    pages.find(
      (page) =>
        (page.properties['slug'] as any).rich_text[0]?.plain_text === slug
    ) ?? (null as unknown as PageObjectResponse)
  )
}

export const getPages = async () => {
  const objects = await getAll(ApiScope.Page)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Page'
  )
}

export const getPosts = async (
  scope: ApiScope.Home | ApiScope.Archive | ApiScope.Draft
) => {
  const objects = await getAll(scope)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Post'
  )
}

export const getPostsAndPieces = async (
  scope: ApiScope.Home | ApiScope.Archive | ApiScope.Draft
) => {
  const objects = await getAll(scope)
  return {
    posts: objects.filter(
      (object) =>
        object.properties['type'].type === 'select' &&
        object.properties['type'].select?.name === 'Post'
    ),
    pieces: objects.filter(
      (object) =>
        object.properties['type'].type === 'select' &&
        object.properties['type'].select?.name === 'Piece'
    ),
  }
}

export const getWidgets = async () => {
  const objects = await getAll(ApiScope.Home)
  return objects.filter(
    (object) =>
      object.properties['type'].type === 'select' &&
      object.properties['type'].select?.name === 'Widget'
  )
}