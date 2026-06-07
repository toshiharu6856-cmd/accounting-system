import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

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

export function rateTypeForAccount(accountType) {
  return accountType?.startsWith('BS_') ? 'END' : 'AVG'
}

// 連結用テーブルは汎用 JSON ストアとして conso_data テーブルを使う
// （テーブルが存在しない場合は localStorage にフォールバック）
const FX_KEY   = 'accounting_fxrates_v1'
const PKG_KEY  = 'accounting_conso_packages_v1'
const ELIM_KEY = 'accounting_eliminations_v1'

function loadLocal(key) {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : [] } catch { return [] }
}
function saveLocal(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

export function useConsolidation() {
  const [fxRates,      setFxRates]      = useState(() => loadLocal(FX_KEY))
  const [packages,     setPackages]     = useState(() => loadLocal(PKG_KEY))
  const [eliminations, setEliminations] = useState(() => loadLocal(ELIM_KEY))

  useEffect(() => { saveLocal(FX_KEY,   fxRates)      }, [fxRates])
  useEffect(() => { saveLocal(PKG_KEY,  packages)     }, [packages])
  useEffect(() => { saveLocal(ELIM_KEY, eliminations) }, [eliminations])

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
    fxRates,      saveFxRate,      deleteFxRate,  getFxRate,
    packages,     savePackage,     deletePackage, getPackage,
    eliminations, saveElimination, deleteElimination,
  }
}
