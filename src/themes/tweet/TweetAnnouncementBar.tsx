import Link from 'next/link'
import { tweetCardSurfaceClass } from './tweetFonts'

type AnnouncementLike = {
  title?: string
  slug?: string
}

export function TweetAnnouncementBar({
  announcement,
}: {
  announcement?: AnnouncementLike | null
}) {
  const title = announcement?.title?.trim()
  if (!title) return null

  return (
    <Link
      href="/announcement"
      className={`group flex items-center gap-3 px-4 py-3 transition-colors ${tweetCardSurfaceClass}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m3 11 18-5v12L3 13v-2z" />
          <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 truncate font-tweet text-sm font-medium text-neutral-800 group-hover:underline dark:text-neutral-100">
        {title}
      </span>
    </Link>
  )
}
