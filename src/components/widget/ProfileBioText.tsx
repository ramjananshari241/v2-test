import React from 'react'
import { linkifyPlainText } from '@/src/lib/text/linkifyPlainText'

type ProfileBioTextProps = {
  text: string
  className?: string
  linkClassName?: string
  as?: 'p' | 'span' | 'div'
}

/** 网站信息组件摘要：自动将 excerpt 中的 URL 渲染为可点击链接 */
export function ProfileBioText({
  text,
  className,
  linkClassName = 'profile-bio-link',
  as: Tag = 'p',
}: ProfileBioTextProps) {
  const trimmed = text?.trim()
  if (!trimmed) return null

  const segments = linkifyPlainText(trimmed)

  return (
    <Tag className={className}>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <a
            key={i}
            href={seg.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(e) => e.stopPropagation()}
          >
            {seg.value}
          </a>
        ) : (
          <React.Fragment key={i}>{seg.value}</React.Fragment>
        )
      )}
    </Tag>
  )
}
