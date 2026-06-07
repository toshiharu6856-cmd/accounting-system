import { useState, useMemo } from 'react'
import { OP_TYPES } from '../hooks/useOpLog'
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

const TARGET_LABELS = {
  auth:       '認証',
  journal:    '仕訳',
  approval:   '承認',
  account:    '勘定科目',
  dept:       '部門',
  user:       'ユーザー',
}

function targetLabel(target) {
  if (!target) return '—'
  const prefix = target.split(':')[0]
  return TARGET_LABELS[prefix] || target
}

export default function OpLog({ logs, users = [] }) {
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [userFilter,  setUserFilter]  = useState('')
  const [typeFilter,  setTypeFilter]  = useState('ALL')
  const [targetFilter, setTargetFilter] = useState('ALL')

  const uniqueUsers = useMemo(() => {
    const map = {}
    logs.forEach(l => { if (l.userId) map[l.userId] = l.userName || l.userId })
    return Object.entries(map).map(([id, name]) => ({ id, name }))
  }, [logs])

  const filtered = useMemo(() => {
    return logs.filter(l => {
      const localDate = isoToLocalDate(l.recordedAt)
      if (dateFrom && localDate < dateFrom) return false
      if (dateTo   && localDate > dateTo)   return false
      if (userFilter  && l.userId !== userFilter)  return false
      if (typeFilter  !== 'ALL' && l.type !== typeFilter)  return false
      if (targetFilter !== 'ALL') {
        const prefix = (l.target || '').split(':')[0]
        if (prefix !== targetFilter) return false
      }
      return true
    })
  }, [logs, dateFrom, dateTo, userFilter, typeFilter, targetFilter])

  function clearFilters() {
    setDateFrom(''); setDateTo(''); setUserFilter(''); setTypeFilter('ALL'); setTargetFilter('ALL')
  }
  const hasFilter = dateFrom || dateTo || userFilter || typeFilter !== 'ALL' || targetFilter !== 'ALL'

  function exportCsv() {
    const header = ['操作日時', '操作者ID', '操作者名', '操作種別', '対象', '内容']
    const rows = filtered.map(l => [
      fmtDateTime(l.recordedAt),
      l.userId,
      l.userName,
      OP_TYPES[l.type]?.label || l.type,
      l.target,
      l.detail,
    ])
    downloadCsv(`操作ログ_${todayStamp()}.csv`, [header, ...rows])
  }

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 内部統制 › 操作ログ</div>
        <div className="je__title-row">
          <h1 className="je__title">操作ログ</h1>
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
                <label className="je-label">操作者</label>
                <select className="je-select" value={userFilter} onChange={e => setUserFilter(e.target.value)}>
                  <option value="">すべて</option>
                  {uniqueUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div className="jl-filter-field">
                <label className="je-label">操作種別</label>
                <select className="je-select" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                  <option value="ALL">すべて</option>
                  {Object.entries(OP_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="jl-filter-field">
                <label className="je-label">対象区分</label>
                <select className="je-select" value={targetFilter} onChange={e => setTargetFilter(e.target.value)}>
                  <option value="ALL">すべて</option>
                  {Object.entries(TARGET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
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
              ? '操作ログがありません。ログイン・仕訳操作などを行うと記録されます。'
              : '条件に一致する操作ログがありません。'}
          </div>
        ) : (
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">操作日時</th>
                    <th className="jl-th">操作者</th>
                    <th className="jl-th jl-th--center">操作種別</th>
                    <th className="jl-th jl-th--center">対象</th>
                    <th className="jl-th">内容</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => {
                    const typeInfo = OP_TYPES[log.type] || { label: log.type, cls: '' }
                    return (
                      <tr key={log.id} className={`jl-tr ${i % 2 === 1 ? 'jl-tr--alt' : ''} ${log.type === 'DELETE' ? 'audit-tr--delete' : ''}`}>
                        <td className="jl-td" style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                          {fmtDateTime(log.recordedAt)}
                        </td>
                        <td className="jl-td" style={{ fontSize: 13 }}>
                          <span style={{ fontWeight: 600 }}>{log.userName || '—'}</span>
                          {log.userId && <span style={{ color: 'var(--c-text-muted)', fontSize: 11, display: 'block' }}>{log.userId}</span>}
                        </td>
                        <td className="jl-td jl-td--actions">
                          <span className={`op-badge ${typeInfo.cls}`}>{typeInfo.label}</span>
                        </td>
                        <td className="jl-td jl-td--actions" style={{ fontSize: 12 }}>
                          {targetLabel(log.target)}
                        </td>
                        <td className="jl-td" style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
                          {log.detail || '—'}
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
    </div>
  )
}
