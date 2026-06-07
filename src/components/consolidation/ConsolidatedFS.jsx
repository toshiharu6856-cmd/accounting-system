import { useState, useMemo } from 'react'
import { getPLSummary, getBSSummary } from '../../utils/accounting'
import { downloadCsv, todayStamp } from '../../utils/csv'
import { PKG_STATUS } from '../../hooks/useConsolidation'

const TYPE_CATS = {
  BS_ASSET:     'ASSET',
  BS_LIABILITY: 'LIABILITY',
  BS_EQUITY:    'EQUITY',
  PL_REVENUE:   'REVENUE',
  PL_EXPENSE:   'EXPENSE',
}

function SectionTable({ title, rows, total, totalLabel, isDebit = true }) {
  return (
    <div className="cfs-section">
      <div className="cfs-section-title">{title}</div>
      <table className="jl-table">
        <thead>
          <tr>
            <th className="jl-th">科目</th>
            <th className="jl-th jl-th--right">親会社</th>
            <th className="jl-th jl-th--right">子会社合計</th>
            <th className="jl-th jl-th--right">相殺消去</th>
            <th className="jl-th jl-th--right">連結合計</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={5} className="jl-empty-cell">—</td></tr>
          ) : (
            rows.map((r, i) => (
              <tr key={r.key || i} className={`jl-tr ${i % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                <td className="jl-td">
                  {r.code && <span className="fs-code">{r.code}</span>}
                  {r.name}
                  {r.subs?.length > 0 && (
                    <span className="cfs-sub-detail">
                      （{r.subs.map(s => `${s.name}: ¥${s.amount.toLocaleString('ja-JP')}`).join('、')}）
                    </span>
                  )}
                </td>
                <td className="jl-td jl-td--amount">{r.parent.toLocaleString('ja-JP')}</td>
                <td className="jl-td jl-td--amount">{r.subTotal.toLocaleString('ja-JP')}</td>
                <td className="jl-td jl-td--amount cfs-elim-cell">
                  {r.elim !== 0 ? `(${r.elim.toLocaleString('ja-JP')})` : '—'}
                </td>
                <td className="jl-td jl-td--amount cfs-total-cell">
                  {r.consolidated.toLocaleString('ja-JP')}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="jl-tr--total">
            <td className="jl-td" style={{ fontWeight: 700 }}>{totalLabel}</td>
            <td className="jl-td jl-td--amount" style={{ fontWeight: 700 }}>{total.parent.toLocaleString('ja-JP')}</td>
            <td className="jl-td jl-td--amount" style={{ fontWeight: 700 }}>{total.subTotal.toLocaleString('ja-JP')}</td>
            <td className="jl-td jl-td--amount cfs-elim-cell" style={{ fontWeight: 700 }}>
              {total.elim !== 0 ? `(${total.elim.toLocaleString('ja-JP')})` : '—'}
            </td>
            <td className="jl-td jl-td--amount cfs-total-cell" style={{ fontWeight: 700 }}>
              {total.consolidated.toLocaleString('ja-JP')}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

export default function ConsolidatedFS({
  journals, accounts, subsidiaries, packages, eliminations, periodCtx,
}) {
  const defaultMonth = new Date().toISOString().slice(0, 7)
  const [yearMonth,    setYearMonth]    = useState(defaultMonth)
  const [showSubBreak, setShowSubBreak] = useState(false)
  const [view,         setView]         = useState('pl') // 'pl' | 'bs'

  // 親会社: journals の期間フィルタ
  const parentJournals = useMemo(() => {
    const [y, m] = yearMonth.split('-').map(Number)
    const from = `${y}-${String(m).padStart(2,'0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const to   = `${y}-${String(m).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
    return journals.filter(j => j.date >= from && j.date <= to)
  }, [journals, yearMonth])

  // 対象パッケージ（APPROVED or CONFIRMED）
  const activePkgs = useMemo(() =>
    packages.filter(p => p.yearMonth === yearMonth && (p.status === 'APPROVED' || p.status === 'CONFIRMED')),
    [packages, yearMonth])

  // 対象消去仕訳
  const activeElims = useMemo(() =>
    eliminations.filter(e => e.yearMonth === yearMonth),
    [eliminations, yearMonth])

  const subMap = useMemo(() =>
    Object.fromEntries(subsidiaries.map(s => [s.id, s])),
    [subsidiaries])

  // 子会社PL/BS集計 (accountType → category map)
  const subAggByCategory = useMemo(() => {
    const agg = {}
    activePkgs.forEach(pkg => {
      const sub = subMap[pkg.subsidiaryId]
      pkg.items.forEach(it => {
        const cat = TYPE_CATS[it.accountType]
        if (!cat) return
        const key = `${cat}||${it.accountCode}||${it.accountName}`
        if (!agg[key]) {
          agg[key] = {
            category: cat, code: it.accountCode, name: it.accountName,
            subTotal: 0, subs: [],
          }
        }
        agg[key].subTotal += it.amountJpy || 0
        agg[key].subs.push({ id: pkg.subsidiaryId, name: sub?.name || pkg.subsidiaryId, amount: it.amountJpy || 0 })
      })
    })
    return agg
  }, [activePkgs, subMap])

  // 消去集計 (category → amount)
  const elimByCategory = useMemo(() => {
    const agg = { ASSET: 0, LIABILITY: 0, EQUITY: 0, REVENUE: 0, EXPENSE: 0 }
    activeElims.forEach(e => {
      if (e.type === 'RECEIVABLE_PAYABLE') {
        agg.ASSET     += e.amountJpy
        agg.LIABILITY += e.amountJpy
      } else if (e.type === 'REVENUE_EXPENSE') {
        agg.REVENUE += e.amountJpy
        agg.EXPENSE += e.amountJpy
      }
    })
    return agg
  }, [activeElims])

  // 親会社PL
  const parentPL = useMemo(() => getPLSummary(parentJournals, accounts), [parentJournals, accounts])
  const parentBS = useMemo(() => getBSSummary(parentJournals, accounts), [parentJournals, accounts])

  function buildRows(category) {
    const parentItems = category === 'REVENUE' ? parentPL.revenues
      : category === 'EXPENSE'    ? parentPL.expenses
      : category === 'ASSET'      ? parentBS.assets
      : category === 'LIABILITY'  ? parentBS.liabilities
      : parentBS.equities

    const allKeys = new Set([
      ...parentItems.map(a => `${category}||${a.code}||${a.name}`),
      ...Object.keys(subAggByCategory).filter(k => k.startsWith(`${category}||`)),
    ])

    return [...allKeys].map(key => {
      const [, code, name] = key.split('||')
      const parentItem = parentItems.find(a => a.code === code && a.name === name)
      const subItem    = subAggByCategory[key]
      const parent   = parentItem?.amount || 0
      const subTotal = subItem?.subTotal  || 0
      const subs     = showSubBreak ? (subItem?.subs || []) : []
      const elim     = 0
      return { key, code, name, parent, subTotal, subs, elim, consolidated: parent + subTotal - elim }
    }).filter(r => r.parent !== 0 || r.subTotal !== 0)
  }

  // PL rows
  const revenueRows = useMemo(() => buildRows('REVENUE'), [parentPL, subAggByCategory, showSubBreak])
  const expenseRows = useMemo(() => buildRows('EXPENSE'), [parentPL, subAggByCategory, showSubBreak])

  const revenueElim = elimByCategory.REVENUE
  const expenseElim = elimByCategory.EXPENSE

  const totalRevParent   = parentPL.totalRevenue
  const totalRevSub      = activePkgs.reduce((s, p) => s + p.items.filter(it => it.accountType === 'PL_REVENUE').reduce((a, it) => a + (it.amountJpy || 0), 0), 0)
  const totalRevConsolidated = totalRevParent + totalRevSub - revenueElim

  const totalExpParent   = parentPL.totalExpense
  const totalExpSub      = activePkgs.reduce((s, p) => s + p.items.filter(it => it.accountType === 'PL_EXPENSE').reduce((a, it) => a + (it.amountJpy || 0), 0), 0)
  const totalExpConsolidated = totalExpParent + totalExpSub - expenseElim

  const netIncome = totalRevConsolidated - totalExpConsolidated

  // BS rows
  const assetRows    = useMemo(() => buildRows('ASSET'),     [parentBS, subAggByCategory, showSubBreak])
  const liabRows     = useMemo(() => buildRows('LIABILITY'), [parentBS, subAggByCategory, showSubBreak])
  const equityRows   = useMemo(() => buildRows('EQUITY'),    [parentBS, subAggByCategory, showSubBreak])

  const assetElim = elimByCategory.ASSET
  const liabElim  = elimByCategory.LIABILITY

  const totalAssetParent  = parentBS.totalAssets
  const totalAssetSub     = activePkgs.reduce((s, p) => s + p.items.filter(it => it.accountType === 'BS_ASSET').reduce((a, it) => a + (it.amountJpy || 0), 0), 0)
  const totalAssetConso   = totalAssetParent + totalAssetSub - assetElim

  const totalLiabParent   = parentBS.totalLiabilities
  const totalLiabSub      = activePkgs.reduce((s, p) => s + p.items.filter(it => it.accountType === 'BS_LIABILITY').reduce((a, it) => a + (it.amountJpy || 0), 0), 0)
  const totalLiabConso    = totalLiabParent + totalLiabSub - liabElim

  const totalEqParent     = parentBS.totalEquities
  const totalEqSub        = activePkgs.reduce((s, p) => s + p.items.filter(it => it.accountType === 'BS_EQUITY').reduce((a, it) => a + (it.amountJpy || 0), 0), 0)
  const totalEqConso      = totalEqParent + totalEqSub
  const totalLiabEqConso  = totalLiabConso + totalEqConso + netIncome

  function exportCsv() {
    const header = ['科目', '親会社', '子会社合計', '相殺消去', '連結合計']
    const rows = []
    if (view === 'pl') {
      rows.push(['【収益】'])
      revenueRows.forEach(r => rows.push([r.name, r.parent, r.subTotal, r.elim, r.consolidated]))
      rows.push(['収益合計', totalRevParent, totalRevSub, revenueElim, totalRevConsolidated])
      rows.push(['【費用】'])
      expenseRows.forEach(r => rows.push([r.name, r.parent, r.subTotal, r.elim, r.consolidated]))
      rows.push(['費用合計', totalExpParent, totalExpSub, expenseElim, totalExpConsolidated])
      rows.push(['当期純利益', parentPL.netIncome, totalRevSub - totalExpSub, 0, netIncome])
    } else {
      rows.push(['【資産】'])
      assetRows.forEach(r => rows.push([r.name, r.parent, r.subTotal, r.elim, r.consolidated]))
      rows.push(['資産合計', totalAssetParent, totalAssetSub, assetElim, totalAssetConso])
      rows.push(['【負債】'])
      liabRows.forEach(r => rows.push([r.name, r.parent, r.subTotal, r.elim, r.consolidated]))
      rows.push(['負債合計', totalLiabParent, totalLiabSub, liabElim, totalLiabConso])
      rows.push(['【純資産】'])
      equityRows.forEach(r => rows.push([r.name, r.parent, r.subTotal, 0, r.consolidated]))
      rows.push(['純資産合計', totalEqParent + parentBS.netIncome, totalEqSub, 0, totalEqConso + netIncome])
    }
    downloadCsv(`連結財務諸表_${yearMonth}_${todayStamp()}.csv`, [header, ...rows])
  }

  const pendingPkgs = packages.filter(p => p.yearMonth === yearMonth &&
    (p.status === 'DRAFT' || p.status === 'SUBMITTED'))

  return (
    <div className="je print-area">
      <div className="je__page-header no-print">
        <div className="je__breadcrumb">会計システム › 連結会計 › 連結財務諸表</div>
        <div className="je__title-row">
          <h1 className="je__title">連結財務諸表</h1>
        </div>
      </div>

      <div className="jl-toolbar no-print" style={{ flexWrap: 'wrap', gap: 8 }}>
        <input type="month" className="je-input" style={{ width: 160 }}
          value={yearMonth} onChange={e => setYearMonth(e.target.value)} />
        <div className="hist-tab-bar" style={{ marginLeft: 8 }}>
          <button className={`hist-tab ${view === 'pl' ? 'hist-tab--active' : ''}`} onClick={() => setView('pl')}>
            損益計算書
          </button>
          <button className={`hist-tab ${view === 'bs' ? 'hist-tab--active' : ''}`} onClick={() => setView('bs')}>
            貸借対照表
          </button>
        </div>
        <label className="ms-check-label" style={{ marginLeft: 8 }}>
          <input type="checkbox" checked={showSubBreak}
            onChange={e => setShowSubBreak(e.target.checked)} />
          子会社内訳表示
        </label>
        <button className="je-btn je-btn--outline" style={{ marginLeft: 'auto' }} onClick={() => window.print()}>🖨 印刷</button>
        <button className="je-btn je-btn--outline" onClick={exportCsv}>📄 CSV</button>
      </div>

      {/* パッケージ状況 */}
      <div className="cfs-pkg-summary no-print">
        <span className="cfs-pkg-label">
          {yearMonth} パッケージ: 確定・承認済 {activePkgs.length}社
          {pendingPkgs.length > 0 && (
            <span className="cfs-pkg-pending">　⚠ 未確定 {pendingPkgs.length}社（データ未反映）</span>
          )}
        </span>
        {activeElims.length > 0 && (
          <span className="cfs-pkg-label">　消去仕訳 {activeElims.length}件 適用済</span>
        )}
      </div>

      {/* 損益計算書 */}
      {view === 'pl' && (
        <div className="cfs-layout">
          <div className="fs-sheet print-area">
            <div className="fs-sheet-header">
              <h2 className="fs-sheet-title">連結損益計算書</h2>
              <p className="fs-sheet-sub">{yearMonth.replace('-','年')}月　（金額：円）</p>
            </div>

            <SectionTable
              title="収益"
              rows={revenueRows}
              total={{ parent: totalRevParent, subTotal: totalRevSub, elim: revenueElim, consolidated: totalRevConsolidated }}
              totalLabel="収益合計"
            />

            <SectionTable
              title="費用"
              rows={expenseRows}
              total={{ parent: totalExpParent, subTotal: totalExpSub, elim: expenseElim, consolidated: totalExpConsolidated }}
              totalLabel="費用合計"
            />

            <div className="cfs-net-income">
              <span className="cfs-ni-label">当期純利益</span>
              <span className={`cfs-ni-value ${netIncome < 0 ? 'cfs-ni-value--loss' : ''}`}>
                ¥{netIncome.toLocaleString('ja-JP')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 貸借対照表 */}
      {view === 'bs' && (
        <div className="cfs-layout">
          <div className="fs-sheet print-area">
            <div className="fs-sheet-header">
              <h2 className="fs-sheet-title">連結貸借対照表</h2>
              <p className="fs-sheet-sub">{yearMonth.replace('-','年')}月末　（金額：円）</p>
            </div>

            <div className="bs-layout">
              <div>
                <SectionTable
                  title="資産"
                  rows={assetRows}
                  total={{ parent: totalAssetParent, subTotal: totalAssetSub, elim: assetElim, consolidated: totalAssetConso }}
                  totalLabel="資産合計"
                />
              </div>
              <div>
                <SectionTable
                  title="負債"
                  rows={liabRows}
                  total={{ parent: totalLiabParent, subTotal: totalLiabSub, elim: liabElim, consolidated: totalLiabConso }}
                  totalLabel="負債合計"
                />
                <SectionTable
                  title="純資産"
                  rows={equityRows}
                  total={{ parent: totalEqParent + parentBS.netIncome, subTotal: totalEqSub, elim: 0, consolidated: totalEqConso + netIncome }}
                  totalLabel="純資産合計"
                />
                <div className="cfs-net-income">
                  <span className="cfs-ni-label">負債・純資産合計</span>
                  <span className="cfs-ni-value">¥{totalLiabEqConso.toLocaleString('ja-JP')}</span>
                </div>
              </div>
            </div>

            {Math.abs(totalAssetConso - totalLiabEqConso) >= 1 && (
              <div className="bs-check-banner bs-check-banner--ng" style={{ marginTop: 12 }}>
                ⚠ 貸借不一致（差額 ¥{Math.abs(totalAssetConso - totalLiabEqConso).toLocaleString('ja-JP')}）
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
