/** 首屏关键 CSS：必须在 HTML 解析阶段就生效，避免 blog 内容先闪现 */
export const TWEET_BOOT_BRAND_HTML =
  '<span class="tweet-boot-screen__brand" aria-hidden="true">' +
  '<span class="tweet-boot-screen__word">PRO</span>' +
  '<span class="tweet-boot-screen__plus">+</span>' +
  '</span>'

export const TWEET_BOOT_CRITICAL_CSS = `
html.tweet-boot-pending body {
  overflow: hidden;
}
html.tweet-boot-pending #__next {
  visibility: hidden;
}
#tweet-boot-screen {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ffffff;
}
html.tweet-theme.dark #tweet-boot-screen,
html.dark #tweet-boot-screen {
  background-color: #111110;
}
#tweet-boot-screen .tweet-boot-screen__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.38em;
  color: #000000;
  animation: tweet-boot-blink 1.6s ease-in-out infinite;
  user-select: none;
}
#tweet-boot-screen .tweet-boot-screen__word {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(2.75rem, 10vw, 5.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
}
#tweet-boot-screen .tweet-boot-screen__plus {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(1.5rem, 5.2vw, 2.85rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0;
  transform: translateY(-0.06em);
}
html.tweet-theme.dark #tweet-boot-screen .tweet-boot-screen__brand,
html.dark #tweet-boot-screen .tweet-boot-screen__brand {
  color: #eeeeee;
}
#tweet-boot-screen.tweet-boot-screen--hiding {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.35s ease, visibility 0.35s ease;
}
@keyframes tweet-boot-blink {
  0%, 100% { opacity: 0.28; transform: scale(0.94); }
  50% { opacity: 1; transform: scale(1); }
}
`.trim()

/** tweet-theme-boot.js 兜底用（与上方样式保持一致） */
export const TWEET_BOOT_INLINE_STYLE =
  'html.tweet-boot-pending body{overflow:hidden}' +
  'html.tweet-boot-pending #__next{visibility:hidden}' +
  '#tweet-boot-screen{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#fff}' +
  'html.tweet-theme.dark #tweet-boot-screen,html.dark #tweet-boot-screen{background:#111110}' +
  '#tweet-boot-screen .tweet-boot-screen__brand{display:inline-flex;align-items:center;gap:.38em;color:#000;animation:tweet-boot-blink 1.6s ease-in-out infinite;user-select:none}' +
  '#tweet-boot-screen .tweet-boot-screen__word{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:clamp(2.75rem,10vw,5.5rem);font-weight:800;line-height:1;letter-spacing:-.04em}' +
  '#tweet-boot-screen .tweet-boot-screen__plus{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:clamp(1.5rem,5.2vw,2.85rem);font-weight:700;line-height:1;transform:translateY(-.06em)}' +
  'html.tweet-theme.dark #tweet-boot-screen .tweet-boot-screen__brand,html.dark #tweet-boot-screen .tweet-boot-screen__brand{color:#eee}' +
  '#tweet-boot-screen.tweet-boot-screen--hiding{opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s ease;pointer-events:none}' +
  '@keyframes tweet-boot-blink{0%,100%{opacity:.28;transform:scale(.94)}50%{opacity:1;transform:scale(1)}}'
