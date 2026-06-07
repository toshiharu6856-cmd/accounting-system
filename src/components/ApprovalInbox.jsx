import { useState, useMemo } from 'react'
import Modal from './masters/Modal'
import { APPROVAL_STATUS } from '../hooks/useApprovals'
import { downloadCsv, todayStamp } from '../utils/csv'

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
  { value: 'PENDING',  label: '申請中' },
  { value: 'APPROVED', label: '承認済' },
  { value: 'REJECTED', label: '却下' },
  { value: 'ALL',      label: 'すべて' },
]

export default function ApprovalInbox({ approvals, journals, users, currentUser, onApprove, onReject }) {
  const [statusFilter,   setStatusFilter]   = useState('PENDING')
  const [approveModal,   setApproveModal]   = useState(null)  // { approvalId, journalId }
  const [approveComment, setApproveComment] = useState('')
  const [rejectModal,    setRejectModal]    = useState(null)  // { approvalId, journalId }
  const [rejectComment,  setRejectComment]  = useState('')
  const [commentError,   setCommentError]   = useState('')

  const canApproveReject = currentUser?.role === 'APPROVER' || currentUser?.role === 'ADMIN'

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

  const filtered = useMemo(() => {
    return approvals
      .filter(a => statusFilter === 'ALL' || a.status === statusFilter)
      .sort((a, b) => (b.requestedAt || '').localeCompare(a.requestedAt || ''))
  }, [approvals, statusFilter])

  function openApprove(apv) {
    setApproveModal({ approvalId: apv.id, journalId: apv.journalId })
    setApproveComment('')
  }

  function handleApprove() {
    onApprove(approveModal.approvalId, currentUser.id, approveComment.trim())
    setApproveModal(null)
  }

  function openReject(apv) {
    setRejectModal({ approvalId: apv.id, journalId: apv.journalId })
    setRejectComment('')
    setCommentError('')
  }

  function handleReject() {
    if (!rejectComment.trim()) { setCommentError('却下コメントは必須です'); return }
    onReject(rejectModal.approvalId, currentUser.id, rejectComment.trim())
    setRejectModal(null)
  }

  function exportCsv() {
    const header = ['ステータス', '伝票番号', '摘要', '金額', '申請者', '申請日時', '審査者', '審査日時', '承認コメント', '却下コメント']
    const rows = filtered.map(apv => {
      const j = journalMap[apv.journalId]
      const reqUser = userMap[apv.requestedBy]
      const revUser = userMap[apv.reviewedBy]
      return [
        APPROVAL_STATUS[apv.status]?.label || apv.status,
        apv.journalId,
        j?.description || '',
        j ? totalAmt(j.lines) : '',
        reqUser?.name || apv.requestedBy || '',
        fmtTs(apv.requestedAt),
        revUser?.name || apv.reviewedBy || '',
        fmtTs(apv.reviewedAt),
        apv.approveComment || '',
        apv.comment        || '',
      ]
    })
    downloadCsv(`承認履歴_${todayStamp()}.csv`, [header, ...rows])
  }

  const st = APPROVAL_STATUS

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 承認 › 承認受付</div>
        <div className="je__title-row">
          <h1 className="je__title">承認受付</h1>
          <span className="je__spec-badge">
            {filtered.length} 件
          </span>
        </div>
      </div>

      {!canApproveReject && (
        <div className="je-alert je-alert--error" style={{ marginBottom: 16 }}>
          あなたの役割（一般ユーザー）では承認・却下できません。承認者または管理者のみが操作できます。
        </div>
      )}

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
                  {approvals.filter(a => a.status === opt.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <button className="je-btn je-btn--outline" style={{ marginLeft: 'auto' }}
          onClick={exportCsv} disabled={filtered.length === 0}>
          📄 CSV出力
        </button>
      </div>

      <section className="je-card">
        {filtered.length === 0 ? (
          <div className="jl-empty-cell" style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
            {statusFilter === 'PENDING' ? '申請中の仕訳はありません' : '該当する承認記録がありません'}
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
                    <th className="jl-th">申請者</th>
                    <th className="jl-th">申請日時</th>
                    <th className="jl-th">審査者</th>
                    <th className="jl-th">コメント</th>
                    <th className="jl-th jl-th--center no-print">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((apv, idx) => {
                    const j       = journalMap[apv.journalId]
                    const reqUser = userMap[apv.requestedBy]
                    const revUser = userMap[apv.reviewedBy]
                    const isSelf  = apv.requestedBy === currentUser?.id
                    const info    = st[apv.status] || st.DRAFT
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
                        <td className="jl-td">{reqUser?.name || apv.requestedBy}</td>
                        <td className="jl-td" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fmtTs(apv.requestedAt)}</td>
                        <td className="jl-td">{revUser?.name || (apv.reviewedBy ? apv.reviewedBy : '—')}</td>
                        <td className="jl-td apv-comment">{apv.comment || '—'}</td>
                        <td className="jl-td jl-td--actions no-print">
                          {apv.status === 'PENDING' && canApproveReject && (
                            isSelf ? (
                              <span className="apv-self-note">自己承認不可</span>
                            ) : (
                              <>
                                <button className="jl-btn apv-btn--approve" onClick={() => openApprove(apv)}>承認</button>
                                <button className="jl-btn apv-btn--reject"  onClick={() => openReject(apv)}>却下</button>
                              </>
                            )
                          )}
                          {apv.status !== 'PENDING' && <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>—</span>}
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

      {approveModal && (
        <Modal title="承認確認" onClose={() => setApproveModal(null)} size="sm">
          <div className="ms-form">
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: 8 }}>
              伝票 <strong>{approveModal.journalId}</strong> を承認します。
            </p>
            <div className="je-field">
              <label className="je-label">承認コメント（任意）</label>
              <textarea
                className="je-input apv-textarea"
                value={approveComment}
                onChange={e => setApproveComment(e.target.value)}
                placeholder="承認理由・コメントがあれば入力してください"
                rows={3}
              />
            </div>
            <div className="ms-modal-actions">
              <button className="je-btn je-btn--secondary" onClick={() => setApproveModal(null)}>キャンセル</button>
              <button className="je-btn apv-btn--approve" onClick={handleApprove}>承認する</button>
            </div>
          </div>
        </Modal>
      )}

      {rejectModal && (
        <Modal title="却下コメントを入力" onClose={() => setRejectModal(null)} size="sm">
          <div className="ms-form">
            <p style={{ fontSize: 13, color: 'var(--c-text-2)', marginBottom: 8 }}>
              伝票 <strong>{rejectModal.journalId}</strong> を却下します。
            </p>
            <div className="je-field">
              <label className="je-label je-label--required">却下理由・コメント</label>
              <textarea
                className={`je-input apv-textarea ${commentError ? 'je-input--error' : ''}`}
                value={rejectComment}
                onChange={e => { setRejectComment(e.target.value); setCommentError('') }}
                placeholder="却下理由を入力してください"
                rows={4}
              />
              {commentError && <span className="je-field-error">{commentError}</span>}
            </div>
            <div className="ms-modal-actions">
              <button className="je-btn je-btn--secondary" onClick={() => setRejectModal(null)}>キャンセル</button>
              <button className="je-btn" style={{ background: 'var(--c-error)', color: '#fff' }} onClick={handleReject}>却下する</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
