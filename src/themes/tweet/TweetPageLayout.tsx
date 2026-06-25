import { ReactNode } from 'react'
import { tweetShellClass } from './tweetFonts'

type TweetPageLayoutProps = {
  children: ReactNode
}

/** Tweet 主题根节点（背景/字体由 tweet-theme.css + html.tweet-theme 控制） */
export function TweetPageLayout({ children }: TweetPageLayoutProps) {
  return (
    <div className={`tweet-root ${tweetShellClass} min-h-screen min-h-[100dvh]`}>
      {children}
    </div>
  )
}
