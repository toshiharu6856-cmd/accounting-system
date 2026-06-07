import { useState } from 'react'
import { ROLES } from '../hooks/useUsers'

const HINTS = [
  { role: '管理者',     email: 'admin@example.com',    password: 'admin123'    },
  { role: '承認者',     email: 'approver@example.com', password: 'approver123' },
  { role: '一般ユーザー', email: 'user@example.com',     password: 'user123'     },
]

export default function LoginScreen({ onLogin }) {
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)
  const [showHints,   setShowHints]   = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim())    { setError('メールアドレスを入力してください'); return }
    if (!password.trim()) { setError('パスワードを入力してください'); return }
    setLoading(true)
    setError('')
    setTimeout(() => {
      const result = onLogin(email, password)
      if (!result.ok) {
        setError(result.message)
        setLoading(false)
      }
    }, 300)
  }

  function fillHint(hint) {
    setEmail(hint.email)
    setPassword(hint.password)
    setError('')
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">📒</span>
          <span className="login-logo-text">会計システム</span>
        </div>
        <h1 className="login-title">ログイン</h1>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="je-field">
            <label className="je-label je-label--required">メールアドレス</label>
            <input
              type="email"
              className={`je-input login-input ${error ? 'je-input--error' : ''}`}
              value={email}
              onChange={e => { setEmail(e.target.value); setError('') }}
              placeholder="admin@example.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="je-field">
            <label className="je-label je-label--required">パスワード</label>
            <div className="login-pass-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                className={`je-input login-input login-input--pass ${error ? 'je-input--error' : ''}`}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="パスワードを入力"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass(v => !v)}
                title={showPass ? 'パスワードを隠す' : 'パスワードを表示'}
              >
                {showPass ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error">
              <span className="login-error-icon">⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="je-btn je-btn--primary login-btn"
            disabled={loading}
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <div className="login-hint-section">
          <button
            type="button"
            className="login-hint-toggle"
            onClick={() => setShowHints(v => !v)}
          >
            サンプルアカウント {showHints ? '▲' : '▼'}
          </button>
          {showHints && (
            <div className="login-hints">
              {HINTS.map(h => (
                <button
                  key={h.email}
                  type="button"
                  className="login-hint-row"
                  onClick={() => fillHint(h)}
                  title="クリックで入力"
                >
                  <span className="login-hint-role">{h.role}</span>
                  <span className="login-hint-cred">{h.email}</span>
                  <span className="login-hint-sep">/</span>
                  <span className="login-hint-cred">{h.password}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
