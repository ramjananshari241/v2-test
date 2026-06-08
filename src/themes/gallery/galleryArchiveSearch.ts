import { Post } from '@/src/types/blog'

export function filterGalleryArchivePosts(
  posts: Post[],
  rawQuery: string
): Post[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return posts
  return posts.filter((p) => {
    const title = (p.title || '').toLowerCase()
    const category = (p.category?.name || '').toLowerCase()
    const tags = (p.tags || []).map((t) => (t.name || '').toLowerCase()).join(' ')
    return title.includes(q) || category.includes(q) || tags.includes(q)
  })
}
