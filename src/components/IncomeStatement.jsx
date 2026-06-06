import { getPLSummary, fmtDisplay } from '../utils/accounting'
import PeriodSelector from './PeriodSelector'

export default function IncomeStatement({ journals, accounts, periodCtx }) {
  const targetJournals = periodCtx ? periodCtx.periodJournals : journals
  const { revenues, expenses, totalRevenue, totalExpense, netIncome } = getPLSummary(targetJournals, accounts)
  const isProfit = netIncome >= 0

  return (
    <div className="je print-area">
      <div className="je__page-header no-print">
        <div className="je__breadcrumb">会計システム › 損益計算書</div>
        <div className="je__title-row">
          <h1 className="je__title">損益計算書</h1>
          <span className="je__spec-badge">自動集計</span>
        </div>
      </div>

      <div className="fs-toolbar no-print">
        {periodCtx && <PeriodSelector {...periodCtx} />}
        <button className="je-btn je-btn--outline" onClick={() => window.print()}>🖨 印刷</button>
      </div>

      <div className="fs-sheet">
        <div className="fs-sheet-header">
          <h2 className="fs-sheet-title">損益計算書</h2>
          <p className="fs-sheet-sub">
            {periodCtx ? `${periodCtx.label}　` : '全期間　'}
            （{targetJournals.length} 件）
          </p>
        </div>

        {/* 収益の部 */}
        <div className="fs-section">
          <div className="fs-section-title fs-section-title--revenue">収益の部</div>
          <table className="fs-table">
            <tbody>
              {revenues.length === 0
                ? <tr><td colSpan={2} className="fs-empty">データなし</td></tr>
                : revenues.map(a => (
                  <tr key={a.code} className="fs-row">
                    <td className="fs-td fs-td--name">
                      <span className="fs-code">{a.code}</span>{a.name}
                    </td>
                    <td className="fs-td fs-td--num">{a.amount.toLocaleString('ja-JP')}</td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr className="fs-subtotal fs-subtotal--revenue">
                <td className="fs-td fs-td--subtotal-label">収益合計</td>
                <td className="fs-td fs-td--num fs-td--subtotal">{totalRevenue.toLocaleString('ja-JP')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 費用の部 */}
        <div className="fs-section">
          <div className="fs-section-title fs-section-title--expense">費用の部</div>
          <table className="fs-table">
            <tbody>
              {expenses.length === 0
                ? <tr><td colSpan={2} className="fs-empty">データなし</td></tr>
                : expenses.map(a => (
                  <tr key={a.code} className="fs-row">
                    <td className="fs-td fs-td--name">
                      <span className="fs-code">{a.code}</span>{a.name}
                    </td>
                    <td className="fs-td fs-td--num">{a.amount.toLocaleString('ja-JP')}</td>
                  </tr>
                ))
              }
            </tbody>
            <tfoot>
              <tr className="fs-subtotal fs-subtotal--expense">
                <td className="fs-td fs-td--subtotal-label">費用合計</td>
                <td className="fs-td fs-td--num fs-td--subtotal">{totalExpense.toLocaleString('ja-JP')}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 当期純利益 / 損失 */}
        <div className={`fs-net-income ${isProfit ? 'fs-net-income--profit' : 'fs-net-income--loss'}`}>
          <span className="fs-net-label">{isProfit ? '当期純利益' : '当期純損失'}</span>
          <span className="fs-net-amount">{fmtDisplay(Math.abs(netIncome))}</span>
        </div>
      </div>
    </div>
  )
}
