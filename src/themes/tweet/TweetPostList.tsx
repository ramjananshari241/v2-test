'use client'

import { useRouter } from 'next/router'
import { TweetPostCard } from './TweetPostCard'
import { TWEET_HOME_PAGE_SIZE } from './tweetConstants'

type TweetPostListProps = {
  posts: Array<import('@/src/types/blog').Post>
  emptyLabel?: string
}

function parsePage(query: unknown, maxPages: number): number {
  const raw = Array.isArray(query) ? query[0] : query
  const n = parseInt(String(raw ?? ''), 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(n, maxPages)
}

export function TweetPostList({ posts, emptyLabel = '暂无文章' }: TweetPostListProps) {
  const router = useRouter()
  const totalPages = Math.max(1, Math.ceil(posts.length / TWEET_HOME_PAGE_SIZE))
  const currentPage = router.isReady
    ? parsePage(router.query.page, totalPages)
    : 1
  const safePage = Math.min(currentPage, totalPages)
  const start = (safePage - 1) * TWEET_HOME_PAGE_SIZE
  const slice = posts.slice(start, start + TWEET_HOME_PAGE_SIZE)

  const goPage = (page: number) => {
    const query = { ...router.query }
    if (page <= 1) delete query.page
    else query.page = String(page)
    router.replace({ pathname: router.pathname, query }, undefined, {
      shallow: true,
      scroll: false,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-tweet text-base font-semibold text-neutral-800 dark:text-neutral-100">
          All Posts
        </h2>
        {totalPages > 1 ? (
          <span className="font-tweet text-xs text-neutral-400">
            {safePage} / {totalPages}
          </span>
        ) : null}
      </div>

      {slice.length === 0 ? (
        <p className="py-12 text-center font-tweet text-sm text-neutral-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-5">
          {slice.map((post) => <TweetPostCard key={post.id} post={post} />)}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => goPage(safePage - 1)}
            className="rounded-lg px-3 py-1.5 font-tweet text-sm text-neutral-600 disabled:opacity-40 dark:text-neutral-300"
          >
            上一页
          </button>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => goPage(safePage + 1)}
            className="rounded-lg px-3 py-1.5 font-tweet text-sm text-neutral-600 disabled:opacity-40 dark:text-neutral-300"
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  )
}
