/** Vercel Serverless 请求体硬上限约 4.5MB，留余量走代理 */
const PROXY_SAFE_BYTES = 3.5 * 1024 * 1024

function isLocalDevHost() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]'
}

async function readResponseBody(res) {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    const msg = json.message || json.error || ''
    if (/csrf/i.test(msg)) {
      throw new Error(
        '兰空 CSRF 校验失败。请确认走服务端代理上传，勿在浏览器直传 Bearer Token。'
      )
    }
    return { json, text }
  } catch (e) {
    if (e.message?.includes('CSRF')) throw e
    if (/request entity too large|payload too large|413|FUNCTION_PAYLOAD/i.test(text)) {
      const err = new Error('VERCEL_PAYLOAD_TOO_LARGE')
      err.raw = text
      throw err
    }
    throw new Error(text.slice(0, 200) || `HTTP ${res.status}`)
  }
}

/**
 * Vercel 线上大图：客户端压缩到代理上限以内，再走后端转发兰空
 * （标准兰空 Pro 无临时上传 token 接口，浏览器直传易触发 CSRF）
 */
async function compressImageForUpload(file, maxBytes = PROXY_SAFE_BYTES) {
  if (file.size <= maxBytes) return file

  const mime = file.type || ''
  if (!/^image\//i.test(mime)) {
    throw new Error(
      `文件约 ${(file.size / 1024 / 1024).toFixed(1)}MB，超过线上单张限制（约 3.5MB），请先压缩后再上传`
    )
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('无法读取图片'))
      el.src = objectUrl
    })

    let width = img.naturalWidth
    let height = img.naturalHeight
    let maxDim = 4096

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器无法处理图片压缩')

    let quality = 0.9
    let blob = null

    for (let attempt = 0; attempt < 10; attempt++) {
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      canvas.width = width
      canvas.height = height
      ctx.drawImage(img, 0, 0, width, height)

      blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality)
      })

      if (blob && blob.size <= maxBytes) break

      if (quality > 0.45) {
        quality -= 0.08
      } else {
        width = Math.round(width * 0.82)
        height = Math.round(height * 0.82)
        maxDim = Math.max(width, height)
        quality = 0.82
      }
    }

    if (!blob || blob.size > maxBytes) {
      throw new Error('图片过大，自动压缩后仍超过线上限制，请手动压缩到 3MB 以下')
    }

    const baseName = (file.name || 'image').replace(/\.[^.]+$/, '')
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function uploadViaProxy(file) {
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      'content-type': file.type || 'application/octet-stream',
      'x-file-name': encodeURIComponent(file.name || 'image.png'),
    },
    body: file,
    credentials: 'same-origin',
  })
  const { json } = await readResponseBody(res)
  if (!json.success) throw new Error(json.error || '上传失败')
  return json.url
}

async function prepareFileForUpload(file) {
  if (isLocalDevHost()) return file
  if (file.size <= PROXY_SAFE_BYTES) return file
  return compressImageForUpload(file)
}

/**
 * 智能上传：
 * - 本地：原图走服务端代理（无 Vercel 4.5MB 限制）
 * - 线上大图：先压缩到 ≤3.5MB，再服务端代理（避免 Vercel 413 与兰空 CSRF）
 */
export async function uploadImageToLsky(file) {
  if (!file) throw new Error('未选择文件')

  let prepared = await prepareFileForUpload(file)

  try {
    return await uploadViaProxy(prepared)
  } catch (e) {
    if (e.message === 'VERCEL_PAYLOAD_TOO_LARGE' && !isLocalDevHost()) {
      prepared = await compressImageForUpload(file, Math.floor(PROXY_SAFE_BYTES * 0.75))
      return uploadViaProxy(prepared)
    }
    throw e
  }
}
