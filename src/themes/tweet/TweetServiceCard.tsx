import { AiFillCodeSandboxCircle } from 'react-icons/ai'
import { TweetSectionTitle } from './TweetSectionTitle'

const VENDING_URL = 'https://store.proplus.onl/buy'

export function TweetServiceCard() {
  return (
    <div className="tweet-service">
      <TweetSectionTitle emoji="🌟" label="Service" desktopOnly />
      <div className="tweet-service__card">
        <a
          href={VENDING_URL}
          className="tweet-service__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <AiFillCodeSandboxCircle className="tweet-service__icon" aria-hidden />
          <span className="tweet-service__name">贩售机</span>
        </a>
      </div>
    </div>
  )
}
