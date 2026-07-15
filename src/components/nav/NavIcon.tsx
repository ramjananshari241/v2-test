/* eslint-disable @next/next/no-img-element */
import CONFIG from '@/blog.config'
import { colorMap } from '@/src/lib/colors'
import { classNames, isValidUrl } from '@/src/lib/util'
import { ApiColor } from '@/src/types/notion'
import { useEffect, useState } from 'react'

const getLocalIconPath = (icon: string, iconPath: string) => {
  if (!icon) return ''

  const malformedLocalSvgUrl = icon.match(/^https?:\/\/([^/]+\.svg)$/i)
  if (malformedLocalSvgUrl?.[1]) {
    return `${iconPath}/${malformedLocalSvgUrl[1]}`
  }

  if (icon.startsWith('/')) {
    return /^\/[^/]+$/.test(icon) ? `${iconPath}${icon}` : icon
  }

  return `${iconPath}/${icon}`
}

export const NavIcon = ({
  icon,
  alt,
  color,
}: {
  icon: string
  alt: string
  color: string
}) => {
  const { ICON_PATH } = CONFIG
  const [remoteFailed, setRemoteFailed] = useState(false)

  const safeIcon = (icon || '').trim()
  const isMalformedLocalSvgUrl = /^https?:\/\/[^/]+\.svg$/i.test(safeIcon)
  const isUrl = isValidUrl(safeIcon) && !isMalformedLocalSvgUrl
  const shouldUseRemoteImage = isUrl && !remoteFailed
  const iconPath = shouldUseRemoteImage
    ? safeIcon
    : isUrl
    ? ''
    : getLocalIconPath(safeIcon, ICON_PATH)

  useEffect(() => {
    setRemoteFailed(false)
  }, [safeIcon])

  if (!iconPath) return null

  return shouldUseRemoteImage ? (
    <img
      src={iconPath}
      alt={alt}
      className="h-full text-white text-opacity-0 aspect-square dark:text-black dark:text-opacity-0"
      onError={() => setRemoteFailed(true)}
    />
  ) : (
    <span
      aria-label={alt}
      className={classNames(
        colorMap[(color + '_background') as ApiColor],
        'aspect-square h-full text-transparent'
      )}
      style={{
        mask: `url(${iconPath}) no-repeat center`,
        WebkitMask: `url(${iconPath}) no-repeat center`,
      }}
    />
  )
}
