import { useEffect, useMemo, useState } from 'react'
import type { AnnouncementPopupConfig } from '@/src/lib/blog/announcementPopupDefaults'
import { isTweetTheme } from '@/src/themes/tweet/tweetTheme'

type Props = {
  config?: AnnouncementPopupConfig | null
  activeTheme?: string
}

function buildPopupKey(config: AnnouncementPopupConfig) {
  return [
    config.title,
    config.content,
    config.image,
    config.buttonText,
    config.buttonUrl,
  ]
    .join('|')
    .slice(0, 500)
}

function resolveThemeClass(activeTheme?: string) {
  if (activeTheme === 'gallery') return 'announcement-popup--gallery'
  if (activeTheme === 'tweet-light') return 'announcement-popup--tweet-light'
  if (activeTheme === 'tweet-dark') return 'announcement-popup--tweet-dark'
  if (isTweetTheme(activeTheme)) return 'announcement-popup--tweet'
  return 'announcement-popup--standard'
}

export function AnnouncementPopup({ config, activeTheme }: Props) {
  const hasContent = Boolean(
    config?.enabled &&
      ((config.title || '').trim() ||
        (config.content || '').trim() ||
        (config.image || '').trim())
  )
  const popupKey = useMemo(
    () => (config && hasContent ? buildPopupKey(config) : ''),
    [config, hasContent]
  )
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!config || !hasContent || !popupKey) {
      setVisible(false)
      return
    }
    try {
      const storageKey = `announcement-popup:${popupKey}`
      setVisible(sessionStorage.getItem(storageKey) !== 'closed')
    } catch {
      setVisible(true)
    }
  }, [config, hasContent, popupKey])

  if (!config || !hasContent || !visible) return null

  const close = () => {
    setVisible(false)
    try {
      sessionStorage.setItem(`announcement-popup:${popupKey}`, 'closed')
    } catch {
      // Ignore storage failures in private browsing modes.
    }
  }
  const themeClass = resolveThemeClass(activeTheme)
  const hasButton = Boolean(config.buttonText?.trim() && config.buttonUrl?.trim())

  return (
    <div className={`announcement-popup ${themeClass}`} role="dialog" aria-modal="true">
      <div className="announcement-popup__backdrop" onClick={close} />
      <section className="announcement-popup__panel" aria-label={config.title || '公告'}>
        <button
          className="announcement-popup__close"
          type="button"
          aria-label="关闭公告"
          onClick={close}
        >
          ×
        </button>
        {config.image ? (
          <div className="announcement-popup__media">
            <img src={config.image} alt="" />
          </div>
        ) : null}
        <div className="announcement-popup__body">
          {config.title ? (
            <h2 className="announcement-popup__title">{config.title}</h2>
          ) : null}
          {config.content ? (
            <p className="announcement-popup__content">{config.content}</p>
          ) : null}
          {hasButton ? (
            <a className="announcement-popup__button" href={config.buttonUrl} onClick={close}>
              {config.buttonText}
            </a>
          ) : null}
        </div>
      </section>
      <style jsx global>{`
        .announcement-popup {
          --ap-bg: rgba(255, 255, 255, 0.96);
          --ap-text: #111827;
          --ap-muted: #4b5563;
          --ap-border: rgba(17, 24, 39, 0.12);
          --ap-shadow: 0 24px 80px rgba(15, 23, 42, 0.28);
          --ap-button-bg: #111827;
          --ap-button-text: #ffffff;
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          pointer-events: none;
        }
        .announcement-popup--gallery {
          --ap-bg: rgba(20, 20, 22, 0.94);
          --ap-text: #f8fafc;
          --ap-muted: #cbd5e1;
          --ap-border: rgba(255, 255, 255, 0.12);
          --ap-button-bg: #f8fafc;
          --ap-button-text: #111827;
        }
        .announcement-popup--tweet {
          --ap-bg: rgba(33, 35, 39, 0.96);
          --ap-text: #f5f7fb;
          --ap-muted: #d7dde8;
          --ap-border: rgba(255, 255, 255, 0.14);
          --ap-button-bg: #a6ff3f;
          --ap-button-text: #101214;
        }
        .announcement-popup--tweet-light {
          --ap-bg: rgba(255, 255, 255, 0.98);
          --ap-text: #0f172a;
          --ap-muted: #475569;
          --ap-border: rgba(15, 23, 42, 0.13);
          --ap-button-bg: #0f1419;
          --ap-button-text: #ffffff;
        }
        .announcement-popup--tweet-dark {
          --ap-bg: rgba(10, 12, 15, 0.96);
          --ap-text: #f8fafc;
          --ap-muted: #cbd5e1;
          --ap-border: rgba(255, 255, 255, 0.12);
          --ap-button-bg: #f8fafc;
          --ap-button-text: #0a0c0f;
        }
        .announcement-popup__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(15, 23, 42, 0.36);
          pointer-events: auto;
        }
        .announcement-popup__panel {
          position: relative;
          width: min(440px, 100%);
          max-height: min(720px, calc(100vh - 40px));
          overflow: hidden;
          border: 1px solid var(--ap-border);
          border-radius: 22px;
          background: var(--ap-bg);
          color: var(--ap-text);
          box-shadow: var(--ap-shadow);
          pointer-events: auto;
          backdrop-filter: blur(18px);
          animation: announcement-popup-rise 180ms ease-out;
        }
        .announcement-popup__close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 2;
          width: 34px;
          height: 34px;
          border: 1px solid var(--ap-border);
          border-radius: 50%;
          background: var(--ap-bg);
          color: var(--ap-text);
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }
        .announcement-popup__media {
          width: 100%;
          aspect-ratio: 16 / 8.5;
          background: rgba(148, 163, 184, 0.16);
        }
        .announcement-popup__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .announcement-popup__body {
          padding: 26px;
        }
        .announcement-popup__title {
          margin: 0;
          color: var(--ap-text);
          font-size: 24px;
          line-height: 1.24;
          letter-spacing: 0;
          font-weight: 800;
        }
        .announcement-popup__content {
          margin: 12px 0 0;
          color: var(--ap-muted);
          font-size: 15px;
          line-height: 1.75;
          white-space: pre-wrap;
        }
        .announcement-popup__button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          max-width: 100%;
          margin-top: 20px;
          padding: 0 18px;
          border-radius: 999px;
          background: var(--ap-button-bg);
          color: var(--ap-button-text);
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
          overflow-wrap: anywhere;
        }
        @keyframes announcement-popup-rise {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 520px) {
          .announcement-popup {
            align-items: flex-end;
            padding: 12px;
          }
          .announcement-popup__panel {
            border-radius: 20px;
          }
          .announcement-popup__body {
            padding: 22px;
          }
          .announcement-popup__title {
            font-size: 21px;
          }
        }
      `}</style>
    </div>
  )
}
