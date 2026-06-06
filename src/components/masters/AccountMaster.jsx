import { useState } from 'react'
import { CATEGORIES } from '../../data/accounts'
import Modal from './Modal'

const CAT_OPTIONS = Object.entries(CATEGORIES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([k, v]) => ({ value: k, label: v.name }))

const NORMAL_BALANCE_BY_CAT = {
  ASSET: 'DEBIT', EXPENSE: 'DEBIT',
  LIABILITY: 'CREDIT', EQUITY: 'CREDIT', REVENUE: 'CREDIT',
}

const EMPTY_FORM = {
  code: '', name: '', category: 'ASSET', normalBalance: 'DEBIT', isActive: true, subAccounts: [],
}

function validate(form, accounts, editingId) {
  const errs = {}
  if (!form.code.trim()) errs.code = '科目コードは必須です'
  else if (accounts.some(a => a.code === form.code.trim() && a.id !== editingId))
    errs.code = 'このコードは既に使用されています'
  if (!form.name.trim()) errs.name = '科目名は必須です'
  return errs
}

function CategoryTabs({ selected, onChange }) {
  return (
    <div className="ms-cat-tabs">
      <button
        className={`ms-cat-tab ${selected === '' ? 'ms-cat-tab--active' : ''}`}
        onClick={() => onChange('')}
        type="button"
      >すべて</button>
      {CAT_OPTIONS.map(o => (
        <button
          key={o.value}
          className={`ms-cat-tab ms-cat-tab--${o.value.toLowerCase()} ${selected === o.value ? 'ms-cat-tab--active' : ''}`}
          onClick={() => onChange(o.value)}
          type="button"
        >{o.label}</button>
      ))}
    </div>
  )
}

