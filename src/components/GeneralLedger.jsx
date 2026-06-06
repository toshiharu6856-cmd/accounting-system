import { useState, useMemo } from 'react'
import { accounts as _staticAccounts, CATEGORIES } from '../data/accounts'
import { getLedgerEntries, fmtDisplay } from '../utils/accounting'
import PeriodSelector from './PeriodSelector'

const CAT_NAMES = Object.fromEntries(
  Object.entries(CATEGORIES).map(([k, v]) => [k, v.name])
)

export default function GeneralLedger({ journals, accounts: propAccounts, periodCtx }) {
  const accounts = propAccounts || _staticAccounts
  const [selectedCode, setSelectedCode] = useState('1102')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const periodJournals = periodCtx ? periodCtx.periodJournals : journals

  const account = accounts.find(a => a.code === selectedCode)
  const allEntries = useMemo(
    () => getLedgerEntries(selectedCode, periodJournals, accounts),
    [selectedCode, periodJournals, accounts]
  )

  const entries = useMemo(() => {
    return allEntries.filter(e => {
      if (dateFrom && e.date < dateFrom) return false
      if (dateTo   && e.date > dateTo)   return false
      return true
    })
  }, [allEntries, dateFrom, dateTo])

  const totalDebit   = entries.reduce((s, e) => s + e.debit,   0)
  const totalCredit  = entries.reduce((s, e) => s + e.credit,  0)
  const finalBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0

  function fmt(d) { return d?.replace(/-/g, '/') || '' }

  return (
    <div className="je print-area">
      <div className="je__page-header">
        <div className="je__breadcrumb no-print">会計システム › 総勘定元帳</div>
        <div className="je__title-row">
          <h1 className="je__title">総勘定元帳</h1>
          {periodCtx && <span className="je__spec-badge">{periodCtx.label}</span>}
        </div>
      </div>

      {/* 科目選択・絞り込み */}
      <section className="je-card no-print">
        <div className="je-card__header">
          <h2 className="je-card__title">科目・期間の絞り込み</h2>
          <div className="je-card__header-actions">
            {periodCtx && <PeriodSelector {...periodCtx} />}
            <button
              className="je-btn je-btn--outline"
              onClick={() => window.print()}
              disabled={!account}
            >🖨 印刷</button>
          </div>
        </div>
        <div className="je-card__body">
          <div className="gl-selector">
            <div className="gl-select-wrap">
              <label className="je-label">勘定科目</label>
              <select
                className="je-select gl-select"
                value={selectedCode}
                onChange={e => setSelectedCode(e.target.value)}
              >
                {Object.entries(CATEGORIES)
                  .sort((a, b) => a[1].order - b[1].order)
                  .map(([catKey, cat]) => (
                    <optgroup key={catKey} label={cat.name}>
                      {accounts
                        .filter(a => a.category === catKey)
                        .map(a => (
                          <option key={a.code} value={a.code}>
                            {a.code}　{a.name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
              </select>
            </div>
            <div className="gl-select-wrap">
              <label className="je-label">日付（から）</label>
              <input type="date" className="je-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="gl-select-wrap">
              <label className="je-label">日付（まで）</label>
              <input type="date" className="je-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            {(dateFrom || dateTo) && (
              <div className="gl-select-wrap" style={{ alignSelf: 'flex-end' }}>
                <button
                  className="je-btn je-btn--outline"
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                >期間クリア</button>
              </div>
            )}
            {account && (
              <div className="gl-account-info">
                <span className="gl-cat-badge">{CAT_NAMES[account.category]}</span>
                <span className="gl-balance-info">
                  期末残高:&nbsp;
                  <strong className={finalBalance < 0 ? 'gl-negative' : ''}>
                    {fmtDisplay(finalBalance)}
                  </strong>
                </span>
                <span className="gl-txn-count">{entries.length} 件の取引</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 元帳明細 */}
      {account && (
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">
              {account.code}　{account.name}
              {periodCtx && <span className="je-card__title-sub">　（{periodCtx.label}）</span>}
            </h2>
            <div className="gl-header-totals">
              <span className="gl-hdr-debit">借方合計: {totalDebit.toLocaleString('ja-JP')}</span>
              <span className="gl-hdr-credit">貸方合計: {totalCredit.toLocaleString('ja-JP')}</span>
            </div>
          </div>
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="je-table">
                <thead>
                  <tr>
                    <th className="je-th gl-th-date">日付</th>
                    <th className="je-th">伝票番号</th>
                    <th className="je-th gl-th-desc">摘要</th>
                    <th className="je-th je-th--amount">借方</th>
                    <th className="je-th je-th--amount">貸方</th>
                    <th className="je-th je-th--amount">残高</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="jl-empty-cell">この科目の仕訳データがありません</td>
                    </tr>
                  ) : (
                    entries.map((e, i) => (
                      <tr key={i} className={`je-tr ${i % 2 === 1 ? 'je-tr--alt' : ''}`}>
                        <td className="je-td">{fmt(e.date)}</td>
                        <td className="je-td gl-voucher-cell">{e.journalId}</td>
                        <td className="je-td">{e.description}</td>
                        <td className="je-td je-td--amount">
                          {e.debit > 0 && (
                            <span className="gl-debit">{e.debit.toLocaleString('ja-JP')}</span>
                          )}
                        </td>
                        <td className="je-td je-td--amount">
                          {e.credit > 0 && (
                            <span className="gl-credit">{e.credit.toLocaleString('ja-JP')}</span>
                          )}
                        </td>
                        <td className="je-td je-td--amount">
                          <span className={`gl-balance-val ${e.balance < 0 ? 'gl-negative' : ''}`}>
                            {e.balance.toLocaleString('ja-JP')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="je-tfoot-row">
                    <td className="je-td" colSpan={3} style={{ textAlign: 'right', fontWeight: 700, paddingRight: '12px' }}>
                      合計
                    </td>
                    <td className="je-td je-td--amount">
                      <span className="gl-debit gl-total">{totalDebit.toLocaleString('ja-JP')}</span>
                    </td>
                    <td className="je-td je-td--amount">
                      <span className="gl-credit gl-total">{totalCredit.toLocaleString('ja-JP')}</span>
                    </td>
                    <td className="je-td je-td--amount">
                      <span className={`gl-balance-val gl-total ${finalBalance < 0 ? 'gl-negative' : ''}`}>
                        {finalBalance.toLocaleString('ja-JP')}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
