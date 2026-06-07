import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { SAMPLE_JOURNALS } from '../data/sampleData'

function journalFromRow(row, lines) {
  return {
    id:          row.id,
    date:        row.date,
    voucherType: row.voucher_type,
    description: row.description,
    deptCode:    row.dept_code,
    lines: (lines || [])
      .sort((a, b) => a.line_no - b.line_no)
      .map(l => ({
        id:           l.line_no,
        debitCode:    l.debit_code,
        debitAmount:  Number(l.debit_amount),
        creditCode:   l.credit_code,
        creditAmount: Number(l.credit_amount),
        memo:         l.memo,
      })),
  }
}

// モジュールレベルのフラグでStrictMode二重実行によるシード重複を防ぐ
let _seeded = false

export function useJournals() {
  const [journals, setJournals] = useState([])
  const [loading,  setLoading]  = useState(true)
  const seedingRef = useRef(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: rows, error } = await supabase
      .from('journals')
      .select('*, journal_lines(*)')
      .order('date', { ascending: false })

    if (error) {
      console.error('journals fetch error:', error)
      setLoading(false)
      return
    }

    if (rows.length === 0 && !_seeded && !seedingRef.current) {
      seedingRef.current = true
      _seeded = true
      await seedSampleData()
      seedingRef.current = false
      return fetchAll()
    }

    setJournals(rows.map(r => journalFromRow(r, r.journal_lines)))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function seedSampleData() {
    // 既存データを全削除してから挿入（冪等性を確保）
    await supabase.from('journals').delete().neq('id', '')
    for (const j of SAMPLE_JOURNALS) {
      await supabase.from('journals').insert({
        id:           j.id,
        date:         j.date,
        voucher_type: j.voucherType,
        description:  j.description,
        dept_code:    j.deptCode,
      })
      const lineRows = j.lines.map(l => ({
        journal_id:    j.id,
        line_no:       l.id,
        debit_code:    l.debitCode,
        debit_amount:  l.debitAmount,
        credit_code:   l.creditCode,
        credit_amount: l.creditAmount,
        memo:          l.memo || null,
      }))
      if (lineRows.length > 0) {
        await supabase.from('journal_lines').insert(lineRows)
      }
    }
  }

  async function saveJournal(entry) {
    const now = new Date().toISOString()

    const { error: hErr } = await supabase.from('journals').upsert({
      id:           entry.id,
      date:         entry.date,
      voucher_type: entry.voucherType,
      description:  entry.description,
      dept_code:    entry.deptCode,
      updated_at:   now,
    })
    if (hErr) { console.error('saveJournal header error:', hErr); return }

    // 既存行を削除して再挿入
    await supabase.from('journal_lines').delete().eq('journal_id', entry.id)
    const lineRows = entry.lines.map(l => ({
      journal_id:    entry.id,
      line_no:       l.id,
      debit_code:    l.debitCode,
      debit_amount:  l.debitAmount,
      credit_code:   l.creditCode,
      credit_amount: l.creditAmount,
      memo:          l.memo || null,
    }))
    if (lineRows.length > 0) {
      const { error: lErr } = await supabase.from('journal_lines').insert(lineRows)
      if (lErr) { console.error('saveJournal lines error:', lErr) }
    }

    await fetchAll()
  }

  async function deleteJournal(id) {
    const { error } = await supabase.from('journals').delete().eq('id', id)
    if (error) { console.error('deleteJournal error:', error); return }
    setJournals(prev => prev.filter(j => j.id !== id))
  }

  async function resetToSample() {
    _seeded = false
    await seedSampleData()
    await fetchAll()
  }

  return { journals, loading, saveJournal, deleteJournal, resetToSample }
}
