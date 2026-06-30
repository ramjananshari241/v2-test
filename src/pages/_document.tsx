import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        {/* 标签图标由 _app 按 activeTheme 切换；此处不再写死 favicon，避免覆盖 Gallery 主题图标 */}
      </Head>
      <body>
        <Main />
        <NextScript />
        {/* 在 __NEXT_DATA__ 之后立刻根据 activeTheme 设置 Gallery 图标与 cookie */}
        <script src="/gallery-theme-boot.js" />
        <script src="/tweet-theme-boot.js" />
      </body>
    </Html>
  )
}
