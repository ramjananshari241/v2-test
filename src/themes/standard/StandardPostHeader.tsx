'use client'

import PostHeader from '@/src/components/post/PostHeader'
import { Post, BlockDataType } from '@/src/types/blog'
import { StandardGalleryHero } from './StandardGalleryHero'
import { useStandardGalleryPreview } from './StandardGalleryPreviewContext'

type StandardPostHeaderProps = {
  post: Post
  blocks: BlockDataType[]
}

/** 有图库时大图区展示预览浏览器主图；加载中先黑框占位，确认无图库后回退 Notion 封面。 */
export function StandardPostHeader({ post, blocks }: StandardPostHeaderProps) {
  const ctx = useStandardGalleryPreview()
  const useGalleryHero = ctx && (!ctx.ready || ctx.hasGallery)

  return (
    <PostHeader
      post={post}
      blocks={blocks}
      showHeroCover
      heroSlot={
        useGalleryHero ? (
          <div
            id="cover"
            className="relative w-full h-full md:rounded-3xl"
            data-aos="fade-up"
            data-aos-duration="500"
          >
            <StandardGalleryHero />
          </div>
        ) : undefined
      }
    />
  )
}
