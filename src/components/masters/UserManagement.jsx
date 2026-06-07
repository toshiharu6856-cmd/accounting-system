import { useState } from 'react'
import Modal from './Modal'
import { ROLES } from '../../hooks/useUsers'

const EMPTY_FORM = { name: '', role: 'USER', isActive: true }

function validate(form, users, editingId) {
  const errs = {}
  if (!form.name.trim()) errs.name = '名前は必須です'
  else if (users.some(u => u.name === form.name.trim() && u.id !== editingId))
    errs.name = 'この名前は既に使用されています'
  if (!form.role) errs.role = '役割は必須です'
  return errs
}

const ROLE_BADGE = {
  USER:     'apv-role--user',
  APPROVER: 'apv-role--approver',
  ADMIN:    'apv-role--admin',
}

export default function UserManagement({ users, saveUser, deleteUser, currentUser }) {
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  function openAdd() {
    setForm(EMPTY_FORM)
    setErrors({})
    setModal({ mode: 'add' })
  }

  function openEdit(u) {
    setForm({ ...EMPTY_FORM, ...u })
    setErrors({})
    setModal({ mode: 'edit', id: u.id })
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleSave() {
    const errs = validate(form, users, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const item = modal.mode === 'add'
      ? { ...form, name: form.name.trim() }
      : { ...form, id: modal.id, name: form.name.trim() }
    saveUser(item)
    setModal(null)
  }

  function handleDelete(u) {
    if (u.id === currentUser?.id) { alert('現在ログイン中のユーザーは削除できません'); return }
    if (window.confirm(`「${u.name}」を削除しますか？`)) deleteUser(u.id)
  }

  const roleName = code => ROLES.find(r => r.code === code)?.name || code

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › マスタ管理 › ユーザー管理</div>
        <div className="je__title-row">
          <h1 className="je__title">ユーザー管理</h1>
          <span className="je__spec-badge">{users.length} 件</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ ユーザーを追加</button>
      </div>

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">名前</th>
                  <th className="jl-th">役割</th>
                  <th className="jl-th jl-th--center">状態</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={4} className="jl-empty-cell">ユーザーがいません</td></tr>
                ) : (
                  users.map((u, idx) => (
                    <tr key={u.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td ms-name">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ms-default-badge">ログイン中</span>
                        )}
                      </td>
                      <td className="jl-td">
                        <span className={`apv-role ${ROLE_BADGE[u.role] || ''}`}>{roleName(u.role)}</span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-status ${u.isActive ? 'ms-status--on' : 'ms-status--off'}`}>
                          {u.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(u)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => handleDelete(u)}>削除</button>
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
        <Modal title={modal.mode === 'add' ? 'ユーザーを追加' : 'ユーザーを編集'} onClose={() => setModal(null)}>
          <div className="ms-form">
            <div className="je-field">
              <label className="je-label je-label--required">名前</label>
              <input
                className={`je-input ${errors.name ? 'je-input--error' : ''}`}
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                placeholder="山田 太郎"
                maxLength={30}
              />
              {errors.name && <span className="je-field-error">{errors.name}</span>}
            </div>

            <div className="je-field">
              <label className="je-label je-label--required">役割</label>
              <select
                className={`je-select ${errors.role ? 'je-select--error' : ''}`}
                value={form.role}
                onChange={e => setField('role', e.target.value)}
              >
                {ROLES.map(r => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
              <span className="je-field-hint">
                一般ユーザー: 仕訳入力・申請　承認者: 承認・却下　管理者: 全権限
              </span>
            </div>

            <div className="ms-form-row ms-form-row--checks">
              <label className="ms-check-label">
                <input type="checkbox" checked={form.isActive} onChange={e => setField('isActive', e.target.checked)} />
                有効
              </label>
            </div>

            <div className="ms-modal-actions">
              <button type="button" className="je-btn je-btn--secondary" onClick={() => setModal(null)}>キャンセル</button>
              <button type="button" className="je-btn je-btn--primary"   onClick={handleSave}>保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