export default function AccountMaster({ accounts, saveAccount, deleteAccount }) {
  const [catFilter, setCatFilter] = useState('')
  const [search,    setSearch]    = useState('')
  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [errors,    setErrors]    = useState({})
  const [newSub,    setNewSub]    = useState({ code: '', name: '' })

  const displayed = accounts.filter(a => {
    if (catFilter && a.category !== catFilter) return false
    if (search && !a.code.includes(search) && !a.name.includes(search)) return false
    return true
  })

  function openAdd() {
    setForm({ ...EMPTY_FORM, subAccounts: [] })
    setErrors({})
    setNewSub({ code: '', name: '' })
    setModal({ mode: 'add' })
  }

  function openEdit(acc) {
    setForm({ ...acc, subAccounts: [...(acc.subAccounts || [])] })
    setErrors({})
    setNewSub({ code: '', name: '' })
    setModal({ mode: 'edit', id: acc.id })
  }

  function closeModal() { setModal(null) }

  function setField(key, value) {
    setForm(f => {
      const next = { ...f, [key]: value }
      if (key === 'category') next.normalBalance = NORMAL_BALANCE_BY_CAT[value]
      return next
    })
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleSave() {
    const errs = validate(form, accounts, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }
    saveAccount(
      modal.mode === 'add'
        ? { ...form, code: form.code.trim(), name: form.name.trim() }
        : { ...form, id: modal.id, code: form.code.trim(), name: form.name.trim() }
    )
    closeModal()
  }

  function handleDelete(acc) {
    if (window.confirm(`「${acc.code} ${acc.name}」を削除しますか？\n仕訳で使用している場合、科目名が表示されなくなります。`))
      deleteAccount(acc.id)
  }

  // Sub-account management
  function addSubAccount() {
    if (!newSub.code.trim() || !newSub.name.trim()) return
    if (form.subAccounts.some(s => s.code === newSub.code.trim())) {
      alert('この補助科目コードは既に存在します'); return
    }
    const sub = { id: `SA-${Date.now()}`, code: newSub.code.trim(), name: newSub.name.trim() }
    setForm(f => ({ ...f, subAccounts: [...f.subAccounts, sub] }))
    setNewSub({ code: '', name: '' })
  }

  function removeSubAccount(id) {
    setForm(f => ({ ...f, subAccounts: f.subAccounts.filter(s => s.id !== id) }))
  }

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › マスタ管理 › 勘定科目マスタ</div>
        <div className="je__title-row">
          <h1 className="je__title">勘定科目マスタ</h1>
          <span className="je__spec-badge">{accounts.length} 科目</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ 科目を追加</button>
        <input
          className="je-input ms-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="コード・科目名で検索..."
        />
      </div>

      <CategoryTabs selected={catFilter} onChange={setCatFilter} />

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">科目コード</th>
                  <th className="jl-th">科目名</th>
                  <th className="jl-th">科目区分</th>
                  <th className="jl-th jl-th--center">残高方向</th>
                  <th className="jl-th jl-th--center">補助科目</th>
                  <th className="jl-th jl-th--center">状態</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={7} className="jl-empty-cell">該当する科目がありません</td></tr>
                ) : (
                  displayed.map((acc, idx) => (
                    <tr key={acc.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td">
                        <span className="ms-code-badge">{acc.code}</span>
                      </td>
                      <td className="jl-td ms-name">{acc.name}</td>
                      <td className="jl-td">
                        <span className={`ms-cat-badge ms-cat-badge--${acc.category.toLowerCase()}`}>
                          {CATEGORIES[acc.category]?.name}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-balance-badge ${acc.normalBalance === 'DEBIT' ? 'ms-balance-badge--debit' : 'ms-balance-badge--credit'}`}>
                          {acc.normalBalance === 'DEBIT' ? '借方' : '貸方'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        {(acc.subAccounts?.length || 0) > 0
                          ? <span className="ms-sub-count">{acc.subAccounts.length} 件</span>
                          : <span className="ms-sub-none">—</span>}
                      </td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-status ${acc.isActive ? 'ms-status--on' : 'ms-status--off'}`}>
                          {acc.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(acc)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => handleDelete(acc)}>削除</button>
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
          title={modal.mode === 'add' ? '科目を追加' : '科目を編集'}
          onClose={closeModal}
          size="lg"
        >
          <div className="ms-form">
            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">科目コード</label>
                <input
                  className={`je-input ${errors.code ? 'je-input--error' : ''}`}
                  value={form.code}
                  onChange={e => setField('code', e.target.value)}
                  placeholder="1001"
                  maxLength={10}
                />
                {errors.code && <span className="je-field-error">{errors.code}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">科目名</label>
                <input
                  className={`je-input ${errors.name ? 'je-input--error' : ''}`}
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="現金"
                  maxLength={30}
                />
                {errors.name && <span className="je-field-error">{errors.name}</span>}
              </div>
            </div>

            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">科目区分</label>
                <select
                  className="je-select"
                  value={form.category}
                  onChange={e => setField('category', e.target.value)}
                >
                  {CAT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="je-field">
                <label className="je-label">残高方向（自動）</label>
                <div className={`ms-balance-display ${form.normalBalance === 'DEBIT' ? 'ms-balance-display--debit' : 'ms-balance-display--credit'}`}>
                  {form.normalBalance === 'DEBIT' ? '借方残高' : '貸方残高'}
                </div>
              </div>
            </div>

            <label className="ms-check-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setField('isActive', e.target.checked)}
              />
              有効
            </label>

            {/* 補助科目 */}
            <div className="ms-sub-section">
              <div className="ms-sub-header">
                <span className="ms-sub-title">補助科目</span>
                <span className="ms-sub-count-badge">{form.subAccounts.length} 件</span>
              </div>

              {form.subAccounts.length > 0 && (
                <table className="ms-sub-table">
                  <thead>
                    <tr>
                      <th className="ms-sub-th">補助コード</th>
                      <th className="ms-sub-th">補助科目名</th>
                      <th className="ms-sub-th"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.subAccounts.map(sub => (
                      <tr key={sub.id} className="ms-sub-row">
                        <td className="ms-sub-td">
                          <span className="ms-code-badge ms-code-badge--sm">{sub.code}</span>
                        </td>
                        <td className="ms-sub-td">{sub.name}</td>
                        <td className="ms-sub-td ms-sub-td--del">
                          <button
                            type="button"
                            className="je-del-btn"
                            onClick={() => removeSubAccount(sub.id)}
                            title="削除"
                          >×</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="ms-sub-add-row">
                <input
                  className="je-input ms-sub-code-input"
                  value={newSub.code}
                  onChange={e => setNewSub(s => ({ ...s, code: e.target.value }))}
                  placeholder="01"
                  maxLength={5}
                />
                <input
                  className="je-input ms-sub-name-input"
                  value={newSub.name}
                  onChange={e => setNewSub(s => ({ ...s, name: e.target.value }))}
                  placeholder="補助科目名"
                  maxLength={30}
                  onKeyDown={e => e.key === 'Enter' && addSubAccount()}
                />
                <button
                  type="button"
                  className="je-btn je-btn--outline ms-sub-add-btn"
                  onClick={addSubAccount}
                  disabled={!newSub.code.trim() || !newSub.name.trim()}
                >＋追加</button>
              </div>
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
