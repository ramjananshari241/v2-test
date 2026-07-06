import { isValidUrl } from '@/src/lib/util'

export type LinkifySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string }

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi
const TRAILING_PUNCT = /[.,;:!?)}\]"']+$/

/** 将纯文本中的 http(s) / www. 链接拆分为可渲染片段 */
export function linkifyPlainText(text: string): LinkifySegment[] {
  if (!text) return []

  const segments: LinkifySegment[] = []
  let lastIndex = 0
  const re = new RegExp(URL_PATTERN.source, URL_PATTERN.flags)
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    const raw = match[0]
    const start = match.index

    if (start > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, start) })
    }

    const url = raw.replace(TRAILING_PUNCT, '')
    const punctSuffix = raw.slice(url.length)
    const href = url.startsWith('www.') ? `https://${url}` : url

    if (isValidUrl(href)) {
      segments.push({ type: 'link', value: url, href })
      if (punctSuffix) segments.push({ type: 'text', value: punctSuffix })
    } else {
      segments.push({ type: 'text', value: raw })
    }

    lastIndex = start + raw.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}
