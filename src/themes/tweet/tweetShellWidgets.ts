import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { Post } from '@/src/types/blog'

export type TweetAnnouncementLike = { title?: string; slug?: string }

export function pickTweetShellWidgets(
  widgets?: Record<string, unknown> | null
): {
  profile?: ProfileWidgetType | null
  announcement?: TweetAnnouncementLike | null
} {
  if (!widgets) return {}

  const profile = widgets.profile as ProfileWidgetType | undefined
  const raw = widgets.announcement

  let announcement: TweetAnnouncementLike | null = null
  if (raw && typeof raw === 'object' && 'title' in raw) {
    const post = raw as Post
    announcement = { title: post.title, slug: post.slug }
  }

  return { profile, announcement }
}
