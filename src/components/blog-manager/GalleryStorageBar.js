/** 后台首页：图库容量条（Supabase 记录的压缩后体积） */

function barColor(percent) {
  if (percent >= 95) return '#ff4d4f'
  if (percent >= 80) return '#f59e0b'
  return 'greenyellow'
}

export function GalleryStorageBar({ stats, loading, error }) {
  if (loading) {
    return (
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          background: '#2a2a2e',
          borderRadius: '12px',
          border: '1px solid #444',
          color: '#888',
          fontSize: '13px',
        }}
      >
        图库容量加载中…
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          background: '#2a2a2e',
          borderRadius: '12px',
          border: '1px solid #553333',
          color: '#ff7875',
          fontSize: '12px',
        }}
      >
        图库容量不可用：{error}
      </div>
    )
  }

  if (!stats?.configured) {
    return (
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 20px',
          background: '#2a2a2e',
          borderRadius: '12px',
          border: '1px solid #444',
          color: '#888',
          fontSize: '12px',
          lineHeight: 1.6,
        }}
      >
        图库容量统计未启用（需配置 Supabase 环境变量）。
      </div>
    )
  }

  const pct = Math.min(100, stats.usedPercent || 0)
  const full = pct >= 99.9 || stats.remainingBytes <= 0

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '16px 20px',
        background: '#2a2a2e',
        borderRadius: '12px',
        border: '1px solid #444',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '10px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
          图库容量
          <span
            style={{
              marginLeft: '8px',
              fontSize: '11px',
              fontWeight: 'normal',
              color: '#888',
            }}
          >
            Supabase 记录 · 压缩后体积
          </span>
        </div>
        <div style={{ fontSize: '13px', color: '#ccc' }}>
          <span style={{ color: 'greenyellow', fontWeight: 'bold' }}>
            {stats.usedLabel}
          </span>
          <span style={{ color: '#666' }}> / </span>
          {stats.quotaLabel}
          <span style={{ marginLeft: '10px', color: '#888', fontSize: '11px' }}>
            {stats.imageCount} 张
          </span>
        </div>
      </div>

      <div
        style={{
          height: '10px',
          background: '#1a1a1e',
          borderRadius: '999px',
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <div
          style={{
            width: `${Math.max(pct > 0 ? 2 : 0, pct)}%`,
            height: '100%',
            background: barColor(pct),
            borderRadius: '999px',
            transition: 'width 0.35s ease',
            boxShadow: pct > 0 ? `0 0 12px ${barColor(pct)}55` : 'none',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: full ? '#ff7875' : '#777',
          display: 'flex',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <span>
          {full
            ? '已达 50GB 上限，无法继续上传图库图片'
            : `剩余 ${stats.remainingLabel}（${(100 - pct).toFixed(1)}%）`}
        </span>
        <span>{pct.toFixed(1)}% 已用</span>
      </div>
    </div>
  )
}
