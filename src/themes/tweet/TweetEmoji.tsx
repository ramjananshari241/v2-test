import { ReactNode } from 'react'

type TweetEmojiProps = {
  children: ReactNode
  className?: string
}

/** 彩色 emoji：使用 Noto Color Emoji，对齐 morethan-log 显示风格 */
export function TweetEmoji({ children, className }: TweetEmojiProps) {
  return (
    <span className={`tweet-emoji${className ? ` ${className}` : ''}`}>
      {children}
    </span>
  )
}
