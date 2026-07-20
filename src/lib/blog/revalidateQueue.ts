import { getBlogSiteId, getBlogSiteIdOrNull } from '@/src/lib/gallery/blogSite'
import { getSupabaseAdmin } from '@/src/lib/supabase/admin'

const TABLE = 'blog_revalidate_queue'
const DEFAULT_DELAY_MS = Number(process.env.REVALIDATE_QUEUE_DELAY_MS) || 30_000
const PROCESSING_STALE_MS = 10 * 60 * 1000

export type RevalidateQueueRow = {
  id: string
  site_id: string
  path: string
  scope: string
  reason: string | null
  status: 'pending' | 'processing' | 'done' | 'failed'
  priority: number
  scheduled_at: string
  attempts: number
  max_attempts: number
  fresh_theme: boolean
  clear_caches: boolean
  warm_paths: boolean
  expected_theme: string | null
  content_change: boolean
}

type EnqueueOptions = {
  scope?: string
  reason?: string
  priority?: number
  delayMs?: number
  maxAttempts?: number
  freshTheme?: boolean
  clearCaches?: boolean
  warmPaths?: boolean
  expectedTheme?: string | null
  contentChange?: boolean
}

function normalizePath(path: string): string {
  const trimmed = String(path || '').trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

const NEW_POST_REASON_PREFIX = 'new-post:'

export function getNewPostSlugsFromReason(reason?: string | null): string[] {
  if (!reason?.startsWith(NEW_POST_REASON_PREFIX)) return []
  return reason
    .slice(NEW_POST_REASON_PREFIX.length)
    .split(',')
    .map((slug) => {
      try {
        return decodeURIComponent(slug).trim()
      } catch {
        return slug.trim()
      }
    })
    .filter(Boolean)
}

function mergeQueueReason(
  existingReason?: string | null,
  incomingReason?: string | null
): string | null {
  const existingSlugs = getNewPostSlugsFromReason(existingReason)
  const incomingSlugs = getNewPostSlugsFromReason(incomingReason)
  if (existingSlugs.length > 0 && incomingSlugs.length > 0) {
    const merged = Array.from(new Set([...existingSlugs, ...incomingSlugs]))
    return `${NEW_POST_REASON_PREFIX}${merged
      .map((slug) => encodeURIComponent(slug))
      .join(',')}`
  }
  return incomingReason || existingReason || null
}

export function isRevalidateQueueConfigured(): boolean {
  return Boolean(getSupabaseAdmin() && getBlogSiteIdOrNull())
}

export function getDefaultRevalidateQueueDelayMs(): number {
  return DEFAULT_DELAY_MS
}

export async function enqueueRevalidatePaths(
  paths: string[],
  options: EnqueueOptions = {}
): Promise<{
  configured: boolean
  queued: number
  paths: string[]
  scheduledAt: string | null
  drainAfterMs: number
}> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  const uniquePaths = Array.from(new Set(paths.map(normalizePath)))
  const delayMs = Math.max(0, Number(options.delayMs ?? DEFAULT_DELAY_MS) || 0)
  const maxAttempts = Math.min(
    12,
    Math.max(1, Number(options.maxAttempts) || 3)
  )
  const scheduledAt = new Date(Date.now() + delayMs).toISOString()

  if (!sb || !siteId) {
    return {
      configured: false,
      queued: 0,
      paths: uniquePaths,
      scheduledAt: null,
      drainAfterMs: delayMs,
    }
  }

  let queued = 0
  for (const path of uniquePaths) {
    const incoming = {
      scope: options.scope || 'unknown',
      reason: options.reason || options.scope || null,
      priority: Math.max(0, Number(options.priority) || 0),
      scheduled_at: scheduledAt,
      max_attempts: maxAttempts,
      fresh_theme: Boolean(options.freshTheme),
      clear_caches: options.clearCaches !== false,
      // 队列里的普通任务默认不 warm；强一致刷新仍走即时模式。
      warm_paths: Boolean(options.warmPaths),
      expected_theme: options.expectedTheme || null,
      content_change: Boolean(options.contentChange),
      error_message: null,
    }

    const { data: existing, error: existingError } = await sb
      .from(TABLE)
      .select(
        'id, reason, priority, max_attempts, fresh_theme, clear_caches, warm_paths, expected_theme, content_change'
      )
      .eq('site_id', siteId)
      .eq('path', path)
      .eq('status', 'pending')
      .maybeSingle()

    if (existingError) throw existingError

    if (existing) {
      const { error: updateError } = await sb
        .from(TABLE)
        .update({
          ...incoming,
          reason: mergeQueueReason(existing.reason, incoming.reason),
          priority: Math.max(
            Number(existing.priority) || 0,
            incoming.priority
          ),
          max_attempts: Math.max(
            Number(existing.max_attempts) || 3,
            incoming.max_attempts
          ),
          fresh_theme: Boolean(existing.fresh_theme || incoming.fresh_theme),
          clear_caches: Boolean(existing.clear_caches || incoming.clear_caches),
          warm_paths: Boolean(existing.warm_paths || incoming.warm_paths),
          expected_theme: incoming.expected_theme || existing.expected_theme,
          content_change: Boolean(
            existing.content_change || incoming.content_change
          ),
        })
        .eq('id', existing.id)

      if (updateError) throw updateError
      queued += 1
      continue
    }

    const { error: insertError } = await sb.from(TABLE).insert({
      site_id: siteId,
      path,
      status: 'pending',
      ...incoming,
    })

    if (insertError) {
      const duplicate = insertError.code === '23505'
      if (!duplicate) throw insertError
      const { error: retryUpdateError } = await sb
        .from(TABLE)
        .update(incoming)
        .eq('site_id', siteId)
        .eq('path', path)
        .eq('status', 'pending')
      if (retryUpdateError) throw retryUpdateError
    }
    queued += 1
  }

  return {
    configured: true,
    queued,
    paths: uniquePaths,
    scheduledAt,
    drainAfterMs: delayMs,
  }
}

