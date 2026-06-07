import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  SAMPLE_COMPANIES,
  SAMPLE_MASTER_ACCOUNTS,
  SAMPLE_DEPARTMENTS,
} from '../data/masterSampleData'
import { accounts as STATIC_ACCOUNTS } from '../data/accounts'

function genId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`
}

function companyFromRow(r) {
  return {
    id:               r.id,
    code:             r.code,
    name:             r.name,
    nameKana:         r.name_kana,
    fiscalStartMonth: r.fiscal_start_month,
    fiscalStartDay:   r.fiscal_start_day,
    address:          r.address,
    tel:              r.tel,
    isActive:         r.is_active,
    isDefault:        r.is_default,
    createdAt:        r.created_at,
  }
}

function accountFromRow(r) {
  // DBにromaji/kanaカラムがない場合は静的データからフォールバック
  const staticRef = STATIC_ACCOUNTS.find(a => a.code === r.code)
  return {
    id:            r.id,
    code:          r.code,
    name:          r.name,
    category:      r.category,
    normalBalance: r.normal_balance,
    isActive:      r.is_active,
    romaji:        r.romaji ?? staticRef?.romaji ?? '',
    kana:          r.kana   ?? staticRef?.kana   ?? '',
    subAccounts:   r.sub_accounts || [],
  }
}

function deptFromRow(r) {
  return {
    id:        r.id,
    code:      r.code,
    name:      r.name,
    parentId:  r.parent_id,
    sortOrder: r.sort_order,
    isActive:  r.is_active,
  }
}

let _masterSeeded = false

export function useMasters() {
  const [companies,   setCompanies]   = useState([])
  const [accounts,    setAccounts]    = useState([])
  const [departments, setDepartments] = useState([])
  const [loading,     setLoading]     = useState(true)
  const seedingRef = useRef(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [cRes, aRes, dRes] = await Promise.all([
      supabase.from('companies').select('*').order('code'),
      supabase.from('accounts').select('*').order('code'),
      supabase.from('departments').select('*').order('sort_order'),
    ])

    const needSeed =
      (cRes.data?.length === 0) ||
      (aRes.data?.length === 0) ||
      (dRes.data?.length === 0)

    if (needSeed && !_masterSeeded && !seedingRef.current) {
      seedingRef.current = true
      _masterSeeded = true
      await seedMasters()
      seedingRef.current = false
      return fetchAll()
    }

    if (!cRes.error) setCompanies(cRes.data.map(companyFromRow))
    if (!aRes.error) setAccounts(aRes.data.map(accountFromRow))
    if (!dRes.error) setDepartments(dRes.data.map(deptFromRow))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function seedMasters() {
    await supabase.from('companies').upsert(SAMPLE_COMPANIES.map(c => ({
      id:                 c.id,
      code:               c.code,
      name:               c.name,
      name_kana:          c.nameKana,
      fiscal_start_month: c.fiscalStartMonth,
      fiscal_start_day:   c.fiscalStartDay,
      address:            c.address,
      tel:                c.tel,
      is_active:          c.isActive,
      is_default:         c.isDefault,
      created_at:         c.createdAt,
    })))

    const acctRows = SAMPLE_MASTER_ACCOUNTS.map(a => ({
      id:             a.id,
      code:           a.code,
      name:           a.name,
      category:       a.category,
      normal_balance: a.normalBalance,
      is_active:      a.isActive,
      romaji:         a.romaji || '',
      kana:           a.kana   || '',
      sub_accounts:   a.subAccounts || [],
    }))
    const { error: acctErr } = await supabase.from('accounts').upsert(acctRows)
    if (acctErr) {
      // romaji/kanaカラムがまだない場合はそれらを除いて再試行
      await supabase.from('accounts').upsert(acctRows.map(({ romaji, kana, ...rest }) => rest))
    }

    await supabase.from('departments').upsert(SAMPLE_DEPARTMENTS.map(d => ({
      id:         d.id,
      code:       d.code,
      name:       d.name,
      parent_id:  d.parentId || null,
      sort_order: d.sortOrder,
      is_active:  d.isActive,
    })))
  }

  // ── Companies ─────────────────────────────────────────────────
  async function saveCompany(item) {
    const now = new Date().toISOString()
    const entry = item.id ? item : { ...item, id: genId('CO'), createdAt: now }

    if (entry.isDefault) {
      await supabase.from('companies').update({ is_default: false }).neq('id', entry.id)
    }

    const { error } = await supabase.from('companies').upsert({
      id:                 entry.id,
      code:               entry.code,
      name:               entry.name,
      name_kana:          entry.nameKana,
      fiscal_start_month: entry.fiscalStartMonth,
      fiscal_start_day:   entry.fiscalStartDay,
      address:            entry.address,
      tel:                entry.tel,
      is_active:          entry.isActive,
      is_default:         entry.isDefault,
      created_at:         entry.createdAt || now,
    })
    if (error) { console.error('saveCompany error:', error); return }
    await fetchAll()
  }

  async function deleteCompany(id) {
    const { error } = await supabase.from('companies').delete().eq('id', id)
    if (error) { console.error('deleteCompany error:', error); return }
    setCompanies(prev => prev.filter(x => x.id !== id))
  }

  // ── Accounts ──────────────────────────────────────────────────
  async function saveAccount(item) {
    const entry = item.id ? item : { ...item, id: genId('ACC'), subAccounts: item.subAccounts || [] }
    const baseRow = {
      id:             entry.id,
      code:           entry.code,
      name:           entry.name,
      category:       entry.category,
      normal_balance: entry.normalBalance,
      is_active:      entry.isActive,
      sub_accounts:   entry.subAccounts || [],
    }
    let { error } = await supabase.from('accounts').upsert({
      ...baseRow,
      romaji: entry.romaji || '',
      kana:   entry.kana   || '',
    })
    if (error?.code === '42703') {
      // romaji/kana columns not yet added — retry without them
      const res = await supabase.from('accounts').upsert(baseRow)
      error = res.error
    }
    if (error) { console.error('saveAccount error:', error); return }
    await fetchAll()
  }

  async function deleteAccount(id) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) { console.error('deleteAccount error:', error); return }
    setAccounts(prev => prev.filter(x => x.id !== id))
  }

  // ── Departments ───────────────────────────────────────────────
  async function saveDepartment(item) {
    const entry = item.id ? item : { ...item, id: genId('DEPT') }
    const { error } = await supabase.from('departments').upsert({
      id:         entry.id,
      code:       entry.code,
      name:       entry.name,
      parent_id:  entry.parentId || null,
      sort_order: entry.sortOrder || 0,
      is_active:  entry.isActive,
    })
    if (error) { console.error('saveDepartment error:', error); return }
    await fetchAll()
  }

  async function deleteDepartment(id) {
    const { error } = await supabase.from('departments').delete().eq('id', id)
    if (error) { console.error('deleteDepartment error:', error); return }
    setDepartments(prev => prev.filter(x => x.id !== id))
  }

  async function resetMasters() {
    await supabase.from('companies').delete().neq('id', '')
    await supabase.from('accounts').delete().neq('id', '')
    await supabase.from('departments').delete().neq('id', '')
    await seedMasters()
    await fetchAll()
  }

  return {
    companies,   saveCompany,   deleteCompany,
    accounts,    saveAccount,   deleteAccount,
    departments, saveDepartment, deleteDepartment,
    loading,
    resetMasters,
    genId,
  }
}
