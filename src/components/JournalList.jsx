import { useState, useMemo } from 'react'
import { getAccountByCode } from '../data/accounts'
import { downloadCsv, todayStamp } from '../utils/csv'
import PeriodSelector from './PeriodSelector'
import { APPROVAL_STATUS } from '../hooks/useApprovals'

const TYPE_LABELS = {
  NORMAL: '通常', MONTHLY: '月次', CLOSING: '決算', OPENING: '期首', ADJUST: '修正',
}

function parseAmt(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function fmt(d) {
  return d?.replace(/-/g, '/') || ''
}

function summarize(lines) {
  const dr = [...new Set(
    lines.filter(l => l.debitCode && parseAmt(l.debitAmount) > 0)
         .map(l => getAccountByCode(l.debitCode)?.name || l.debitCode)
  )].join('・')
  const cr = [...new Set(
    lines.filter(l => l.creditCode && parseAmt(l.creditAmount) > 0)
         .map(l => getAccountByCode(l.creditCode)?.name || l.creditCode)
  )].join('・')
  return { dr, cr }
}

function totalAmt(lines) {
  return lines.reduce((s, l) => s + parseAmt(l.debitAmount), 0)
}

function accountName(code, accounts) {
  if (!code) return ''
  return accounts.find(a => a.code === code)?.name || getAccountByCode(code)?.name || code
}

export default function JournalList({ journals, onNew, onEdit, onDelete, onReset, accounts = [], periodCtx,
  approvals = [], currentUser = null, onRequestApproval }) {
  const [keyword, setKeyword] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [accountCode, setAccountCode] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')

  const periodFiltered = periodCtx ? periodCtx.periodJournals : journals

  const approvalMap = useMemo(() => {
    const m = {}
    approvals.forEach(a => { m[a.journalId] = a })
    return m
  }, [approvals])

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    const minN = amountMin === '' ? null : parseFloat(amountMin)
    const maxN = amountMax === '' ? null : parseFloat(amountMax)

    return periodFiltered.filter(j => {
      if (dateFrom && j.date < dateFrom) return false
      if (dateTo   && j.date > dateTo)   return false

      if (accountCode) {
        const hasAcct = j.lines.some(l =>
          l.debitCode === accountCode || l.creditCode === accountCode
        )
        if (!hasAcct) return false
      }

      const amt = totalAmt(j.lines)
      if (minN !== null && !isNaN(minN) && amt < minN) return false
      if (maxN !== null && !isNaN(maxN) && amt > maxN) return false

      if (kw) {
        const hay = [
          j.id, j.description,
          ...j.lines.map(l => l.memo || ''),
          ...j.lines.map(l => accountName(l.debitCode, accounts)),
          ...j.lines.map(l => accountName(l.creditCode, accounts)),
        ].join(' ').toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [periodFiltered, keyword, dateFrom, dateTo, accountCode, amountMin, amountMax, accounts])

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.date.localeCompare(a.date)),
    [filtered]
  )

  function handleCsvExport() {
    const header = ['日付', '伝票番号', '摘要', '借方科目', '貸方科目', '金額']
    const rows = []
    const sortedAsc = [...filtered].sort((a, b) =>
      a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
    )
    sortedAsc.forEach(j => {
      j.lines.forEach(line => {
        const amt = parseAmt(line.debitAmount) || parseAmt(line.creditAmount)
        rows.push([
          j.date,
          j.id,
          line.memo || j.description || '',
          accountName(line.debitCode, accounts),
          accountName(line.creditCode, accounts),
          amt,
        ])
      })
    })
    downloadCsv(`仕訳帳_${todayStamp()}.csv`, [header, ...rows])
  }

  function clearFilters() {
    setKeyword('')
    setDateFrom('')
    setDateTo('')
    setAccountCode('')
    setAmountMin('')
    setAmountMax('')
  }

  const hasActiveFilter =
    keyword || dateFrom || dateTo || accountCode || amountMin || amountMax

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 仕訳一覧</div>
        <div className="je__title-row">
          <h1 className="je__title">仕訳一覧</h1>
          <span className="je__spec-badge">
            {sorted.length} / {periodFiltered.length} 件
            {periodCtx && <>　（{periodCtx.label}）</>}
          </span>
        </div>
      </div>

      <div className="jl-toolbar no-print">
        <button className="je-btn je-btn--primary" onClick={onNew}>＋ 新規仕訳入力</button>
        <button
          className="je-btn je-btn--outline"
          onClick={handleCsvExport}
          disabled={filtered.length === 0}
        >
          📄 CSV出力
        </button>
        <button
          className="je-btn je-btn--outline"
          onClick={() => { if (window.confirm('サンプルデータに戻しますか？（現在のデータは失われます）')) onReset() }}
        >
          サンプルデータに戻す
        </button>
        {periodCtx && (
          <div style={{ marginLeft: 'auto' }}>
            <PeriodSelector {...periodCtx} />
          </div>
        )}
      </div>

      {/* 検索・絞り込み */}
      <section className="je-card no-print">
        <div className="je-card__body">
          <div className="jl-filter">
            <div className="jl-filter-row">
              <input
                type="text"
                className="je-input jl-filter-search"
                placeholder="🔍 摘要・伝票番号・科目名で検索"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
              />
            </div>
            <div className="jl-filter-row jl-filter-row--grid">
              <div className="jl-filter-field">
                <label className="je-label">日付（から）</label>
                <input type="date" className="je-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="jl-filter-field">
                <label className="je-label">日付（まで）</label>
                <input type="date" className="je-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div className="jl-filter-field">
                <label className="je-label">勘定科目</label>
                <select className="je-select" value={accountCode} onChange={e => setAccountCode(e.target.value)}>
                  <option value="">（すべて）</option>
                  {accounts.map(a => (
                    <option key={a.code} value={a.code}>{a.code}　{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="jl-filter-field">
                <label className="je-label">金額（以上）</label>
                <input type="number" className="je-input" value={amountMin} onChange={e => setAmountMin(e.target.value)} placeholder="0" />
              </div>
              <div className="jl-filter-field">
                <label className="je-label">金額（以下）</label>
                <input type="number" className="je-input" value={amountMax} onChange={e => setAmountMax(e.target.value)} placeholder="" />
              </div>
              <div className="jl-filter-field jl-filter-field--btn">
                <button
                  className="je-btn je-btn--outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilter}
                >条件クリア</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="je-card">
        {sorted.length === 0 ? (
          <div className="jl-empty">
            <div className="jl-empty-icon">📋</div>
            <p>{periodFiltered.length === 0 ? '仕訳データがありません' : '条件に一致する仕訳がありません'}</p>
            {periodFiltered.length === 0 && (
              <button className="je-btn je-btn--primary" onClick={onNew}>最初の仕訳を入力する</button>
            )}
          </div>
        ) : (
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">日付</th>
                    <th className="jl-th">伝票番号</th>
                    <th className="jl-th">種別</th>
                    <th className="jl-th">摘要</th>
                    <th className="jl-th jl-th--debit">借方科目</th>
                    <th className="jl-th jl-th--credit">貸方科目</th>
                    <th className="jl-th jl-th--right">金額</th>
                    <th className="jl-th jl-th--center">承認</th>
                    <th className="jl-th jl-th--center no-print">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((j, idx) => {
                    const { dr, cr } = summarize(j.lines)
                    const amt = totalAmt(j.lines)
                    const apv = approvalMap[j.id]
                    const apvStatus = apv?.status || null
                    // DRAFT（下書き）またはレコードなし → 申請ボタン表示
                    const isDraft = !apvStatus || apvStatus === 'DRAFT'
                    const statusInfo = isDraft ? null : (APPROVAL_STATUS[apvStatus] || null)
                    const isLocked = apvStatus === 'PENDING' || apvStatus === 'APPROVED'
                    const canApply = isDraft && !!onRequestApproval && !!currentUser
                    return (
                      <tr key={j.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''} ${isLocked ? 'jl-tr--locked' : ''}`}>
                        <td className="jl-td jl-td--date">{fmt(j.date)}</td>
                        <td className="jl-td jl-td--voucher">{j.id}</td>
                        <td className="jl-td">
                          <span className={`jl-type-badge jl-type-badge--${j.voucherType?.toLowerCase()}`}>
                            {TYPE_LABELS[j.voucherType] || j.voucherType}
                          </span>
                        </td>
                        <td className="jl-td jl-td--desc">{j.description}</td>
                        <td className="jl-td jl-td--account jl-td--debit">{dr}</td>
                        <td className="jl-td jl-td--account jl-td--credit">{cr}</td>
                        <td className="jl-td jl-td--amount">¥{amt.toLocaleString('ja-JP')}</td>
                        <td className="jl-td jl-td--actions">
                          {statusInfo
                            ? <span className={`apv-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                            : canApply
                              ? <button
                                  className="jl-btn apv-btn--apply"
                                  onClick={() => onRequestApproval(j.id, currentUser.id)}
                                >申請</button>
                              : <span style={{ color: 'var(--c-text-muted)', fontSize: 11 }}>—</span>
                          }
                        </td>
                        <td className="jl-td jl-td--actions no-print">
                          <button
                            className="jl-btn jl-btn--edit"
                            disabled={isLocked}
                            title={isLocked ? '申請中・承認済の仕訳は編集できません' : undefined}
                            onClick={() => !isLocked && onEdit(j)}
                          >編集</button>
                          <button
                            className="jl-btn jl-btn--delete"
                            disabled={isLocked}
                            title={isLocked ? '申請中・承認済の仕訳は削除できません' : undefined}
                            onClick={() => {
                              if (!isLocked && window.confirm(`伝票番号 ${j.id} を削除しますか？`)) onDelete(j.id)
                            }}
                          >削除</button>
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
