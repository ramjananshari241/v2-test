import { TWEET_CARD_GALLERY_VISIBLE } from './tweetFeedMedia'

type TweetPostCardGalleryStripProps = {
  thumbs: string[]
  total: number
}

export function TweetPostCardGalleryStrip({
  thumbs,
  total,
}: TweetPostCardGalleryStripProps) {
  const visibleCount = Math.min(TWEET_CARD_GALLERY_VISIBLE, thumbs.length, total)
  const cells = thumbs.slice(0, visibleCount)
  const showMoreOverlay = total > visibleCount
  const overlayCount = showMoreOverlay ? total : 0

  return (
    <div className="tweet-post-card__gallery" aria-hidden>
      {cells.map((src, index) => {
        const isLast = index === cells.length - 1
        const showOverlay = showMoreOverlay && isLast

        return (
          <div key={`${src}-${index}`} className="tweet-post-card__gallery-cell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="tweet-post-card__gallery-img" />
            {showOverlay ? (
              <span className="tweet-post-card__gallery-more">
                {overlayCount}+
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
