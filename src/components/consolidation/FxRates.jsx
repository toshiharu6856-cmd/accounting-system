import { useState, useMemo } from 'react'
import Modal from '../masters/Modal'
import { CURRENCIES } from '../../hooks/useSubsidiaries'
import { downloadCsv, todayStamp } from '../../utils/csv'

const EMPTY = { yearMonth: '', currency: 'USD', endRate: '', avgRate: '' }
const FOREIGN = CURRENCIES.filter(c => c.code !== 'JPY')

function validate(form, fxRates, editingId) {
  const errs = {}
  if (!form.yearMonth) errs.yearMonth = '年月は必須です'
  if (!form.currency)  errs.currency  = '通貨は必須です'
  if (fxRates.some(r => r.yearMonth === form.yearMonth && r.currency === form.currency && r.id !== editingId))
    errs.currency = 'この年月・通貨の組み合わせは既に登録されています'
  const end = Number(form.endRate)
  const avg = Number(form.avgRate)
  if (!form.endRate || isNaN(end) || end <= 0) errs.endRate = '期末レートは正の数で入力してください'
  if (!form.avgRate || isNaN(avg) || avg <= 0) errs.avgRate = '平均レートは正の数で入力してください'
  return errs
}

export default function FxRates({ fxRates, saveFxRate, deleteFxRate }) {
  const [modal,       setModal]       = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [errors,      setErrors]      = useState({})
  const [filterMonth, setFilterMonth] = useState('')

  const sorted = useMemo(() => [...fxRates].sort((a, b) =>
    b.yearMonth.localeCompare(a.yearMonth) || a.currency.localeCompare(b.currency)
  ), [fxRates])

  const displayed = filterMonth ? sorted.filter(r => r.yearMonth === filterMonth) : sorted

  function openAdd() {
    const ym = new Date().toISOString().slice(0, 7)
    setForm({ ...EMPTY, yearMonth: ym })
    setErrors({})
    setModal({ mode: 'add' })
  }
  function openEdit(r) { setForm({ ...r }); setErrors({}); setModal({ mode: 'edit', id: r.id }) }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleSave() {
    const errs = validate(form, fxRates, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const item = { ...form, endRate: Number(form.endRate), avgRate: Number(form.avgRate) }
    if (modal.mode === 'edit') item.id = modal.id
    saveFxRate(item)
    setModal(null)
  }

  function exportCsv() {
    const header = ['年月', '通貨', '期末レート', '平均レート']
    const rows = displayed.map(r => [r.yearMonth, r.currency, r.endRate, r.avgRate])
    downloadCsv(`為替レート_${todayStamp()}.csv`, [header, ...rows])
  }

  const currName = code => CURRENCIES.find(c => c.code === code)?.name || code

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 連結会計 › 為替レート</div>
        <div className="je__title-row">
          <h1 className="je__title">月次為替レート</h1>
          <span className="je__spec-badge">{fxRates.length} 件</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ レートを追加</button>
        <input type="month" className="je-input" style={{ width: 160 }}
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        {filterMonth && (
          <button className="je-btn je-btn--ghost" onClick={() => setFilterMonth('')}>クリア</button>
        )}
        <button className="je-btn je-btn--outline" style={{ marginLeft: 'auto' }}
          onClick={exportCsv} disabled={displayed.length === 0}>
          📄 CSV出力
        </button>
      </div>

      <div className="je-alert" style={{ marginBottom: 12, fontSize: 12, color: 'var(--c-text-2)', background: '#f8fafc', border: '1px solid var(--c-border)', borderRadius: 6, padding: '8px 12px' }}>
        BS科目（資産・負債・純資産）には<strong>期末レート</strong>、PL科目（収益・費用）には<strong>平均レート</strong>が適用されます。
      </div>

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">年月</th>
                  <th className="jl-th">通貨</th>
                  <th className="jl-th jl-th--right">期末レート（円）</th>
                  <th className="jl-th jl-th--right">平均レート（円）</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={5} className="jl-empty-cell">為替レートが登録されていません</td></tr>
                ) : (
                  displayed.map((r, idx) => (
                    <tr key={r.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td jl-td--date">{r.yearMonth}</td>
                      <td className="jl-td">
                        <span className="conso-currency-badge">{r.currency}</span>
                        <span className="conso-currency-name">{currName(r.currency)}</span>
                      </td>
                      <td className="jl-td jl-td--amount">{r.endRate.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="jl-td jl-td--amount">{r.avgRate.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(r)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => { if (window.confirm('削除しますか？')) deleteFxRate(r.id) }}>削除</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {modal && (
        <Modal title={modal.mode === 'add' ? '為替レートを追加' : '為替レートを編集'} onClose={() => setModal(null)}>
          <div className="ms-form">
            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">年月</label>
                <input type="month" className={`je-input ${errors.yearMonth ? 'je-input--error' : ''}`}
                  value={form.yearMonth} onChange={e => setField('yearMonth', e.target.value)} />
                {errors.yearMonth && <span className="je-field-error">{errors.yearMonth}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">通貨</label>
                <select className={`je-select ${errors.currency ? 'je-select--error' : ''}`}
                  value={form.currency} onChange={e => setField('currency', e.target.value)}>
                  {FOREIGN.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
                {errors.currency && <span className="je-field-error">{errors.currency}</span>}
              </div>
            </div>

            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">期末レート（円/外貨1単位）</label>
                <input type="number" className={`je-input ${errors.endRate ? 'je-input--error' : ''}`}
                  value={form.endRate} onChange={e => setField('endRate', e.target.value)}
                  placeholder="150.00" min={0} step={0.0001} />
                {errors.endRate && <span className="je-field-error">{errors.endRate}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">平均レート（円/外貨1単位）</label>
                <input type="number" className={`je-input ${errors.avgRate ? 'je-input--error' : ''}`}
                  value={form.avgRate} onChange={e => setField('avgRate', e.target.value)}
                  placeholder="148.50" min={0} step={0.0001} />
                {errors.avgRate && <span className="je-field-error">{errors.avgRate}</span>}
              </div>
            </div>

            <div className="ms-modal-actions">
              <button className="je-btn je-btn--secondary" onClick={() => setModal(null)}>キャンセル</button>
              <button className="je-btn je-btn--primary" onClick={handleSave}>保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
