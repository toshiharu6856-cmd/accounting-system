import { getBSSummary, fmtDisplay } from '../utils/accounting'
import PeriodSelector from './PeriodSelector'

function AccountRows({ items }) {
  return items.map(a => (
    <tr key={a.code} className="fs-row">
      <td className="fs-td fs-td--name">
        <span className="fs-code">{a.code}</span>{a.name}
      </td>
      <td className="fs-td fs-td--num">{a.amount.toLocaleString('ja-JP')}</td>
    </tr>
  ))
}

export default function BalanceSheet({ journals, accounts, periodCtx }) {
  const targetJournals = periodCtx ? periodCtx.bsJournals : journals
  const {
    assets, liabilities, equities,
    totalAssets, totalLiabilities, totalEquities,
    netIncome, totalLiabEquity, isBalanced,
  } = getBSSummary(targetJournals, accounts)

  const totalEquityWithNI = totalEquities + netIncome
  const isProfit = netIncome >= 0

  return (
    <div className="je print-area">
      <div className="je__page-header no-print">
        <div className="je__breadcrumb">会計システム › 貸借対照表</div>
        <div className="je__title-row">
          <h1 className="je__title">貸借対照表</h1>
          <span className="je__spec-badge">自動集計</span>
        </div>
      </div>

      <div className="fs-toolbar no-print">
        {periodCtx && <PeriodSelector {...periodCtx} />}
        <button className="je-btn je-btn--outline" onClick={() => window.print()}>🖨 印刷</button>
      </div>

      <div className="fs-sheet">
        <div className="fs-sheet-header">
          <h2 className="fs-sheet-title">貸借対照表</h2>
          <p className="fs-sheet-sub">
            {periodCtx ? `${periodCtx.label}（${periodCtx.periodEnd.replace(/-/g, '/')} 時点）　` : '全期間　'}
            （対象仕訳 {targetJournals.length} 件）
          </p>
        </div>

        {/* 貸借チェックバナー */}
        <div className={`bs-check-banner ${isBalanced ? 'bs-check-banner--ok' : 'bs-check-banner--ng'}`}>
          <span className="bs-check-icon">{isBalanced ? '✓' : '✗'}</span>
          <span>
            {isBalanced
              ? `貸借一致　資産合計 = 負債・純資産合計 = ${fmtDisplay(totalAssets)}`
              : `貸借不一致　差額: ${fmtDisplay(Math.abs(totalAssets - totalLiabEquity))}`}
          </span>
        </div>

        <div className="bs-layout">
          {/* 左列: 資産 */}
          <div className="bs-col">
            <div className="fs-section">
              <div className="fs-section-title fs-section-title--asset">資産の部</div>
              <table className="fs-table">
                <tbody>
                  <AccountRows items={assets} />
                </tbody>
                <tfoot>
                  <tr className="fs-subtotal fs-subtotal--asset">
                    <td className="fs-td fs-td--subtotal-label">資産合計</td>
                    <td className="fs-td fs-td--num fs-td--subtotal">{totalAssets.toLocaleString('ja-JP')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 右列: 負債 + 純資産 */}
          <div className="bs-col">
            <div className="fs-section">
              <div className="fs-section-title fs-section-title--liability">負債の部</div>
              <table className="fs-table">
                <tbody>
                  <AccountRows items={liabilities} />
                </tbody>
                <tfoot>
                  <tr className="fs-subtotal fs-subtotal--liability">
                    <td className="fs-td fs-td--subtotal-label">負債合計</td>
                    <td className="fs-td fs-td--num fs-td--subtotal">{totalLiabilities.toLocaleString('ja-JP')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="fs-section">
              <div className="fs-section-title fs-section-title--equity">純資産の部</div>
              <table className="fs-table">
                <tbody>
                  <AccountRows items={equities} />
                  <tr className={`fs-row fs-row--net ${isProfit ? 'fs-row--net-profit' : 'fs-row--net-loss'}`}>
                    <td className="fs-td fs-td--name">
                      {isProfit ? '当期純利益' : '当期純損失'}
                    </td>
                    <td className="fs-td fs-td--num">{netIncome.toLocaleString('ja-JP')}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="fs-subtotal fs-subtotal--equity">
                    <td className="fs-td fs-td--subtotal-label">純資産合計</td>
                    <td className="fs-td fs-td--num fs-td--subtotal">{totalEquityWithNI.toLocaleString('ja-JP')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="bs-grand-total">
              <span>負債・純資産合計</span>
              <span>{totalLiabEquity.toLocaleString('ja-JP')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
