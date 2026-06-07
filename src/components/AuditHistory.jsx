import React, { useState, useMemo } from 'react'
import { LOG_TYPES } from '../hooks/useAuditLog'
import { downloadCsv, todayStamp } from '../utils/csv'

function pad(n) { return String(n).padStart(2, '0') }

function fmtDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function isoToLocalDate(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`
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

function getChanges(before, after) {
  if (!before || !after) return []
  const changes = []
  if (before.date !== after.date)
    changes.push({ field: '日付',     before: fmtDate(before.date),           after: fmtDate(after.date) })
  if ((before.description || '') !== (after.description || ''))
    changes.push({ field: '摘要',     before: before.description || '（空）', after: after.description || '（空）' })
  if ((before.voucherType || '') !== (after.voucherType || ''))
    changes.push({ field: '伝票種別', before: before.voucherType || '—',      after: after.voucherType || '—' })
  if ((before.deptCode || '') !== (after.deptCode || ''))
    changes.push({ field: '部門',     before: before.deptCode || '—',         after: after.deptCode || '—' })
  const bAmt = journalTotal(before)
  const aAmt = journalTotal(after)
  if (bAmt !== aAmt)
    changes.push({ field: '金額', before: `¥${bAmt.toLocaleString('ja-JP')}`, after: `¥${aAmt.toLocaleString('ja-JP')}` })
  return changes
}

function DetailPanel({ log }) {
  const { type, before, after } = log

  if (type === 'CREATE') {
    return (
      <div className="audit-detail audit-detail--create">
        <div className="audit-detail-title">登録内容</div>
        <table className="audit-diff-table">
          <tbody>
            <tr><td className="audit-diff-label">日付</td><td>{fmtDate(after?.date)}</td></tr>
            <tr><td className="audit-diff-label">摘要</td><td>{after?.description || '—'}</td></tr>
            <tr><td className="audit-diff-label">金額</td><td>¥{journalTotal(after).toLocaleString('ja-JP')}</td></tr>
            <tr><td className="audit-diff-label">明細行数</td><td>{after?.lines?.length ?? 0} 行</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'DELETE') {
    return (
      <div className="audit-detail audit-detail--delete">
        <div className="audit-detail-title">削除された仕訳の内容</div>
        <table className="audit-diff-table">
          <tbody>
            <tr><td className="audit-diff-label">日付</td><td>{fmtDate(before?.date)}</td></tr>
            <tr><td className="audit-diff-label">摘要</td><td>{before?.description || '—'}</td></tr>
            <tr><td className="audit-diff-label">伝票種別</td><td>{before?.voucherType || '—'}</td></tr>
            <tr><td className="audit-diff-label">金額</td><td>¥{journalTotal(before).toLocaleString('ja-JP')}</td></tr>
            <tr><td className="audit-diff-label">明細行数</td><td>{before?.lines?.length ?? 0} 行</td></tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (type === 'EDIT') {
    const changes = getChanges(before, after)
    return (
      <div className="audit-detail audit-detail--edit">
        <div className="audit-detail-title">変更内容の比較</div>
        {changes.length === 0 ? (
          <p style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>検出された変更はありません（行明細の変更のみの場合）</p>
        ) : (
          <table className="audit-diff-table audit-diff-table--compare">
            <thead>
              <tr>
                <th className="audit-diff-label">項目</th>
                <th className="audit-diff-before">変更前</th>
                <th className="audit-diff-sep"></th>
                <th className="audit-diff-after">変更後</th>
              </tr>
            </thead>
            <tbody>
              {changes.map(c => (
                <tr key={c.field}>
                  <td className="audit-diff-label">{c.field}</td>
                  <td className="audit-diff-before">{c.before}</td>
                  <td className="audit-diff-sep">→</td>
                  <td className="audit-diff-after">{c.after}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--c-text-muted)' }}>
          ※ 明細行の変更内容は変更前後のスナップショットで保存されています
        </div>
      </div>
    )
  }

  return null
}

export default function AuditHistory({ logs }) {
  const [dateFrom,        setDateFrom]        = useState('')
  const [dateTo,          setDateTo]          = useState('')
  const [typeFilter,      setTypeFilter]      = useState('ALL')
  const [journalIdFilter, setJournalIdFilter] = useState('')
  const [expandedId,      setExpandedId]      = useState(null)

  const filtered = useMemo(() => {
    const kw = journalIdFilter.trim().toLowerCase()
    return logs.filter(l => {
      const localDate = isoToLocalDate(l.recordedAt)
      if (dateFrom && localDate < dateFrom) return false
      if (dateTo   && localDate > dateTo)   return false
      if (typeFilter !== 'ALL' && l.type !== typeFilter) return false
      if (kw && !l.journalId.toLowerCase().includes(kw)) return false
      return true
    })
  }, [logs, dateFrom, dateTo, typeFilter, journalIdFilter])

  function exportCsv() {
    const header = ['操作日時', '操作種別', '伝票番号', '操作者',
                    '変更前日付', '変更前摘要', '変更前金額',
                    '変更後日付', '変更後摘要', '変更後金額']
    const rows = filtered.map(l => [
      fmtDateTime(l.recordedAt),
      LOG_TYPES[l.type]?.label || l.type,
      l.journalId,
      l.userName || l.userId || '—',
      l.before?.date  || '',
      l.before?.description || '',
      journalTotal(l.before) || '',
      l.after?.date   || '',
      l.after?.description || '',
      journalTotal(l.after) || '',
    ])
    downloadCsv(`訂正削除履歴_${todayStamp()}.csv`, [header, ...rows])
  }

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setTypeFilter('ALL')
    setJournalIdFilter('')
  }

  const hasFilter = dateFrom || dateTo || typeFilter !== 'ALL' || journalIdFilter

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 訂正削除履歴</div>
        <div className="je__title-row">
          <h1 className="je__title">訂正削除履歴</h1>
          <span className="je__spec-badge">{filtered.length} 件 / 全 {logs.length} 件</span>
        </div>
      </div>

      <section className="je-card no-print">
        <div className="je-card__body">
          <div className="jl-filter">
            <div className="jl-filter-row jl-filter-row--grid">
              <div className="jl-filter-field">
                <label className="je-label">操作日（から）</label>
                <input type="date" className="je-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="jl-filter-field">
                <label className="je-label">操作日（まで）</label>
                <input type="date" className="je-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="jl-filter-field">
                <label className="je-label">操作種別</label>
                <select className="je-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="ALL">すべて</option>
                  <option value="CREATE">新規登録</option>
                  <option value="EDIT">修正</option>
                  <option value="DELETE">削除</option>
                </select>
              </div>
              <div className="jl-filter-field">
                <label className="je-label">伝票番号</label>
                <input type="text" className="je-input" value={journalIdFilter}
                  onChange={e => setJournalIdFilter(e.target.value)} placeholder="JV-..." />
              </div>
              <div className="jl-filter-field jl-filter-field--btn">
                <button className="je-btn je-btn--outline" onClick={clearFilters} disabled={!hasFilter}>
                  条件クリア
                </button>
                <button className="je-btn je-btn--outline" onClick={exportCsv} disabled={filtered.length === 0}>
                  📄 CSV出力
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="je-card">
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
            {logs.length === 0
              ? '変更履歴がありません。仕訳の新規登録・修正・削除を行うと記録されます。'
              : '条件に一致する履歴がありません。'}
          </div>
        ) : (
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">操作日時</th>
                    <th className="jl-th jl-th--center">操作種別</th>
                    <th className="jl-th">伝票番号</th>
                    <th className="jl-th">操作者</th>
                    <th className="jl-th">変更前の摘要</th>
                    <th className="jl-th">変更後の摘要</th>
                    <th className="jl-th jl-th--center no-print">詳細</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const typeInfo  = LOG_TYPES[log.type] || { label: log.type, cls: '' }
                    const isExpanded = expandedId === log.id
                    return (
                      <React.Fragment key={log.id}>
                        <tr className={`jl-tr ${i % 2 === 1 ? 'jl-tr--alt' : ''} ${log.type === 'DELETE' ? 'audit-tr--delete' : ''}`}>
                          <td className="jl-td" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                            {fmtDateTime(log.recordedAt)}
                          </td>
                          <td className="jl-td jl-td--actions">
                            <span className={`audit-badge ${typeInfo.cls}`}>{typeInfo.label}</span>
                          </td>
                          <td className="jl-td jl-td--voucher">{log.journalId}</td>
                          <td className="jl-td" style={{ fontSize: 13 }}>{log.userName || log.userId || '—'}</td>
                          <td className="jl-td jl-td--desc" style={{ color: 'var(--c-text-2)', fontSize: 12 }}>
                            {log.before?.description || '—'}
                          </td>
                          <td className="jl-td jl-td--desc" style={{ fontSize: 12 }}>
                            {log.type === 'DELETE'
                              ? <span className="audit-deleted-label">削除済み</span>
                              : log.after?.description || '—'}
                          </td>
                          <td className="jl-td jl-td--actions no-print">
                            <button
                              className={`jl-btn audit-detail-btn ${isExpanded ? 'audit-detail-btn--active' : ''}`}
                              onClick={() => setExpandedId(v => v === log.id ? null : log.id)}
                            >
                              {isExpanded ? '▲ 閉じる' : '▼ 詳細'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="audit-detail-row">
                            <td colSpan={7} className="audit-detail-cell">
                              <DetailPanel log={log} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
