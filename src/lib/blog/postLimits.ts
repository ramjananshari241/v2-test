import CONFIG from '@/blog.config'
import { Post } from '@/src/types/blog'
import { ANNOUNCEMENT_SLUG, sortPostsByPinnedThenDate } from './pinnedPosts'

/**
 * 构建期与首页文章策略（全主题共用，与 Notion theme-config 无关）：
 * - 首页 feed：buildHomeFeedPosts → 默认全量，供卡片翻页（announcement + 置顶优先排序）
 * - 预渲染路径：capPostsForBuild → STATIC_POST_PATHS_MAX（0 = 部署时不生成任何 /post/* 静态页）
 */
export const BLOG_STATIC_POST_PATHS_MAX =
  (CONFIG as { STATIC_POST_PATHS_MAX?: number }).STATIC_POST_PATHS_MAX ?? 0

/** 0 表示首页不限制篇数 */
export const BLOG_HOME_FEED_POSTS_MAX =
  (CONFIG as { HOME_FEED_POSTS_MAX?: number }).HOME_FEED_POSTS_MAX ?? 0

type PostCapFields = Pick<Post, 'slug' | 'pinned' | 'date'>

/** announcement 最先，其余置顶优先，再按发布日期降序 */
export function orderPostsForBuildCap<T extends PostCapFields>(posts: T[]): T[] {
  const announcement = posts.find((p) => p.slug === ANNOUNCEMENT_SLUG)
  const rest = posts.filter((p) => p.slug !== ANNOUNCEMENT_SLUG)
  const sortedRest = sortPostsByPinnedThenDate(rest)
  return announcement ? [announcement, ...sortedRest] : sortedRest
}

function sliceToMax<T>(posts: T[], max: number): T[] {
  if (posts.length <= max) return posts
  return posts.slice(0, max)
}

/** 首页下发的文章列表：默认全量；HOME_FEED_POSTS_MAX>0 时才截断 */
export function buildHomeFeedPosts(posts: Post[]): Post[] {
  const ordered = orderPostsForBuildCap(posts)
  if (!BLOG_HOME_FEED_POSTS_MAX || BLOG_HOME_FEED_POSTS_MAX <= 0) {
    return ordered
  }
  return sliceToMax(ordered, BLOG_HOME_FEED_POSTS_MAX)
}

/** 构建 paths 时预渲染的文章集合（仅用于 /post/*、/draft/*；0 则返回空数组） */
export function capPostsForBuild(posts: Post[]): Post[] {
  if (!BLOG_STATIC_POST_PATHS_MAX || BLOG_STATIC_POST_PATHS_MAX <= 0) {
    return []
  }
  return sliceToMax(orderPostsForBuildCap(posts), BLOG_STATIC_POST_PATHS_MAX)
}

/** @deprecated 使用 buildHomeFeedPosts */
export function capHomePosts(posts: Post[]): Post[] {
  return buildHomeFeedPosts(posts)
}
