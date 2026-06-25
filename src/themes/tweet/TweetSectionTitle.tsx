type TweetSectionTitleProps = {
  emoji: string
  label: string
  desktopOnly?: boolean
}

export function TweetSectionTitle({
  emoji,
  label,
  desktopOnly = false,
}: TweetSectionTitleProps) {
  return (
    <div
      className={`tweet-section__title${
        desktopOnly ? ' tweet-section__title--desktop-only' : ''
      }`}
    >
      {emoji} {label}
    </div>
  )
}
