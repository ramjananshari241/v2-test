'use client'

import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import {
  filterGalleryBodyBlocks,
  hasGalleryBodyContent,
} from '@/src/themes/gallery/galleryPostBlocks'
import { useGalleryHasImages } from '@/src/themes/gallery/GalleryImageGrid'
import { MathJaxContext } from 'better-react-mathjax'
import { StandardGallerySection } from './StandardGallerySection'

type StandardPostContentProps = {
  postSlug: string
  blocks: BlockResponse[]
}

export function StandardPostContent({
  postSlug,
  blocks,
}: StandardPostContentProps) {
  const { ready, hasGallery } = useGalleryHasImages(postSlug)
  const bodyBlocks = filterGalleryBodyBlocks(blocks, hasGallery)
  const showBody = hasGalleryBodyContent(blocks, hasGallery)

  return (
    <MathJaxContext>
      <div className="standard-post-content overflow-hidden break-words">
        {hasGallery ? <StandardGallerySection postSlug={postSlug} /> : null}

        {ready && showBody ? (
          <div className={hasGallery ? 'standard-post-content__body mt-8' : ''}>
            <BlockRender blocks={bodyBlocks} variant="default" />
          </div>
        ) : null}

        {ready && !hasGallery && !showBody ? (
          <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
            暂无内容
          </p>
        ) : null}
      </div>
    </MathJaxContext>
  )
}
