/** 首屏关键 CSS：必须在 HTML 解析阶段就生效，避免 blog 内容先闪现 */
export const TWEET_BOOT_PLACEHOLDER_HTML =
  '<div class="tweet-boot-screen__lottie-host" aria-hidden="true"></div>'

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
#tweet-boot-screen .tweet-boot-screen__lottie-host {
  width: clamp(10rem, 42vw, 15rem);
  aspect-ratio: 280 / 200;
  flex-shrink: 0;
}
#tweet-boot-screen .tweet-boot-screen__lottie {
  width: 100%;
  height: 100%;
}
#tweet-boot-screen.tweet-boot-screen--hiding {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.35s ease, visibility 0.35s ease;
}
`.trim()

/** tweet-theme-boot.js 兜底用（与上方样式保持一致） */
export const TWEET_BOOT_INLINE_STYLE =
  'html.tweet-boot-pending body{overflow:hidden}' +
  'html.tweet-boot-pending #__next{visibility:hidden}' +
  '#tweet-boot-screen{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#fff}' +
  'html.tweet-theme.dark #tweet-boot-screen,html.dark #tweet-boot-screen{background:#111110}' +
  '#tweet-boot-screen .tweet-boot-screen__lottie-host{width:clamp(10rem,42vw,15rem);aspect-ratio:280/200;flex-shrink:0}' +
  '#tweet-boot-screen .tweet-boot-screen__lottie{width:100%;height:100%}' +
  '#tweet-boot-screen.tweet-boot-screen--hiding{opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s ease;pointer-events:none}'
