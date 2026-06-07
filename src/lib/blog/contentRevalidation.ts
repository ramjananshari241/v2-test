import type { NextApiResponse } from 'next'
import CONFIG from '@/blog.config'
import { clearGalleryAdBannerCache } from '@/src/lib/gallery/loadGalleryAdBanner'
import { getAllCategories } from '@/src/lib/blog/format/category'
import { formatPages } from '@/src/lib/blog/format/page'
import { formatPosts } from '@/src/lib/blog/format/post'
import { getAllTags } from '@/src/lib/blog/format/tag'
import { clearCachedNavFooter } from '@/src/lib/notion/getCachedMem'
import {
  clearRemoteThemeCache,
  getPages,
  getPosts,
  getPostsAndPieces,
  getWidgets,
  setRevalidateFreshTheme,
} from '@/src/lib/notion/getBlogData'
import { ApiScope } from '@/src/types/notion'

const { CATEGORY, TAG, ARCHIVE } = CONFIG.DEFAULT_SPECIAL_PAGES
const DEDICATED_PAGE_ROUTES = new Set(
  Object.values(CONFIG.DEFAULT_SPECIAL_PAGES)
)

export type RevalidateResult = {
  path: string
  ok: boolean
  error?: string
}

/** 清空构建期进程内缓存，确保 ISR 再生时拉取最新 Notion 数据 */
export function clearContentBuildCaches(): void {
  clearCachedNavFooter()
  clearRemoteThemeCache()
  clearGalleryAdBannerCache()
}

function normalizePath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

/** 收集全站需要按需刷新的路径 */
export async function collectAllRevalidatePaths(): Promise<string[]> {
  const paths = new Set<string>([
    '/',
    '/about',
    '/friends',
    '/download',
    `/${CATEGORY}`,
    `/${TAG}`,
    `/${ARCHIVE}`,
  ])

  const [{ posts, pieces }, pagesRaw] = await Promise.all([
    getPostsAndPieces(ApiScope.Archive),
    getPages(),
  ])

  const formattedPosts = await formatPosts(posts, { skipImageProbe: true })
  const formattedPages = formatPages(pagesRaw)

  for (const post of formattedPosts) {
    paths.add(`/post/${post.slug}`)
    paths.add(`/post/${post.slug}/download`)
  }

  for (const category of getAllCategories(formattedPosts)) {
    paths.add(`/category/${category.id}`)
  }

  for (const tag of getAllTags(formattedPosts)) {
    paths.add(`/tag/${tag.id}`)
  }

  const archiveCount = formattedPosts.length + pieces.length
  const archivePageCount = Math.max(
    1,
    Math.ceil(archiveCount / CONFIG.ARCHIVE_PER_COUNT)
  )
  for (let page = 2; page <= archivePageCount; page += 1) {
    paths.add(`/archive/${page}`)
  }

  for (const page of formattedPages) {
    if (page.status !== 'Published') continue
    if (DEDICATED_PAGE_ROUTES.has(page.slug)) continue
    paths.add(`/${page.slug}`)
  }

  const draftPosts = await getPosts(ApiScope.Draft)
  const formattedDrafts = await formatPosts(draftPosts, { skipImageProbe: true })
  for (const post of formattedDrafts) {
    paths.add(`/draft/${post.slug}`)
  }

  return Array.from(paths)
}

/** 单篇文章保存后刷新的核心路径（含首页与列表页） */
export async function collectPostRevalidatePaths(
  slug: string,
  options?: {
    categoryId?: string | null
    tagIds?: string[]
    previousSlug?: string | null
  }
): Promise<string[]> {
  const paths = new Set<string>([
    '/',
    `/${ARCHIVE}`,
    `/${CATEGORY}`,
    `/${TAG}`,
    `/post/${slug}`,
    `/post/${slug}/download`,
  ])

  if (options?.previousSlug && options.previousSlug !== slug) {
    paths.add(`/post/${options.previousSlug}`)
    paths.add(`/post/${options.previousSlug}/download`)
  }

  if (options?.categoryId) {
    paths.add(`/category/${options.categoryId}`)
  }

  for (const tagId of options?.tagIds ?? []) {
    if (tagId) paths.add(`/tag/${tagId}`)
  }

  const { posts, pieces } = await getPostsAndPieces(ApiScope.Archive)
  const formattedPosts = await formatPosts(posts, { skipImageProbe: true })
  const archivePageCount = Math.max(
    1,
    Math.ceil((formattedPosts.length + pieces.length) / CONFIG.ARCHIVE_PER_COUNT)
  )
  for (let page = 2; page <= archivePageCount; page += 1) {
    paths.add(`/archive/${page}`)
  }

  return Array.from(paths)
}

export async function revalidateMany(
  res: NextApiResponse,
  paths: string[],
  options?: { freshTheme?: boolean }
): Promise<RevalidateResult[]> {
  const unique = Array.from(new Set(paths.map(normalizePath)))
  const results: RevalidateResult[] = []
  const freshTheme = options?.freshTheme ?? false

  if (freshTheme) {
    setRevalidateFreshTheme(true)
  }

  try {
    for (const path of unique) {
      if (freshTheme) {
        clearContentBuildCaches()
      }
      try {
        await res.revalidate(path)
        results.push({ path, ok: true })
      } catch (error) {
        results.push({
          path,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } finally {
    if (freshTheme) {
      setRevalidateFreshTheme(false)
    }
  }

  return results
}
