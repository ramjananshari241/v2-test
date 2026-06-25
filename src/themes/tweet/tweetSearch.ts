import { Post } from '@/src/types/blog'

export function readTweetSearchQuery(query: unknown): string {
  const raw = Array.isArray(query) ? query[0] : query
  return typeof raw === 'string' ? raw.trim() : ''
}

export function filterTweetPosts(
  posts: Post[],
  options: {
    q?: string
    categoryId?: string
    order?: string
  } = {}
): Post[] {
  const q = (options.q ?? '').trim().toLowerCase()
  const categoryId = options.categoryId?.trim()
  const order = options.order === 'asc' ? 'asc' : 'desc'

  let list = posts.filter((p) => p.slug !== 'announcement')

  if (q) {
    list = list.filter((post) => {
      const tagText = post.tags?.map((t) => t.name).join(' ') ?? ''
      const haystack = `${post.title} ${post.excerpt ?? ''} ${tagText}`.toLowerCase()
      return haystack.includes(q)
    })
  }

  if (categoryId) {
    list = list.filter((post) => post.category?.id === categoryId)
  }

  list = [...list].sort((a, b) => {
    const aTime = new Date(a.date?.created ?? 0).getTime()
    const bTime = new Date(b.date?.created ?? 0).getTime()
    return order === 'asc' ? aTime - bTime : bTime - aTime
  })

  return list
}

export function collectTweetTags(posts: Post[]): import('@/src/types/blog').Tag[] {
  const map = new Map<string, import('@/src/types/blog').Tag>()
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
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
