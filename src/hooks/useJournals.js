import { useState, useEffect } from 'react'
import { SAMPLE_JOURNALS } from '../data/sampleData'

const KEY = 'accounting_journals_v1'

export function useJournals() {
  const [journals, setJournals] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {}
    return SAMPLE_JOURNALS
  })

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(journals)) } catch {}
  }, [journals])

  function saveJournal(entry) {
    setJournals(prev => {
      const idx = prev.findIndex(j => j.id === entry.id)
      return idx >= 0
        ? prev.map(j => j.id === entry.id ? entry : j)
        : [...prev, entry]
    })
  }

  function deleteJournal(id) {
    setJournals(prev => prev.filter(j => j.id !== id))
  }

  function resetToSample() {
    setJournals(SAMPLE_JOURNALS)
  }

  return { journals, saveJournal, deleteJournal, resetToSample }
}
