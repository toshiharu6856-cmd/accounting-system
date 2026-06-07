import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

function logFromRow(r) {
  return {
    id:          r.id,
    type:        r.type,
    journalId:   r.journal_id,
    userId:      r.user_id,
    userName:    r.user_name,
    recordedAt:  r.recorded_at,
    before:      r.before_data,
    after:       r.after_data,
  }
}

export function useAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('recorded_at', { ascending: false })

    if (error) { console.error('audit_logs fetch error:', error); setLoading(false); return }
    setLogs(data.map(logFromRow))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addLog({ type, journalId, userId, userName, before, after }) {
    const log = {
      id:          genLogId(),
      type,
      journal_id:  journalId,
      user_id:     userId,
      user_name:   userName,
      recorded_at: new Date().toISOString(),
      before_data: before ? JSON.parse(JSON.stringify(before)) : null,
      after_data:  after  ? JSON.parse(JSON.stringify(after))  : null,
    }
    const { error } = await supabase.from('audit_logs').insert(log)
    if (error) { console.error('addLog error:', error); return null }
    const entry = logFromRow(log)
    setLogs(prev => [entry, ...prev])
    return entry
  }

  function getLogsForJournal(journalId) {
    return logs
      .filter(l => l.journalId === journalId)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
  }

  return { logs, loading, addLog, getLogsForJournal }
}
