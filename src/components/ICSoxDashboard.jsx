import { useMemo } from 'react'
import { OP_TYPES } from '../hooks/useOpLog'

function pad(n) { return String(n).padStart(2, '0') }
function fmtDT(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtDate(s) { return s?.replace(/-/g, '/') || '—' }
function parseAmt(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}
function journalTotal(j) {
  return (j?.lines || []).reduce((s, l) => s + parseAmt(l.debitAmount), 0)
}

const APPROVAL_STATUS = {
  DRAFT:    '下書き',
  PENDING:  '申請中',
  APPROVED: '承認済',
  REJECTED: '却下',
}

function StatCard({ title, value, sub, color, icon }) {
  return (
    <div className="sox-stat-card" style={{ borderTopColor: color }}>
      <div className="sox-stat-icon">{icon}</div>
      <div className="sox-stat-body">
        <div className="sox-stat-value" style={{ color }}>{value}</div>
        <div className="sox-stat-title">{title}</div>
        {sub && <div className="sox-stat-sub">{sub}</div>}
      </div>
    </div>
  )
}

export default function ICSoxDashboard({ approvals, journals, opLogs, onNavigate }) {
  const now = new Date()

  const stats = useMemo(() => {
    // 今月の起算日
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const pending   = approvals.filter(a => a.status === 'PENDING').length
    const todayOps  = opLogs.filter(l => new Date(l.recordedAt) >= todayStart).length
    const monthOps  = opLogs.filter(l => new Date(l.recordedAt) >= monthStart).length
    const masterChg = opLogs.filter(l =>
      new Date(l.recordedAt) >= monthStart &&
      ['account', 'dept', 'user'].some(p => (l.target || '').startsWith(p + ':'))
    ).length

    return { pending, todayOps, monthOps, masterChg }
  }, [approvals, opLogs, now])

  // アラート: 3日以上承認待ちの仕訳
  const stalePending = useMemo(() => {
    const limit = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
    return approvals
      .filter(a => a.status === 'PENDING' && a.requestedAt && new Date(a.requestedAt) < limit)
      .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
      .slice(0, 10)
  }, [approvals, now])

  // アラート: 高額仕訳（100万円超）で未承認
  const highValueDraft = useMemo(() => {
    const approvalMap = Object.fromEntries(approvals.map(a => [a.journalId, a]))
    return journals
      .filter(j => {
        const total = journalTotal(j)
        if (total < 1_000_000) return false
        const apv = approvalMap[j.id]
        return !apv || apv.status === 'DRAFT' || apv.status === 'REJECTED'
      })
      .sort((a, b) => journalTotal(b) - journalTotal(a))
      .slice(0, 5)
  }, [journals, approvals])

  // 最近のマスタ変更（7日以内）
  const recentMasterChanges = useMemo(() => {
    const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return opLogs
      .filter(l =>
        new Date(l.recordedAt) >= limit &&
        ['account', 'dept', 'user'].some(p => (l.target || '').startsWith(p + ':'))
      )
      .slice(0, 5)
  }, [opLogs, now])

  const alertCount = stalePending.length + highValueDraft.length

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 内部統制 › J-SOXダッシュボード</div>
        <div className="je__title-row">
          <h1 className="je__title">J-SOXダッシュボード</h1>
          <span className="je__spec-badge">
            {alertCount > 0
              ? <span style={{ color: 'var(--c-error)' }}>⚠ アラート {alertCount} 件</span>
              : '異常なし'}
          </span>
        </div>
      </div>

      {/* 統計カード */}
      <div className="sox-stats-grid">
        <StatCard
          title="未承認仕訳"
          value={stats.pending}
          sub="件"
          color={stats.pending > 0 ? 'var(--c-warning)' : 'var(--c-success)'}
          icon="📋"
        />
        <StatCard
          title="今日の操作"
          value={stats.todayOps}
          sub="件"
          color="var(--c-primary)"
          icon="🔍"
        />
        <StatCard
          title="今月の操作ログ"
          value={stats.monthOps}
          sub="件"
          color="var(--c-primary)"
          icon="📊"
        />
        <StatCard
          title="今月のマスタ変更"
          value={stats.masterChg}
          sub="件"
          color={stats.masterChg > 0 ? 'var(--c-warning)' : 'var(--c-success)'}
          icon="⚙"
        />
      </div>

      <div className="sox-content-grid">
        {/* アラートセクション */}
        <section className="je-card sox-alert-card">
          <div className="je-card__header">
            <h2 className="je-card__title">
              {alertCount > 0 ? `⚠ アラート（${alertCount}件）` : '✓ アラートなし'}
            </h2>
          </div>
          <div className="je-card__body">
            {alertCount === 0 && (
              <p style={{ color: 'var(--c-success)', fontWeight: 600, padding: '8px 0' }}>
                現在、異常な操作・未処理案件はありません。
              </p>
            )}

            {stalePending.length > 0 && (
              <div className="sox-alert-group">
                <div className="sox-alert-group-title">
                  ⏰ 承認待ち3日超 — {stalePending.length} 件
                </div>
                <table className="sox-mini-table">
                  <thead>
                    <tr>
                      <th>伝票番号</th>
                      <th>申請日時</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stalePending.map(a => (
                      <tr key={a.id}>
                        <td>{a.journalId}</td>
                        <td style={{ fontSize: 12 }}>{fmtDT(a.requestedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {highValueDraft.length > 0 && (
              <div className="sox-alert-group" style={{ marginTop: stalePending.length > 0 ? 16 : 0 }}>
                <div className="sox-alert-group-title">
                  💰 高額仕訳（100万円超）で未申請 — {highValueDraft.length} 件
                </div>
                <table className="sox-mini-table">
                  <thead>
                    <tr>
                      <th>伝票番号</th>
                      <th>日付</th>
                      <th style={{ textAlign: 'right' }}>金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highValueDraft.map(j => (
                      <tr key={j.id}>
                        <td>{j.id}</td>
                        <td style={{ fontSize: 12 }}>{fmtDate(j.date)}</td>
                        <td style={{ textAlign: 'right', fontSize: 12, fontWeight: 600 }}>
                          ¥{journalTotal(j).toLocaleString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* 最近のマスタ変更 */}
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">最近のマスタ変更（7日以内）</h2>
            <button className="je-btn je-btn--outline" style={{ fontSize: 12 }} onClick={() => onNavigate('oplog')}>
              操作ログ →
            </button>
          </div>
          <div className="je-card__body je-card__body--flush">
            {recentMasterChanges.length === 0 ? (
              <div style={{ padding: '16px 20px', color: 'var(--c-text-muted)', fontSize: 13 }}>
                直近7日のマスタ変更はありません
              </div>
            ) : (
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">操作日時</th>
                    <th className="jl-th jl-th--center">種別</th>
                    <th className="jl-th">操作者</th>
                    <th className="jl-th">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMasterChanges.map((l, i) => {
                    const typeInfo = OP_TYPES[l.type] || { label: l.type, cls: '' }
                    return (
                      <tr key={l.id} className={`jl-tr ${i % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                        <td className="jl-td" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {fmtDT(l.recordedAt)}
                        </td>
                        <td className="jl-td jl-td--actions">
                          <span className={`op-badge ${typeInfo.cls}`}>{typeInfo.label}</span>
                        </td>
                        <td className="jl-td" style={{ fontSize: 12 }}>{l.userName || '—'}</td>
                        <td className="jl-td" style={{ fontSize: 12 }}>{l.detail || '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {/* クイックリンク */}
      <section className="je-card">
        <div className="je-card__header"><h2 className="je-card__title">クイックアクセス</h2></div>
        <div className="je-card__body">
          <div className="sox-quick-links">
            <button className="sox-quick-btn" onClick={() => onNavigate('approvalinbox')}>
              <span className="sox-quick-icon">📋</span>
              <span>承認受付</span>
              {stats.pending > 0 && <span className="sox-quick-badge">{stats.pending}</span>}
            </button>
            <button className="sox-quick-btn" onClick={() => onNavigate('oplog')}>
              <span className="sox-quick-icon">🔍</span>
              <span>操作ログ</span>
            </button>
            <button className="sox-quick-btn" onClick={() => onNavigate('audithistory')}>
              <span className="sox-quick-icon">📝</span>
              <span>訂正削除履歴</span>
            </button>
            <button className="sox-quick-btn" onClick={() => onNavigate('usermgmt')}>
              <span className="sox-quick-icon">👤</span>
              <span>ユーザー管理</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
