/** Standard V1/V2 与 Gallery 列表需预拉 Supabase 图库首图，供封面回退链使用 */
export function shouldLoadGalleryFeedCovers(
  themeId: string | null | undefined
): boolean {
  const t = (themeId || '').trim().toLowerCase()
  return t === 'gallery' || t === 'anzifan' || t === 'touchgal'
}
