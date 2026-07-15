import { SocialLink } from '../childrenDatabase/socialLinksDatabase'
import { BlogStats, Widget } from './../../../../types/blog'

export type SocialLinksWidgetType = {
  enabled: boolean
  links: SocialLink[]
}

export function formatSocialLinksWidget(
  properties: Widget['properties'],
  _blogStats: BlogStats,
  data: {
    SocialLinks?: SocialLink[]
    'Social Links'?: SocialLink[]
    'social-links'?: SocialLink[]
    '社交媒体'?: SocialLink[]
  }
): SocialLinksWidgetType {
  const links =
    data.SocialLinks ||
    data['Social Links'] ||
    data['social-links'] ||
    data['社交媒体'] ||
    []

  return {
    enabled: properties.slug === 'social-links',
    links,
  }
}
