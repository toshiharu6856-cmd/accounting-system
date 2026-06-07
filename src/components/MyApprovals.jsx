import { useState, useMemo } from 'react'
import { APPROVAL_STATUS } from '../hooks/useApprovals'

function fmt(d) { return d?.replace(/-/g, '/') || '' }
function fmtTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function totalAmt(lines) {
  return lines?.reduce((s, l) => {
    const n = typeof l.debitAmount === 'number' ? l.debitAmount : parseFloat(String(l.debitAmount).replace(/,/g, '')) || 0
    return s + n
  }, 0) || 0
}

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL',      label: 'すべて' },
  { value: 'PENDING',  label: '申請中' },
  { value: 'APPROVED', label: '承認済' },
  { value: 'REJECTED', label: '却下' },
  { value: 'DRAFT',    label: '下書き' },
]

export default function MyApprovals({ approvals, journals, users, currentUser, onEditJournal, onReapply, onWithdraw }) {
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [historyId, setHistoryId] = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  const journalMap = useMemo(() => {
    const m = {}
    journals.forEach(j => { m[j.id] = j })
    return m
  }, [journals])

  const userMap = useMemo(() => {
    const m = {}
    users.forEach(u => { m[u.id] = u })
    return m
  }, [users])

  const myApprovals = useMemo(() => {
    const list = isAdmin
      ? approvals
      : approvals.filter(a => a.requestedBy === currentUser?.id)
    const filtered = statusFilter === 'ALL' ? list : list.filter(a => a.status === statusFilter)
    return [...filtered].sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''))
  }, [approvals, currentUser, isAdmin, statusFilter])

  const historyApv = approvals.find(a => a.id === historyId)

  const st = APPROVAL_STATUS

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 承認 › {isAdmin ? '承認一覧（管理者）' : '自分の申請'}</div>
        <div className="je__title-row">
          <h1 className="je__title">{isAdmin ? '承認一覧' : '自分の申請'}</h1>
          <span className="je__spec-badge">{myApprovals.length} 件</span>
        </div>
      </div>

      <div className="jl-toolbar no-print">
        <div className="apv-filter-tabs">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              className={`apv-filter-tab ${statusFilter === opt.value ? 'apv-filter-tab--active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              {opt.value !== 'ALL' && (
                <span className="apv-filter-count">
                  {(isAdmin ? approvals : approvals.filter(a => a.requestedBy === currentUser?.id))
                    .filter(a => a.status === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <section className="je-card">
        {myApprovals.length === 0 ? (
          <div className="jl-empty-cell" style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
            該当する申請記録がありません
          </div>
        ) : (
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">ステータス</th>
                    <th className="jl-th">日付</th>
                    <th className="jl-th">伝票番号</th>
                    <th className="jl-th">摘要</th>
                    <th className="jl-th jl-th--right">金額</th>
                    {isAdmin && <th className="jl-th">申請者</th>}
                    <th className="jl-th">申請日時</th>
                    <th className="jl-th">審査日時</th>
                    <th className="jl-th">却下コメント</th>
                    <th className="jl-th jl-th--center no-print">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {myApprovals.map((apv, idx) => {
                    const j    = journalMap[apv.journalId]
                    const info = st[apv.status] || st.DRAFT
                    const reqUser = userMap[apv.requestedBy]
                    return (
                      <tr key={apv.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                        <td className="jl-td">
                          <span className={`apv-badge ${info.cls}`}>{info.label}</span>
                        </td>
                        <td className="jl-td jl-td--date">{fmt(j?.date)}</td>
                        <td className="jl-td jl-td--voucher">{apv.journalId}</td>
                        <td className="jl-td jl-td--desc">{j?.description || '—'}</td>
                        <td className="jl-td jl-td--amount">
                          {j ? `¥${totalAmt(j.lines).toLocaleString('ja-JP')}` : '—'}
                        </td>
                        {isAdmin && <td className="jl-td">{reqUser?.name || apv.requestedBy}</td>}
                        <td className="jl-td" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTs(apv.requestedAt)}</td>
                        <td className="jl-td" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTs(apv.reviewedAt)}</td>
                        <td className="jl-td apv-comment apv-comment--rejected">
                          {apv.status === 'REJECTED' && apv.comment
                            ? <span className="apv-reject-comment">{apv.comment}</span>
                            : '—'}
                        </td>
                        <td className="jl-td jl-td--actions no-print">
                          <button
                            className="jl-btn"
                            style={{ fontSize: 11, padding: '3px 8px', color: 'var(--c-text-2)', marginRight: 4 }}
                            onClick={() => setHistoryId(apv.id === historyId ? null : apv.id)}
                          >履歴</button>
                          {apv.status === 'REJECTED' && (
                            <>
                              {j && (
                                <button
                                  className="jl-btn jl-btn--edit"
                                  style={{ marginRight: 4 }}
                                  onClick={() => onEditJournal(j)}
                                >修正</button>
                              )}
                              <button
                                className="jl-btn apv-btn--reapply"
                                onClick={() => {
                                  if (window.confirm('再申請しますか？')) onReapply(apv.journalId, currentUser.id)
                                }}
                              >再申請</button>
                            </>
                          )}
                          {apv.status === 'PENDING' && apv.requestedBy === currentUser?.id && (
                            <button
                              className="jl-btn jl-btn--delete"
                              onClick={() => {
                                if (window.confirm('申請を取り消しますか？')) onWithdraw(apv.id, currentUser.id)
                              }}
                            >取消</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* 履歴パネル */}
      {historyApv && (
        <section className="je-card" style={{ marginTop: 16 }}>
          <div className="je-card__header">
            <h2 className="je-card__title">ワークフロー履歴 — {historyApv.journalId}</h2>
            <button className="je-btn je-btn--secondary" style={{ padding: '4px 12px', fontSize: 12 }} onClick={() => setHistoryId(null)}>閉じる</button>
          </div>
          <div className="je-card__body">
            <div className="apv-history">
              {(historyApv.history || []).map((h, i) => {
                const info = st[h.status] || st.DRAFT
                const u = userMap[h.userId]
                return (
                  <div key={i} className="apv-history-item">
                    <span className={`apv-badge ${info.cls}`}>{info.label}</span>
                    <span className="apv-history-user">{u?.name || h.userId}</span>
                    <span className="apv-history-at">{fmtTs(h.at)}</span>
                    {h.comment && <span className="apv-history-comment">「{h.comment}」</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
