import { slugify } from '@/src/lib/util'
import CONFIG from '@/blog.config'
import {
  clearContentBuildCaches,
  collectAllRevalidatePaths,
  collectDeleteRevalidatePaths,
  collectDownloadInstructionsRevalidatePaths,
  collectGalleryAdRevalidatePaths,
  collectPageRevalidatePaths,
  collectPostRevalidatePaths,
  collectShellRevalidatePaths,
  collectThemePostRevalidatePaths,
  revalidateMany,
  resolveRevalidateOrigin,
} from '@/src/lib/blog/contentRevalidation'

export const config = {
  maxDuration: 300,
}

/** 手动「刷新BLOG」最小间隔（服务端兜底，防多标签/脚本连点） */
const MANUAL_SHELL_REVALIDATE_MIN_MS = 45_000
let lastManualShellRevalidateAt = 0

function resolveTagIds(tagsString) {
  return (tagsString || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((name) => slugify(name))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const {
      scope = 'post',
      slug,
      category,
      tags,
      previousSlug,
      listScope = 'shell',
      paths: explicitPaths,
      clearCaches = true,
      freshTheme = false,
      warmPaths = false,
      expectedTheme = null,
      manualShell = false,
      contentChange = false,
    } = req.body ?? {}

    if (scope === 'shell' && manualShell) {
      const now = Date.now()
      const elapsed = now - lastManualShellRevalidateAt
      if (lastManualShellRevalidateAt > 0 && elapsed < MANUAL_SHELL_REVALIDATE_MIN_MS) {
        const retryAfterSec = Math.ceil(
          (MANUAL_SHELL_REVALIDATE_MIN_MS - elapsed) / 1000
        )
        return res.status(429).json({
          success: false,
          error: `刷新过于频繁，请 ${retryAfterSec} 秒后再试`,
          retryAfterSec,
        })
      }
      lastManualShellRevalidateAt = now
    }

    if (scope === 'list') {
      let paths = []
      if (listScope === 'full') {
        paths = await collectAllRevalidatePaths()
      } else if (listScope === 'shell') {
        paths = collectShellRevalidatePaths()
      } else if (listScope === 'theme') {
        paths = await collectGalleryAdRevalidatePaths()
      } else if (listScope === 'theme-posts') {
        paths = await collectThemePostRevalidatePaths()
      } else if (listScope === 'download-instructions') {
        paths = await collectDownloadInstructionsRevalidatePaths()
      } else if (listScope === 'gallery-ad') {
        paths = await collectGalleryAdRevalidatePaths()
      }
      return res.status(200).json({
        success: true,
        paths,
        total: paths.length,
      })
    }

    const categoryId = category?.trim() ? slugify(category.trim()) : null
    const tagIds = resolveTagIds(tags)

    let paths
    if (scope === 'batch') {
      paths = Array.isArray(explicitPaths) ? explicitPaths : []
    } else if (scope === 'full') {
      paths = await collectAllRevalidatePaths()
    } else if (scope === 'shell') {
      paths = collectShellRevalidatePaths()
    } else if (scope === 'gallery-ad') {
      paths = await collectGalleryAdRevalidatePaths()
    } else if (scope === 'delete' && slug) {
      paths = await collectDeleteRevalidatePaths(slug, { categoryId, tagIds })
    } else if (scope === 'post' && slug) {
      paths = await collectPostRevalidatePaths(slug, {
        categoryId,
        tagIds,
        previousSlug,
      })
    } else if (scope === 'page' && slug) {
      if (slug === CONFIG.DEFAULT_SPECIAL_PAGES.DOWNLOAD) {
        paths = await collectDownloadInstructionsRevalidatePaths()
      } else {
        paths = collectPageRevalidatePaths(slug, { previousSlug })
      }
    } else if (scope === 'friends') {
      paths = ['/', '/friends']
    } else if (scope === 'widget') {
      paths = ['/', '/about', '/download']
    } else if (slug) {
      paths = await collectPostRevalidatePaths(slug, {
        categoryId,
        tagIds,
        previousSlug,
      })
    } else {
      paths = collectShellRevalidatePaths()
    }

    if (clearCaches && scope !== 'batch') {
      clearContentBuildCaches()
    }

    if (warmPaths) {
      console.log('[admin/revalidate] warmPaths', {
        scope,
        pathCount: paths.length,
        origin: resolveRevalidateOrigin(req),
        expectedTheme: expectedTheme || null,
      })
    }

    const results = await revalidateMany(res, paths, {
      freshTheme,
      clearCaches: scope === 'batch' ? clearCaches : false,
      warmPaths: Boolean(warmPaths),
      origin: warmPaths ? resolveRevalidateOrigin(req) : undefined,
      expectedTheme: expectedTheme || null,
      contentChange: Boolean(contentChange),
    })
    const failed = results.filter((item) => !item.ok)
    const succeeded = results.filter((item) => item.ok)

    return res.status(200).json({
      success: failed.length === 0,
      total: results.length,
      succeeded: succeeded.length,
      failed: failed.length,
      paths,
      results,
    })
  } catch (error) {
    console.error('admin revalidate error:', error)
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
