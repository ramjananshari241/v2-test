import { Post } from '@/src/types/blog'
import { ANNOUNCEMENT_SLUG, sortPostsByPinnedThenDate } from './pinnedPosts'

type PostOrderFields = Pick<Post, 'slug' | 'pinned' | 'date'>

/** announcement 最先，其余置顶优先，再按发布日期降序 */
export function orderPostsForFeed<T extends PostOrderFields>(posts: T[]): T[] {
  const announcement = posts.find((p) => p.slug === ANNOUNCEMENT_SLUG)
  const rest = posts.filter((p) => p.slug !== ANNOUNCEMENT_SLUG)
  const sortedRest = sortPostsByPinnedThenDate(rest)
  return announcement ? [announcement, ...sortedRest] : sortedRest
}

/** 首页 feed：全量文章（ISR 按需刷新，不再截断篇数） */
export function buildHomeFeedPosts(posts: Post[]): Post[] {
  return orderPostsForFeed(posts)
}

/** getStaticPaths：预渲染全部文章路径；未命中路径仍走 fallback: blocking */
export function buildStaticPostPaths<T extends PostOrderFields>(posts: T[]): T[] {
  return orderPostsForFeed(posts)
}
