import { useState, useMemo, useCallback } from 'react'
import { parseAmt } from '../utils/accounting'
import { BUDGET_VERSIONS } from '../hooks/useBudget'

function fmt(n) {
  if (n === 0) return ''
  return n.toLocaleString('ja-JP')
}

function rateColor(rate, isExpense) {
  if (rate === null) return ''
  if (isExpense) {
    if (rate > 1.1) return 'bm-cell--over'
    if (rate > 1.0) return 'bm-cell--warn'
    return 'bm-cell--ok'
  } else {
    if (rate >= 1.0) return 'bm-cell--ok'
    if (rate >= 0.9) return 'bm-cell--warn'
    return 'bm-cell--over'
  }
}

function exportCSV(rows, filename) {
  const bom = '﻿'
  const csv = bom + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function BudgetManagement({
  journals, accounts, departments,
  budgets, getBudget, saveBudgetBulk, deleteBudget,
  periodCtx,
}) {
  const firstMonth   = periodCtx?.firstMonth ?? 1
  const fiscalMonths = periodCtx?.fiscalMonths ?? [1,2,3,4,5,6,7,8,9,10,11,12]
  const companies    = periodCtx?.companies ?? []
  const selectedCompanyId   = periodCtx?.selectedCompanyId
  const setSelectedCompanyId = periodCtx?.setSelectedCompanyId

  // 事業年度順の月リスト（2桁文字列）
  const ORDERED_MONTHS = fiscalMonths.map(m => String(m).padStart(2, '0'))
  const ORDERED_LABELS = fiscalMonths.map(m => `${m}月`)

  const currentYear = new Date().getFullYear()
  const [fiscalYear,   setFiscalYear]   = useState(String(periodCtx?.period?.year ?? currentYear))
  const [version,      setVersion]      = useState('INITIAL')
  const [selectedDept, setSelectedDept] = useState('')
  const [viewMode,     setViewMode]     = useState('input')

  const activeDepts = useMemo(
    () => departments.filter(d => d.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [departments]
  )

  const plAccounts = useMemo(() => {
    const rev = accounts.filter(a => a.category === 'REVENUE' && a.isActive !== false)
    const exp = accounts.filter(a => a.category === 'EXPENSE' && a.isActive !== false)
    return { revenues: rev, expenses: exp }
  }, [accounts])

  const budgetData = useMemo(() => getBudget(fiscalYear, version), [budgets, fiscalYear, version])

  const [localEntries, setLocalEntries] = useState(() => budgetData?.entries ? [...budgetData.entries] : [])
  useMemo(() => { setLocalEntries(budgetData?.entries ? [...budgetData.entries] : []) }, [budgetData])

  function getEntry(deptCode, accountCode, month) {
    return localEntries.find(e =>
      e.deptCode === deptCode && e.accountCode === accountCode && e.month === month
    )?.amount ?? 0
  }

  function setEntry(deptCode, accountCode, month, raw) {
    const amount = parseAmt(String(raw).replace(/,/g, ''))
    setLocalEntries(prev => {
      const filtered = prev.filter(e =>
        !(e.deptCode === deptCode && e.accountCode === accountCode && e.month === month)
      )
      return amount > 0 ? [...filtered, { deptCode, accountCode, month, amount }] : filtered
    })
  }

  // 月文字列（'01'〜'12'）に対応するカレンダー年を返す
  function getCalYear(month2d) {
    const calMonth = parseInt(month2d, 10)
    return calMonth >= firstMonth ? parseInt(fiscalYear, 10) : parseInt(fiscalYear, 10) + 1
  }

  function getActualForAccount(acc, month2d) {
    let dr = 0, cr = 0
    const calYear = getCalYear(month2d)
    const prefix = `${calYear}-${month2d}`
    journals.forEach(j => {
      if (!j.date.startsWith(prefix)) return
      if (selectedDept && j.deptCode !== selectedDept) return
      j.lines.forEach(l => {
        if (l.debitCode  === acc.code) dr += parseAmt(l.debitAmount)
        if (l.creditCode === acc.code) cr += parseAmt(l.creditAmount)
      })
    })
    return acc.normalBalance === 'DEBIT' ? dr - cr : cr - dr
  }

  function handleSave() {
    saveBudgetBulk(fiscalYear, version, localEntries)
    alert('予算を保存しました')
  }

  function handleDelete() {
    const vName = BUDGET_VERSIONS.find(v2 => v2.code === version)?.name || version
    if (!window.confirm(`${fiscalYear}年度 ${vName} を削除しますか？`)) return
    deleteBudget(fiscalYear, version)
    setLocalEntries([])
  }

  function handleCSV() {
    const vName = BUDGET_VERSIONS.find(v2 => v2.code === version)?.name || version
    const deptName = selectedDept
      ? (activeDepts.find(d => d.code === selectedDept)?.name || selectedDept)
      : '全部門'
    const header = ['科目コード', '科目名', '種別',
      ...ORDERED_LABELS.flatMap(m => [m + '予算', m + '実績', m + '差異']),
      '年間予算合計', '年間実績合計',
    ]
    const rows = [header]
    function addRows(accts, type, isExpense) {
      accts.forEach(acc => {
        const cols = []
        let tb = 0, ta = 0
        ORDERED_MONTHS.forEach(mo => {
          const b = getEntry(selectedDept, acc.code, mo)
          const a = getActualForAccount(acc, mo)
          const v = isExpense ? b - a : a - b
          tb += b; ta += a
          cols.push(b, a, v)
        })
        rows.push([acc.code, acc.name, type, ...cols, tb, ta])
      })
    }
    addRows(plAccounts.revenues, '収益', false)
    addRows(plAccounts.expenses, '費用', true)
    exportCSV(rows, `予算管理_${fiscalYear}_${vName}_${deptName}.csv`)
  }

  const yearOptions = useMemo(() => {
    const years = new Set()
    journals.forEach(j => years.add(j.date.slice(0, 4)))
    years.add(String(currentYear))
    years.add(String(currentYear + 1))
    return [...years].sort((a, b) => b.localeCompare(a))
  }, [journals, currentYear])

  const deptLabel = selectedDept
    ? (activeDepts.find(d => d.code === selectedDept)?.name || selectedDept)
    : '全部門'

  const activeCompanies = companies.filter(c => c.isActive !== false)

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 予算管理</div>
        <div className="je__title-row">
          <h1 className="je__title">予算管理</h1>
        </div>
      </div>

      <div className="je-card no-print">
        <div className="je-card__header">
          <h2 className="je-card__title">表示・編集条件</h2>
          <div className="je-card__header-actions">
            <button className="je-btn je-btn--outline" onClick={handleCSV}>CSV出力</button>
            {budgetData && (
              <button className="je-btn je-btn--outline" style={{ color: 'var(--c-error)' }} onClick={handleDelete}>削除</button>
            )}
            <button className="je-btn je-btn--primary" onClick={handleSave}>保存</button>
          </div>
        </div>
        <div className="je-card__body">
          <div className="dpl-filter">
            {activeCompanies.length > 1 && (
              <div className="je-field" style={{ minWidth: 180 }}>
                <label className="je-label">会社</label>
                <select className="je-select" value={selectedCompanyId || ''} onChange={e => setSelectedCompanyId?.(e.target.value)}>
                  {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="je-field" style={{ minWidth: 120 }}>
              <label className="je-label">年度</label>
              <select className="je-select" value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}>
                {yearOptions.map(y => <option key={y} value={y}>{y}年度</option>)}
              </select>
            </div>
            <div className="je-field" style={{ minWidth: 160 }}>
              <label className="je-label">予算バージョン</label>
              <select className="je-select" value={version} onChange={e => setVersion(e.target.value)}>
                {BUDGET_VERSIONS.map(v2 => (
                  <option key={v2.code} value={v2.code}>{v2.name}</option>
                ))}
              </select>
            </div>
            <div className="je-field" style={{ minWidth: 180 }}>
              <label className="je-label">部門</label>
              <select className="je-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                <option value="">全部門</option>
                {activeDepts.map(d => (
                  <option key={d.id} value={d.code}>{d.code} {d.name}</option>
                ))}
              </select>
            </div>
            <div className="je-field" style={{ minWidth: 160 }}>
              <label className="je-label">表示モード</label>
              <select className="je-select" value={viewMode} onChange={e => setViewMode(e.target.value)}>
                <option value="input">予算入力</option>
                <option value="compare">予実対比</option>
              </select>
            </div>
          </div>
          {budgetData && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--c-text-2)' }}>
              最終更新: {new Date(budgetData.updatedAt).toLocaleString('ja-JP')}　全{budgetData.entries.length}件
            </div>
          )}
        </div>
      </div>

      <div className="je-card">
        <div className="je-card__header">
          <h2 className="je-card__title">
            {fiscalYear}年度　{BUDGET_VERSIONS.find(v2 => v2.code === version)?.name}
            <span style={{ marginLeft: 12, fontWeight: 400, fontSize: 13, color: 'var(--c-text-2)' }}>{deptLabel}</span>
          </h2>
          {viewMode === 'compare' && (
            <div className="bm-legend">
              <span className="bm-legend-item bm-cell--ok">達成</span>
              <span className="bm-legend-item bm-cell--warn">要注意</span>
              <span className="bm-legend-item bm-cell--over">超過/未達</span>
            </div>
          )}
        </div>
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="bm-table">
              <thead>
                <tr>
                  <th className="bm-th bm-th--name">科目</th>
                  {ORDERED_MONTHS.map((mo, i) => (
                    <th key={mo} className="bm-th bm-th--month" colSpan={viewMode === 'compare' ? 2 : 1}>
                      {ORDERED_LABELS[i]}
                    </th>
                  ))}
                  <th className="bm-th bm-th--total" colSpan={viewMode === 'compare' ? 2 : 1}>年間合計</th>
                </tr>
                {viewMode === 'compare' && (
                  <tr>
                    <th className="bm-th bm-th--name"></th>
                    {ORDERED_MONTHS.map(mo => (
                      <>
                        <th key={`${mo}-b`} className="bm-th bm-th--sub">予算</th>
                        <th key={`${mo}-a`} className="bm-th bm-th--sub">実績</th>
                      </>
                    ))}
                    <th className="bm-th bm-th--sub">予算計</th>
                    <th className="bm-th bm-th--sub">実績計</th>
                  </tr>
                )}
              </thead>
              <tbody>
                <BudgetSection
                  title="収益"
                  accts={plAccounts.revenues}
                  isExpense={false}
                  viewMode={viewMode}
                  selectedDept={selectedDept}
                  months={ORDERED_MONTHS}
                  monthLabels={ORDERED_LABELS}
                  getEntry={getEntry}
                  setEntry={setEntry}
                  getActual={getActualForAccount}
                />
                <BudgetSection
                  title="費用"
                  accts={plAccounts.expenses}
                  isExpense={true}
                  viewMode={viewMode}
                  selectedDept={selectedDept}
                  months={ORDERED_MONTHS}
                  monthLabels={ORDERED_LABELS}
                  getEntry={getEntry}
                  setEntry={setEntry}
                  getActual={getActualForAccount}
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function BudgetSection({ title, accts, isExpense, viewMode, selectedDept, months, monthLabels, getEntry, setEntry, getActual }) {
  const sectionClass = isExpense ? 'dpl-section-row--expense' : 'dpl-section-row--revenue'
  const cols = viewMode === 'compare' ? months.length * 2 + 2 : months.length + 1
  return (
    <>
      <tr className={`dpl-section-row ${sectionClass}`}>
        <td colSpan={1 + cols} className="dpl-section-label">{title}</td>
      </tr>
      {accts.map(acc => (
        <BudgetRow
          key={acc.code}
          acc={acc}
          isExpense={isExpense}
          viewMode={viewMode}
          selectedDept={selectedDept}
          months={months}
          getEntry={getEntry}
          setEntry={setEntry}
          getActual={getActual}
        />
      ))}
      <BudgetSubtotalRow
        title={title + '合計'}
        accts={accts}
        isExpense={isExpense}
        viewMode={viewMode}
        selectedDept={selectedDept}
        months={months}
        getEntry={getEntry}
        getActual={getActual}
      />
    </>
  )
}

function BudgetRow({ acc, isExpense, viewMode, selectedDept, months, getEntry, setEntry, getActual }) {
  const [editing, setEditing] = useState({})

  function handleChange(month, val) {
    setEditing(prev => ({ ...prev, [month]: val }))
  }
  function handleBlur(month, val) {
    const n = parseAmt(String(val).replace(/,/g, ''))
    setEntry(selectedDept, acc.code, month, n)
    setEditing(prev => { const next = { ...prev }; delete next[month]; return next })
  }

  let totalBudget = 0, totalActual = 0
  months.forEach(mo => {
    totalBudget += getEntry(selectedDept, acc.code, mo)
    totalActual += getActual(acc, mo)
  })

  return (
    <tr className="bm-row">
      <td className="bm-td bm-td--name">
        <span className="fs-code">{acc.code}</span> {acc.name}
      </td>
      {months.map(mo => {
        const budget = getEntry(selectedDept, acc.code, mo)
        const actual = getActual(acc, mo)
        const rate   = budget > 0 ? actual / budget : null
        const color  = rateColor(rate, isExpense)
        if (viewMode === 'compare') {
          return (
            <>
              <td key={`${mo}-b`} className="bm-td bm-td--num">{budget > 0 ? fmt(budget) : ''}</td>
              <td key={`${mo}-a`} className={`bm-td bm-td--num ${color}`}>
                {actual !== 0 ? fmt(actual) : ''}
                {rate !== null && <div className="bm-rate">{(rate * 100).toFixed(0)}%</div>}
              </td>
            </>
          )
        }
        const displayVal = editing[mo] !== undefined
          ? editing[mo]
          : (budget > 0 ? fmt(budget) : '')
        return (
          <td key={mo} className="bm-td bm-td--input">
            <input
              className="bm-input"
              type="text"
              inputMode="numeric"
              value={displayVal}
              onChange={e => handleChange(mo, e.target.value)}
              onBlur={e => handleBlur(mo, e.target.value)}
              placeholder="0"
            />
          </td>
        )
      })}
      {viewMode === 'compare' ? (
        <>
          <td className="bm-td bm-td--num bm-subtotal">{totalBudget > 0 ? fmt(totalBudget) : ''}</td>
          <td className={`bm-td bm-td--num bm-subtotal ${rateColor(totalBudget > 0 ? totalActual / totalBudget : null, isExpense)}`}>
            {totalActual !== 0 ? fmt(totalActual) : ''}
            {totalBudget > 0 && <div className="bm-rate">{((totalActual / totalBudget) * 100).toFixed(0)}%</div>}
          </td>
        </>
      ) : (
        <td className="bm-td bm-td--num bm-subtotal">{totalBudget > 0 ? fmt(totalBudget) : ''}</td>
      )}
    </tr>
  )
}

function BudgetSubtotalRow({ title, accts, isExpense, viewMode, selectedDept, months, getEntry, getActual }) {
  return (
    <tr className="dpl-subtotal-row">
      <td className="bm-td bm-td--name dpl-subtotal-label">{title}</td>
      {months.map(mo => {
        const tb = accts.reduce((s, a) => s + getEntry(selectedDept, a.code, mo), 0)
        const ta = accts.reduce((s, a) => s + getActual(a, mo), 0)
        const rate = tb > 0 ? ta / tb : null
        const color = rateColor(rate, isExpense)
        if (viewMode === 'compare') {
          return (
            <>
              <td key={`${mo}-b`} className="bm-td bm-td--num dpl-subtotal-val">{tb > 0 ? fmt(tb) : '—'}</td>
              <td key={`${mo}-a`} className={`bm-td bm-td--num dpl-subtotal-val ${color}`}>
                {ta !== 0 ? fmt(ta) : '—'}
                {rate !== null && <div className="bm-rate">{(rate * 100).toFixed(0)}%</div>}
              </td>
            </>
          )
        }
        return (
          <td key={mo} className="bm-td bm-td--num dpl-subtotal-val">{tb > 0 ? fmt(tb) : '—'}</td>
        )
      })}
      {(() => {
        const tb = accts.reduce((s, a) => months.reduce((ss, mo) => ss + getEntry(selectedDept, a.code, mo), s), 0)
        const ta = accts.reduce((s, a) => months.reduce((ss, mo) => ss + getActual(a, mo), s), 0)
        const rate = tb > 0 ? ta / tb : null
        const color = rateColor(rate, isExpense)
        return viewMode === 'compare' ? (
          <>
            <td className="bm-td bm-td--num dpl-subtotal-val">{tb > 0 ? fmt(tb) : '—'}</td>
            <td className={`bm-td bm-td--num dpl-subtotal-val ${color}`}>
              {ta !== 0 ? fmt(ta) : '—'}
              {rate !== null && <div className="bm-rate">{(rate * 100).toFixed(0)}%</div>}
            </td>
          </>
        ) : (
          <td className="bm-td bm-td--num dpl-subtotal-val">{tb > 0 ? fmt(tb) : '—'}</td>
        )
      })()}
    </tr>
  )
}
