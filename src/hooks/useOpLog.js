import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

let _seq = 1

function genLogId() {
  const ts = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '')
  return `OP-${ts}-${String(_seq++).padStart(3, '0')}`
}

export const OP_TYPES = {
  LOGIN:   { label: 'ログイン',     cls: 'op-badge--login'   },
  LOGOUT:  { label: 'ログアウト',   cls: 'op-badge--logout'  },
  CREATE:  { label: '登録',         cls: 'op-badge--create'  },
  UPDATE:  { label: '更新',         cls: 'op-badge--update'  },
  DELETE:  { label: '削除',         cls: 'op-badge--delete'  },
  APPROVE: { label: '承認',         cls: 'op-badge--approve' },
  REJECT:  { label: '却下',         cls: 'op-badge--reject'  },
  EXPORT:  { label: 'エクスポート', cls: 'op-badge--export'  },
}

function logFromRow(r) {
  return {
    id:         String(r.id),
    type:       r.action,
    userId:     r.user_id   || '',
    userName:   r.user_name || '',
    target:     r.target    || '',
    detail:     r.detail    || '',
    recordedAt: r.recorded_at,
  }
}

export function useOpLog() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('op_logs')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(10000)

    if (error) { console.error('op_logs fetch error:', error); setLoading(false); return }
    setLogs(data.map(logFromRow))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function addOpLog({ type, userId, userName, target, detail }) {
    const now = new Date().toISOString()
    const row = {
      recorded_at: now,
      action:      type,
      user_id:     userId   || '',
      user_name:   userName || '',
      target:      target   || '',
      detail:      detail   || '',
    }
    const { data, error } = await supabase.from('op_logs').insert(row).select().single()
    if (error) { console.error('addOpLog error:', error); return }
    setLogs(prev => [logFromRow(data), ...prev])
  }

  return { logs, loading, addOpLog }
}
