function isVideoImageContent(content) {
  return /\.(mp4|mov|webm|ogg|mkv)(\?|$)/i.test(content || '')
}
export function normalizeCoverCompareUrl(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const parsed = new URL(url.trim())
    return `${parsed.origin}${parsed.pathname}`.toLowerCase()
  } catch {
    return url.trim().split('?')[0].split('#')[0].toLowerCase()
  }
}

export function coverUrlsMatch(a, b) {
  const na = normalizeCoverCompareUrl(a)
  const nb = normalizeCoverCompareUrl(b)
  if (!na || !nb) return false
  return na === nb
}

export function isImageBlockEligibleForCover(block) {
  return (
    block?.type === 'image' &&
    !!block.content?.trim() &&
    !isVideoImageContent(block.content)
  )
}

/** 用户手动标记为封面的图片块 */
export function findManualCoverImageBlock(blocks) {
  return (blocks || []).find(
    (b) => b.type === 'image' && b.isCover && isImageBlockEligibleForCover(b)
  )
}

/** 自动封面：正文中第一个非视频图片块 */
export function findAutoCoverImageBlock(blocks) {
  return (blocks || []).find((b) => isImageBlockEligibleForCover(b))
}

/** 当前生效的封面块：手动优先，否则第一个图片块 */
export function findCoverImageBlock(blocks) {
  return findManualCoverImageBlock(blocks) || findAutoCoverImageBlock(blocks)
}

/** 保存到 Notion cover 属性时使用的 URL（仅 https） */
export function resolveCoverFromBlocks(blocks) {
  const coverBlock = findCoverImageBlock(blocks)
  if (!coverBlock?.content) return ''
  const url = coverBlock.content.trim()
  return /^https?:\/\//i.test(url) ? url : ''
}

/** @deprecated 使用 resolveCoverFromBlocks */
export function resolveAutoCover(blocks) {
  return resolveCoverFromBlocks(blocks)
}

export function setBlockAsCover(blocks, blockId) {
  return (blocks || []).map((b) => ({
    ...b,
    isCover:
      b.id === blockId &&
      b.type === 'image' &&
      isImageBlockEligibleForCover(b),
  }))
}

export function clearManualCoverFlags(blocks) {
  return (blocks || []).map((b) => ({ ...b, isCover: false }))
}

/**
 * 二次编辑：根据已保存的 Notion cover 恢复手动封面标记。
 * 若 cover 与自动首图一致，视为未手动设定。
 */
export function syncCoverFlagsFromSavedCover(blocks, savedCoverUrl) {
  const cover = (savedCoverUrl || '').trim()
  const list = blocks || []
  if (!cover) return clearManualCoverFlags(list)

  const autoFirst = findAutoCoverImageBlock(list)
  if (autoFirst?.content && coverUrlsMatch(cover, autoFirst.content)) {
    return clearManualCoverFlags(list)
  }

  let matched = false
  return list.map((b) => {
    if (!isImageBlockEligibleForCover(b)) {
      return { ...b, isCover: false }
    }
    const isMatch = !matched && coverUrlsMatch(cover, b.content)
    if (isMatch) matched = true
    return { ...b, isCover: isMatch }
  })
}
