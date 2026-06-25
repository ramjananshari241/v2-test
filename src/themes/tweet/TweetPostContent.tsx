'use client'

import { BlockRender } from '@/src/components/blocks/BlockRender'
import { BlockResponse } from '@/src/types/notion'
import { MathJaxContext } from 'better-react-mathjax'
import {
  filterGalleryBodyBlocks,
  hasGalleryBodyContent,
} from '@/src/themes/gallery/galleryPostBlocks'
import { useGalleryHasImages } from '@/src/themes/gallery/GalleryImageGrid'
import { TweetGallerySection } from './TweetGallerySection'

type TweetPostContentProps = {
  postSlug: string
  blocks: BlockResponse[]
}

export function TweetPostContent({ postSlug, blocks }: TweetPostContentProps) {
  const { ready, hasGallery } = useGalleryHasImages(postSlug)
  const bodyBlocks = filterGalleryBodyBlocks(blocks, hasGallery)
  const showBody = hasGalleryBodyContent(blocks, hasGallery)

  return (
    <MathJaxContext>
      <div className="tweet-post-content overflow-hidden break-words">
        <TweetGallerySection postSlug={postSlug} />

        {ready && showBody ? (
          <div className={hasGallery ? 'tweet-post-content__body mt-6' : ''}>
            <div className="prose-tweet">
              <BlockRender blocks={bodyBlocks} />
            </div>
          </div>
        ) : null}

        {ready && !hasGallery && !showBody ? (
          <p className="tweet-post-content__empty">暂无内容</p>
        ) : null}
      </div>
    </MathJaxContext>
  )
}
