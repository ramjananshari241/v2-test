import { getBlogSiteId, getBlogSiteIdOrNull } from '@/src/lib/gallery/blogSite'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

const TABLE = 'blog_site_settings'

/** 未配置 Supabase 或尚无记录时默认开启，保持存量站点行为 */
const DEFAULT_ENABLED = true

export async function getVendingEnabled(): Promise<boolean> {
  const siteId = getBlogSiteIdOrNull()
  const supabase = getSupabaseAdmin()
  if (!siteId || !supabase) return DEFAULT_ENABLED

  const { data, error } = await supabase
    .from(TABLE)
    .select('vending_enabled')
    .eq('site_id', siteId)
    .maybeSingle()

  if (error || !data || data.vending_enabled == null) {
    return DEFAULT_ENABLED
  }

  return Boolean(data.vending_enabled)
}

export async function updateVendingEnabled(enabled: boolean): Promise<boolean> {
  const siteId = getBlogSiteId()
  const supabase = getSupabaseAdmin()
  if (!supabase) throw new Error('Supabase 未配置')

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from(TABLE)
    .update({ vending_enabled: enabled, updated_at: now })
    .eq('site_id', siteId)

  if (updateError) {
    const { error: upsertError } = await supabase.from(TABLE).upsert(
      {
        site_id: siteId,
        theme_code: 'gallery',
        vending_enabled: enabled,
        updated_at: now,
      },
      { onConflict: 'site_id' }
    )
    if (upsertError) throw new Error(upsertError.message)
  }

  return enabled
}
