import CONFIG from '@/blog.config'
import Link from 'next/link'
import {
  AiFillCodeSandboxCircle,
  AiOutlineDownload,
  AiOutlineLink,
  AiOutlineSound,
} from 'react-icons/ai'
import { TweetSectionTitle } from './TweetSectionTitle'

const VENDING_URL = 'https://store.proplus.onl/buy'
const { FREINDS } = CONFIG.DEFAULT_SPECIAL_PAGES

type AnnouncementLike = { title?: string; slug?: string }

type TweetServiceCardProps = {
  announcement?: AnnouncementLike | null
  showSectionTitle?: boolean
  sectionTitleDesktopOnly?: boolean
}

export function TweetServiceCard({
  announcement,
  showSectionTitle = true,
  sectionTitleDesktopOnly = true,
}: TweetServiceCardProps) {
  const announcementTitle = announcement?.title?.trim()

  return (
    <div className="tweet-service">
      {showSectionTitle ? (
        <TweetSectionTitle
          emoji="🌟"
          label="Service"
          desktopOnly={sectionTitleDesktopOnly}
        />
      ) : null}
      <div className="tweet-service__card">
        {announcementTitle ? (
          <Link href="/announcement" className="tweet-service__link">
            <AiOutlineSound className="tweet-service__icon" aria-hidden />
            <span className="tweet-service__name">{announcementTitle}</span>
          </Link>
        ) : null}
        <a
          href={VENDING_URL}
          className="tweet-service__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <AiFillCodeSandboxCircle className="tweet-service__icon" aria-hidden />
          <span className="tweet-service__name">贩售机</span>
        </a>
        <Link href="/download" className="tweet-service__link">
          <AiOutlineDownload className="tweet-service__icon" aria-hidden />
          <span className="tweet-service__name">下载说明</span>
        </Link>
        <Link href={`/${FREINDS}`} className="tweet-service__link">
          <AiOutlineLink className="tweet-service__icon" aria-hidden />
          <span className="tweet-service__name">友链</span>
        </Link>
      </div>
    </div>
  )
}
