import { useState, useMemo } from 'react'

const KEY = 'accounting_period_v1'

function loadInitial() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p.year === 'number') return p
    }
  } catch {}
  return { year: 2026, month: null }
}

export function usePeriod(journals) {
  const [period, setPeriodState] = useState(loadInitial)

  function setPeriod(next) {
    setPeriodState(next)
    try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
  }

  const availableYears = useMemo(() => {
    const years = new Set()
    journals.forEach(j => {
      const y = parseInt(j.date.slice(0, 4), 10)
      if (!isNaN(y)) years.add(y)
    })
    const currentYear = new Date().getFullYear()
    years.add(currentYear)
    years.add(period.year)
    return [...years].sort((a, b) => b - a)
  }, [journals, period.year])

  const { start, end } = useMemo(() => {
    if (period.month) {
      const m = String(period.month).padStart(2, '0')
      return {
        start: `${period.year}-${m}-01`,
        end:   `${period.year}-${m}-31`,
      }
    }
    return {
      start: `${period.year}-01-01`,
      end:   `${period.year}-12-31`,
    }
  }, [period])

  const periodJournals = useMemo(
    () => journals.filter(j => j.date >= start && j.date <= end),
    [journals, start, end]
  )

  // 貸借対照表は期末時点の累計残高のため、期末日までの仕訳を使う
  const bsJournals = useMemo(
    () => journals.filter(j => j.date <= end),
    [journals, end]
  )

  const label = period.month
    ? `${period.year}年${period.month}月度`
    : `${period.year}年度`

  return {
    period, setPeriod,
    availableYears,
    periodJournals,
    bsJournals,
    periodStart: start,
    periodEnd:   end,
    label,
  }
}
