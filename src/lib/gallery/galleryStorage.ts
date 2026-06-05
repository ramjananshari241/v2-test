import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

/** 每个 Blog 图库总容量上限（Supabase 记录压缩后体积） */
export const GALLERY_STORAGE_QUOTA_BYTES = 50 * 1024 * 1024 * 1024

export function formatGalleryStorageBytes(bytes: number): string {
  const n = Math.max(0, Number(bytes) || 0)
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

export async function getTotalGalleryStorageBytes(): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0

  const { data, error } = await sb.from('gallery_images').select('file_size')
  if (error) throw error

  return (data || []).reduce(
    (sum, row) => sum + (Number(row.file_size) > 0 ? Number(row.file_size) : 0),
    0
  )
}

export async function getGalleryStorageBytesBySlug(
  postSlug: string
): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0
  const slug = postSlug.trim()
  if (!slug) return 0

  const { data: gallery, error: gErr } = await sb
    .from('galleries')
    .select('id')
    .eq('post_slug', slug)
    .maybeSingle()
  if (gErr) throw gErr
  if (!gallery?.id) return 0

  const { data, error } = await sb
    .from('gallery_images')
    .select('file_size')
    .eq('gallery_id', gallery.id)
  if (error) throw error

  return (data || []).reduce(
    (sum, row) => sum + (Number(row.file_size) > 0 ? Number(row.file_size) : 0),
    0
  )
}

export async function countGalleryStorageImages(): Promise<number> {
  const sb = getSupabaseAdmin()
  if (!sb) return 0
  const { count, error } = await sb
    .from('gallery_images')
    .select('*', { count: 'exact', head: true })
  if (error) throw error
  return count ?? 0
}

export type GalleryStorageStats = {
  usedBytes: number
  quotaBytes: number
  usedPercent: number
  imageCount: number
  remainingBytes: number
}

export async function getGalleryStorageStats(): Promise<GalleryStorageStats> {
  const [usedBytes, imageCount] = await Promise.all([
    getTotalGalleryStorageBytes(),
    countGalleryStorageImages(),
  ])
  const quotaBytes = GALLERY_STORAGE_QUOTA_BYTES
  const usedPercent =
    quotaBytes > 0 ? Math.min(100, (usedBytes / quotaBytes) * 100) : 0
  return {
    usedBytes,
    quotaBytes,
    usedPercent,
    imageCount,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
  }
}

export class GalleryStorageQuotaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GalleryStorageQuotaError'
  }
}

/**
 * 校验同步后全局图库容量（替换指定 slug 图库后的总量）
 */
export async function assertGalleryStorageQuota(input: {
  postSlug: string
  images: { url: string; file_size?: number | null }[]
}): Promise<void> {
  const slug = input.postSlug.trim()
  const globalUsed = await getTotalGalleryStorageBytes()
  const thisGalleryUsed = slug ? await getGalleryStorageBytesBySlug(slug) : 0

  const newGalleryBytes = (input.images || []).reduce(
    (sum, img) =>
      sum + (Number(img.file_size) > 0 ? Number(img.file_size) : 0),
    0
  )

  const projected = globalUsed - thisGalleryUsed + newGalleryBytes
  if (projected > GALLERY_STORAGE_QUOTA_BYTES) {
    const over = projected - GALLERY_STORAGE_QUOTA_BYTES
    throw new GalleryStorageQuotaError(
      `图库容量已满（上限 ${formatGalleryStorageBytes(GALLERY_STORAGE_QUOTA_BYTES)}）。` +
        `本次保存将超出 ${formatGalleryStorageBytes(over)}，请删除部分图库图片后重试。`
    )
  }
}

/** 客户端预选图：全局已用 + 待上传体积是否超限 */
export async function canAddGalleryPendingBytes(
  pendingBytes: number
): Promise<{ ok: boolean; usedBytes: number; quotaBytes: number; message?: string }> {
  const usedBytes = await getTotalGalleryStorageBytes()
  const quotaBytes = GALLERY_STORAGE_QUOTA_BYTES
  const add = Math.max(0, Number(pendingBytes) || 0)
  if (usedBytes + add <= quotaBytes) {
    return { ok: true, usedBytes, quotaBytes }
  }
  return {
    ok: false,
    usedBytes,
    quotaBytes,
    message:
      `图库容量不足（已用 ${formatGalleryStorageBytes(usedBytes)} / ${formatGalleryStorageBytes(quotaBytes)}）。` +
      `请删除部分图库图片或联系管理员扩容。`,
  }
}
