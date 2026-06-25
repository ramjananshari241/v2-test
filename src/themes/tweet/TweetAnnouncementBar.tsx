import Link from 'next/link'

type AnnouncementLike = {
  title?: string
  slug?: string
}

type TweetAnnouncementBarProps = {
  announcement?: AnnouncementLike | null
  placement?: 'sidebar' | 'mobile'
}

export function TweetAnnouncementBar({
  announcement,
  placement = 'sidebar',
}: TweetAnnouncementBarProps) {
  const title = announcement?.title?.trim()
  if (!title) return null

  if (placement === 'mobile') {
    return (
      <Link href="/announcement" className="tweet-announcement-mobile">
        {title}
      </Link>
    )
  }

  return (
    <Link href="/announcement" className="tweet-announcement-sidebar">
      {title}
    </Link>
  )
}
