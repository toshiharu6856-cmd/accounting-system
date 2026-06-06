import { useState, useMemo } from 'react'
import Modal from './Modal'

const EMPTY_FORM = { code: '', name: '', parentId: '', sortOrder: 10, isActive: true }

function validate(form, departments, editingId) {
  const errs = {}
  if (!form.code.trim()) errs.code = '部門コードは必須です'
  else if (departments.some(d => d.code === form.code.trim() && d.id !== editingId))
    errs.code = 'このコードは既に使用されています'
  if (!form.name.trim()) errs.name = '部門名は必須です'
  return errs
}

// Build flat list sorted by sortOrder, with level info derived from parentId
function buildSortedList(departments) {
  const byId = Object.fromEntries(departments.map(d => [d.id, d]))

  function getLevel(d) {
    let level = 0
    let cur = d
    while (cur.parentId && byId[cur.parentId]) { level++; cur = byId[cur.parentId] }
    return level
  }

  return [...departments]
    .map(d => ({ ...d, level: getLevel(d) }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
}

export default function DepartmentMaster({ departments, saveDepartment, deleteDepartment }) {
  const [modal,  setModal]  = useState(null)
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})

  const sorted = useMemo(() => buildSortedList(departments), [departments])
  const byId   = useMemo(() => Object.fromEntries(departments.map(d => [d.id, d])), [departments])

  function openAdd() {
    setForm({ ...EMPTY_FORM, sortOrder: departments.length * 10 + 10 })
    setErrors({})
    setModal({ mode: 'add' })
  }

  function openEdit(dept) {
    setForm({ ...dept, parentId: dept.parentId || '' })
    setErrors({})
    setModal({ mode: 'edit', id: dept.id })
  }

  function closeModal() { setModal(null) }

  function setField(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function handleSave() {
    const errs = validate(form, departments, modal?.id)
    if (Object.keys(errs).length) { setErrors(errs); return }

    const entry = {
      ...form,
      code:     form.code.trim(),
      name:     form.name.trim(),
      parentId: form.parentId || null,
      sortOrder: Number(form.sortOrder) || 10,
    }

    saveDepartment(modal.mode === 'add' ? entry : { ...entry, id: modal.id })
    closeModal()
  }

  function hasChildren(id) {
    return departments.some(d => d.parentId === id)
  }

  function handleDelete(dept) {
    if (hasChildren(dept.id)) {
      alert(`「${dept.name}」には下位部門があるため削除できません。\n先に下位部門を削除または上位部門を変更してください。`)
      return
    }
    if (window.confirm(`「${dept.code} ${dept.name}」を削除しますか？`)) {
      deleteDepartment(dept.id)
    }
  }

  // parent options: exclude self and its descendants
  function getDescendantIds(id) {
    const result = new Set()
    function walk(parentId) {
      departments.filter(d => d.parentId === parentId).forEach(d => { result.add(d.id); walk(d.id) })
    }
    walk(id)
    return result
  }

  const parentOptions = useMemo(() => {
    if (!modal) return []
    const excluded = modal.id ? new Set([modal.id, ...getDescendantIds(modal.id)]) : new Set()
    return sorted.filter(d => !excluded.has(d.id))
  }, [modal, sorted]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="je">
      <div className="je__page-header">
        <div className="je__breadcrumb">会計システム › マスタ管理 › 部門マスタ</div>
        <div className="je__title-row">
          <h1 className="je__title">部門マスタ</h1>
          <span className="je__spec-badge">{departments.length} 件</span>
        </div>
      </div>

      <div className="jl-toolbar">
        <button className="je-btn je-btn--primary" onClick={openAdd}>＋ 部門を追加</button>
      </div>

      <section className="je-card">
        <div className="je-card__body je-card__body--flush">
          <div className="je-table-wrap">
            <table className="jl-table">
              <thead>
                <tr>
                  <th className="jl-th">部門コード</th>
                  <th className="jl-th">部門名</th>
                  <th className="jl-th">上位部門</th>
                  <th className="jl-th jl-th--center">表示順</th>
                  <th className="jl-th jl-th--center">状態</th>
                  <th className="jl-th jl-th--center">操作</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr><td colSpan={6} className="jl-empty-cell">部門データがありません</td></tr>
                ) : (
                  sorted.map((dept, idx) => (
                    <tr key={dept.id} className={`jl-tr ${idx % 2 === 1 ? 'jl-tr--alt' : ''}`}>
                      <td className="jl-td">
                        <span className="ms-code-badge">{dept.code}</span>
                      </td>
                      <td className="jl-td ms-dept-name">
                        <span
                          className="ms-dept-indent"
                          style={{ paddingLeft: `${dept.level * 20}px` }}
                        >
                          {dept.level > 0 && <span className="ms-dept-tree">{'└'} </span>}
                          {dept.name}
                          {hasChildren(dept.id) && <span className="ms-has-children">▾</span>}
                        </span>
                      </td>
                      <td className="jl-td ms-kana">
                        {dept.parentId ? byId[dept.parentId]?.name : <span className="ms-sub-none">—</span>}
                      </td>
                      <td className="jl-td jl-td--actions">{dept.sortOrder}</td>
                      <td className="jl-td jl-td--actions">
                        <span className={`ms-status ${dept.isActive ? 'ms-status--on' : 'ms-status--off'}`}>
                          {dept.isActive ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="jl-td jl-td--actions">
                        <button className="jl-btn jl-btn--edit"   onClick={() => openEdit(dept)}>編集</button>
                        <button className="jl-btn jl-btn--delete" onClick={() => handleDelete(dept)}>削除</button>
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
          title={modal.mode === 'add' ? '部門を追加' : '部門を編集'}
          onClose={closeModal}
        >
          <div className="ms-form">
            <div className="ms-form-row ms-form-row--2">
              <div className="je-field">
                <label className="je-label je-label--required">部門コード</label>
                <input
                  className={`je-input ${errors.code ? 'je-input--error' : ''}`}
                  value={form.code}
                  onChange={e => setField('code', e.target.value)}
                  placeholder="0101"
                  maxLength={10}
                />
                {errors.code && <span className="je-field-error">{errors.code}</span>}
              </div>
              <div className="je-field">
                <label className="je-label je-label--required">部門名</label>
                <input
                  className={`je-input ${errors.name ? 'je-input--error' : ''}`}
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="営業部"
                  maxLength={30}
                />
                {errors.name && <span className="je-field-error">{errors.name}</span>}
              </div>
            </div>

            <div className="je-field">
              <label className="je-label">上位部門</label>
              <select
                className="je-select"
                value={form.parentId}
                onChange={e => setField('parentId', e.target.value)}
              >
                <option value="">（なし / トップレベル）</option>
                {parentOptions.map(d => (
                  <option key={d.id} value={d.id}>
                    {'　'.repeat(d.level)}{d.code}　{d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="je-field">
              <label className="je-label">表示順</label>
              <input
                type="number"
                className="je-input"
                value={form.sortOrder}
                onChange={e => setField('sortOrder', e.target.value)}
                min={0}
                max={9999}
                style={{ width: '100px' }}
              />
            </div>

            <label className="ms-check-label">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => setField('isActive', e.target.checked)}
              />
              有効
            </label>

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
