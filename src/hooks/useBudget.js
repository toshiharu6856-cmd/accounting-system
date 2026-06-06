import { useState, useEffect } from 'react'

const KEY = 'accounting_budget_v1'

export const BUDGET_VERSIONS = [
  { code: 'INITIAL',  name: '当初予算' },
  { code: 'REVISED',  name: '補正予算' },
  { code: 'FORECAST', name: '着地見込' },
]

function defaultBudgets() {
  return []
}

export function useBudget() {
  const [budgets, setBudgets] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {}
    return defaultBudgets()
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(budgets)) } catch {}
  }, [budgets])

  function getBudget(fiscalYear, version) {
    return budgets.find(b => b.fiscalYear === fiscalYear && b.version === version) || null
  }

  function saveBudgetEntry(fiscalYear, version, deptCode, accountCode, month, amount) {
    setBudgets(prev => {
      const existing = prev.find(b => b.fiscalYear === fiscalYear && b.version === version)
      if (existing) {
        const entries = existing.entries.filter(
          e => !(e.deptCode === deptCode && e.accountCode === accountCode && e.month === month)
        )
        if (amount > 0) {
          entries.push({ deptCode, accountCode, month, amount })
        }
        return prev.map(b =>
          b.fiscalYear === fiscalYear && b.version === version
            ? { ...b, entries, updatedAt: new Date().toISOString() }
            : b
        )
      } else {
        const entries = amount > 0 ? [{ deptCode, accountCode, month, amount }] : []
        return [...prev, {
          id: `BUD-${fiscalYear}-${version}`,
          fiscalYear,
          version,
          entries,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }
    })
  }

  function saveBudgetBulk(fiscalYear, version, entries) {
    setBudgets(prev => {
      const existing = prev.find(b => b.fiscalYear === fiscalYear && b.version === version)
      if (existing) {
        return prev.map(b =>
          b.fiscalYear === fiscalYear && b.version === version
            ? { ...b, entries, updatedAt: new Date().toISOString() }
            : b
        )
      } else {
        return [...prev, {
          id: `BUD-${fiscalYear}-${version}`,
          fiscalYear,
          version,
          entries,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }]
      }
    })
  }

  function deleteBudget(fiscalYear, version) {
    setBudgets(prev => prev.filter(b => !(b.fiscalYear === fiscalYear && b.version === version)))
  }

  return { budgets, getBudget, saveBudgetEntry, saveBudgetBulk, deleteBudget }
}
