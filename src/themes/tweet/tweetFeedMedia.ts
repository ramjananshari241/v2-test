import { resolvePostCoverSrc } from '@/src/lib/gallery/postCover'
import { GalleryFeedPreview } from '@/src/lib/gallery/galleryFeedPreviews'
import { TweetFeedMediaMap } from '@/src/lib/tweet/loadTweetFeedMedia'
import { Post } from '@/src/types/blog'

export type TweetCardGalleryMedia = GalleryFeedPreview & { mode: 'gallery' }
export type TweetCardCoverMedia = { mode: 'cover'; src: string }
export type TweetCardNoMedia = { mode: 'none' }
export type TweetCardMedia =
  | TweetCardGalleryMedia
  | TweetCardCoverMedia
  | TweetCardNoMedia

export const TWEET_CARD_GALLERY_VISIBLE = 6

export function resolveTweetCardMedia(
  post: Post,
  feedMedia?: TweetFeedMediaMap | null
): TweetCardMedia {
  const gallery = feedMedia?.galleryPreviews?.[post.slug]
  if (gallery?.thumbs?.length) {
    return { mode: 'gallery', total: gallery.total, thumbs: gallery.thumbs }
  }

  const notionCover = resolvePostCoverSrc(post)
  if (notionCover) {
    return { mode: 'cover', src: notionCover }
  }

  const bodySrc = feedMedia?.bodyImages?.[post.slug]
  if (bodySrc) {
    return { mode: 'cover', src: bodySrc }
  }

  return { mode: 'none' }
}

export function isDeferredTweetBodyImage(
  slug: string,
  feedMedia?: TweetFeedMediaMap | null
): boolean {
  return !!feedMedia?.deferredBodyImageSlugs?.includes(slug)
}
