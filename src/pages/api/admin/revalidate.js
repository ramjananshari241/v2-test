import { slugify } from '@/src/lib/util'
import {
  clearContentBuildCaches,
  collectAllRevalidatePaths,
  collectPostRevalidatePaths,
  revalidateMany,
} from '@/src/lib/blog/contentRevalidation'

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
    clearContentBuildCaches()

    const {
      scope = 'post',
      slug,
      category,
      tags,
      previousSlug,
    } = req.body ?? {}

    const categoryId = category?.trim() ? slugify(category.trim()) : null
    const tagIds = resolveTagIds(tags)

    let paths
    if (scope === 'full') {
      paths = await collectAllRevalidatePaths()
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
      paths = await collectAllRevalidatePaths()
    }

    const results = await revalidateMany(res, paths)
    const failed = results.filter((item) => !item.ok)

    return res.status(200).json({
      success: failed.length === 0,
      total: results.length,
      failed: failed.length,
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
