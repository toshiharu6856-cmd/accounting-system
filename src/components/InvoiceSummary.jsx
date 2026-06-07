import { useState, useMemo } from 'react'
import { TAX_CATEGORIES, TRANSITIONAL_MEASURES } from '../data/invoiceConstants'
import { downloadCsv, todayStamp } from '../utils/csv'

function fmtY(n) { return n == null ? '—' : '¥' + Math.round(n).toLocaleString('ja-JP') }
function fmtDate(d) { return d?.replace(/-/g, '/') || '' }

function parseAmt(v) {
  if (typeof v === 'number') return v
  const n = parseFloat(String(v).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}
function journalTotal(j) {
  return (j.lines || []).reduce((s, l) => s + parseAmt(l.debitAmount), 0)
}

// 行ラベルの生成
function rowLabel(inv) {
  if (!inv.enabled) return null
  const cat = TAX_CATEGORIES.find(c => c.code === inv.taxCategory)
  if (!cat) return null
  if (inv.qualified) return `適格 / ${cat.label}`
  if (!cat.taxable)  return `非適格 / ${cat.label}`
  const tr = TRANSITIONAL_MEASURES.find(m => m.code === inv.transitional)
  return `非適格 / ${cat.label} / ${tr?.label || ''}`
}

function groupKey(inv) {
  if (!inv?.enabled) return null
  const q = inv.qualified ? 'Q' : 'N'
  const tr = (!inv.qualified && TAX_CATEGORIES.find(c => c.code === inv.taxCategory)?.taxable)
    ? `_${inv.transitional}` : ''
  return `${q}_${inv.taxCategory}${tr}`
}

export default function InvoiceSummary({ journals, periodCtx }) {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo,   setDateTo]   = useState('')
  const [qualFilter, setQualFilter] = useState('ALL')
  const [tab, setTab] = useState('summary')

  // インボイス情報ありの仕訳だけを対象にする
  const invJournals = useMemo(() => {
    const base = periodCtx ? periodCtx.periodJournals : journals
    return base.filter(j => j.invoice?.enabled)
  }, [journals, periodCtx])

  const filtered = useMemo(() => {
    return invJournals.filter(j => {
      if (dateFrom && j.date < dateFrom) return false
      if (dateTo   && j.date > dateTo)   return false
      if (qualFilter === 'Q' && !j.invoice.qualified)  return false
      if (qualFilter === 'N' &&  j.invoice.qualified)  return false
      return true
    })
  }, [invJournals, dateFrom, dateTo, qualFilter])

  // グループ集計
  const groups = useMemo(() => {
    const map = {}
    filtered.forEach(j => {
      const inv = j.invoice
      const key = groupKey(inv)
      if (!key) return
      if (!map[key]) {
        map[key] = {
          key,
          label:        rowLabel(inv),
          qualified:    inv.qualified,
          taxCategory:  inv.taxCategory,
          transitional: inv.transitional,
          count:     0,
          base:      0,
          tax:       0,
          total:     0,
          credit:    0,
        }
      }
      map[key].count++
      map[key].base   += inv.baseAmount  || 0
      map[key].tax    += inv.taxAmount   || 0
      map[key].total  += inv.totalAmount || 0
      map[key].credit += inv.creditAmount|| 0
    })
    return Object.values(map).sort((a, b) => {
      const qa = a.qualified ? 0 : 1
      const qb = b.qualified ? 0 : 1
      return qa - qb || a.taxCategory.localeCompare(b.taxCategory)
    })
  }, [filtered])

  const totals = useMemo(() => groups.reduce(
    (s, g) => ({ count: s.count+g.count, base: s.base+g.base, tax: s.tax+g.tax, total: s.total+g.total, credit: s.credit+g.credit }),
    { count: 0, base: 0, tax: 0, total: 0, credit: 0 }
  ), [groups])

  // CSV export (summary)
  function exportSummaryCsv() {
    const header = ['区分', '件数', '税抜金額', '消費税額', '税込金額', '仕入税額控除']
    const rows = groups.map(g => [g.label, g.count, g.base, g.tax, g.total, g.credit])
    rows.push(['合計', totals.count, totals.base, totals.tax, totals.total, totals.credit])
    downloadCsv(`インボイス集計_${todayStamp()}.csv`, [header, ...rows])
  }

  // CSV export (detail)
  function exportDetailCsv() {
    const header = ['日付','伝票番号','摘要','適格区分','登録番号','消費税区分','税抜金額','消費税額','税込金額','仕入税額控除','経過措置']
    const rows = filtered.map(j => {
      const inv = j.invoice
      const cat = TAX_CATEGORIES.find(c => c.code === inv.taxCategory)?.label || inv.taxCategory
      const tr  = inv.qualified ? '—' : (TRANSITIONAL_MEASURES.find(m => m.code === inv.transitional)?.label || '—')
      return [
        j.date, j.id, j.description || '',
        inv.qualified ? '適格' : '非適格',
        inv.invoiceNo || '—',
        cat,
        inv.baseAmount, inv.taxAmount, inv.totalAmount, inv.creditAmount,
        tr,
      ]
    })
    downloadCsv(`インボイス明細_${todayStamp()}.csv`, [header, ...rows])
  }

  const catName = code => TAX_CATEGORIES.find(c => c.code === code)?.label || code

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › インボイス集計</div>
        <div className="je__title-row">
          <h1 className="je__title">インボイス集計</h1>
          <span className="je__spec-badge">{filtered.length} 件</span>
        </div>
      </div>

      {/* フィルター */}
      <section className="je-card no-print">
        <div className="je-card__body">
          <div className="jl-filter">
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
                <label className="je-label">適格区分</label>
                <select className="je-select" value={qualFilter} onChange={e => setQualFilter(e.target.value)}>
                  <option value="ALL">すべて</option>
                  <option value="Q">適格のみ</option>
                  <option value="N">非適格のみ</option>
                </select>
              </div>
              <div className="jl-filter-field jl-filter-field--btn" style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <button className="je-btn je-btn--outline" onClick={exportSummaryCsv} disabled={groups.length === 0}>
                  📄 集計CSV
                </button>
                <button className="je-btn je-btn--outline" onClick={exportDetailCsv} disabled={filtered.length === 0}>
                  📄 明細CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* タブ */}
      <div className="apv-filter-tabs no-print" style={{ marginBottom: 12 }}>
        <button className={`apv-filter-tab ${tab === 'summary' ? 'apv-filter-tab--active' : ''}`} onClick={() => setTab('summary')}>集計表</button>
        <button className={`apv-filter-tab ${tab === 'detail'  ? 'apv-filter-tab--active' : ''}`} onClick={() => setTab('detail')}>明細一覧</button>
      </div>

      {filtered.length === 0 ? (
        <section className="je-card">
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-muted)' }}>
            インボイス情報を持つ仕訳がありません。<br />
            仕訳入力画面でインボイス情報を入力してください。
          </div>
        </section>
      ) : tab === 'summary' ? (
        /* 集計表 */
        <section className="je-card">
          <div className="je-card__header"><h2 className="je-card__title">消費税区分別 集計</h2></div>
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">適格区分</th>
                    <th className="jl-th">消費税区分</th>
                    <th className="jl-th">経過措置</th>
                    <th className="jl-th jl-th--right">件数</th>
                    <th className="jl-th jl-th--right">税抜金額</th>
                    <th className="jl-th jl-th--right">消費税額</th>
                    <th className="jl-th jl-th--right">税込金額</th>
                    <th className="jl-th jl-th--right">仕入税額控除</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map((g, i) => {
                    const tr = (!g.qualified && g.transitional)
                      ? TRANSITIONAL_MEASURES.find(m => m.code === g.transitional)
                      : null
                    return (
                      <tr key={g.key} className={`jl-tr ${i % 2 ? 'jl-tr--alt' : ''}`}>
                        <td className="jl-td">
                          <span className={`inv-badge ${g.qualified ? 'inv-badge--qualified' : 'inv-badge--non'}`}>
                            {g.qualified ? '適格' : '非適格'}
                          </span>
                        </td>
                        <td className="jl-td" style={{ fontSize: 13 }}>{catName(g.taxCategory)}</td>
                        <td className="jl-td" style={{ fontSize: 12, color: 'var(--c-text-2)' }}>
                          {tr ? <span className="inv-trans-label">{tr.label}</span> : '—'}
                        </td>
                        <td className="jl-td jl-td--amount">{g.count}</td>
                        <td className="jl-td jl-td--amount">{fmtY(g.base)}</td>
                        <td className="jl-td jl-td--amount">{g.tax > 0 ? fmtY(g.tax) : '—'}</td>
                        <td className="jl-td jl-td--amount">{fmtY(g.total)}</td>
                        <td className="jl-td jl-td--amount" style={{ fontWeight: 600 }}>
                          {g.tax > 0 ? fmtY(g.credit) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="inv-summary-total">
                    <td className="jl-td" colSpan={3}><strong>合計</strong></td>
                    <td className="jl-td jl-td--amount"><strong>{totals.count}</strong></td>
                    <td className="jl-td jl-td--amount"><strong>{fmtY(totals.base)}</strong></td>
                    <td className="jl-td jl-td--amount"><strong>{fmtY(totals.tax)}</strong></td>
                    <td className="jl-td jl-td--amount"><strong>{fmtY(totals.total)}</strong></td>
                    <td className="jl-td jl-td--amount" style={{ color: 'var(--c-primary)', fontWeight: 700 }}>
                      <strong>{fmtY(totals.credit)}</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      ) : (
        /* 明細一覧 */
        <section className="je-card">
          <div className="je-card__header"><h2 className="je-card__title">明細一覧</h2></div>
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">日付</th>
                    <th className="jl-th">伝票番号</th>
                    <th className="jl-th">摘要</th>
                    <th className="jl-th">適格区分</th>
                    <th className="jl-th">登録番号</th>
                    <th className="jl-th">消費税区分</th>
                    <th className="jl-th jl-th--right">税抜金額</th>
                    <th className="jl-th jl-th--right">消費税額</th>
                    <th className="jl-th jl-th--right">税込金額</th>
                    <th className="jl-th jl-th--right">仕入税額控除</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map((j, i) => {
                    const inv = j.invoice
                    const tr = (!inv.qualified && inv.transitional)
                      ? TRANSITIONAL_MEASURES.find(m => m.code === inv.transitional)
                      : null
                    return (
                      <tr key={j.id} className={`jl-tr ${i % 2 ? 'jl-tr--alt' : ''}`}>
                        <td className="jl-td jl-td--date">{fmtDate(j.date)}</td>
                        <td className="jl-td jl-td--voucher">{j.id}</td>
                        <td className="jl-td jl-td--desc">{j.description || '—'}</td>
                        <td className="jl-td">
                          <span className={`inv-badge ${inv.qualified ? 'inv-badge--qualified' : 'inv-badge--non'}`}>
                            {inv.qualified ? '適格' : '非適格'}
                          </span>
                          {tr && <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginTop: 2 }}>{tr.label}</div>}
                        </td>
                        <td className="jl-td" style={{ fontSize: 12, fontFamily: 'monospace' }}>
                          {inv.invoiceNo || '—'}
                        </td>
                        <td className="jl-td" style={{ fontSize: 12 }}>{catName(inv.taxCategory)}</td>
                        <td className="jl-td jl-td--amount">{fmtY(inv.baseAmount)}</td>
                        <td className="jl-td jl-td--amount">{inv.taxAmount > 0 ? fmtY(inv.taxAmount) : '—'}</td>
                        <td className="jl-td jl-td--amount">{fmtY(inv.totalAmount)}</td>
                        <td className="jl-td jl-td--amount" style={{ fontWeight: 600 }}>
                          {inv.taxAmount > 0 ? fmtY(inv.creditAmount) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
