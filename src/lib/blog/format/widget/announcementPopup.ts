import { BlogStats, Widget } from '@/src/types/blog'
import {
  AnnouncementPopupConfig,
  normalizeAnnouncementPopupText,
} from '@/src/lib/blog/announcementPopupDefaults'

export function formatAnnouncementPopupWidget(
  properties: Widget['properties'],
  _blogStats?: BlogStats
): AnnouncementPopupConfig {
  return {
    enabled: true,
    title: normalizeAnnouncementPopupText(properties.title, 120),
    content: normalizeAnnouncementPopupText(properties.excerpt),
    image: properties.cover?.light?.src || '',
    buttonText: '',
    buttonUrl: '',
    source: 'notion',
  }
}
