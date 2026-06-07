import { useState, useEffect } from 'react'

const KEY = 'accounting_oplog_v1'
const MAX_ENTRIES = 10000
let _seq = 1

function genLogId() {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return `OP-${ts}-${String(_seq++).padStart(3, '0')}`
}

export const OP_TYPES = {
  LOGIN:   { label: 'ログイン',       cls: 'op-badge--login'   },
  LOGOUT:  { label: 'ログアウト',     cls: 'op-badge--logout'  },
  CREATE:  { label: '登録',           cls: 'op-badge--create'  },
  UPDATE:  { label: '更新',           cls: 'op-badge--update'  },
  DELETE:  { label: '削除',           cls: 'op-badge--delete'  },
  APPROVE: { label: '承認',           cls: 'op-badge--approve' },
  REJECT:  { label: '却下',           cls: 'op-badge--reject'  },
  EXPORT:  { label: 'エクスポート',   cls: 'op-badge--export'  },
}

export function useOpLog() {
  const [logs, setLogs] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const p = JSON.parse(raw)
        if (Array.isArray(p)) return p
      }
    } catch {}
    return []
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(logs)) } catch {}
  }, [logs])

  function addOpLog({ type, userId, userName, target, detail }) {
    const log = {
      id:         genLogId(),
      type,
      userId:     userId   || '',
      userName:   userName || '',
      target:     target   || '',
      detail:     detail   || '',
      recordedAt: new Date().toISOString(),
    }
    setLogs(prev => {
      const next = [log, ...prev]
      return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next
    })
  }

  return { logs, addOpLog }
}
