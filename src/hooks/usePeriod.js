import { useState, useMemo } from 'react'

const KEY = 'accounting_period_v1'

function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (p && typeof p.year === 'number') return p
    }
  } catch {}
  return null
}

// 事業年度の第1月を算出
// ・開始日が1日 → 開始月がそのまま第1月
// ・開始日が2日以降 → 翌月が第1月
export function getFirstMonth(company) {
  if (!company) return 1
  const sm = parseInt(company.fiscalStartMonth || '01', 10)
  const sd = parseInt(company.fiscalStartDay   || '01', 10)
  if (sd >= 2) return sm === 12 ? 1 : sm + 1
  return sm
}

// 事業年度の12ヶ月を順番に返す（第1月〜第12月）
export function getFiscalMonths(firstMonth) {
  return Array.from({ length: 12 }, (_, i) => ((firstMonth - 1 + i) % 12) + 1)
}

// あるカレンダー月がどの会計年度に属するか
function calToFY(calYear, calMonth, firstMonth) {
  return calMonth >= firstMonth ? calYear : calYear - 1
}

// 会計月に対応するカレンダー年を返す
function fyMonthToCalYear(fyYear, calMonth, firstMonth) {
  return calMonth >= firstMonth ? fyYear : fyYear + 1
}

// データから最新日を探して属する会計年度を返す（初期値用）
function defaultFYYear(journals, firstMonth) {
  const now = new Date()
  const nm = now.getMonth() + 1
  const currentFY = calToFY(now.getFullYear(), nm, firstMonth)
  if (journals.length === 0) return currentFY
  const latest = [...journals].sort((a, b) => b.date.localeCompare(a.date))[0]
  const cy = parseInt(latest.date.slice(0, 4), 10)
  const cm = parseInt(latest.date.slice(5, 7), 10)
  return calToFY(cy, cm, firstMonth)
}

export function usePeriod(journals, companies = []) {
  const saved = useState(loadSaved)[0]

  // 選択中の会社
  const [selectedCompanyId, _setSelectedCompanyId] = useState(() => {
    if (saved?.companyId) return saved.companyId
    const def = companies.find(c => c.isDefault) || companies[0]
    return def?.id || null
  })

  const selectedCompany = useMemo(
    () => companies.find(c => c.id === selectedCompanyId)
       || companies.find(c => c.isDefault)
       || companies[0]
       || null,
    [companies, selectedCompanyId]
  )

  const firstMonth = useMemo(() => getFirstMonth(selectedCompany), [selectedCompany])

  const fiscalMonths = useMemo(() => getFiscalMonths(firstMonth), [firstMonth])

  // 会計期間 state
  const [period, setPeriodState] = useState(() => {
    if (saved && typeof saved.year === 'number') {
      return { year: saved.year, month: saved.month ?? null }
    }
    return { year: defaultFYYear(journals, firstMonth), month: null }
  })

  function setPeriod(next) {
    setPeriodState(next)
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...next, companyId: selectedCompanyId }))
    } catch {}
  }

  function setSelectedCompanyId(id) {
    _setSelectedCompanyId(id)
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...period, companyId: id }))
    } catch {}
  }

  // 選択可能な会計年度リスト
  const availableYears = useMemo(() => {
    const years = new Set()
    journals.forEach(j => {
      const cy = parseInt(j.date.slice(0, 4), 10)
      const cm = parseInt(j.date.slice(5, 7), 10)
      if (!isNaN(cy)) years.add(calToFY(cy, cm, firstMonth))
    })
    years.add(period.year)
    const now = new Date()
    years.add(calToFY(now.getFullYear(), now.getMonth() + 1, firstMonth))
    return [...years].sort((a, b) => b - a)
  }, [journals, period.year, firstMonth])

  // フィルタ用の開始日・終了日
  const { start, end } = useMemo(() => {
    const lastFiscalMonth = fiscalMonths[11]
    const endCalYear = fyMonthToCalYear(period.year, lastFiscalMonth, firstMonth)
    const lastDay = new Date(endCalYear, lastFiscalMonth, 0).getDate()

    if (period.month) {
      const calYear = fyMonthToCalYear(period.year, period.month, firstMonth)
      const m = String(period.month).padStart(2, '0')
      const ld = new Date(calYear, period.month, 0).getDate()
      return {
        start: `${calYear}-${m}-01`,
        end:   `${calYear}-${m}-${String(ld).padStart(2, '0')}`,
      }
    }

    return {
      start: `${period.year}-${String(firstMonth).padStart(2, '0')}-01`,
      end:   `${endCalYear}-${String(lastFiscalMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }, [period, firstMonth, fiscalMonths])

  const periodJournals = useMemo(
    () => journals.filter(j => j.date >= start && j.date <= end),
    [journals, start, end]
  )

  const bsJournals = useMemo(
    () => journals.filter(j => j.date <= end),
    [journals, end]
  )

  const label = useMemo(() => {
    if (period.month) return `${period.year}年度 ${period.month}月`
    const last = fiscalMonths[11]
    const endY  = fyMonthToCalYear(period.year, last, firstMonth)
    const range = firstMonth === 1
      ? ''
      : `（${firstMonth}月〜${endY !== period.year ? endY + '年' : ''}${last}月）`
    return `${period.year}年度${range}`
  }, [period, firstMonth, fiscalMonths])

  return {
    period, setPeriod,
    availableYears,
    periodJournals,
    bsJournals,
    periodStart: start,
    periodEnd:   end,
    label,
    firstMonth,
    fiscalMonths,
    selectedCompany,
    selectedCompanyId,
    setSelectedCompanyId,
    companies,
    // カレンダー年変換ヘルパー（BudgetManagement等で使用）
    fyMonthToCalYear: (calMonth) => fyMonthToCalYear(period.year, calMonth, firstMonth),
  }
}
