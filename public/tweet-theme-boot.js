(function () {
  try {
    var el = document.getElementById('__NEXT_DATA__')
    if (!el) return
    var pageProps = JSON.parse(el.textContent).props.pageProps || {}
    var theme = String(pageProps.activeTheme || '').toLowerCase()
    if (theme !== 'tweet' && theme !== 'tweet-light' && theme !== 'tweet-dark') return
    if (document.getElementById('tweet-boot-screen')) return

    var root = document.documentElement
    root.classList.add('tweet-theme', 'tweet-boot-pending')
    if (theme === 'tweet-light') {
      root.classList.add('tweet-theme--light')
    } else {
      root.classList.add('dark')
      if (theme === 'tweet-dark') {
        root.classList.add('tweet-theme--dark')
      }
    }

    var bootBg = theme === 'tweet-light' ? '#fff' : theme === 'tweet-dark' ? '#000' : '#111110'

    var style = document.createElement('style')
    style.id = 'tweet-boot-screen-style'
    style.textContent =
      'html.tweet-boot-pending body{overflow:hidden}' +
      'html.tweet-boot-pending #__next{visibility:hidden}' +
      '#tweet-boot-screen{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:#fff}' +
      'html.tweet-theme.dark #tweet-boot-screen,html.dark #tweet-boot-screen{background:' +
      bootBg +
      '}' +
      '#tweet-boot-screen .tweet-boot-screen__lottie-host{width:clamp(10rem,42vw,15rem);aspect-ratio:280/200;flex-shrink:0}' +
      '#tweet-boot-screen .tweet-boot-screen__lottie{width:100%;height:100%}' +
      '#tweet-boot-screen.tweet-boot-screen--hiding{opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s ease;pointer-events:none}'

    document.head.appendChild(style)

    var screen = document.createElement('div')
    screen.id = 'tweet-boot-screen'
    screen.className = 'tweet-boot-screen'
    screen.setAttribute('role', 'status')
    screen.setAttribute('aria-live', 'polite')
    screen.setAttribute('aria-label', '页面加载中')
    screen.innerHTML =
      '<div class="tweet-boot-screen__lottie-host" aria-hidden="true"></div>'

    document.body.insertBefore(screen, document.body.firstChild)
  } catch (e) {
    /* ignore */
  }
})()
