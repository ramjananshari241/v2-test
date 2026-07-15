/* eslint-disable @next/next/no-img-element */
import CONFIG from '@/blog.config'
import { colorMap } from '@/src/lib/colors'
import { classNames, isValidUrl } from '@/src/lib/util'
import { ApiColor } from '@/src/types/notion'
import { useEffect, useState } from 'react'

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
  const isUrl = isValidUrl(safeIcon)
  const shouldUseRemoteImage = isUrl && !remoteFailed
  const fallbackIconPath = `${ICON_PATH}/default.svg`
  const iconPath = shouldUseRemoteImage
    ? safeIcon
    : isUrl
    ? fallbackIconPath
    : safeIcon
    ? safeIcon.startsWith('/')
      ? /^\/[^/]+$/.test(safeIcon)
        ? `${ICON_PATH}${safeIcon}`
        : safeIcon
      : `${ICON_PATH}/${safeIcon}`
    : fallbackIconPath

  useEffect(() => {
    setRemoteFailed(false)
  }, [safeIcon])

  return (
    <>
      {iconPath &&
        (shouldUseRemoteImage ? (
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
        ))}
    </>
  )
}
