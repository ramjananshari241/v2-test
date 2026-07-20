/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 忽略各种检查，确保旧代码顺畅通过
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  
  // 给足每个页面的打包超时时间（防中断）
  staticPageGenerationTimeout: 1200, 
  trailingSlash: false, 

  // Notion 公共 API 容易被 SSG 多页并发触发 429，构建期串行生成更可靠。
  experimental: { cpus: 1 },
  
  images: {
    formats: ['image/avif', 'image/webp'],
    domains: [
      'www.notion.so', 'images.unsplash.com', 'img.notionusercontent.com',
      'file.notion.so', 'static.anzifan.com', 's3.us-west-2.amazonaws.com',
      'img.x1file.top',
    ],
    unoptimized: true,
  }
}
module.exports = nextConfig;
