import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const APPROVAL_STATUS = {
  DRAFT:    { code: 'DRAFT',    label: '下書き', cls: 'apv-badge--draft'    },
  PENDING:  { code: 'PENDING',  label: '申請中', cls: 'apv-badge--pending'  },
  APPROVED: { code: 'APPROVED', label: '承認済', cls: 'apv-badge--approved' },
  REJECTED: { code: 'REJECTED', label: '却下',   cls: 'apv-badge--rejected' },
}

function approvalFromRow(r) {
  return {
    id:             r.id,
    journalId:      r.journal_id,
    status:         r.status,
    requestedBy:    r.requested_by,
    requestedAt:    r.requested_at,
    reviewedBy:     r.reviewed_by,
    reviewedAt:     r.reviewed_at,
    comment:        r.comment,
    approveComment: r.comment,
    note:           r.note,
    history:        r.history || [],
  }
}

export function useApprovals() {
  const [approvals, setApprovals] = useState([])
  const [loading,   setLoading]   = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .order('requested_at', { ascending: false })

    if (error) { console.error('approvals fetch error:', error); setLoading(false); return }
    setApprovals(data.map(approvalFromRow))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function getApproval(journalId) {
    return approvals.find(a => a.journalId === journalId) || null
  }

  async function requestApproval(journalId, userId, note = '') {
    const ts  = new Date().toISOString()
    const evt = { status: 'PENDING', userId, at: ts, comment: note || null }

    const existing = approvals.find(a => a.journalId === journalId)
    if (existing) {
      const history = [...(existing.history || []), evt]
      await supabase.from('approvals').update({
        status:       'PENDING',
        requested_by: userId,
        requested_at: ts,
        reviewed_by:  null,
        reviewed_at:  null,
        comment:      null,
        note,
        history,
      }).eq('id', existing.id)
    } else {
      const history = [evt]
      await supabase.from('approvals').insert({
        id:           `APR-${Date.now()}`,
        journal_id:   journalId,
        status:       'PENDING',
        requested_by: userId,
        requested_at: ts,
        note,
        history,
      })
    }
    await fetchAll()
  }

  async function approveJournal(approvalId, userId, comment = '') {
    const ts  = new Date().toISOString()
    const apv = approvals.find(a => a.id === approvalId)
    if (!apv) return
    const history = [...(apv.history || []), { status: 'APPROVED', userId, at: ts, comment: comment || null }]
    await supabase.from('approvals').update({
      status:      'APPROVED',
      reviewed_by: userId,
      reviewed_at: ts,
      comment:     comment || null,
      history,
    }).eq('id', approvalId)
    await fetchAll()
  }

  async function rejectJournal(approvalId, userId, comment) {
    const ts  = new Date().toISOString()
    const apv = approvals.find(a => a.id === approvalId)
    if (!apv) return
    const history = [...(apv.history || []), { status: 'REJECTED', userId, at: ts, comment }]
    await supabase.from('approvals').update({
      status:      'REJECTED',
      reviewed_by: userId,
      reviewed_at: ts,
      comment,
      history,
    }).eq('id', approvalId)
    await fetchAll()
  }

  async function withdrawApproval(approvalId, userId) {
    const ts  = new Date().toISOString()
    const apv = approvals.find(a => a.id === approvalId)
    if (!apv) return
    const history = [...(apv.history || []), { status: 'DRAFT', userId, at: ts, comment: '申請取消' }]
    await supabase.from('approvals').update({
      status:      'DRAFT',
      reviewed_by: null,
      reviewed_at: null,
      history,
    }).eq('id', approvalId)
    await fetchAll()
  }

  return { approvals, loading, getApproval, requestApproval, approveJournal, rejectJournal, withdrawApproval }
}