export async function resetStaleRevalidateJobs(): Promise<number> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return 0

  const cutoff = new Date(Date.now() - PROCESSING_STALE_MS).toISOString()
  const { data, error } = await sb
    .from(TABLE)
    .update({
      status: 'pending',
      claimed_at: null,
      error_message: '处理超时，已自动重新排队',
    })
    .eq('site_id', siteId)
    .eq('status', 'processing')
    .lt('claimed_at', cutoff)
    .select('id')

  if (error) throw error
  return data?.length ?? 0
}

export async function claimDueRevalidateJobs(
  limit = 25
): Promise<RevalidateQueueRow[]> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteId()
  const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 50)

  await resetStaleRevalidateJobs()

  const now = new Date().toISOString()
  const { data: rows, error } = await sb!
    .from(TABLE)
    .select(
      'id, site_id, path, scope, reason, status, priority, scheduled_at, attempts, max_attempts, fresh_theme, clear_caches, warm_paths, expected_theme, content_change'
    )
    .eq('site_id', siteId)
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('priority', { ascending: false })
    .order('scheduled_at', { ascending: true })
    .order('updated_at', { ascending: true })
    .limit(safeLimit)

  if (error) throw error
  if (!rows?.length) return []

  const claimedAt = new Date().toISOString()
  const claimed: RevalidateQueueRow[] = []
  for (const row of rows as RevalidateQueueRow[]) {
    const nextAttempts = (row.attempts || 0) + 1
    const { data, error: updateError } = await sb!
      .from(TABLE)
      .update({
        status: 'processing',
        claimed_at: claimedAt,
        attempts: nextAttempts,
        error_message: null,
      })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select(
        'id, site_id, path, scope, reason, status, priority, scheduled_at, attempts, max_attempts, fresh_theme, clear_caches, warm_paths, expected_theme, content_change'
      )
      .maybeSingle()

    if (updateError) throw updateError
    if (data) claimed.push(data as RevalidateQueueRow)
  }

  return claimed
}

export async function markRevalidateJobDone(id: string): Promise<void> {
  const sb = getSupabaseAdmin()
  if (!sb) return
  const now = new Date().toISOString()
  const { error } = await sb
    .from(TABLE)
    .update({
      status: 'done',
      processed_at: now,
      error_message: null,
    })
    .eq('id', id)
  if (error) throw error
}

export async function markRevalidateJobFailed(
  job: RevalidateQueueRow,
  message: string
): Promise<void> {
  const sb = getSupabaseAdmin()
  if (!sb) return
  const exhausted = job.attempts >= job.max_attempts
  const now = new Date().toISOString()
  const { error } = await sb
    .from(TABLE)
    .update({
      status: exhausted ? 'failed' : 'pending',
      scheduled_at: exhausted
        ? job.scheduled_at
        : new Date(Date.now() + 60_000).toISOString(),
      processed_at: exhausted ? now : null,
      claimed_at: null,
      error_message: message.slice(0, 2000),
    })
    .eq('id', job.id)
  if (error) throw error
}

export async function countPendingRevalidateJobs(): Promise<number> {
  const sb = getSupabaseAdmin()
  const siteId = getBlogSiteIdOrNull()
  if (!sb || !siteId) return 0
  const { count, error } = await sb
    .from(TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .eq('status', 'pending')
  if (error) throw error
  return count ?? 0
}
