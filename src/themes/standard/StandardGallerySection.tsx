'use client'

import { GalleryImageGrid } from '@/src/themes/gallery/GalleryImageGrid'
import { StandardGalleryGridLoader } from './StandardGalleryGridLoader'

type StandardGallerySectionProps = {
  postSlug: string
}

export function StandardGallerySection({ postSlug }: StandardGallerySectionProps) {
  return (
    <div className="standard-gallery-section">
      <GalleryImageGrid
        postSlug={postSlug}
        GridLoader={StandardGalleryGridLoader}
        gridClassName="standard-gallery-grid"
        loadMoreClassName="standard-gallery-load-more"
      />
    </div>
  )
}
