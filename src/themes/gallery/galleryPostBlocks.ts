import { BlockResponse } from '@/src/types/notion'

/**
 * Gallery / Tweet 内页正文：图库网格与 Notion 正文并存；
 * 正文 image 块照常渲染（图库只负责套图，不替代正文插图）。
 */
export function filterGalleryBodyBlocks(
  blocks: BlockResponse[],
  _hasGallery?: boolean
): BlockResponse[] {
  return blocks
}

export function hasGalleryBodyContent(
  blocks: BlockResponse[],
  hasGallery: boolean
): boolean {
  return filterGalleryBodyBlocks(blocks, hasGallery).length > 0
}

/** @deprecated 使用 hasGalleryBodyContent */
export function hasGalleryTextBody(
  blocks: BlockResponse[],
  hasGallery = true
): boolean {
  return hasGalleryBodyContent(blocks, hasGallery)
}
