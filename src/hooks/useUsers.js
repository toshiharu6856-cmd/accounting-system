import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SAMPLE_USERS } from '../data/masterSampleData'

const SESSION_KEY = 'accounting_session_v1'

export const ROLES = [
  { code: 'USER',     name: '一般ユーザー' },
  { code: 'APPROVER', name: '承認者' },
  { code: 'ADMIN',    name: '管理者' },
]

function genId() {
  return `USR-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
}

function userFromRow(r) {
  return {
    id:        r.id,
    name:      r.name,
    email:     r.email,
    password:  r.password,
    role:      r.role,
    isActive:  r.is_active,
    createdAt: r.created_at,
  }
}

let _userSeeded = false

export function useUsers() {
  const [users, setUsers] = useState([])
  const [currentUserId, _setCurrentUserId] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) return JSON.parse(raw).userId || null
    } catch {}
    return null
  })
  const [loading, setLoading] = useState(true)
  const seedingRef = useRef(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').order('created_at')
    if (error) { console.error('users fetch error:', error); setLoading(false); return }

    if (data.length === 0 && !_userSeeded && !seedingRef.current) {
      seedingRef.current = true
      _userSeeded = true
      await seedUsers()
      seedingRef.current = false
      return fetchAll()
    }

    const loaded = data.map(userFromRow)
    setUsers(loaded)

    // セッションにユーザーがいない場合は最初のアクティブユーザーをセット
    if (!currentUserId && loaded.length > 0) {
      _setCurrentUserId(loaded.find(u => u.isActive)?.id || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function seedUsers() {
    await supabase.from('users').upsert(SAMPLE_USERS.map(u => ({
      id:         u.id,
      name:       u.name,
      email:      u.email,
      password:   u.password,
      role:       u.role,
      is_active:  u.isActive,
      created_at: u.createdAt,
    })))
  }

  function setCurrentUserId(id) {
    _setCurrentUserId(id)
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: id, loggedInAt: new Date().toISOString() }))
    } catch {}
  }

  const currentUser = users.find(u => u.id === currentUserId)
    || users.find(u => u.isActive)
    || null

  async function saveUser(item) {
    const now = new Date().toISOString()
    const entry = item.id ? item : { ...item, id: genId(), createdAt: now }
    const { error } = await supabase.from('users').upsert({
      id:         entry.id,
      name:       entry.name,
      email:      entry.email,
      password:   entry.password,
      role:       entry.role,
      is_active:  entry.isActive,
      created_at: entry.createdAt || now,
    })
    if (error) { console.error('saveUser error:', error); return }
    await fetchAll()
  }

  async function deleteUser(id) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) { console.error('deleteUser error:', error); return }
    setUsers(prev => prev.filter(u => u.id !== id))
  }

  return { users, currentUser, currentUserId, setCurrentUserId, saveUser, deleteUser, loading }
}
