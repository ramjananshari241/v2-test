import { BlogStats, Widget } from '@/src/types/blog'
import {
  VendingConfig,
  normalizeVendingTitle,
  normalizeVendingUrl,
} from '@/src/lib/blog/vendingDefaults'

export function formatVendingWidget(
  properties: Widget['properties'],
  _blogStats?: BlogStats
): VendingConfig {
  return {
    enabled: true,
    url: normalizeVendingUrl(properties.excerpt),
    title: normalizeVendingTitle(properties.title),
    source: 'notion',
  }
}
