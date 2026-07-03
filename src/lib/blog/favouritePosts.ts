/** 后台分类栏「已收藏」虚拟文件夹 key（非 Notion 分类名） */
export const ADMIN_FAVOURITES_FOLDER = '__favourited__'

const FAVOURITE_PROPERTY_KEYS = [
  'favourited',
  'Favourited',
  'favourite',
  'Favourite',
  'favorite',
  'Favorite',
  'favourate',
  'Favourate',
  '收藏',
]

export function readFavouritedFromNotionProperties(
  properties: Record<string, { type?: string; checkbox?: boolean }>
): boolean {
  for (const key of FAVOURITE_PROPERTY_KEYS) {
    const prop = properties[key]
    if (!prop) continue
    if (prop.type === 'checkbox') return !!prop.checkbox
  }
  return false
}

export function getFavouritePropertyKey(
  targetProps: Record<string, { type?: string }>
): string | null {
  for (const key of FAVOURITE_PROPERTY_KEYS) {
    if (targetProps[key]?.type === 'checkbox') return key
  }
  return null
}
