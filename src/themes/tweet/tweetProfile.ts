import { ProfileWidgetType } from '@/src/lib/blog/format/widget/profile'
import { Title } from '@/src/types/blog'
import { normalizeMediaUrl } from '@/src/lib/notion/readProperty'

export function buildTweetProfileData(
  profile?: ProfileWidgetType | null,
  siteTitle?: Title
): ProfileWidgetType | null {
  if (profile?.name || profile?.logo?.src) {
    return profile
  }
  const name = siteTitle?.text?.trim()
  if (!name) return null
  return {
    name,
    description: '',
    logo: { src: '', info: { placeholder: '', width: 0, height: 0 } },
    links: [],
  }
}

export function tweetAvatarSrc(profile?: ProfileWidgetType | null): string {
  const raw = profile?.logo?.src?.trim()
  if (!raw) return ''
  return normalizeMediaUrl(raw) || raw
}
