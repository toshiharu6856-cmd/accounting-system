import { useState } from 'react'
import Modal from './Modal'

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const m = String(i + 1).padStart(2, '0')
  return { value: m, label: `${i + 1}月` }
})

function fiscalLabel(startMonth) {
  const s = parseInt(startMonth, 10)
  const e = s === 1 ? 12 : s - 1
  return `${s}月 〜 ${e}月`
}

const EMPTY_FORM = {
  code: '', name: '', nameKana: '', fiscalStartMonth: '04',
  address: '', tel: '', isActive: true, isDefault: false,
}

function validate(form, companies, editingId) {
  const errs = {}
  if (!form.code.trim()) errs.code = '会社コードは必須です'
  else if (companies.some(c => c.code === form.code.trim() && c.id !== editingId))
    errs.code = 'このコードは既に使用されています'
  if (!form.name.trim()) errs.name = '会社名は必須です'
  return errs
}

export default function CompanyMaster({ companies, saveCompany, deleteCompany }) {
  const [modal, setModal] = useState(null)   // null | { mode: 'add'|'edit', data: {} }
  const [form,  setForm]  = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal({ mode: 'add' })
  }

  function openEdit(co) {
    setForm({ ...co })
    setErrors({})
    setModal({ mode: 'edit', id: co.id })
  }

  function closeModal() { setModal(null) }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleSave() {
    const errs = validate(form, companies, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }

    saveCompany(
      modal.mode === 'add'
        ? { ...form, code: form.code.trim(), name: form.name.trim() }
        : { ...form, id: modal.id, code: form.code.trim(), name: form.name.trim() }
    )
    closeModal()
  }

  function handleDelete(co) {
    if (co.isDefault) { alert('デフォルト会社は削除できません'); return }
    if (window.confirm(`「${co.name}」を削除しますか？`)) deleteCompany(co.id)
  }

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › マスタ管理 › 会社マスタ</div>
        <div className="je__title-row">
          <h1 className="je__title">会社マスタ</h1>
          <span className="je__spec-badge">{companies.length} 件</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ 会社を追加</button>
      </div>

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">会社コード</th>
                  <th className="jl-th">会社名</th>
                  <th className="jl-th">会社名（カナ）</th>
                  <th className="jl-th">事業年度</th>
                  <th className="jl-th">電話番号</th>
                  <th className="jl-th jl-th--center">状態</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr><td colSpan={7} className="jl-empty-cell">会社データがありません</td></tr>
                ) : (
                  companies.map((co, idx) => (
                    <tr key={co.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td">
                        <span className="ms-code-badge">{co.code}</span>
                        {co.isDefault && <span className="ms-default-badge">デフォルト</span>}
                      </td>
                      <td className="jl-td ms-name">{co.name}</td>
                      <td className="jl-td ms-kana">{co.nameKana}</td>
                      <td className="jl-td">{fiscalLabel(co.fiscalStartMonth)}</td>
                      <td className="jl-td">{co.tel}</td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-status ${co.isActive ? 'ms-status--on' : 'ms-status--off'}`}>
                          {co.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(co)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => handleDelete(co)}>削除</button>
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
        <Modal
          title={modal.mode === 'add' ? '会社を追加' : '会社を編集'}
          onClose={closeModal}
        >
          <div className="ms-form">
            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">会社コード</label>
                <input
                  className={`je-input ${errors.code ? 'je-input--error' : ''}`}
                  value={form.code}
                  onChange={e => setField('code', e.target.value)}
                  placeholder="SMPL"
                  maxLength={10}
                />
                {errors.code && <span className="je-field-error">{errors.code}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">会社名</label>
                <input
                  className={`je-input ${errors.name ? 'je-input--error' : ''}`}
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="株式会社○○"
                  maxLength={50}
                />
                {errors.name && <span className="je-field-error">{errors.name}</span>}
              </div>
            </div>

            <div className="je-field">
              <label className="je-label">会社名（カナ）</label>
              <input
                className="je-input"
                value={form.nameKana}
                onChange={e => setField('nameKana', e.target.value)}
                placeholder="カブシキガイシャ○○"
                maxLength={80}
              />
            </div>

            <div className="je-field">
              <label className="je-label je-label--required">事業年度 開始月</label>
              <select
                className="je-select"
                value={form.fiscalStartMonth}
                onChange={e => setField('fiscalStartMonth', e.target.value)}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}始まり</option>
                ))}
              </select>
              <span className="je-field-hint">事業年度: {fiscalLabel(form.fiscalStartMonth)}</span>
            </div>

            <div className="je-field">
              <label className="je-label">住所</label>
              <input
                className="je-input"
                value={form.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="東京都○○区..."
                maxLength={100}
              />
            </div>

            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label">電話番号</label>
                <input
                  className="je-input"
                  value={form.tel}
                  onChange={e => setField('tel', e.target.value)}
                  placeholder="03-0000-0000"
                  maxLength={20}
                />
              </div>
            </div>

            <div className="ms-form-row ms-form-row--checks">
              <label className="ms-check-label">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setField('isActive', e.target.checked)}
                />
                有効
              </label>
              <label className="ms-check-label">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setField('isDefault', e.target.checked)}
                />
                デフォルト会社
              </label>
            </div>

            <div className="ms-modal-actions">
              <button type="button" className="je-btn je-btn--secondary" onClick={closeModal}>キャンセル</button>
              <button type="button" className="je-btn je-btn--primary"   onClick={handleSave}>保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
