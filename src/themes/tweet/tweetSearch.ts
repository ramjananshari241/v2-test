import { Post, Tag } from '@/src/types/blog'

export function readTweetSearchQuery(query: unknown): string {
  const raw = Array.isArray(query) ? query[0] : query
  return typeof raw === 'string' ? raw.trim() : ''
}

export function filterTweetPosts(posts: Post[], query: string): Post[] {
  const q = query.trim().toLowerCase()
  const list = posts.filter((p) => p.slug !== 'announcement')
  if (!q) return list
  return list.filter((post) => {
    const tagText = post.tags?.map((t) => t.name).join(' ') ?? ''
    const haystack = `${post.title} ${post.excerpt ?? ''} ${tagText}`.toLowerCase()
    return haystack.includes(q)
  })
}

export function collectTweetTags(posts: Post[]): Tag[] {
  const map = new Map<string, Tag>()
  for (const post of posts) {
    for (const tag of post.tags ?? []) {
      if (tag.name?.trim()) map.set(tag.id, tag)
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-CN')
  )
}

export function formatTweetDate(value?: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value.slice(0, 10)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
