import { useState, useEffect } from 'react'
import {
  SAMPLE_COMPANIES,
  SAMPLE_MASTER_ACCOUNTS,
  SAMPLE_DEPARTMENTS,
} from '../data/masterSampleData'

const KEYS = {
  companies:   'acct_companies_v1',
  accounts:    'acct_master_accounts_v1',
  departments: 'acct_departments_v1',
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return fallback
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)) } catch {}
}

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
}

export function useMasters() {
  const [companies,   setCompanies]   = useState(() => load(KEYS.companies,   SAMPLE_COMPANIES))
  const [accounts,    setAccounts]    = useState(() => load(KEYS.accounts,    SAMPLE_MASTER_ACCOUNTS))
  const [departments, setDepartments] = useState(() => load(KEYS.departments, SAMPLE_DEPARTMENTS))

  useEffect(() => save(KEYS.companies,   companies),   [companies])
  useEffect(() => save(KEYS.accounts,    accounts),    [accounts])
  useEffect(() => save(KEYS.departments, departments), [departments])

  // ── Companies ────────────────────────────────────────────────
  function saveCompany(item) {
    const entry = item.id ? item : { ...item, id: genId('CO'), createdAt: new Date().toISOString() }
    setCompanies(prev => {
      const idx = prev.findIndex(x => x.id === entry.id)
      if (idx >= 0) return prev.map(x => x.id === entry.id ? entry : x)
      // if setting as default, unset others
      if (entry.isDefault) return [...prev.map(x => ({ ...x, isDefault: false })), entry]
      return [...prev, entry]
    })
  }

  function deleteCompany(id) {
    setCompanies(prev => prev.filter(x => x.id !== id))
  }

  // ── Accounts ─────────────────────────────────────────────────
  function saveAccount(item) {
    const entry = item.id ? item : { ...item, id: genId('ACC'), subAccounts: item.subAccounts || [] }
    setAccounts(prev => {
      const idx = prev.findIndex(x => x.id === entry.id)
      return idx >= 0 ? prev.map(x => x.id === entry.id ? entry : x) : [...prev, entry]
    })
  }

  function deleteAccount(id) {
    setAccounts(prev => prev.filter(x => x.id !== id))
  }

  // ── Departments ───────────────────────────────────────────────
  function saveDepartment(item) {
    const entry = item.id ? item : { ...item, id: genId('DEPT') }
    setDepartments(prev => {
      const idx = prev.findIndex(x => x.id === entry.id)
      return idx >= 0 ? prev.map(x => x.id === entry.id ? entry : x) : [...prev, entry]
    })
  }

  function deleteDepartment(id) {
    setDepartments(prev => prev.filter(x => x.id !== id))
  }

  // ── Reset ─────────────────────────────────────────────────────
  function resetMasters() {
    setCompanies(SAMPLE_COMPANIES)
    setAccounts(SAMPLE_MASTER_ACCOUNTS)
    setDepartments(SAMPLE_DEPARTMENTS)
  }

  return {
    companies,   saveCompany,   deleteCompany,
    accounts,    saveAccount,   deleteAccount,
    departments, saveDepartment, deleteDepartment,
    resetMasters,
    genId,
  }
}
