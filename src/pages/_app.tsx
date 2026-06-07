import type { AppProps, NextWebVitalsMetric } from 'next/app'
import '../styles/globals.css'

import CONFIG from '@/blog.config'
import BlogLayout from '@/src/components/layout/BlogLayout'
import { Analytics } from '@vercel/analytics/react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import { event, GoogleAnalytics } from 'nextjs-google-analytics'
import NextNprogress from 'nextjs-progressbar'
import Script from 'next/script' // 1. 引入 Next.js 脚本组件
import { useEffect } from 'react'
import {
  AdminFaviconLinks,
  GalleryFaviconLinks,
} from '@/src/themes/gallery/GalleryFaviconLinks'
import { ThemeSyncGuard } from '@/src/components/theme/ThemeSyncGuard'
import { NextPageWithLayout } from '../types/blog'

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout
}

function BlogApp({ Component, pageProps, router }: AppPropsWithLayout) {
  console.log(pageProps,"-----------pageProps----------")
  const activeTheme = (pageProps as { activeTheme?: string })?.activeTheme
  const isAdminRoute =
    router.pathname === '/admin' || router.pathname.startsWith('/admin/')
  const getLayout =
    Component.getLayout ?? ((page) => <BlogLayout>{page}</BlogLayout>)

  useEffect(() => {
    AOS.init({
      easing: 'ease-out-cubic',
      once: true,
      offset: 50,
      duration: 500,
    })
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (activeTheme === 'gallery' && !isAdminRoute) {
      root.classList.add('gallery-theme')
    } else {
      root.classList.remove('gallery-theme')
    }
    return () => root.classList.remove('gallery-theme')
  }, [activeTheme, isAdminRoute])

  return (
    <>
      {/* 2. 替换 Jivo 为 Chatwoot 增强版逻辑 */}
      <Script id="chatwoot-setup" strategy="afterInteractive">
        {`
          (function(d,t) {
            var BASE_URL = "https://chat.pro-pl.us";
            var g = d.createElement(t), s = d.getElementsByTagName(t)[0];
            g.src = BASE_URL + "/packs/js/sdk.js";
            g.defer = true;
            g.async = true;
            s.parentNode.insertBefore(g, s);

            window.chatwootSettings = {
              position: 'right',
              type: 'standard',
              launcherTitle: '',
              darkMode: 'light',
              // 监听消息：实现丝滑提醒逻辑
              onMessage: function(message) {
                if (message.message_type === 1) {
                  // A. 播放声音
                  var audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3");
                  audio.play().catch(function(e) { console.log("等待交互后开启声音") });

                  // B. 手机震动
                  if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);

                  // C. 窗口抖动
                  var container = d.getElementById('chatwoot-widget-container');
                  if (container) {
                    container.style.transition = "transform 0.1s";
                    var count = 0;
                    var interval = setInterval(function() {
                      container.style.transform = (count % 2) ? "translateX(-15px)" : "translateX(15px)";
                      if (++count > 12) {
                        clearInterval(interval);
                        container.style.transform = "translateX(0)";
                      }
                    }, 80);
                  }

                  // D. 标题闪烁
                  var oldTitle = d.title;
                  var blink = true;
                  var timer = setInterval(function() {
                    d.title = blink ? "【新回复】" + oldTitle : oldTitle;
                    blink = !blink;
                  }, 1000);
                  d.addEventListener('click', function() { clearInterval(timer); d.title = oldTitle; }, { once: true });
                }
              }
            };

            function patchChatwootLauncher() {
              var textEl = d.getElementById('woot-widget--expanded__text');
              if (textEl) textEl.textContent = '';
              var bubble = d.querySelector('.woot-widget-bubble');
              if (bubble) {
                bubble.setAttribute('aria-label', '在线客服');
                bubble.setAttribute('title', '在线客服');
              }
            }
            function watchChatwootLauncherText() {
              var textEl = d.getElementById('woot-widget--expanded__text');
              if (!textEl || textEl.__cwPatched) return;
              textEl.__cwPatched = true;
              patchChatwootLauncher();
              new MutationObserver(patchChatwootLauncher).observe(textEl, {
                characterData: true,
                childList: true,
                subtree: true
              });
            }
            function forceChatwootLightPanel() {
              if (window.$chatwoot && window.$chatwoot.setColorScheme) {
                window.$chatwoot.setColorScheme('light');
              }
            }
            window.addEventListener('chatwoot:ready', function() {
              patchChatwootLauncher();
              watchChatwootLauncherText();
              forceChatwootLightPanel();
            });

            g.onload = function() {
              window.chatwootSDK.run({
                websiteToken: 'SGwpXTTn9T7jhVsvudTEy1tV',
                baseUrl: BASE_URL
              });
              [400, 1200, 2500, 5000].forEach(function(ms) {
                setTimeout(function() {
                  patchChatwootLauncher();
                  watchChatwootLauncherText();
                  forceChatwootLightPanel();
                }, ms);
              });
            }
          })(document,"script");
        `}
      </Script>

     <ThemeProvider attribute="class">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <title>{pageProps?.siteTitle?.text}</title>
        <meta name="description" content="PRO+" />
        {isAdminRoute ? (
          <AdminFaviconLinks />
        ) : (
          <GalleryFaviconLinks activeTheme={activeTheme} />
        )}
        {!isAdminRoute && activeTheme !== 'gallery' ? (
          <link rel="manifest" href="/site.webmanifest" />
        ) : null}
      </Head>
      <NextNprogress
        color={CONFIG.PROGRESS_BAR_COLOR}
        options={{ showSpinner: false }}
      />
      <GoogleAnalytics trackPageViews />
      <ThemeSyncGuard activeTheme={activeTheme} isAdminRoute={isAdminRoute} />
      {getLayout(<Component {...pageProps} />)}
      <Analytics />
    </ThemeProvider>
    </>
  )
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  const { id, name, label, value } = metric
  event(name, {
    category: label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    label: id,
    nonInteraction: true,
  })
}

export default BlogApp
