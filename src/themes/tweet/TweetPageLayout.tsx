import { ReactNode } from 'react'

type TweetPageLayoutProps = {
  children: ReactNode
}

/** Tweet 页面外层：浅色/深色背景铺满视口 */
export function TweetPageLayout({ children }: TweetPageLayoutProps) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-neutral-50 text-neutral-900 dark:bg-[#111111] dark:text-neutral-100">
      {children}
    </div>
  )
}
