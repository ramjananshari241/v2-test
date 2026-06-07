import type { NextApiRequest, NextApiResponse } from 'next'
import { getSiteThemeCode } from '@/src/lib/blog/siteTheme'
import { getRemoteTheme } from '@/src/lib/notion/getBlogData'
import { resolveThemeId } from '@/src/themes/registry'
import { ThemeId } from '@/src/themes/types'

type ActiveThemeResponse = {
  themeId: ThemeId
  code: string | null
  source: 'supabase' | 'notion' | 'default'
}

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse<ActiveThemeResponse>
) {
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')

  const fromDb = await getSiteThemeCode()
  if (fromDb) {
    return res.status(200).json({
      themeId: resolveThemeId(fromDb),
      code: fromDb,
      source: 'supabase',
    })
  }

  const fromNotion = await getRemoteTheme()
  if (fromNotion) {
    return res.status(200).json({
      themeId: resolveThemeId(fromNotion),
      code: fromNotion,
      source: 'notion',
    })
  }

  return res.status(200).json({
    themeId: 'anzifan',
    code: null,
    source: 'default',
  })
}
