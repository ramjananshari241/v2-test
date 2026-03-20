import { ApiScope } from '@/src/types/notion'
import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getAll } from './getDatabase'

/**
 * 🟢 获取远程主题配置 (代号映射逻辑)
 * 映射关系：v1 -> anzifan (经典), v2 -> touchgal (极客)
 */
export const getRemoteTheme = async () => {
  try {
    const pages = await getPages()
    const themeConfigPage = pages.find(
      (page) =>
        (page.properties['slug'] as any).rich_text[0]?.plain_text === 'theme-config'
    )
    
    // 强制类型转换为 any 以解决 TypeScript 报红
    const themeCode = (themeConfigPage?.properties['excerpt'] as any)?.rich_text[0]?.plain_text?.trim()
    
    if (themeCode === 'v2') return 'touchgal'
    if (themeCode === 'v1') return 'anzifan'
    
    return null
  } catch (e) {
    console.error('获取远程主题配置失败:', e)
    return null
  }
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