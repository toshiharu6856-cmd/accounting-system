import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const TOKEN_KEY = 'accounting_session_token_v2'
const SESSION_DAYS = 7

function makeToken() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function useAuth(users) {
  const [loggedInUserId, setLoggedInUserId] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)

  // アプリ起動時にSupabaseでセッションを検証
  const validateSession = useCallback(async () => {
    setSessionLoading(true)
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setSessionLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (error || !data) {
      // Supabaseに存在しないトークン → クリア
      localStorage.removeItem(TOKEN_KEY)
      setLoggedInUserId(null)
      setSessionLoading(false)
      return
    }

    if (new Date(data.expires_at) < new Date()) {
      // 有効期限切れ → 削除
      await supabase.from('user_sessions').delete().eq('token', token)
      localStorage.removeItem(TOKEN_KEY)
      setLoggedInUserId(null)
      setSessionLoading(false)
      return
    }

    setLoggedInUserId(data.user_id)
    setSessionLoading(false)
  }, [])

  useEffect(() => { validateSession() }, [validateSession])

  const isLoggedIn = !sessionLoading &&
    !!loggedInUserId &&
    users.some(u => u.id === loggedInUserId && u.isActive !== false)

  const currentUser = isLoggedIn
    ? users.find(u => u.id === loggedInUserId) || null
    : null

  async function login(email, password) {
    const user = users.find(u =>
      u.isActive !== false &&
      u.email?.trim().toLowerCase() === email.trim().toLowerCase() &&
      u.password === password
    )
    if (!user) return { ok: false, message: 'メールアドレスまたはパスワードが正しくありません' }

    // Supabaseにセッションを登録
    const token     = makeToken()
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000).toISOString()

    const { error } = await supabase.from('user_sessions').insert({
      token,
      user_id:    user.id,
      expires_at: expiresAt,
    })
    if (error) {
      console.error('session create error:', error)
      return { ok: false, message: 'セッションの作成に失敗しました。時間をおいて再試行してください。' }
    }

    localStorage.setItem(TOKEN_KEY, token)
    setLoggedInUserId(user.id)
    return { ok: true }
  }

  async function logout() {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      await supabase.from('user_sessions').delete().eq('token', token)
      localStorage.removeItem(TOKEN_KEY)
    }
    setLoggedInUserId(null)
  }

  return { isLoggedIn, currentUser, loggedInUserId, login, logout, sessionLoading }
}
