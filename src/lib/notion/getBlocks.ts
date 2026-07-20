import { BlockResponse } from '@/src/types/notion'
import { collectPaginatedAPI, isFullBlock } from '@notionhq/client'
import { notion } from './notion'
import { isNotionBuildPhase, isTransientNotionError } from './transientErrors'

const deleteUnnecessaryProperties = (object: BlockResponse) => {
  delete object.object
  delete object.archived
  delete object.created_by
  delete object.last_edited_by
  delete object.parent
  delete object.created_time
  delete object.last_edited_time
}

const loadAllBlocks = async (
  parentBlockId: string
): Promise<Array<BlockResponse>> => {
  const blocks = await collectPaginatedAPI(notion.blocks.children.list, {
    block_id: parentBlockId,
  })

  const fullBlocks = await Promise.all(
    blocks.filter(isFullBlock).map(async (block) => {
      const object: BlockResponse = block
      deleteUnnecessaryProperties(object)
      const { has_children } = object
      delete object.has_children
      if (has_children && object.id) {
        return {
          ...object,
          children: await loadAllBlocks(object.id),
        }
      }
      return {
        ...object,
        children: [],
      }
    })
  )

  return fullBlocks as BlockResponse[]
}

export const getAllBlocks = async (
  parentBlockId: string
): Promise<Array<BlockResponse>> => {
  const safeId = String(parentBlockId || '').trim()
  if (!safeId) return []

  try {
    return await loadAllBlocks(safeId)
  } catch (error) {
    if (!isNotionBuildPhase() || !isTransientNotionError(error)) throw error
    console.warn(
      `[getAllBlocks] Notion transient error during build, using empty blocks: ${safeId}`,
      error instanceof Error ? error.message : error
    )
    return []
  }
}
