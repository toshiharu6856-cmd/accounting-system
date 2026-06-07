import { useState, useEffect } from 'react'

const FX_KEY   = 'accounting_fxrates_v1'
const PKG_KEY  = 'accounting_conso_packages_v1'
const ELIM_KEY = 'accounting_eliminations_v1'

export const PKG_STATUS = {
  DRAFT:     { label: '下書',   cls: 'pkg-badge--draft'     },
  SUBMITTED: { label: '提出済', cls: 'pkg-badge--submitted' },
  APPROVED:  { label: '承認済', cls: 'pkg-badge--approved'  },
  CONFIRMED: { label: '確定',   cls: 'pkg-badge--confirmed' },
}

export const ACCOUNT_TYPES = [
  { code: 'BS_ASSET',     label: 'BS 資産',   group: 'BS' },
  { code: 'BS_LIABILITY', label: 'BS 負債',   group: 'BS' },
  { code: 'BS_EQUITY',    label: 'BS 純資産', group: 'BS' },
  { code: 'PL_REVENUE',   label: 'PL 収益',   group: 'PL' },
  { code: 'PL_EXPENSE',   label: 'PL 費用',   group: 'PL' },
]

// BS items use END rate; PL items use AVG rate
export function rateTypeForAccount(accountType) {
  return accountType?.startsWith('BS_') ? 'END' : 'AVG'
}

export function useConsolidation() {
  const [fxRates, setFxRates] = useState(() => {
    try { const r = localStorage.getItem(FX_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [packages, setPackages] = useState(() => {
    try { const r = localStorage.getItem(PKG_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
  })
  const [eliminations, setEliminations] = useState(() => {
    try { const r = localStorage.getItem(ELIM_KEY); return r ? JSON.parse(r) : [] } catch { return [] }
  })

  useEffect(() => { try { localStorage.setItem(FX_KEY,   JSON.stringify(fxRates))      } catch {} }, [fxRates])
  useEffect(() => { try { localStorage.setItem(PKG_KEY,  JSON.stringify(packages))     } catch {} }, [packages])
  useEffect(() => { try { localStorage.setItem(ELIM_KEY, JSON.stringify(eliminations)) } catch {} }, [eliminations])

  function saveFxRate(item) {
    setFxRates(prev => {
      if (item.id) return prev.map(r => r.id === item.id ? item : r)
      return [...prev, { ...item, id: `FX-${Date.now()}` }]
    })
  }
  function deleteFxRate(id) { setFxRates(prev => prev.filter(r => r.id !== id)) }

  function getFxRate(yearMonth, currency) {
    if (currency === 'JPY') return { endRate: 1, avgRate: 1 }
    return fxRates.find(r => r.yearMonth === yearMonth && r.currency === currency) || null
  }

  function savePackage(item) {
    setPackages(prev => {
      if (item.id) return prev.map(p => p.id === item.id ? item : p)
      return [...prev, { ...item, id: `PKG-${Date.now()}` }]
    })
  }
  function deletePackage(id) { setPackages(prev => prev.filter(p => p.id !== id)) }

  function getPackage(subsidiaryId, yearMonth) {
    return packages.find(p => p.subsidiaryId === subsidiaryId && p.yearMonth === yearMonth) || null
  }

  function saveElimination(item) {
    setEliminations(prev => {
      if (item.id) return prev.map(e => e.id === item.id ? item : e)
      return [...prev, { ...item, id: `ELIM-${Date.now()}` }]
    })
  }
  function deleteElimination(id) { setEliminations(prev => prev.filter(e => e.id !== id)) }

  return {
    fxRates, saveFxRate, deleteFxRate, getFxRate,
    packages, savePackage, deletePackage, getPackage,
    eliminations, saveElimination, deleteElimination,
  }
}
