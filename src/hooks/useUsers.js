import { useState, useEffect } from 'react'
import { SAMPLE_USERS } from '../data/masterSampleData'

const USERS_KEY   = 'accounting_users_v1'
const CURRENT_KEY = 'accounting_current_user_v1'

export const ROLES = [
  { code: 'USER',     name: '一般ユーザー' },
  { code: 'APPROVER', name: '承認者' },
  { code: 'ADMIN',    name: '管理者' },
]

function genId() {
  return `USR-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
}

export function useUsers() {
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem(USERS_KEY)
      if (raw) {
        const p = JSON.parse(raw)
        // email フィールドがない古いデータはサンプルデータに置き換え
        if (Array.isArray(p) && p.length > 0 && p[0].email) return p
      }
    } catch {}
    return SAMPLE_USERS
  })

  const [currentUserId, _setCurrentUserId] = useState(() => {
    try {
      const raw = localStorage.getItem(CURRENT_KEY)
      if (raw) return raw
    } catch {}
    return SAMPLE_USERS[0]?.id || null
  })

  useEffect(() => {
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)) } catch {}
  }, [users])

  function setCurrentUserId(id) {
    _setCurrentUserId(id)
    try { localStorage.setItem(CURRENT_KEY, id) } catch {}
  }

  const currentUser = users.find(u => u.id === currentUserId)
    || users.find(u => u.isActive)
    || null

  function saveUser(item) {
    const entry = item.id
      ? item
      : { ...item, id: genId(), createdAt: new Date().toISOString() }
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === entry.id)
      return idx >= 0
        ? prev.map(u => u.id === entry.id ? entry : u)
        : [...prev, entry]
    })
  }

  function deleteUser(id) {
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  return { users, currentUser, currentUserId, setCurrentUserId, saveUser, deleteUser }
}
