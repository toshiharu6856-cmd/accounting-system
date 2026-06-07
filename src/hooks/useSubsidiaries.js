import { useState, useEffect } from 'react'

const KEY = 'accounting_subsidiaries_v1'

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

export function useSubsidiaries() {
  const [subsidiaries, setSubsidiaries] = useState(() => {
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
    try { localStorage.setItem(KEY, JSON.stringify(subsidiaries)) } catch {}
  }, [subsidiaries])

  function saveSubsidiary(item) {
    setSubsidiaries(prev => {
      const existing = prev.find(s => s.id === item.id)
      if (existing) return prev.map(s => s.id === item.id ? item : s)
      return [...prev, { ...item, id: `SUB-${Date.now()}` }]
    })
  }

  function deleteSubsidiary(id) {
    setSubsidiaries(prev => prev.filter(s => s.id !== id))
  }

  return { subsidiaries, saveSubsidiary, deleteSubsidiary }
}
