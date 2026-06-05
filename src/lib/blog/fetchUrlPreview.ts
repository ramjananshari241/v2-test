import { unfurl } from 'unfurl.js'

export type UrlPreview = {
  title: string
  description: string
  image: string | null
  favicon: string | null
  url: string
}

export async function fetchUrlPreview(url: string): Promise<UrlPreview> {
  const fallback: UrlPreview = {
    title: '',
    description: '',
    image: null,
    favicon: null,
    url,
  }

  try {
    const result = await unfurl(url, {
      headers: {
        Accept:
          'application/json, text/plain, text/html, application/xhtml+xml, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'facebookexternalhit',
      },
    })
    const { title, description, favicon, oEmbed, open_graph, twitter_card } =
      result
    const oEmbedThumbnail = oEmbed?.thumbnails?.[0]
    const oEmbedTitle = oEmbed?.title

    const openGraphDescription = open_graph?.description
    const openGraphTitle = open_graph?.title
    const openGraphImage = open_graph?.images?.[0]

    const twitterCardDescription = twitter_card?.description
    const twitterCardTitle = twitter_card?.title
    const twitterCardImage = twitter_card?.images?.[0]

    const imageCandidate =
      oEmbedThumbnail ?? openGraphImage ?? twitterCardImage ?? null
    const image =
      typeof imageCandidate === 'string'
        ? imageCandidate
        : imageCandidate?.url ?? null

    return {
      title: title ?? oEmbedTitle ?? openGraphTitle ?? twitterCardTitle ?? '',
      description:
        description ?? openGraphDescription ?? twitterCardDescription ?? '',
      favicon: favicon ?? null,
      image,
      url,
    }
  } catch {
    return fallback
  }
}
