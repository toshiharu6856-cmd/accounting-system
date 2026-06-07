import { useState, useMemo, useCallback } from 'react'
import AccountSelect from './AccountSelect'
import {
  TAX_CATEGORIES, TRANSITIONAL_MEASURES, INVOICE_DEFAULTS,
  validateInvoiceNo, calcTax, calcInputCredit,
} from '../data/invoiceConstants'
import { LOG_TYPES } from '../hooks/useAuditLog'

const VOUCHER_TYPES = [
  { code: '',        name: '--- 選択してください ---' },
  { code: 'NORMAL',  name: '通常仕訳'  },
  { code: 'MONTHLY', name: '月次仕訳'  },
  { code: 'CLOSING', name: '決算仕訳'  },
  { code: 'OPENING', name: '期首仕訳'  },
  { code: 'ADJUST',  name: '修正仕訳'  },
]

let _id = 100
const nextId = () => _id++

function newLine() {
  return { id: nextId(), debitCode: '', debitAmount: '', creditCode: '', creditAmount: '', memo: '' }
}

function toDay() {
  return new Date().toISOString().slice(0, 10)
}

function genVoucherNo() {
  const ymd = toDay().replace(/-/g, '')
  const seq  = String(Math.floor(Math.random() * 900) + 100)
  return `JV-${ymd}-${seq}`
}

function parseAmt(s) {
  if (typeof s === 'number') return s >= 0 ? s : 0
  if (!s) return 0
  const n = parseFloat(String(s).replace(/,/g, ''))
  return isNaN(n) || n < 0 ? 0 : n
}

function fmtDisplay(n) {
  return '¥ ' + (n || 0).toLocaleString('ja-JP')
}

function amtToStr(v) {
  const n = parseAmt(v)
  return n > 0 ? n.toLocaleString('ja-JP') : ''
}

