import { useState } from 'react'
import Modal from '../masters/Modal'
import { CURRENCIES } from '../../hooks/useSubsidiaries'

const EMPTY = { code: '', name: '', currency: 'USD', ownershipPct: 100, country: '', isActive: true }

function validate(form, subsidiaries, editingId) {
  const errs = {}
  if (!form.code.trim()) errs.code = '会社コードは必須です'
  else if (subsidiaries.some(s => s.code === form.code.trim() && s.id !== editingId))
    errs.code = 'このコードは既に使用されています'
  if (!form.name.trim()) errs.name = '会社名は必須です'
  const pct = Number(form.ownershipPct)
  if (isNaN(pct) || pct <= 0 || pct > 100) errs.ownershipPct = '持分比率は1〜100で入力してください'
  return errs
}

export default function SubsidiaryMaster({ subsidiaries, saveSubsidiary, deleteSubsidiary }) {
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY)
  const [errors, setErrors] = useState({})

  function openAdd() { setForm(EMPTY); setErrors({}); setModal({ mode: 'add' }) }
  function openEdit(s) { setForm({ ...s }); setErrors({}); setModal({ mode: 'edit', id: s.id }) }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => { const n = { ...e }; delete n[k]; return n })
  }

  function handleSave() {
    const errs = validate(form, subsidiaries, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const item = { ...form, code: form.code.trim(), name: form.name.trim(), ownershipPct: Number(form.ownershipPct) }
    if (modal.mode === 'edit') item.id = modal.id
    saveSubsidiary(item)
    setModal(null)
  }

  function handleDelete(s) {
    if (window.confirm(`「${s.name}」を削除しますか？`)) deleteSubsidiary(s.id)
  }

  const currName = code => CURRENCIES.find(c => c.code === code)?.name || code

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › 連結会計 › 子会社管理</div>
        <div className="je__title-row">
          <h1 className="je__title">子会社管理</h1>
          <span className="je__spec-badge">{subsidiaries.length} 社</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ 子会社を追加</button>
      </div>

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">会社コード</th>
                  <th className="jl-th">会社名</th>
                  <th className="jl-th">機能通貨</th>
                  <th className="jl-th jl-th--center">持分比率</th>
                  <th className="jl-th">所在国</th>
                  <th className="jl-th jl-th--center">状態</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {subsidiaries.length === 0 ? (
                  <tr><td colSpan={7} className="jl-empty-cell">子会社が登録されていません</td></tr>
                ) : (
                  subsidiaries.map((s, idx) => (
                    <tr key={s.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td"><span className="ms-code-badge">{s.code}</span></td>
                      <td className="jl-td ms-name">{s.name}</td>
                      <td className="jl-td">
                        <span className="conso-currency-badge">{s.currency}</span>
                        <span className="conso-currency-name">{currName(s.currency)}</span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <span className="conso-pct-badge">{s.ownershipPct}%</span>
                      </td>
                      <td className="jl-td" style={{ fontSize: 13 }}>{s.country || '—'}</td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-status ${s.isActive ? 'ms-status--on' : 'ms-status--off'}`}>
                          {s.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(s)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => handleDelete(s)}>削除</button>
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
        <Modal title={modal.mode === 'add' ? '子会社を追加' : '子会社を編集'} onClose={() => setModal(null)}>
          <div className="ms-form">
            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">会社コード</label>
                <input className={`je-input ${errors.code ? 'je-input--error' : ''}`}
                  value={form.code} onChange={e => setField('code', e.target.value)}
                  placeholder="SUB001" maxLength={10} />
                {errors.code && <span className="je-field-error">{errors.code}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">会社名</label>
                <input className={`je-input ${errors.name ? 'je-input--error' : ''}`}
                  value={form.name} onChange={e => setField('name', e.target.value)}
                  placeholder="〇〇株式会社" maxLength={50} />
                {errors.name && <span className="je-field-error">{errors.name}</span>}
              </div>
            </div>

            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">機能通貨</label>
                <select className="je-select" value={form.currency} onChange={e => setField('currency', e.target.value)}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
                  ))}
                </select>
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">持分比率 (%)</label>
                <input type="number" className={`je-input ${errors.ownershipPct ? 'je-input--error' : ''}`}
                  value={form.ownershipPct} onChange={e => setField('ownershipPct', e.target.value)}
                  min={1} max={100} step={0.01} />
                {errors.ownershipPct && <span className="je-field-error">{errors.ownershipPct}</span>}
              </div>
            </div>

            <div className="je-field">
              <label className="je-label">所在国</label>
              <input className="je-input" value={form.country}
                onChange={e => setField('country', e.target.value)}
                placeholder="米国" maxLength={30} />
            </div>

            <div className="ms-form-row ms-form-row--checks">
              <label className="ms-check-label">
                <input type="checkbox" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} />
                有効
              </label>
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
