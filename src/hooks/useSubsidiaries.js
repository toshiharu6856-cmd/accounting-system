import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const CURRENCIES = [
  { code: 'JPY', name: '日本円' },
  { code: 'USD', name: '米ドル' },
  { code: 'EUR', name: 'ユーロ' },
  { code: 'CNY', name: '人民元' },
  { code: 'KRW', name: '韓国ウォン' },
  { code: 'TWD', name: '台湾ドル' },
  { code: 'SGD', name: 'シンガポールドル' },
  { code: 'HKD', name: '香港ドル' },
  { code: 'THB', name: 'タイバーツ' },
]

function subFromRow(r) {
  return {
    id:        r.id,
    name:      r.name,
    code:      r.code,
    country:   r.country,
    currency:  r.currency,
    ownership: r.ownership,
    isActive:  r.is_active,
  }
}

export function useSubsidiaries() {
  const [subsidiaries, setSubsidiaries] = useState([])
  const [loading,      setLoading]      = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.from('subsidiaries').select('*').order('name')
    if (error) { console.error('subsidiaries fetch error:', error); setLoading(false); return }
    setSubsidiaries(data.map(subFromRow))
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function saveSubsidiary(item) {
    const entry = item.id ? item : { ...item, id: `SUB-${Date.now()}` }
    const { error } = await supabase.from('subsidiaries').upsert({
      id:        entry.id,
      name:      entry.name,
      code:      entry.code || null,
      country:   entry.country || null,
      currency:  entry.currency || 'JPY',
      ownership: entry.ownership ?? 100,
      is_active: entry.isActive ?? true,
    })
    if (error) { console.error('saveSubsidiary error:', error); return }
    await fetchAll()
  }

  async function deleteSubsidiary(id) {
    const { error } = await supabase.from('subsidiaries').delete().eq('id', id)
    if (error) { console.error('deleteSubsidiary error:', error); return }
    setSubsidiaries(prev => prev.filter(s => s.id !== id))
  }

  return { subsidiaries, loading, saveSubsidiary, deleteSubsidiary }
}
