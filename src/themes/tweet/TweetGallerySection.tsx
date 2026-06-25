'use client'

import { GalleryImageGrid } from '@/src/themes/gallery/GalleryImageGrid'
import { TweetGalleryGridLoader } from './TweetGalleryGridLoader'

type TweetGallerySectionProps = {
  postSlug: string
}

export function TweetGallerySection({ postSlug }: TweetGallerySectionProps) {
  return (
    <div className="tweet-gallery-section gallery-content-container">
      <GalleryImageGrid
        postSlug={postSlug}
        GridLoader={TweetGalleryGridLoader}
      />
    </div>
  )
}
