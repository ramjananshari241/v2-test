export const ANNOUNCEMENT_POPUP_WIDGET_SLUG = 'announcement-popup'

export type AnnouncementPopupConfig = {
  id?: string | null
  enabled: boolean
  title: string
  content: string
  image: string
  buttonText: string
  buttonUrl: string
  source?: 'notion' | 'default'
}

export function normalizeAnnouncementPopupText(
  value: string | null | undefined,
  maxLength = 2000
): string {
  return String(value || '').trim().slice(0, maxLength)
}

export function normalizeAnnouncementPopupUrl(
  value: string | null | undefined
): string {
  const url = String(value || '').trim()
  if (!url) return ''
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url
  return ''
}

export function createDefaultAnnouncementPopupConfig(): AnnouncementPopupConfig {
  return {
    id: null,
    enabled: false,
    title: '',
    content: '',
    image: '',
    buttonText: '',
    buttonUrl: '',
    source: 'default',
  }
}
