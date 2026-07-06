'use client'

import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import {
  filterGalleryBodyBlocks,
  hasGalleryBodyContent,
} from '@/src/themes/gallery/galleryPostBlocks'
import { MathJaxContext } from 'better-react-mathjax'
import { StandardGalleryThumbRail } from './StandardGalleryThumbRail'
import { useStandardGalleryPreview } from './StandardGalleryPreviewContext'

type StandardPostContentProps = {
  postSlug: string
  blocks: BlockResponse[]
}

export function StandardPostContent({
  postSlug,
  blocks,
}: StandardPostContentProps) {
  const ctx = useStandardGalleryPreview()
  const ready = ctx?.ready ?? false
  const hasGallery = ctx?.hasGallery ?? false

  const bodyBlocks = filterGalleryBodyBlocks(blocks, hasGallery)
  const showBody = hasGalleryBodyContent(blocks, hasGallery)

  return (
    <MathJaxContext>
      <div className="standard-post-content overflow-hidden break-words">
        {hasGallery && ready ? (
          <>
            <StandardGalleryThumbRail />
            <div className="standard-gallery-preview__divider" role="presentation" />
          </>
        ) : null}

        {ready && showBody ? (
          <div className={hasGallery ? 'standard-post-content__body' : ''}>
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
