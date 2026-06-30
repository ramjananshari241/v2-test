(function () {
  try {
    var el = document.getElementById('__NEXT_DATA__')
    if (!el) return
    var pageProps = JSON.parse(el.textContent).props.pageProps || {}
    var theme = String(pageProps.activeTheme || '').toLowerCase()
    if (theme !== 'tweet' && theme !== 'tweet-light') return

    var root = document.documentElement
    root.classList.add('tweet-theme')
    if (theme === 'tweet-light') {
      root.classList.add('tweet-theme--light')
    } else {
      root.classList.add('dark')
    }

    if (document.getElementById('tweet-boot-screen')) return

    var style = document.createElement('style')
    style.id = 'tweet-boot-screen-style'
    style.textContent =
      '#tweet-boot-screen{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#fff}' +
      'html.tweet-theme.dark #tweet-boot-screen,html.dark #tweet-boot-screen{background:#111110}' +
      '#tweet-boot-screen .tweet-boot-screen__letter{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:clamp(7rem,24vw,12rem);font-weight:800;line-height:1;color:#000;animation:tweet-boot-blink 1.6s ease-in-out infinite}' +
      'html.tweet-theme.dark #tweet-boot-screen .tweet-boot-screen__letter,html.dark #tweet-boot-screen .tweet-boot-screen__letter{color:#eee}' +
      '#tweet-boot-screen.tweet-boot-screen--hiding{opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s ease;pointer-events:none}' +
      '@keyframes tweet-boot-blink{0%,100%{opacity:.28;transform:scale(.94)}50%{opacity:1;transform:scale(1)}}'
    document.head.appendChild(style)

    var screen = document.createElement('div')
    screen.id = 'tweet-boot-screen'
    screen.className = 'tweet-boot-screen'
    screen.setAttribute('role', 'status')
    screen.setAttribute('aria-live', 'polite')
    screen.setAttribute('aria-label', '页面加载中')
    screen.innerHTML =
      '<span class="tweet-boot-screen__letter" aria-hidden="true">P</span>'

    document.body.style.overflow = 'hidden'
    document.body.insertBefore(screen, document.body.firstChild)
  } catch (e) {
    /* ignore */
  }
})()
