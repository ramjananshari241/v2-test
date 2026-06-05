import {
  isSupabaseGalleryConfigured,
} from '@/src/lib/supabase/admin'
import {
  listAllGalleryImagesForAdmin,
  syncGalleryImages,
} from '@/src/lib/gallery/galleryDb'

export default async function handler(req, res) {
  if (!isSupabaseGalleryConfigured()) {
    return res.status(503).json({
      success: false,
      error:
        'Supabase 未配置。请在 Vercel 设置 NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY',
    })
  }

  try {
    if (req.method === 'GET') {
      const slug = String(req.query.slug || '').trim()
      if (!slug) {
        return res.status(400).json({ success: false, error: '缺少 slug' })
      }
      const data = await listAllGalleryImagesForAdmin(slug)
      return res.status(200).json({ success: true, ...data })
    }

    if (req.method === 'POST') {
      const body = req.body || {}
      const slug = String(body.postSlug || body.slug || '').trim()
      if (!slug) {
        return res.status(400).json({ success: false, error: '缺少 postSlug' })
      }
      const images = Array.isArray(body.images) ? body.images : []
      const result = await syncGalleryImages({
        postSlug: slug,
        postNotionId: body.postNotionId || body.notionId || null,
        title: body.title || null,
        images: images.map((img) => ({
          url: typeof img === 'string' ? img : img?.url,
          thumb_url:
            typeof img === 'object' && img?.thumb_url ? img.thumb_url : undefined,
          file_size:
            typeof img === 'object' && img?.file_size != null
              ? Number(img.file_size)
              : undefined,
        })),
      })
      return res.status(200).json({ success: true, ...result })
    }

    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ success: false, error: '不支持的请求方法' })
  } catch (e) {
    console.error('/api/admin/gallery', e)
    const status = e?.name === 'GalleryStorageQuotaError' ? 413 : 500
    return res.status(status).json({
      success: false,
      error: e?.message || '图库操作失败',
    })
  }
}
