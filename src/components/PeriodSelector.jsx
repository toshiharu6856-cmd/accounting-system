export default function PeriodSelector({
  period, setPeriod, availableYears,
  fiscalMonths,
  companies = [], selectedCompanyId, setSelectedCompanyId,
}) {
  const orderedMonths = fiscalMonths || [1,2,3,4,5,6,7,8,9,10,11,12]

  const monthOptions = [
    { v: null, label: '通年' },
    ...orderedMonths.map(m => ({ v: m, label: `${m}月` })),
  ]

  const activeCompanies = companies.filter(c => c.isActive !== false)

  return (
    <div className="pf-period no-print">
      {activeCompanies.length > 1 && (
        <>
          <label className="pf-period-label">会社:</label>
          <select
            className="je-select pf-period-select pf-company-select"
            value={selectedCompanyId || ''}
            onChange={e => setSelectedCompanyId?.(e.target.value)}
          >
            {activeCompanies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </>
      )}

      <label className="pf-period-label">期間:</label>
      <select
        className="je-select pf-period-select"
        value={period.year}
        onChange={e => setPeriod({ ...period, year: parseInt(e.target.value, 10) })}
      >
        {availableYears.map(y => (
          <option key={y} value={y}>{y}年度</option>
        ))}
      </select>

      <select
        className="je-select pf-period-select"
        value={period.month ?? ''}
        onChange={e => {
          const v = e.target.value
          setPeriod({ ...period, month: v === '' ? null : parseInt(v, 10) })
        }}
      >
        {monthOptions.map(m => (
          <option key={m.label} value={m.v ?? ''}>{m.label}</option>
        ))}
      </select>
    </div>
  )
}
