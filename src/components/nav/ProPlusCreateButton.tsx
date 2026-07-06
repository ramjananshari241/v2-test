const PROPLUS_SITE_URL = 'https://www.proplus.team/'

type ProPlusCreateButtonProps = {
  compact?: boolean
  className?: string
}

export function ProPlusCreateButton({
  compact = false,
  className = '',
}: ProPlusCreateButtonProps) {
  return (
    <a
      href={PROPLUS_SITE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`proplus-create-btn${compact ? ' proplus-create-btn--compact' : ''}${className ? ` ${className}` : ''}`}
    >
      <span className="proplus-create-btn__icon" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v18" />
          <path d="M5 8h14" />
          <path d="M7 21h10" />
        </svg>
      </span>
      <span className="proplus-create-btn__label">在 PRO+ 上创作</span>
    </a>
  )
}
