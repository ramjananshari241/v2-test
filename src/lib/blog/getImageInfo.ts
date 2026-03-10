import { getAverageColor } from 'fast-average-color-node'
import { getPlaiceholder } from 'plaiceholder'
import probe from 'probe-image-size'

// 默认的安全占位图（1x1 像素透明 GIF）
const DEFAULT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630

export async function getImageInfo(src: string) {
  try {
    const { placeholder, width, height, type } = await calculatePlaiceholder(src)
    return { width, height, placeholder, type }
  } catch (e) {
    // 🛡️ 最外层兜底：确保这个函数永远不会向上层抛出错误
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, placeholder: DEFAULT_PLACEHOLDER, type: 'jpg' }
  }
}

const calculatePlaiceholder = async (url: string) => {
  // 1. 尝试使用 Plaiceholder (生成高质量模糊预览)
  try {
    const { base64, img } = await getPlaiceholder(url, { size: 16 })
    return {
      placeholder: base64,
      width: img.width,
      height: img.height,
      type: img.type,
    }
  } catch (error) {
    // 2. 如果 Plaiceholder 失败，尝试使用 Probe-image-size (轻量化探测尺寸)
    try {
      const probeData = await probe(url, { timeout: 5000 }) // 设置 5 秒超时防止卡死
      
      // 尝试生成主色调占位符
      let placeholder = DEFAULT_PLACEHOLDER
      try {
        placeholder = await generateColorPlaceholder(url)
      } catch (colorError) {
        // 如果主色调提取也失败，保持使用透明占位符
      }

      return {
        placeholder: placeholder,
        width: probeData.width,
        height: probeData.height,
        type: probeData.type,
      }
    } catch (probeError) {
      // 3. 🛡️ 终极静默逻辑：如果 probe 也报 unrecognized file format (死链)，直接返回默认值
      // 这样 Vercel 的日志里就再也不会出现红色的错误堆栈了
      return {
        placeholder: DEFAULT_PLACEHOLDER,
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        type: 'jpg',
      }
    }
  }
}

async function generateColorPlaceholder(src: string) {
  try {
    const color = await getAverageColor(src)
    const rgb = color.value
    return generateBase64Image(rgb[0], rgb[1], rgb[2])
  } catch (e) {
    return DEFAULT_PLACEHOLDER
  }
}

function generateBase64Image(r: number, g: number, b: number) {
  const keyStr = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  const triplet = (e1: number, e2: number, e3: number) =>
    keyStr.charAt(e1 >> 2) +
    keyStr.charAt(((e1 & 3) << 4) | (e2 >> 4)) +
    keyStr.charAt(((e2 & 15) << 2) | (e3 >> 6)) +
    keyStr.charAt(e3 & 63)

  const rgbDataURL = (r: number, g: number, b: number) =>
    `data:image/gif;base64,R0lGODlhAQABAPAA${
      triplet(0, r, g) + triplet(b, 255, 255)
    }/yH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==`
  return rgbDataURL(r, g, b)
}
