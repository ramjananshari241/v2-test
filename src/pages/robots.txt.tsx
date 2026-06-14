import { GetServerSideProps } from 'next'
import { resolveServerSiteUrl } from '@/src/lib/seo/lightSeo'

function Robots() {
  return null
}

export const getServerSideProps: GetServerSideProps = async ({ req, res }) => {
  const base = resolveServerSiteUrl(req.headers)

  const lines = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /draft/',
  ]
  if (base) {
    lines.push('', `Sitemap: ${base}/sitemap.xml`)
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    'public, max-age=0, s-maxage=86400, stale-while-revalidate=43200'
  )
  res.write(lines.join('\n') + '\n')
  res.end()

  return { props: {} }
}

export default Robots
