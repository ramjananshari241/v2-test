import Link from 'next/link'

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
    <Link href="/announcement" className="tweet-announcement">
      <span className="tweet-announcement__label">📌</span>
      {title}
    </Link>
  )
}
