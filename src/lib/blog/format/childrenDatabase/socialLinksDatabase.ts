import { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

export type SocialPlatform =
  | 'weibo'
  | 'twitter'
  | 'pixiv'
  | 'telegram'
  | 'instagram'

export type SocialLink = {
  id: string
  platform: SocialPlatform | string
  url: string
  status: string
  name: string
  /** @deprecated old anzifan schema */
  link?: string
  /** @deprecated old anzifan schema */
  color_1: string
  /** @deprecated old anzifan schema */
  color_2: string
  /** @deprecated old anzifan schema */
  icon: string
}

const PLATFORM_ALIASES: Record<string, SocialPlatform> = {
  weibo: 'weibo',
  微博: 'weibo',
  twitter: 'twitter',
  x: 'twitter',
  推特: 'twitter',
  pixiv: 'pixiv',
  p站: 'pixiv',
  telegram: 'telegram',
  tg: 'telegram',
  instagram: 'instagram',
  ins: 'instagram',
}

function readText(prop: PageObjectResponse['properties'][string] | undefined) {
  if (!prop) return ''
  if (prop.type === 'title') return prop.title.map((t) => t.plain_text).join('').trim()
  if (prop.type === 'rich_text') return prop.rich_text.map((t) => t.plain_text).join('').trim()
  if (prop.type === 'url') return prop.url || ''
  if (prop.type === 'select') return prop.select?.name || ''
  if (prop.type === 'status') return prop.status?.name || ''
  return ''
}

function pickProp(
  props: PageObjectResponse['properties'],
  names: string[]
) {
  for (const name of names) {
    if (props[name]) return props[name]
  }
  return undefined
}

function normalizePlatform(platform: string): SocialPlatform | string {
  const key = platform.trim().toLowerCase()
  return PLATFORM_ALIASES[key] || PLATFORM_ALIASES[platform.trim()] || key
}

export const formatSocialLinksDatabase = (
  socialLinkDatabase: PageObjectResponse[]
): SocialLink[] => {
  const socialLinks: SocialLink[] = socialLinkDatabase.map((socialLink) => {
    const { properties } = socialLink
    const nameText = readText(pickProp(properties, ['name', 'Name', 'title', 'Title', 'id']))
    const platformText = readText(pickProp(properties, ['platform', 'Platform', '平台']))
    const urlText = readText(pickProp(properties, ['url', 'URL', 'link', 'Link', '链接']))
    const statusText = readText(pickProp(properties, ['status', 'Status', '状态'])) || 'Published'
    const color1Text = readText(pickProp(properties, ['color_1', 'color1', 'Color 1']))
    const color2Text = readText(pickProp(properties, ['color_2', 'color2', 'Color 2']))
    const iconText = readText(pickProp(properties, ['icon', 'Icon', '图标']))
    const platform = normalizePlatform(platformText || nameText || iconText)

    return {
      id: socialLink.id,
      name: nameText,
      platform,
      status: statusText,
      url: urlText,
      link: urlText,
      icon: iconText,
      color_1: color1Text,
      color_2: color2Text,
    }
  })

  return socialLinks
}
