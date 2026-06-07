import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const BUDGET_VERSIONS = [
  { code: 'INITIAL',  name: '当初予算' },
  { code: 'REVISED',  name: '補正予算' },
  { code: 'FORECAST', name: '着地見込' },
]

function budgetFromRows(header, entries) {
  return {
    id:         header.id,
    fiscalYear: header.fiscal_year,
    version:    header.version,
    createdAt:  header.created_at,
    updatedAt:  header.updated_at,
    entries:    (entries || []).map(e => ({
      deptCode:    e.dept_code,
      accountCode: e.account_code,
      month:       e.month,
      amount:      Number(e.amount),
    })),
  }
}

export function useBudget() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: headers, error: hErr } = await supabase
      .from('budgets')
      .select('*, budget_entries(*)')
      .order('fiscal_year')

    if (hErr) { console.error('budgets fetch error:', hErr); setLoading(false); return }
    setBudgets(headers.map(h => budgetFromRows(h, h.budget_entries)))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function getBudget(fiscalYear, version) {
    return budgets.find(b => b.fiscalYear === fiscalYear && b.version === version) || null
  }

  async function saveBudgetEntry(fiscalYear, version, deptCode, accountCode, month, amount) {
    const existing = budgets.find(b => b.fiscalYear === fiscalYear && b.version === version)
    const now = new Date().toISOString()

    if (!existing) {
      const id = `BUD-${fiscalYear}-${version}`
      await supabase.from('budgets').upsert({ id, fiscal_year: fiscalYear, version, created_at: now, updated_at: now })
      if (amount > 0) {
        await supabase.from('budget_entries').insert({ budget_id: id, dept_code: deptCode, account_code: accountCode, month, amount })
      }
    } else {
      await supabase.from('budgets').update({ updated_at: now }).eq('id', existing.id)
      // 該当行を削除して再挿入
      await supabase.from('budget_entries')
        .delete()
        .eq('budget_id', existing.id)
        .eq('dept_code', deptCode)
        .eq('account_code', accountCode)
        .eq('month', month)
      if (amount > 0) {
        await supabase.from('budget_entries').insert({ budget_id: existing.id, dept_code: deptCode, account_code: accountCode, month, amount })
      }
    }
    await fetchAll()
  }

  async function saveBudgetBulk(fiscalYear, version, entries) {
    const id  = `BUD-${fiscalYear}-${version}`
    const now = new Date().toISOString()
    await supabase.from('budgets').upsert({ id, fiscal_year: fiscalYear, version, updated_at: now })
    await supabase.from('budget_entries').delete().eq('budget_id', id)
    if (entries.length > 0) {
      await supabase.from('budget_entries').insert(entries.map(e => ({
        budget_id:    id,
        dept_code:    e.deptCode,
        account_code: e.accountCode,
        month:        e.month,
        amount:       e.amount,
      })))
    }
    await fetchAll()
  }

  async function deleteBudget(fiscalYear, version) {
    const b = budgets.find(b => b.fiscalYear === fiscalYear && b.version === version)
    if (!b) return
    await supabase.from('budgets').delete().eq('id', b.id)
    setBudgets(prev => prev.filter(x => !(x.fiscalYear === fiscalYear && x.version === version)))
  }

  return { budgets, loading, getBudget, saveBudgetEntry, saveBudgetBulk, deleteBudget }
}
