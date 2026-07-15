import type {
  SocialLink,
  SocialPlatform,
} from '@/src/lib/blog/format/childrenDatabase/socialLinksDatabase'
import { classNames } from '@/src/lib/util'
import type { IconType } from 'react-icons/lib'
import {
  FaInstagram,
  FaTelegramPlane,
  FaTwitter,
  FaWeibo,
} from 'react-icons/fa'
import { SiPixiv } from 'react-icons/si'

type SocialLinksVariant = 'standard' | 'gallery' | 'tweet'

type SocialLinkMeta = {
  platform: SocialPlatform
  label: string
  color: string
  Icon: IconType
}

const SOCIAL_PLATFORMS: SocialLinkMeta[] = [
  { platform: 'weibo', label: 'Weibo', color: '#e6162d', Icon: FaWeibo },
  { platform: 'twitter', label: 'Twitter', color: '#1d9bf0', Icon: FaTwitter },
  { platform: 'pixiv', label: 'Pixiv', color: '#0096fa', Icon: SiPixiv },
  {
    platform: 'telegram',
    label: 'Telegram',
    color: '#229ed9',
    Icon: FaTelegramPlane,
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    color: '#e4405f',
    Icon: FaInstagram,
  },
]

function normalizePlatform(platform?: string): string {
  const value = (platform || '').trim().toLowerCase()
  if (value === 'x') return 'twitter'
  if (value === 'tg') return 'telegram'
  if (value === 'ins') return 'instagram'
  return value
}

function normalizeStatus(status?: string): string {
  return (status || 'Published').trim().toLowerCase()
}

function getLinkForPlatform(
  links: SocialLink[] | null | undefined,
  platform: string
) {
  return (links || []).find(
    (link) => normalizePlatform(link.platform) === platform
  )
}

export function SocialLinks({
  links,
  variant = 'standard',
  className,
}: {
  links?: SocialLink[] | null
  variant?: SocialLinksVariant
  className?: string
}) {
  if (!Array.isArray(links)) return null

  return (
    <div
      className={classNames(
        'social-links',
        `social-links--${variant}`,
        className || ''
      )}
      aria-label="Social media"
    >
      {SOCIAL_PLATFORMS.map(({ platform, label, color, Icon }) => {
        const item = getLinkForPlatform(links, platform)
        const url = (item?.url || item?.link || '').trim()
        const active =
          Boolean(url) && normalizeStatus(item?.status) === 'published'
        const content = (
          <span
            className={classNames(
              'social-links__icon',
              active
                ? 'social-links__icon--active'
                : 'social-links__icon--inactive'
            )}
            style={variant === 'standard' && active ? { color } : undefined}
          >
            <Icon aria-hidden />
          </span>
        )

        if (!active) {
          return (
            <span
              key={platform}
              className="social-links__item social-links__item--disabled"
              title={`${label} not configured`}
              aria-label={`${label} not configured`}
            >
              {content}
            </span>
          )
        }

        return (
          <a
            key={platform}
            className="social-links__item social-links__item--active"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title={label}
            aria-label={label}
          >
            {content}
          </a>
        )
      })}
    </div>
  )
}

export type { SocialLink }
