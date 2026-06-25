import { SocialLink } from '../childrenDatabase/socialLinksDatabase'
import { BlogStats, Widget } from './../../../../types/blog'

export type ProfileWidgetType = {
  name: string
  description: string
  logo: {
    src: string
    /** 深色主题用封面；无则回退 src */
    darkSrc?: string
    info: {
      placeholder: string
      width: number
      height: number
    }
  }
  links: SocialLink[]
}

export function formatProfileWidget(
  properties: Widget['properties'],
  _blogStats: BlogStats,
  data: {
    SocialLinks: SocialLink[]
  }
): ProfileWidgetType {
  const { title, excerpt, cover } = properties
  const name = title
  const description = excerpt
  const links = data.SocialLinks
  const logo = cover.light
  const darkSrc = cover.dark?.src?.trim()

  return {
    name,
    description,
    logo: {
      ...logo,
      darkSrc: darkSrc || logo.src,
    },
    links,
  }
}
