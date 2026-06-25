import { TweetCardMedia } from './tweetFeedMedia'
import { TweetPostCardGalleryStrip } from './TweetPostCardGalleryStrip'

type TweetPostCardMediaProps = {
  media: TweetCardMedia
}

export function TweetPostCardMedia({ media }: TweetPostCardMediaProps) {
  if (media.mode === 'gallery') {
    return (
      <TweetPostCardGalleryStrip thumbs={media.thumbs} total={media.total} />
    )
  }

  if (media.mode === 'cover') {
    return (
      <div className="tweet-post-card__cover-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={media.src} alt="" className="tweet-post-card__cover" />
      </div>
    )
  }

  return null
}
