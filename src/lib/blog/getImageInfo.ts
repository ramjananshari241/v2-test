import probe from 'probe-image-size'

// 默认的安全占位图（1x1 像素透明 GIF）
const DEFAULT_PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 630

const PLACEHOLDER_TIMEOUT_MS = 8000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('image processing timeout')), ms)
    ),
  ])
}

export async function getImageInfo(src: string) {
  try {
    const { placeholder, width, height, type } = await calculatePlaiceholder(src)
    return { width, height, placeholder, type }
  } catch (e) {
    return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT, placeholder: DEFAULT_PLACEHOLDER, type: 'jpg' }
  }
}

const calculatePlaiceholder = async (url: string) => {
  // 开发模式，或显式跳过：避免远程探测拖慢 ISR / 按需生成
  if (
    process.env.NODE_ENV === 'development' ||
    process.env.SKIP_REMOTE_IMAGE_PROBE === '1'
  ) {
    return {
      placeholder: DEFAULT_PLACEHOLDER,
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
      type: 'jpg',
    }
  }

  try {
    const { getPlaiceholder } = await import('plaiceholder')
    const { base64, img } = await withTimeout(
      getPlaiceholder(url, { size: 16 }),
      PLACEHOLDER_TIMEOUT_MS
    )
    return {
      placeholder: base64,
      width: img.width,
      height: img.height,
      type: img.type,
    }
  } catch (error) {
    try {
      const probeData = await probe(url, { timeout: 5000 })

      let placeholder = DEFAULT_PLACEHOLDER
      try {
        placeholder = await generateColorPlaceholder(url)
      } catch {
        // keep default
      }

      return {
        placeholder,
        width: probeData.width,
        height: probeData.height,
        type: probeData.type,
      }
    } catch {
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
    const { getAverageColor } = await import('fast-average-color-node')
    const color = await getAverageColor(src)
    const rgb = color.value
    return generateBase64Image(rgb[0], rgb[1], rgb[2])
  } catch {
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
