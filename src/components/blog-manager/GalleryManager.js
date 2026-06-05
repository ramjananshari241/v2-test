import { useCallback, useEffect, useRef, useState } from 'react'
import {
  countPendingGalleryItems,
  createPendingGalleryItem,
  galleryPreviewUrl,
  persistGalleryRemote,
  remoteFromApiImage,
  revokePendingGalleryItems,
  sumPendingGalleryBytes,
  checkGalleryStorageBeforeAdd,
} from '@/src/lib/admin/galleryFlush'

const btnSpinStyle = {
  width: '14px',
  height: '14px',
  border: '2px solid rgba(0,0,0,0.15)',
  borderTopColor: '#000',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  display: 'inline-block',
}

/**
 * Gallery 图库：选图本地预览，发布/保存时由父组件统一上传兰空并写入 Supabase
 */
export function GalleryManager({
  postSlug,
  postTitle,
  postNotionId,
  items,
  onItemsChange,
  onGalleryMutated,
}) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDone, setSaveDone] = useState(false)
  const [error, setError] = useState('')

  const slug = (postSlug || '').trim()
  const pendingCount = countPendingGalleryItems(items)

  const itemsRef = useRef(items)
  itemsRef.current = items

  const loadGallery = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError('')
    try {
      const r = await fetch(`/api/admin/gallery?slug=${encodeURIComponent(slug)}`)
      const d = await r.json()
      if (!d.success) throw new Error(d.error || '加载失败')
      const remote = (d.images || []).map(remoteFromApiImage)
      onItemsChange((prev) => {
        const pending = (prev || []).filter((it) => it.status === 'pending')
        return [...remote, ...pending]
      })
    } catch (e) {
      setError(e.message)
      onItemsChange((prev) => (prev || []).filter((it) => it.status === 'pending'))
    } finally {
      setLoading(false)
    }
  }, [slug, onItemsChange])

  useEffect(() => {
    loadGallery()
  }, [loadGallery])

  useEffect(() => {
    return () => revokePendingGalleryItems(itemsRef.current)
  }, [])

  const saveGallery = async () => {
    if (!slug) {
      alert('缺少文章 slug，无法保存图库')
      return
    }
    const remoteItems = (items || []).filter((it) => it.status === 'remote')
    if (!remoteItems.length && pendingCount > 0) {
      alert('新选的图片尚未发布，请点击底部「确认发布 / 保存修改」后才会上传到图床。')
      return
    }
    if (!remoteItems.length) {
      alert('暂无已上传的图库图片可保存')
      return
    }
    setSaving(true)
    setSaveDone(false)
    setError('')
    try {
      await persistGalleryRemote({
        slug,
        postTitle,
        postNotionId,
        items,
      })
      setSaveDone(true)
      setTimeout(() => setSaveDone(false), 2500)
      await loadGallery()
    } catch (e) {
      setError(e.message)
      alert('图库保存失败：' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      /^image\//i.test(f.type)
    )
    if (!files.length) return
    if (!slug) {
      alert('缺少文章 slug，无法添加图库')
      return
    }
    const addBytes = files.reduce((s, f) => s + (f.size || 0), 0)
    const pendingBytes = sumPendingGalleryBytes(items) + addBytes
    setError('')
    try {
      await checkGalleryStorageBeforeAdd(pendingBytes)
    } catch (e) {
      setError(e.message)
      alert(e.message)
      return
    }
    const pending = files.map(createPendingGalleryItem)
    onItemsChange((prev) => [...(prev || []), ...pending])
    onGalleryMutated?.()
  }

  const removeAt = (index) => {
    onItemsChange((prev) => {
      const next = [...(prev || [])]
      const removed = next[index]
      if (removed?.status === 'pending' && removed.previewUrl) {
        URL.revokeObjectURL(removed.previewUrl)
      }
      next.splice(index, 1)
      return next
    })
    onGalleryMutated?.()
  }

  const move = (index, dir) => {
    onItemsChange((prev) => {
      const next = [...(prev || [])]
      const target = index + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
    onGalleryMutated?.()
  }

  if (!slug) {
    return (
      <div
        style={{
          padding: '16px',
          borderRadius: '10px',
          background: '#2a2a2e',
          color: '#999',
          fontSize: '13px',
          lineHeight: 1.6,
        }}
      >
        缺少文章 slug，无法管理图库。
      </div>
    )
  }

  return (
    <div>
      <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px', lineHeight: 1.7 }}>
        选图后<b style={{ color: '#ccc' }}>仅本地预览</b>，不占图床空间；点击底部
        <b style={{ color: '#ccc' }}>确认发布 / 保存修改</b>后才会压缩上传到
        <b style={{ color: '#ccc' }}>兰空</b>并写入
        <b style={{ color: '#ccc' }}> Supabase</b>。作品标识：
        <code style={{ color: 'greenyellow' }}>{slug}</code>
        {pendingCount > 0 ? (
          <span style={{ color: '#f59e0b', marginLeft: '8px' }}>
            · {pendingCount} 张待发布
          </span>
        ) : null}
      </p>

      <label
        className="img-drop"
        style={{ minHeight: '100px', marginBottom: '16px' }}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          handleFiles(e.dataTransfer.files)
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <div style={{ pointerEvents: 'none', textAlign: 'center' }}>
          <div style={{ fontSize: '15px', color: '#fff', marginBottom: '6px' }}>
            拖拽或点击 · 添加图库（本地预览）
          </div>
          <div style={{ fontSize: '12px', color: '#777' }}>
            支持多选 · 发布/保存时自动压缩并上传
          </div>
        </div>
      </label>

      {loading ? (
        <div style={{ color: '#888', fontSize: '13px', padding: '12px 0' }}>加载图库…</div>
      ) : null}
      {error ? (
        <div style={{ color: '#ff7875', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
      ) : null}

      {items?.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          {items.map((it, index) => (
            <div
              key={`${it.id}-${index}`}
              style={{
                position: 'relative',
                aspectRatio: '3/4',
                borderRadius: '8px',
                overflow: 'hidden',
                background: '#222',
                border:
                  it.status === 'pending'
                    ? '1px dashed #f59e0b'
                    : '1px solid #444',
              }}
            >
              <img
                src={galleryPreviewUrl(it)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: '0 0 auto 0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '4px',
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent)',
                }}
              >
                <span style={{ fontSize: '10px', color: '#fff' }}>{index + 1}</span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {it.status === 'pending' ? (
                    <span
                      style={{
                        fontSize: '9px',
                        color: '#fbbf24',
                        background: 'rgba(0,0,0,0.55)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                      }}
                    >
                      待发布
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    style={{
                      border: 'none',
                      background: 'rgba(0,0,0,0.5)',
                      color: '#ff7875',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  right: '4px',
                  display: 'flex',
                  gap: '4px',
                  justifyContent: 'center',
                }}
              >
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 0',
                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                    opacity: index === 0 ? 0.4 : 1,
                  }}
                >
                  ←
                </button>
                <button
                  type="button"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  style={{
                    flex: 1,
                    fontSize: '10px',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 0',
                    cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: index === items.length - 1 ? 0.4 : 1,
                  }}
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            color: '#666',
            padding: '24px',
            border: '2px dashed #444',
            borderRadius: '12px',
            marginBottom: '16px',
            fontSize: '13px',
          }}
        >
          暂无图库图片
        </div>
      )}

      <button
        type="button"
        onClick={() => saveGallery()}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px',
          background: saveDone ? '#4dab6d' : 'greenyellow',
          color: saveDone ? '#fff' : '#000',
          border: 'none',
          borderRadius: '10px',
          fontWeight: 'bold',
          fontSize: '14px',
          cursor: saving ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {saving ? (
          <>
            <span style={btnSpinStyle} />
            保存排序中…
          </>
        ) : saveDone ? (
          '✓ 排序已保存'
        ) : (
          `手动保存排序（已上传 ${(items || []).filter((i) => i.status === 'remote').length} 张${
            pendingCount ? ` · 待发布 ${pendingCount} 张` : ''
          }）`
        )}
      </button>
    </div>
  )
}
