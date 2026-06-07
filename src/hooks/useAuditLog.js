import { useState, useEffect } from 'react'

const KEY = 'accounting_audit_log_v1'
let _seq = 1

function genLogId() {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return `AL-${ts}-${String(_seq++).padStart(3, '0')}`
}

export const LOG_TYPES = {
  CREATE: { label: '新規登録', cls: 'audit-badge--create' },
  EDIT:   { label: '修正',     cls: 'audit-badge--edit'   },
  DELETE: { label: '削除',     cls: 'audit-badge--delete' },
}

export function useAuditLog() {
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

  function addLog({ type, journalId, userId, userName, before, after }) {
    const log = {
      id:         genLogId(),
      type,
      journalId,
      userId,
      userName,
      recordedAt: new Date().toISOString(),
      before:     before ? JSON.parse(JSON.stringify(before)) : null,
      after:      after  ? JSON.parse(JSON.stringify(after))  : null,
    }
    setLogs(prev => [log, ...prev])
    return log
  }

  function getLogsForJournal(journalId) {
    return logs
      .filter(l => l.journalId === journalId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  }

  return { logs, addLog, getLogsForJournal }
}
