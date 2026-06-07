import { useState, useEffect } from 'react'

const KEY = 'accounting_approvals_v1'

export const APPROVAL_STATUS = {
  DRAFT:    { code: 'DRAFT',    label: '下書き', cls: 'apv-badge--draft'    },
  PENDING:  { code: 'PENDING',  label: '申請中', cls: 'apv-badge--pending'  },
  APPROVED: { code: 'APPROVED', label: '承認済', cls: 'apv-badge--approved' },
  REJECTED: { code: 'REJECTED', label: '却下',   cls: 'apv-badge--rejected' },
}

export function useApprovals() {
  const [approvals, setApprovals] = useState(() => {
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
    try { localStorage.setItem(KEY, JSON.stringify(approvals)) } catch {}
  }, [approvals])

  function getApproval(journalId) {
    return approvals.find(a => a.journalId === journalId) || null
  }

  function requestApproval(journalId, userId, note = '') {
    const ts  = new Date().toISOString()
    const evt = { status: 'PENDING', userId, at: ts, comment: note || null }

    setApprovals(prev => {
      const idx = prev.findIndex(a => a.journalId === journalId)
      if (idx >= 0) {
        return prev.map((a, i) => i !== idx ? a : {
          ...a,
          status:      'PENDING',
          requestedBy: userId,
          requestedAt: ts,
          reviewedBy:  null,
          reviewedAt:  null,
          comment:     null,
          note,
          history: [...(a.history || []), evt],
        })
      }
      return [...prev, {
        id:          `APR-${Date.now()}`,
        journalId,
        status:      'PENDING',
        requestedBy: userId,
        requestedAt: ts,
        reviewedBy:  null,
        reviewedAt:  null,
        comment:     null,
        note,
        history:     [evt],
      }]
    })
  }

  function approveJournal(approvalId, userId) {
    const ts = new Date().toISOString()
    setApprovals(prev => prev.map(a => a.id !== approvalId ? a : {
      ...a,
      status:     'APPROVED',
      reviewedBy: userId,
      reviewedAt: ts,
      history:    [...(a.history || []), { status: 'APPROVED', userId, at: ts, comment: null }],
    }))
  }

  function rejectJournal(approvalId, userId, comment) {
    const ts = new Date().toISOString()
    setApprovals(prev => prev.map(a => a.id !== approvalId ? a : {
      ...a,
      status:     'REJECTED',
      reviewedBy: userId,
      reviewedAt: ts,
      comment,
      history:    [...(a.history || []), { status: 'REJECTED', userId, at: ts, comment }],
    }))
  }

  function withdrawApproval(approvalId, userId) {
    const ts = new Date().toISOString()
    setApprovals(prev => prev.map(a => a.id !== approvalId ? a : {
      ...a,
      status:    'DRAFT',
      reviewedBy: null,
      reviewedAt: null,
      history:   [...(a.history || []), { status: 'DRAFT', userId, at: ts, comment: '申請取消' }],
    }))
  }

  return { approvals, getApproval, requestApproval, approveJournal, rejectJournal, withdrawApproval }
}
