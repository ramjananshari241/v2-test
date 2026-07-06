'use client'

import PostHeader from '@/src/components/post/PostHeader'
import { Post, BlockDataType } from '@/src/types/blog'
import { useGalleryHasImages } from '@/src/themes/gallery/GalleryImageGrid'

type StandardPostHeaderProps = {
  post: Post
  blocks: BlockDataType[]
}

/**
 * 有 Supabase 图库时隐藏 PostHeader 顶部大封面，仅保留标题区元信息。
 */
export function StandardPostHeader({ post, blocks }: StandardPostHeaderProps) {
  const { ready, hasGallery } = useGalleryHasImages(post.slug)
  const showHeroCover = ready ? !hasGallery : false

  return (
    <PostHeader post={post} blocks={blocks} showHeroCover={showHeroCover} />
  )
}
