import { useState, useMemo } from 'react'
import { PKG_STATUS, ACCOUNT_TYPES, rateTypeForAccount } from '../../hooks/useConsolidation'
import { downloadCsv, todayStamp } from '../../utils/csv'

const EMPTY_ITEM = { accountType: 'BS_ASSET', accountCode: '', accountName: '', amount: '' }

function calcJpy(amount, accountType, fxRate) {
  if (!fxRate) return null
  const n = Number(String(amount).replace(/,/g, ''))
  if (isNaN(n)) return null
  const rate = rateTypeForAccount(accountType) === 'END' ? fxRate.endRate : fxRate.avgRate
  return Math.round(n * rate)
}

function ItemRow({ item, currency, fxRate, onChange, onDelete, idx }) {
  const jpy = calcJpy(item.amount, item.accountType, fxRate)
  const rateType = rateTypeForAccount(item.accountType)
  const rate = fxRate ? (rateType === 'END' ? fxRate.endRate : fxRate.avgRate) : null

  return (
    <tr className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
      <td className="jl-td" style={{ minWidth: 120 }}>
        <select className="je-select je-select--sm"
          value={item.accountType}
          onChange={e => onChange('accountType', e.target.value)}>
          {ACCOUNT_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
        </select>
      </td>
      <td className="jl-td" style={{ minWidth: 80 }}>
        <input className="je-input je-input--sm" value={item.accountCode}
          onChange={e => onChange('accountCode', e.target.value)} placeholder="1001" maxLength={10} />
      </td>
      <td className="jl-td" style={{ minWidth: 160 }}>
        <input className="je-input je-input--sm" value={item.accountName}
          onChange={e => onChange('accountName', e.target.value)} placeholder="科目名" maxLength={40} />
      </td>
      <td className="jl-td" style={{ minWidth: 120 }}>
        <input className="je-input je-input--sm je-input--right" value={item.amount}
          onChange={e => onChange('amount', e.target.value)} placeholder="0"
          style={{ textAlign: 'right' }} />
        {currency !== 'JPY' && (
          <span className="conso-currency-badge" style={{ marginLeft: 4, fontSize: 10 }}>{currency}</span>
        )}
      </td>
      <td className="jl-td jl-td--right conso-jpy-cell" style={{ minWidth: 140 }}>
        {currency === 'JPY' ? (
          <span>{Number(String(item.amount).replace(/,/g, '')) ? Number(String(item.amount).replace(/,/g, '')).toLocaleString('ja-JP') : '—'}</span>
        ) : rate ? (
          jpy !== null
            ? <span>¥{jpy.toLocaleString('ja-JP')}</span>
            : <span className="conso-no-rate">—</span>
        ) : (
          <span className="conso-no-rate">レートなし</span>
        )}
      </td>
      <td className="jl-td" style={{ fontSize: 11, color: 'var(--c-text-muted)', whiteSpace: 'nowrap' }}>
        {currency !== 'JPY' && rate ? `${rateType === 'END' ? '期末' : '平均'} ${rate}` : ''}
      </td>
      <td className="jl-td jl-td--actions">
        <button className="je-del-btn" onClick={onDelete} title="行削除">×</button>
      </td>
    </tr>
  )
}

export default function ConsolidationPackage({
  subsidiaries, packages, savePackage, deletePackage, getPackage,
  fxRates, getFxRate, currentUser,
}) {
  const activeSubsidiaries = subsidiaries.filter(s => s.isActive !== false)
  const defaultMonth = new Date().toISOString().slice(0, 7)

  const [selectedSub,   setSelectedSub]   = useState(activeSubsidiaries[0]?.id || '')
  const [yearMonth,     setYearMonth]     = useState(defaultMonth)
  const [editMode,      setEditMode]      = useState(false)
  const [draftItems,    setDraftItems]    = useState([])
  const [draftDueDate,  setDraftDueDate]  = useState('')

  const sub = activeSubsidiaries.find(s => s.id === selectedSub) || null
  const pkg = sub ? getPackage(sub.id, yearMonth) : null
  const fxRate = sub ? getFxRate(yearMonth, sub.currency) : null
  const isForeignCurrency = sub?.currency !== 'JPY'
  const missingRate = isForeignCurrency && !fxRate

  const items = editMode ? draftItems : (pkg?.items || [])

  const bsItems = items.filter(it => it.accountType.startsWith('BS_'))
  const plItems = items.filter(it => it.accountType.startsWith('PL_'))

  const totalBsJpy = useMemo(() =>
    bsItems.reduce((s, it) => {
      const v = calcJpy(it.amount, it.accountType, fxRate)
      return s + (v ?? 0)
    }, 0), [bsItems, fxRate])

  const totalPlJpy = useMemo(() =>
    plItems.reduce((s, it) => {
      const v = calcJpy(it.amount, it.accountType, fxRate)
      return s + (v ?? 0)
    }, 0), [plItems, fxRate])

  function startEdit() {
    const baseItems = pkg?.items?.length
      ? pkg.items.map(it => ({ ...it }))
      : []
    setDraftItems(baseItems)
    setDraftDueDate(pkg?.dueDate || '')
    setEditMode(true)
  }

  function cancelEdit() { setEditMode(false) }

  function addItem() {
    setDraftItems(prev => [...prev, { ...EMPTY_ITEM, id: `IT-${Date.now()}` }])
  }

  function updateItem(idx, key, val) {
    setDraftItems(prev => prev.map((it, i) => i !== idx ? it : { ...it, [key]: val }))
  }

  function deleteItem(idx) {
    setDraftItems(prev => prev.filter((_, i) => i !== idx))
  }

  function computeItemsWithJpy(itemList) {
    return itemList.map(it => {
      const jpy = sub?.currency === 'JPY'
        ? (Number(String(it.amount).replace(/,/g, '')) || 0)
        : (calcJpy(it.amount, it.accountType, fxRate) ?? 0)
      return { ...it, amountJpy: jpy }
    })
  }

  function handleSave(newStatus) {
    const now = new Date().toISOString()
    const computedItems = computeItemsWithJpy(draftItems)
    const base = pkg ? { ...pkg } : {
      subsidiaryId: sub.id,
      yearMonth,
      submittedAt:  null, submittedBy:  null,
      approvedAt:   null, approvedBy:   null,
    }
    const updated = {
      ...base,
      status:  newStatus,
      dueDate: draftDueDate,
      items:   computedItems,
      ...(newStatus === 'SUBMITTED' ? { submittedAt: now, submittedBy: currentUser?.id } : {}),
      ...(newStatus === 'APPROVED'  ? { approvedAt:  now, approvedBy:  currentUser?.id } : {}),
    }
    savePackage(updated)
    setEditMode(false)
  }

  function handleStatusChange(newStatus) {
    if (!pkg) return
    savePackage({ ...pkg, status: newStatus,
      ...(newStatus === 'APPROVED' ? { approvedAt: new Date().toISOString(), approvedBy: currentUser?.id } : {}),
    })
  }

  function exportCsv() {
    if (!pkg) return
    const sub = activeSubsidiaries.find(s => s.id === pkg.subsidiaryId)
    const header = ['科目区分', '科目コード', '科目名', `金額(${sub?.currency})`, '換算額(JPY)']
    const rows = pkg.items.map(it => [
      ACCOUNT_TYPES.find(t => t.code === it.accountType)?.label || it.accountType,
      it.accountCode, it.accountName, it.amount, it.amountJpy,
    ])
    downloadCsv(`連結パッケージ_${pkg.subsidiaryId}_${pkg.yearMonth}_${todayStamp()}.csv`, [header, ...rows])
  }

  const statusInfo = pkg ? PKG_STATUS[pkg.status] : null
  const canApprove = currentUser?.role === 'APPROVER' || currentUser?.role === 'ADMIN'

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 連結会計 › 連結パッケージ</div>
        <div className="je__title-row">
          <h1 className="je__title">連結パッケージ収集</h1>
        </div>
      </div>

      {/* 子会社・年月 選択 */}
      <section className="je-card" style={{ marginBottom: 16 }}>
        <div className="je-card__body">
          <div className="conso-pkg-selector">
            <div className="je-field" style={{ marginBottom: 0 }}>
              <label className="je-label">子会社</label>
              <select className="je-select" value={selectedSub} onChange={e => { setSelectedSub(e.target.value); setEditMode(false) }}>
                {activeSubsidiaries.length === 0
                  ? <option value="">（子会社が登録されていません）</option>
                  : activeSubsidiaries.map(s => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name} ({s.currency})</option>
                  ))
                }
              </select>
            </div>
            <div className="je-field" style={{ marginBottom: 0 }}>
              <label className="je-label">対象年月</label>
              <input type="month" className="je-input" value={yearMonth}
                onChange={e => { setYearMonth(e.target.value); setEditMode(false) }} />
            </div>
            {pkg && !editMode && (
              <div className="je-field" style={{ marginBottom: 0 }}>
                <label className="je-label">提出期限</label>
                <span className="conso-due-date">{pkg.dueDate || '—'}</span>
              </div>
            )}
          </div>

          {/* ステータスバー */}
          {sub && (
            <div className="conso-status-bar">
              {statusInfo
                ? <span className={`pkg-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                : <span className="pkg-badge pkg-badge--none">未作成</span>
              }
              {missingRate && (
                <span className="conso-warn-rate">
                  ⚠ {yearMonth} の {sub.currency} 為替レートが未登録です
                </span>
              )}
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {pkg && !editMode && (
                  <>
                    <button className="je-btn je-btn--outline" onClick={exportCsv}>📄 CSV</button>
                    {pkg.status === 'SUBMITTED' && canApprove && (
                      <button className="je-btn je-btn--primary" onClick={() => handleStatusChange('APPROVED')}>承認</button>
                    )}
                    {pkg.status === 'APPROVED' && canApprove && (
                      <button className="je-btn je-btn--primary" onClick={() => handleStatusChange('CONFIRMED')}>確定</button>
                    )}
                  </>
                )}
                {!editMode && (
                  <button className="je-btn je-btn--primary" onClick={startEdit} disabled={!sub}>
                    {pkg ? '編集' : '新規作成'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 編集モード: 提出期限 */}
      {editMode && (
        <section className="je-card" style={{ marginBottom: 12 }}>
          <div className="je-card__body">
            <div className="je-field" style={{ maxWidth: 240, marginBottom: 0 }}>
              <label className="je-label">提出期限</label>
              <input type="date" className="je-input" value={draftDueDate}
                onChange={e => setDraftDueDate(e.target.value)} />
            </div>
          </div>
        </section>
      )}

      {/* パッケージ明細テーブル */}
      {sub && (
        <section className="je-card">
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="jl-table">
                <thead>
                  <tr>
                    <th className="jl-th">科目区分</th>
                    <th className="jl-th">コード</th>
                    <th className="jl-th">科目名</th>
                    <th className="jl-th jl-th--right">金額 ({sub.currency})</th>
                    <th className="jl-th jl-th--right">換算額 (JPY)</th>
                    <th className="jl-th">レート種別</th>
                    {editMode && <th className="jl-th"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && !editMode ? (
                    <tr><td colSpan={6} className="jl-empty-cell">データがありません。「新規作成」から入力してください。</td></tr>
                  ) : (
                    <>
                      {items.map((it, idx) =>
                        editMode ? (
                          <ItemRow key={it.id || idx} item={it} currency={sub.currency} fxRate={fxRate}
                            onChange={(k, v) => updateItem(idx, k, v)}
                            onDelete={() => deleteItem(idx)} idx={idx} />
                        ) : (
                          <tr key={it.id || idx} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                            <td className="jl-td">
                              <span className="conso-actype-badge">
                                {ACCOUNT_TYPES.find(t => t.code === it.accountType)?.label}
                              </span>
                            </td>
                            <td className="jl-td"><span className="ms-code-badge">{it.accountCode || '—'}</span></td>
                            <td className="jl-td">{it.accountName}</td>
                            <td className="jl-td jl-td--amount">
                              {Number(it.amount).toLocaleString('ja-JP')}
                            </td>
                            <td className="jl-td jl-td--amount">
                              {it.amountJpy != null ? `¥${it.amountJpy.toLocaleString('ja-JP')}` : '—'}
                            </td>
                            <td className="jl-td" style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
                              {sub.currency !== 'JPY' ? (rateTypeForAccount(it.accountType) === 'END' ? '期末' : '平均') : '—'}
                            </td>
                          </tr>
                        )
                      )}
                      {editMode && (
                        <tr>
                          <td colSpan={7} style={{ padding: '8px 12px' }}>
                            <button className="je-btn je-btn--outline" onClick={addItem}>＋ 行を追加</button>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
                {!editMode && items.length > 0 && (
                  <tfoot>
                    <tr className="jl-tr--total">
                      <td colSpan={4} className="jl-td" style={{ fontWeight: 700 }}>BS合計（円換算）</td>
                      <td className="jl-td jl-td--amount" style={{ fontWeight: 700 }}>¥{totalBsJpy.toLocaleString('ja-JP')}</td>
                      <td></td>
                    </tr>
                    <tr className="jl-tr--total">
                      <td colSpan={4} className="jl-td" style={{ fontWeight: 700 }}>PL合計（円換算）</td>
                      <td className="jl-td jl-td--amount" style={{ fontWeight: 700 }}>¥{totalPlJpy.toLocaleString('ja-JP')}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </section>
      )}

      {/* 編集時のアクションボタン */}
      {editMode && (
        <div className="conso-pkg-actions">
          <button className="je-btn je-btn--secondary" onClick={cancelEdit}>キャンセル</button>
          <button className="je-btn je-btn--outline" onClick={() => handleSave('DRAFT')}>下書き保存</button>
          <button className="je-btn je-btn--primary" onClick={() => handleSave('SUBMITTED')}>提出</button>
        </div>
      )}
    </div>
  )
}
