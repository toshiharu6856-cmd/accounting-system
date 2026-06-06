import { useState, useMemo } from 'react'
import PeriodSelector from './PeriodSelector'
import { parseAmt } from '../utils/accounting'

function fmt(n) {
  if (n === 0) return '—'
  return (n < 0 ? '-' : '') + '¥ ' + Math.abs(n).toLocaleString('ja-JP')
}

function fmtNum(n) {
  return (n < 0 ? '-' : '') + Math.abs(n).toLocaleString('ja-JP')
}

function calcDeptPL(journals, accounts, deptCode) {
  const revenueAccounts = accounts.filter(a => a.category === 'REVENUE')
  const expenseAccounts = accounts.filter(a => a.category === 'EXPENSE')

  const filtered = deptCode
    ? journals.filter(j => j.deptCode === deptCode)
    : journals

  function sumAccount(code) {
    let dr = 0, cr = 0
    filtered.forEach(j => {
      j.lines.forEach(l => {
        if (l.debitCode  === code) dr += parseAmt(l.debitAmount)
        if (l.creditCode === code) cr += parseAmt(l.creditAmount)
      })
    })
    const acc = accounts.find(a => a.code === code)
    if (!acc) return 0
    return acc.normalBalance === 'DEBIT' ? dr - cr : cr - dr
  }

  const revenues = revenueAccounts.map(a => ({ ...a, amount: sumAccount(a.code) })).filter(a => a.amount !== 0)
  const expenses = expenseAccounts.map(a => ({ ...a, amount: sumAccount(a.code) })).filter(a => a.amount !== 0)
  const totalRevenue = revenues.reduce((s, a) => s + a.amount, 0)
  const totalExpense = expenses.reduce((s, a) => s + a.amount, 0)
  return { revenues, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense }
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

export default function DeptPL({ journals, accounts, departments, periodCtx, budgets = [] }) {
  const { period, setPeriod, availableYears, periodJournals, label } = periodCtx
  const [selectedDept, setSelectedDept] = useState('ALL')
  const [budgetVersion, setBudgetVersion] = useState('INITIAL')

  const activeDepts = useMemo(
    () => departments.filter(d => d.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder),
    [departments]
  )

  const budgetData = useMemo(() => {
    return budgets.find(b => b.fiscalYear === String(period.year) && b.version === budgetVersion) || null
  }, [budgets, period.year, budgetVersion])

  function getBudgetAmount(deptCode, accountCode) {
    if (!budgetData) return 0
    const monthStr = period.month ? String(period.month).padStart(2, '0') : null
    return budgetData.entries
      .filter(e =>
        (deptCode === 'ALL' || e.deptCode === deptCode) &&
        e.accountCode === accountCode &&
        (monthStr === null || e.month === monthStr)
      )
      .reduce((s, e) => s + e.amount, 0)
  }

  const deptList = useMemo(() => {
    if (selectedDept !== 'ALL') {
      const dept = activeDepts.find(d => d.code === selectedDept)
      return dept ? [dept] : []
    }
    return activeDepts
  }, [selectedDept, activeDepts])

  const deptResults = useMemo(() => {
    return deptList.map(dept => ({
      dept,
      pl: calcDeptPL(periodJournals, accounts, dept.code),
    }))
  }, [deptList, periodJournals, accounts])

  const allAccountCodes = useMemo(() => {
    const rev = new Set(), exp = new Set()
    deptResults.forEach(({ pl }) => {
      pl.revenues.forEach(a => rev.add(a.code))
      pl.expenses.forEach(a => exp.add(a.code))
    })
    return {
      revenues: [...rev].map(code => accounts.find(a => a.code === code)).filter(Boolean),
      expenses: [...exp].map(code => accounts.find(a => a.code === code)).filter(Boolean),
    }
  }, [deptResults, accounts])

  function handleCSV() {
    const VERSIONS = { INITIAL: '当初予算', REVISED: '補正予算', FORECAST: '着地見込' }
    const header = ['科目', '種別', ...deptList.map(d => `${d.name}(実績)`), ...deptList.map(d => `${d.name}(${VERSIONS[budgetVersion]}予算)`), ...deptList.map(d => `${d.name}(差異)`)]
    const rows = [header]

    function addRows(accts, type) {
      accts.forEach(acc => {
        const actuals = deptList.map(dept => {
          const r = deptResults.find(dr => dr.dept.code === dept.code)
          const a = r?.pl[type === '収益' ? 'revenues' : 'expenses'].find(x => x.code === acc.code)
          return a?.amount ?? 0
        })
        const budgetsRow = deptList.map(dept => getBudgetAmount(dept.code, acc.code))
        const variances = actuals.map((a, i) => a - budgetsRow[i])
        rows.push([`${acc.code} ${acc.name}`, type, ...actuals.map(fmtNum), ...budgetsRow.map(fmtNum), ...variances.map(fmtNum)])
      })
    }

    addRows(allAccountCodes.revenues, '収益')
    addRows(allAccountCodes.expenses, '費用')

    const totRevActual  = deptList.map(d => deptResults.find(r => r.dept.code === d.code)?.pl.totalRevenue ?? 0)
    const totExpActual  = deptList.map(d => deptResults.find(r => r.dept.code === d.code)?.pl.totalExpense ?? 0)
    const netActual     = deptList.map(d => deptResults.find(r => r.dept.code === d.code)?.pl.netIncome   ?? 0)
    rows.push(['収益合計', '収益', ...totRevActual.map(fmtNum), ...Array(deptList.length * 2).fill('')])
    rows.push(['費用合計', '費用', ...totExpActual.map(fmtNum), ...Array(deptList.length * 2).fill('')])
    rows.push(['当期純損益', '損益', ...netActual.map(fmtNum), ...Array(deptList.length * 2).fill('')])

    exportCSV(rows, `部門別損益_${label}.csv`)
  }

  const VERSIONS = { INITIAL: '当初予算', REVISED: '補正予算', FORECAST: '着地見込' }

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 部門別損益</div>
        <div className="je__title-row">
          <h1 className="je__title">部門別損益管理</h1>
        </div>
      </div>

      <div className="je-card no-print">
        <div className="je-card__header">
          <h2 className="je-card__title">表示条件</h2>
          <div className="je-card__header-actions">
            <button className="je-btn je-btn--secondary" onClick={() => window.print()}>印刷</button>
            <button className="je-btn je-btn--primary" onClick={handleCSV}>CSV出力</button>
          </div>
        </div>
        <div className="je-card__body">
          <div className="dpl-filter">
            <PeriodSelector period={period} setPeriod={setPeriod} availableYears={availableYears} />

            <div className="je-field" style={{ minWidth: 180 }}>
              <label className="je-label">部門</label>
              <select className="je-select" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                <option value="ALL">全部門</option>
                {activeDepts.map(d => (
                  <option key={d.id} value={d.code}>{d.code} {d.name}</option>
                ))}
              </select>
            </div>

            <div className="je-field" style={{ minWidth: 160 }}>
              <label className="je-label">予算バージョン</label>
              <select className="je-select" value={budgetVersion} onChange={e => setBudgetVersion(e.target.value)}>
                <option value="INITIAL">当初予算</option>
                <option value="REVISED">補正予算</option>
                <option value="FORECAST">着地見込</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="print-area">
        <div className="dpl-print-header" style={{ display: 'none' }}>
          <h2>部門別損益計算書</h2>
          <p>{label}　比較: {VERSIONS[budgetVersion]}</p>
        </div>

        {deptResults.length === 0 ? (
          <div className="je-card">
            <div className="jl-empty-cell">対象データがありません</div>
          </div>
        ) : (
          <div className="je-card">
            <div className="je-card__header">
              <h2 className="je-card__title">{label}　部門別損益一覧</h2>
              <span className="je-card__title-sub">比較予算: {VERSIONS[budgetVersion]}</span>
            </div>
            <div className="je-card__body je-card__body--flush">
              <div className="je-table-wrap">
                <table className="dpl-table">
                  <thead>
                    <tr>
                      <th className="dpl-th dpl-th--name" rowSpan={2}>科目</th>
                      {deptList.map(d => (
                        <th key={d.id} className="dpl-th" colSpan={3}>{d.name}</th>
                      ))}
                    </tr>
                    <tr>
                      {deptList.map(d => (
                        <>
                          <th key={`${d.id}-actual`}  className="dpl-th dpl-th--num">実績</th>
                          <th key={`${d.id}-budget`}  className="dpl-th dpl-th--num">予算</th>
                          <th key={`${d.id}-var`}     className="dpl-th dpl-th--num">差異</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* 収益セクション */}
                    <tr className="dpl-section-row dpl-section-row--revenue">
                      <td colSpan={1 + deptList.length * 3} className="dpl-section-label">収益</td>
                    </tr>
                    {allAccountCodes.revenues.map(acc => (
                      <tr key={acc.code} className="dpl-row">
                        <td className="dpl-td dpl-td--name">
                          <span className="fs-code">{acc.code}</span> {acc.name}
                        </td>
                        {deptList.map(dept => {
                          const r = deptResults.find(dr => dr.dept.code === dept.code)
                          const actual = r?.pl.revenues.find(x => x.code === acc.code)?.amount ?? 0
                          const budget = getBudgetAmount(dept.code, acc.code)
                          const variance = actual - budget
                          return (
                            <>
                              <td key={`${dept.code}-a`} className="dpl-td dpl-td--num">{fmt(actual)}</td>
                              <td key={`${dept.code}-b`} className="dpl-td dpl-td--num dpl-budget">{fmt(budget)}</td>
                              <td key={`${dept.code}-v`} className={`dpl-td dpl-td--num dpl-var ${budget > 0 ? (variance >= 0 ? 'dpl-var--good' : 'dpl-var--bad') : ''}`}>{budget > 0 ? fmt(variance) : '—'}</td>
                            </>
                          )
                        })}
                      </tr>
                    ))}
                    <tr className="dpl-subtotal-row">
                      <td className="dpl-td dpl-td--name dpl-subtotal-label">収益合計</td>
                      {deptList.map(dept => {
                        const r = deptResults.find(dr => dr.dept.code === dept.code)
                        const actual = r?.pl.totalRevenue ?? 0
                        const budget = allAccountCodes.revenues.reduce((s, a) => s + getBudgetAmount(dept.code, a.code), 0)
                        const variance = actual - budget
                        return (
                          <>
                            <td key={`${dept.code}-ra`} className="dpl-td dpl-td--num dpl-subtotal-val dpl-revenue">{fmt(actual)}</td>
                            <td key={`${dept.code}-rb`} className="dpl-td dpl-td--num dpl-subtotal-val dpl-budget">{fmt(budget)}</td>
                            <td key={`${dept.code}-rv`} className={`dpl-td dpl-td--num dpl-subtotal-val dpl-var ${budget > 0 ? (variance >= 0 ? 'dpl-var--good' : 'dpl-var--bad') : ''}`}>{budget > 0 ? fmt(variance) : '—'}</td>
                          </>
                        )
                      })}
                    </tr>

                    {/* 費用セクション */}
                    <tr className="dpl-section-row dpl-section-row--expense">
                      <td colSpan={1 + deptList.length * 3} className="dpl-section-label">費用</td>
                    </tr>
                    {allAccountCodes.expenses.map(acc => (
                      <tr key={acc.code} className="dpl-row">
                        <td className="dpl-td dpl-td--name">
                          <span className="fs-code">{acc.code}</span> {acc.name}
                        </td>
                        {deptList.map(dept => {
                          const r = deptResults.find(dr => dr.dept.code === dept.code)
                          const actual = r?.pl.expenses.find(x => x.code === acc.code)?.amount ?? 0
                          const budget = getBudgetAmount(dept.code, acc.code)
                          const variance = budget - actual
                          return (
                            <>
                              <td key={`${dept.code}-a`} className="dpl-td dpl-td--num">{fmt(actual)}</td>
                              <td key={`${dept.code}-b`} className="dpl-td dpl-td--num dpl-budget">{fmt(budget)}</td>
                              <td key={`${dept.code}-v`} className={`dpl-td dpl-td--num dpl-var ${budget > 0 ? (variance >= 0 ? 'dpl-var--good' : 'dpl-var--bad') : ''}`}>{budget > 0 ? fmt(variance) : '—'}</td>
                            </>
                          )
                        })}
                      </tr>
                    ))}
                    <tr className="dpl-subtotal-row">
                      <td className="dpl-td dpl-td--name dpl-subtotal-label">費用合計</td>
                      {deptList.map(dept => {
                        const r = deptResults.find(dr => dr.dept.code === dept.code)
                        const actual = r?.pl.totalExpense ?? 0
                        const budget = allAccountCodes.expenses.reduce((s, a) => s + getBudgetAmount(dept.code, a.code), 0)
                        const variance = budget - actual
                        return (
                          <>
                            <td key={`${dept.code}-ea`} className="dpl-td dpl-td--num dpl-subtotal-val dpl-expense">{fmt(actual)}</td>
                            <td key={`${dept.code}-eb`} className="dpl-td dpl-td--num dpl-subtotal-val dpl-budget">{fmt(budget)}</td>
                            <td key={`${dept.code}-ev`} className={`dpl-td dpl-td--num dpl-subtotal-val dpl-var ${budget > 0 ? (variance >= 0 ? 'dpl-var--good' : 'dpl-var--bad') : ''}`}>{budget > 0 ? fmt(variance) : '—'}</td>
                          </>
                        )
                      })}
                    </tr>

                    {/* 当期純損益 */}
                    {deptList.map((dept, i) => null) && null}
                  </tbody>
                  <tfoot>
                    <tr className="dpl-net-row">
                      <td className="dpl-td dpl-td--name dpl-net-label">当期純損益</td>
                      {deptList.map(dept => {
                        const r = deptResults.find(dr => dr.dept.code === dept.code)
                        const net = r?.pl.netIncome ?? 0
                        return (
                          <td key={dept.code} colSpan={3} className={`dpl-td dpl-td--num dpl-net-val ${net >= 0 ? 'dpl-net--profit' : 'dpl-net--loss'}`}>
                            {fmt(net)}
                          </td>
                        )
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
