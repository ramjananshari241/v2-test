'use client'

import { GalleryImageGrid } from '@/src/themes/gallery/GalleryImageGrid'

type TweetGallerySectionProps = {
  postSlug: string
}

export function TweetGallerySection({ postSlug }: TweetGallerySectionProps) {
  return (
    <div className="tweet-gallery-section gallery-content-container">
      <GalleryImageGrid postSlug={postSlug} />
    </div>
  )
}
