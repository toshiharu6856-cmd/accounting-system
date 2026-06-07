import { useState } from 'react'

const AUTH_KEY = 'accounting_session_v1'

export function useAuth(users) {
  const [loggedInUserId, setLoggedInUserId] = useState(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        return parsed.userId || null
      }
    } catch {}
    return null
  })

  const isLoggedIn = !!loggedInUserId &&
    users.some(u => u.id === loggedInUserId && u.isActive !== false)

  const currentUser = isLoggedIn
    ? users.find(u => u.id === loggedInUserId) || null
    : null

  function login(email, password) {
    const user = users.find(u =>
      u.isActive !== false &&
      u.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
    )
    if (!user) return { ok: false, message: 'メールアドレスまたはパスワードが正しくありません' }
    setLoggedInUserId(user.id)
    try {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        userId:     user.id,
        loggedInAt: new Date().toISOString(),
      }))
    } catch {}
    return { ok: true }
  }

  function logout() {
    setLoggedInUserId(null)
    try { localStorage.removeItem(AUTH_KEY) } catch {}
  }

  return { isLoggedIn, currentUser, loggedInUserId, login, logout }
}