function pad(n) { return String(n).padStart(2, '0') }
function fmtDT(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fmtDateSlash(s) { return s?.replace(/-/g, '/') || '—' }
function histTotal(j) {
  return (j?.lines || []).reduce((s, l) => {
    const n = typeof l.debitAmount === 'number' ? l.debitAmount
            : parseFloat(String(l.debitAmount).replace(/,/g, '')) || 0
    return s + n
  }, 0)
}
function getChanges(before, after) {
  if (!before || !after) return []
  const rows = []
  if (before.date !== after.date)
    rows.push({ f: '日付',     b: fmtDateSlash(before.date),      a: fmtDateSlash(after.date) })
  if ((before.description||'') !== (after.description||''))
    rows.push({ f: '摘要',     b: before.description||'（空）',   a: after.description||'（空）' })
  if ((before.voucherType||'') !== (after.voucherType||''))
    rows.push({ f: '伝票種別', b: before.voucherType||'—',        a: after.voucherType||'—' })
  if ((before.deptCode||'') !== (after.deptCode||''))
    rows.push({ f: '部門',     b: before.deptCode||'—',           a: after.deptCode||'—' })
  const bA = histTotal(before), aA = histTotal(after)
  if (bA !== aA) rows.push({ f: '金額', b: `¥${bA.toLocaleString('ja-JP')}`, a: `¥${aA.toLocaleString('ja-JP')}` })
  return rows
}

function HistLogEntry({ log }) {
  const [open, setOpen] = useState(false)
  const typeInfo = LOG_TYPES[log.type] || { label: log.type, cls: '' }
  const changes  = log.type === 'EDIT' ? getChanges(log.before, log.after) : []

  return (
    <div className={`hist-entry hist-entry--${log.type.toLowerCase()}`}>
      <div className="hist-entry-header">
        <span className={`audit-badge ${typeInfo.cls}`}>{typeInfo.label}</span>
        <span className="hist-entry-time">{fmtDT(log.recordedAt)}</span>
        <span className="hist-entry-user">{log.userName || log.userId || '—'}</span>
        {(changes.length > 0 || log.type !== 'EDIT') && (
          <button className="hist-entry-toggle" onClick={() => setOpen(v => !v)}>
            {open ? '▲ 閉じる' : '▼ 詳細'}
          </button>
        )}
      </div>
      {open && (
        <div className="hist-entry-body">
          {log.type === 'EDIT' && changes.length === 0 && (
            <span style={{ color: 'var(--c-text-muted)', fontSize: 12 }}>明細行の変更のみ</span>
          )}
          {log.type === 'EDIT' && changes.map(c => (
            <div key={c.f} className="hist-change-row">
              <span className="hist-change-field">{c.f}:</span>
              <span className="hist-change-before">{c.b}</span>
              <span className="hist-change-arrow">→</span>
              <span className="hist-change-after">{c.a}</span>
            </div>
          ))}
          {log.type === 'CREATE' && (
            <div className="hist-change-row">
              <span className="hist-change-field">金額:</span>
              <span className="hist-change-after">¥{histTotal(log.after).toLocaleString('ja-JP')}</span>
            </div>
          )}
          {log.type === 'DELETE' && (
            <div className="hist-change-row">
              <span className="hist-change-field">削除前金額:</span>
              <span className="hist-change-before">¥{histTotal(log.before).toLocaleString('ja-JP')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JournalEntry({ initialData = null, onSave, onCancel, accounts, departments = [], auditLogs = [] }) {
  const isEditing = !!initialData
  const [activeTab, setActiveTab] = useState('form')

  const [journalDate, setJournalDate] = useState(initialData?.date || toDay())
  const [voucherNo]   = useState(initialData?.id || genVoucherNo())
  const [voucherType,  setVoucherType]  = useState(initialData?.voucherType  || '')
  const [description,  setDescription]  = useState(initialData?.description  || '')
  const [deptCode,     setDeptCode]     = useState(initialData?.deptCode     || '')
  const [lines, setLines] = useState(() => {
    if (initialData?.lines?.length > 0) {
      return initialData.lines.map(l => ({
        ...l,
        id:           nextId(),
        debitAmount:  amtToStr(l.debitAmount),
        creditAmount: amtToStr(l.creditAmount),
      }))
    }
    return [newLine(), newLine()]
  })
  const [errors,  setErrors]  = useState({})
  const [toast,   setToast]   = useState(null)

  // インボイス情報
  const initInv = initialData?.invoice || INVOICE_DEFAULTS
  const [invEnabled,    setInvEnabled]    = useState(initInv.enabled    ?? false)
  const [invNo,         setInvNo]         = useState(initInv.invoiceNo  ?? '')
  const [qualified,     setQualified]     = useState(initInv.qualified  ?? true)
  const [taxCategory,   setTaxCategory]   = useState(initInv.taxCategory  ?? 'TAX10')
  const [taxInput,      setTaxInput]      = useState(initInv.taxInput      ?? 'inclusive')
  const [transitional,  setTransitional]  = useState(initInv.transitional  ?? 'TRANS80')

  const debitTotal  = useMemo(() => lines.reduce((s, l) => s + parseAmt(l.debitAmount),  0), [lines])
  const creditTotal = useMemo(() => lines.reduce((s, l) => s + parseAmt(l.creditAmount), 0), [lines])
  const isBalanced   = debitTotal > 0 && creditTotal > 0 && debitTotal === creditTotal
  const difference   = debitTotal - creditTotal
  const hasAnyAmount = debitTotal > 0 || creditTotal > 0

  // 消費税計算（借方合計を入力金額として使用）
  const invCalc = useMemo(() => {
    if (!invEnabled || debitTotal <= 0) return { base: 0, tax: 0, total: 0, credit: 0 }
    const { base, tax, total } = calcTax(debitTotal, taxCategory, taxInput)
    const credit = calcInputCredit(tax, qualified, transitional)
    return { base, tax, total, credit }
  }, [invEnabled, debitTotal, taxCategory, taxInput, qualified, transitional])

  const isTaxable = TAX_CATEGORIES.find(c => c.code === taxCategory)?.taxable ?? false

  const clearError = useCallback((key) => {
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }, [])

  const updateLine = useCallback((id, field, value) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l))
    clearError(`${id}_${field}`)
  }, [clearError])

  const addLine    = useCallback(() => setLines(prev => [...prev, newLine()]), [])
  const removeLine = useCallback((id) => {
    setLines(prev => prev.length > 1 ? prev.filter(l => l.id !== id) : prev)
  }, [])

  function handleAmountChange(id, field, raw) {
    updateLine(id, field, raw.replace(/[^0-9,]/g, ''))
  }

  function handleAmountBlur(id, field, raw) {
    const n = parseAmt(raw)
    updateLine(id, field, n > 0 ? n.toLocaleString('ja-JP') : '')
  }

  function validate() {
    const errs = {}

    if (!journalDate) errs.journalDate = '仕訳日付は必須です'
    if (!voucherType) errs.voucherType = '伝票種別は必須です'

    if (invEnabled && qualified) {
      const invNoErr = validateInvoiceNo(invNo)
      if (invNoErr) errs.invNo = invNoErr
    }

    let hasDebit = false, hasCredit = false

    lines.forEach(line => {
      const da = parseAmt(line.debitAmount)
      const ca = parseAmt(line.creditAmount)

      if (line.debitCode  && da === 0) errs[`${line.id}_debitAmount`]  = '金額を入力してください'
      if (da > 0 && !line.debitCode)   errs[`${line.id}_debitCode`]    = '勘定科目を選択してください'
      if (line.creditCode && ca === 0) errs[`${line.id}_creditAmount`] = '金額を入力してください'
      if (ca > 0 && !line.creditCode)  errs[`${line.id}_creditCode`]   = '勘定科目を選択してください'

      if (line.debitCode  && da > 0) hasDebit  = true
      if (line.creditCode && ca > 0) hasCredit = true
    })

    const missing = []
    if (!hasDebit)  missing.push('借方の入力がありません')
    if (!hasCredit) missing.push('貸方の入力がありません')
    if (missing.length) errs.entries = missing

    if (hasDebit && hasCredit && !isBalanced) {
      errs.balance = `差額: ${fmtDisplay(Math.abs(difference))}（${difference > 0 ? '借方超過' : '貸方超過'}）`
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return

    const journalData = {
      id: voucherNo,
      date: journalDate,
      voucherType,
      description,
      deptCode: deptCode || '',
      invoice: invEnabled ? {
        enabled:      true,
        invoiceNo:    qualified ? invNo.trim() : '',
        qualified,
        taxCategory,
        taxInput,
        transitional: (!qualified && isTaxable) ? transitional : null,
        baseAmount:   invCalc.base,
        taxAmount:    invCalc.tax,
        totalAmount:  invCalc.total,
        creditAmount: invCalc.credit,
      } : { ...INVOICE_DEFAULTS, enabled: false },
      lines: lines
        .filter(l =>
          (l.debitCode  && parseAmt(l.debitAmount)  > 0) ||
          (l.creditCode && parseAmt(l.creditAmount) > 0)
        )
        .map((l, i) => ({
          id:           i + 1,
          debitCode:    l.debitCode,
          debitAmount:  parseAmt(l.debitAmount),
          creditCode:   l.creditCode,
          creditAmount: parseAmt(l.creditAmount),
          memo:         l.memo,
        })),
    }

    onSave(journalData)
    setToast({ msg: `仕訳を${isEditing ? '更新' : '登録'}しました　伝票番号: ${voucherNo}` })
  }

  function handleClear() {
    setJournalDate(toDay())
    setVoucherType('')
    setDescription('')
    setLines([newLine(), newLine()])
    setErrors({})
    setToast(null)
    setInvEnabled(false)
    setInvNo('')
    setQualified(true)
    setTaxCategory('TAX10')
    setTaxInput('inclusive')
    setTransitional('TRANS80')
  }

  return (
    <div className="je">
      {toast && (
        <div className="je-toast je-toast--success">
          ✓ {toast.msg}
          <button className="je-toast__close" onClick={() => setToast(null)}>×</button>
        </div>
      )}

      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 仕訳一覧 › {isEditing ? '仕訳編集' : '仕訳入力'}</div>
        <div className="je__title-row">
          <h1 className="je__title">{isEditing ? '仕訳編集' : '仕訳入力'}</h1>
          <span className="je__spec-badge">設計書 No.11</span>
        </div>
      </div>

      {isEditing && (
        <div className="hist-tab-bar no-print">
          <button
            className={`hist-tab ${activeTab === 'form' ? 'hist-tab--active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            仕訳入力
          </button>
          <button
            className={`hist-tab ${activeTab === 'history' ? 'hist-tab--active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            変更履歴
            {auditLogs.length > 0 && (
              <span className="hist-tab-count">{auditLogs.length}</span>
            )}
          </button>
        </div>
      )}

      {isEditing && activeTab === 'history' && (
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">変更履歴</h2>
            <span style={{ fontSize: 12, color: 'var(--c-text-2)' }}>伝票番号: {initialData.id}</span>
          </div>
          <div className="je-card__body">
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--c-text-muted)', padding: '16px 0' }}>
                変更履歴がありません。この仕訳の登録・修正・削除が行われると記録されます。
              </p>
            ) : (
              <div className="hist-timeline">
                {auditLogs.map(log => (
                  <HistLogEntry key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>
          <div className="je-actions" style={{ borderTop: '1px solid var(--c-border)', paddingTop: 16 }}>
            <button type="button" className="je-btn je-btn--secondary" onClick={onCancel}>← 戻る</button>
          </div>
        </section>
      )}

      {(!isEditing || activeTab === 'form') && (
      <form onSubmit={handleSubmit} noValidate>
        {/* 基本情報 */}
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">基本情報</h2>
          </div>
          <div className="je-card__body">
            <div className="je-grid4">

              <div className="je-field">
                <label className="je-label je-label--required">仕訳日付</label>
                <input
                  type="date"
                  className={`je-input ${errors.journalDate ? 'je-input--error' : ''}`}
                  value={journalDate}
                  onChange={e => { setJournalDate(e.target.value); clearError('journalDate') }}
                />
                {errors.journalDate && <span className="je-field-error">{errors.journalDate}</span>}
              </div>

              <div className="je-field">
                <label className="je-label">伝票番号</label>
                <input type="text" className="je-input je-input--readonly" value={voucherNo} readOnly />
              </div>

              <div className="je-field">
                <label className="je-label je-label--required">伝票種別</label>
                <select
                  className={`je-select ${errors.voucherType ? 'je-select--error' : ''}`}
                  value={voucherType}
                  onChange={e => { setVoucherType(e.target.value); clearError('voucherType') }}
                >
                  {VOUCHER_TYPES.map(t => (
                    <option key={t.code} value={t.code}>{t.name}</option>
                  ))}
                </select>
                {errors.voucherType && <span className="je-field-error">{errors.voucherType}</span>}
              </div>

              <div className="je-field">
                <label className="je-label">摘要</label>
                <input
                  type="text"
                  className="je-input"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="仕訳の概要"
                  maxLength={100}
                />
              </div>

              <div className="je-field">
                <label className="je-label">部門</label>
                <select
                  className="je-select"
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value)}
                >
                  <option value="">--- 未設定 ---</option>
                  {departments.filter(d => d.isActive !== false).map(d => (
                    <option key={d.id} value={d.code}>{d.code} {d.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        </section>

        {(errors.entries || errors.balance) && (
          <div className="je-alert je-alert--error">
            {errors.entries?.map((m, i) => <div key={i}>⚠ {m}</div>)}
            {errors.balance  && <div>⚠ 貸借が一致していません — {errors.balance}</div>}
          </div>
        )}

        {/* 仕訳明細 */}
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">仕訳明細</h2>
            <span className="je-line-badge">{lines.length} 行</span>
          </div>
          <div className="je-card__body je-card__body--flush">
            <div className="je-table-wrap">
              <table className="je-table">
                <thead>
                  <tr>
                    <th className="je-th je-th--no"    rowSpan={2}>No.</th>
                    <th className="je-th je-th--debit"  colSpan={2}>
                      <span className="je-side-label je-side-label--debit">借方</span>
                    </th>
                    <th className="je-th je-th--credit" colSpan={2}>
                      <span className="je-side-label je-side-label--credit">貸方</span>
                    </th>
                    <th className="je-th je-th--memo" rowSpan={2}>摘要</th>
                    <th className="je-th je-th--del"  rowSpan={2}></th>
                  </tr>
                  <tr>
                    <th className="je-th je-th--account">勘定科目</th>
                    <th className="je-th je-th--amount">金額</th>
                    <th className="je-th je-th--account">勘定科目</th>
                    <th className="je-th je-th--amount">金額</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => (
                    <tr key={line.id} className={`je-tr ${idx % 2 === 1 ? 'je-tr--alt' : ''}`}>
                      <td className="je-td je-td--no">{idx + 1}</td>

                      <td className="je-td je-td--account">
                        <AccountSelect
                          accounts={accounts}
                          value={line.debitCode}
                          onChange={code => updateLine(line.id, 'debitCode', code)}
                          placeholder="借方科目"
                          hasError={!!errors[`${line.id}_debitCode`]}
                        />
                        {errors[`${line.id}_debitCode`] && (
                          <span className="je-cell-error">{errors[`${line.id}_debitCode`]}</span>
                        )}
                      </td>

                      <td className="je-td je-td--amount">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`je-amt je-amt--debit ${errors[`${line.id}_debitAmount`] ? 'je-amt--error' : ''}`}
                          value={line.debitAmount}
                          onChange={e => handleAmountChange(line.id, 'debitAmount', e.target.value)}
                          onBlur={e  => handleAmountBlur(  line.id, 'debitAmount', e.target.value)}
                          placeholder="0"
                        />
                        {errors[`${line.id}_debitAmount`] && (
                          <span className="je-cell-error">{errors[`${line.id}_debitAmount`]}</span>
                        )}
                      </td>

                      <td className="je-td je-td--account">
                        <AccountSelect
                          accounts={accounts}
                          value={line.creditCode}
                          onChange={code => updateLine(line.id, 'creditCode', code)}
                          placeholder="貸方科目"
                          hasError={!!errors[`${line.id}_creditCode`]}
                        />
                        {errors[`${line.id}_creditCode`] && (
                          <span className="je-cell-error">{errors[`${line.id}_creditCode`]}</span>
                        )}
                      </td>

                      <td className="je-td je-td--amount">
                        <input
                          type="text"
                          inputMode="numeric"
                          className={`je-amt je-amt--credit ${errors[`${line.id}_creditAmount`] ? 'je-amt--error' : ''}`}
                          value={line.creditAmount}
                          onChange={e => handleAmountChange(line.id, 'creditAmount', e.target.value)}
                          onBlur={e  => handleAmountBlur(  line.id, 'creditAmount', e.target.value)}
                          placeholder="0"
                        />
                        {errors[`${line.id}_creditAmount`] && (
                          <span className="je-cell-error">{errors[`${line.id}_creditAmount`]}</span>
                        )}
                      </td>

                      <td className="je-td je-td--memo">
                        <input
                          type="text"
                          className="je-input je-input--memo"
                          value={line.memo}
                          onChange={e => updateLine(line.id, 'memo', e.target.value)}
                          placeholder="摘要"
                          maxLength={50}
                        />
                      </td>

                      <td className="je-td je-td--del">
                        <button
                          type="button"
                          className="je-del-btn"
                          onClick={() => removeLine(line.id)}
                          disabled={lines.length <= 1}
                          title="この行を削除"
                        >×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="je-tfoot-row">
                    <td className="je-td"></td>
                    <td className="je-td je-td--total-label">合計</td>
                    <td className="je-td je-td--amount">
                      <span className={`je-total je-total--debit ${debitTotal > 0 ? 'je-total--active' : ''}`}>
                        {debitTotal > 0 ? fmtDisplay(debitTotal) : '—'}
                      </span>
                    </td>
                    <td className="je-td je-td--total-label">合計</td>
                    <td className="je-td je-td--amount">
                      <span className={`je-total je-total--credit ${creditTotal > 0 ? 'je-total--active' : ''}`}>
                        {creditTotal > 0 ? fmtDisplay(creditTotal) : '—'}
                      </span>
                    </td>
                    <td className="je-td" colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="je-add-row">
              <button type="button" className="je-add-btn" onClick={addLine}>＋ 行を追加</button>
            </div>
          </div>
        </section>

        {/* インボイス情報 */}
        <section className="je-card">
          <div className="je-card__header">
            <h2 className="je-card__title">インボイス情報</h2>
            <label className="inv-enable-toggle">
              <input
                type="checkbox"
                checked={invEnabled}
                onChange={e => setInvEnabled(e.target.checked)}
              />
              インボイス制度対応を入力する
            </label>
          </div>

          {invEnabled && (
            <div className="je-card__body">
              <div className="inv-section-grid">

                {/* 適格 / 非適格 */}
                <div className="je-field">
                  <label className="je-label je-label--required">適格請求書</label>
                  <div className="inv-radio-group">
                    <label className={`inv-radio-label ${qualified ? 'inv-radio-label--active' : ''}`}>
                      <input type="radio" name="qualified" value="true"
                        checked={qualified} onChange={() => setQualified(true)} />
                      適格
                    </label>
                    <label className={`inv-radio-label ${!qualified ? 'inv-radio-label--active inv-radio-label--non' : ''}`}>
                      <input type="radio" name="qualified" value="false"
                        checked={!qualified} onChange={() => setQualified(false)} />
                      非適格
                    </label>
                  </div>
                </div>

                {/* 登録番号（適格のみ） */}
                <div className="je-field">
                  <label className="je-label" style={{ opacity: qualified ? 1 : 0.4 }}>
                    適格請求書登録番号
                  </label>
                  <input
                    type="text"
                    className={`je-input inv-no-input ${errors.invNo ? 'je-input--error' : ''}`}
                    value={invNo}
                    onChange={e => { setInvNo(e.target.value.toUpperCase()); setErrors(v => { const n={...v}; delete n.invNo; return n }) }}
                    placeholder="T1234567890123"
                    maxLength={14}
                    disabled={!qualified}
                    style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}
                  />
                  {errors.invNo
                    ? <span className="je-field-error">{errors.invNo}</span>
                    : qualified && <span className="je-field-hint">T + 13桁の数字</span>
                  }
                </div>

                {/* 消費税区分 */}
                <div className="je-field">
                  <label className="je-label je-label--required">消費税区分</label>
                  <select className="je-select" value={taxCategory} onChange={e => setTaxCategory(e.target.value)}>
                    {TAX_CATEGORIES.map(c => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* 税込 / 税抜（課税のみ） */}
                <div className="je-field">
                  <label className="je-label" style={{ opacity: isTaxable ? 1 : 0.4 }}>入力方法</label>
                  <div className="inv-radio-group">
                    <label className={`inv-radio-label ${taxInput === 'inclusive' ? 'inv-radio-label--active' : ''}`}>
                      <input type="radio" name="taxInput" value="inclusive"
                        checked={taxInput === 'inclusive'} onChange={() => setTaxInput('inclusive')} disabled={!isTaxable} />
                      税込入力
                    </label>
                    <label className={`inv-radio-label ${taxInput === 'exclusive' ? 'inv-radio-label--active' : ''}`}>
                      <input type="radio" name="taxInput" value="exclusive"
                        checked={taxInput === 'exclusive'} onChange={() => setTaxInput('exclusive')} disabled={!isTaxable} />
                      税抜入力
                    </label>
                  </div>
                </div>

                {/* 経過措置（非適格 + 課税のみ） */}
                {!qualified && isTaxable && (
                  <div className="je-field inv-field--wide">
                    <label className="je-label je-label--required">経過措置</label>
                    <select className="je-select" value={transitional} onChange={e => setTransitional(e.target.value)}>
                      {TRANSITIONAL_MEASURES.map(m => (
                        <option key={m.code} value={m.code}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                )}

              </div>

              {/* 消費税計算結果 */}
              {isTaxable && debitTotal > 0 && (
                <div className="inv-calc-panel">
                  <div className="inv-calc-title">消費税 自動計算結果</div>
                  <div className="inv-calc-row">
                    <span className="inv-calc-label">税抜金額</span>
                    <span className="inv-calc-value">¥{invCalc.base.toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="inv-calc-row">
                    <span className="inv-calc-label">消費税額</span>
                    <span className="inv-calc-value inv-calc-value--tax">¥{invCalc.tax.toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="inv-calc-row">
                    <span className="inv-calc-label">税込金額</span>
                    <span className="inv-calc-value inv-calc-value--total">¥{invCalc.total.toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="inv-calc-divider" />
                  <div className="inv-calc-row">
                    <span className="inv-calc-label">仕入税額控除</span>
                    <span className="inv-calc-value inv-calc-value--credit">¥{invCalc.credit.toLocaleString('ja-JP')}</span>
                  </div>
                  {!qualified && (
                    <div className="inv-calc-note">
                      ※ {TRANSITIONAL_MEASURES.find(m => m.code === transitional)?.label || ''}
                      が適用されています
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 貸借バランス */}
        <div className={`je-balance ${isBalanced ? 'je-balance--ok' : hasAnyAmount ? 'je-balance--ng' : ''}`}>
          <div className="je-balance__side">
            <span className="je-balance__label">借方合計</span>
            <span className="je-balance__value je-balance__value--debit">{fmtDisplay(debitTotal)}</span>
          </div>
          <div className="je-balance__center">
            {isBalanced ? (
              <div className="je-balance__badge je-balance__badge--ok">
                <span className="je-balance__icon">✓</span><span>貸借一致</span>
              </div>
            ) : hasAnyAmount ? (
              <div className="je-balance__badge je-balance__badge--ng">
                <span className="je-balance__icon">✗</span>
                <div>
                  <div>貸借不一致</div>
                  <div className="je-balance__diff">
                    差額 {fmtDisplay(Math.abs(difference))}
                    <small>　{difference > 0 ? '借方超過' : '貸方超過'}</small>
                  </div>
                </div>
              </div>
            ) : (
              <div className="je-balance__badge je-balance__badge--neutral">金額を入力してください</div>
            )}
          </div>
          <div className="je-balance__side je-balance__side--right">
            <span className="je-balance__label">貸方合計</span>
            <span className="je-balance__value je-balance__value--credit">{fmtDisplay(creditTotal)}</span>
          </div>
        </div>

        {/* アクション */}
        <div className="je-actions">
          <button type="button" className="je-btn je-btn--outline" onClick={handleClear}>クリア</button>
          <button type="button" className="je-btn je-btn--secondary" onClick={onCancel}>← 戻る</button>
          <button type="submit" className="je-btn je-btn--primary">
            {isEditing ? '更新' : '登録'}
          </button>
        </div>
      </form>
      )}
    </div>
  )
}
