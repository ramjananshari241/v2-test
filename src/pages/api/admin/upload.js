// ============================================================
// 兰空图床 (Lsky Pro 2.x) 中转上传代理
// ------------------------------------------------------------
// 安全模型：浏览器永远拿不到 LSKY_TOKEN。
// 浏览器 → 本接口(服务端) → 兰空 /api/v1/upload → 返回图片URL
//
// 零新增依赖：利用 Node 18+ 原生的 fetch / FormData / Blob，
// 关闭 Next 默认 bodyParser，直接读取原始二进制流后再转发。
// ============================================================

// 关闭 Next 自带的 body 解析，改为手动读取原始二进制流
export const config = {
  api: {
    bodyParser: false,
  },
}

// 单文件大小上限（字节）。可按需调整。
const MAX_SIZE = 20 * 1024 * 1024 // 20MB

// 兰空实例地址：优先读环境变量，未配置则回退到默认域名
const LSKY_BASE = (process.env.LSKY_URL || 'https://img.x1file.top').replace(/\/+$/, '')
const LSKY_UPLOAD_ENDPOINT = `${LSKY_BASE}/api/v1/upload`

// 把请求流完整读入 Buffer
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_SIZE) {
        reject(new Error('FILE_TOO_LARGE'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ success: false, error: '仅支持 POST 请求' })
  }

  // 1. 校验 token 是否配置
  let token = process.env.LSKY_TOKEN || ''
  if (!token) {
    return res.status(500).json({
      success: false,
      error: '服务端未配置 LSKY_TOKEN 环境变量',
    })
  }
  // 容错：若变量里没带 "Bearer " 前缀，自动补上
  if (!/^bearer\s/i.test(token)) {
    token = `Bearer ${token}`
  }

  try {
    // 2. 读取浏览器发来的原始二进制数据
    const buffer = await readRawBody(req)
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({ success: false, error: '未接收到文件数据' })
    }

    // 文件名与类型由前端通过自定义头传入（见前端约定）
    const rawName = req.headers['x-file-name']
      ? decodeURIComponent(req.headers['x-file-name'])
      : `upload-${Date.now()}.png`
    const contentType = req.headers['content-type'] || 'application/octet-stream'

    // 简单的类型白名单：只允许图片 / 视频
    if (!/^(image|video)\//i.test(contentType)) {
      return res.status(415).json({
        success: false,
        error: `不支持的文件类型: ${contentType}`,
      })
    }

    // 3. 用原生 FormData + Blob 重新打包，转发给兰空
    const blob = new Blob([buffer], { type: contentType })
    const form = new FormData()
    form.append('file', blob, rawName)

    const lskyRes = await fetch(LSKY_UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: token,
        Accept: 'application/json',
        // 注意：千万不要手动设置 Content-Type，
        // fetch 会自动为 FormData 生成带 boundary 的 multipart 头
      },
      body: form,
    })

    // 4. 解析兰空返回
    const text = await lskyRes.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      // 兰空返回了非 JSON（通常是网关错误页 / token 失效跳转登录页）
      return res.status(502).json({
        success: false,
        error: '兰空返回了非预期内容，请检查 LSKY_TOKEN 或站点地址',
        raw: text.slice(0, 300),
      })
    }

    // Lsky Pro 2.x: { status: true, message, data: { links: { url, ... } } }
    if (!lskyRes.ok || data.status === false) {
      return res.status(lskyRes.status || 502).json({
        success: false,
        error: data.message || '兰空上传失败',
        data,
      })
    }

    const url = data?.data?.links?.url || ''
    if (!url) {
      return res.status(502).json({
        success: false,
        error: '兰空未返回图片 URL',
        data,
      })
    }

    // 5. 回传给前端：归一化字段 + 全量数据（方便前端按需取用）
    return res.status(200).json({
      success: true,
      url,
      name: data?.data?.origin_name || rawName,
      mimetype: data?.data?.mimetype || contentType,
      links: data?.data?.links || {},
      data,
    })
  } catch (error) {
    if (error.message === 'FILE_TOO_LARGE') {
      return res.status(413).json({
        success: false,
        error: `文件过大，单文件上限 ${Math.round(MAX_SIZE / 1024 / 1024)}MB`,
      })
    }
    console.error('Upload Proxy Error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}
