const MONTHS = [
  { v: null, label: '通年' },
  { v: 1,  label: '1月' },  { v: 2,  label: '2月' },  { v: 3,  label: '3月' },
  { v: 4,  label: '4月' },  { v: 5,  label: '5月' },  { v: 6,  label: '6月' },
  { v: 7,  label: '7月' },  { v: 8,  label: '8月' },  { v: 9,  label: '9月' },
  { v: 10, label: '10月' }, { v: 11, label: '11月' }, { v: 12, label: '12月' },
]

export default function PeriodSelector({ period, setPeriod, availableYears }) {
  return (
    <div className="pf-period no-print">
      <label className="pf-period-label">期間:</label>
      <select
        className="je-select pf-period-select"
        value={period.year}
        onChange={e => setPeriod({ ...period, year: parseInt(e.target.value, 10) })}
      >
        {availableYears.map(y => (
          <option key={y} value={y}>{y}年</option>
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
        {MONTHS.map(m => (
          <option key={m.label} value={m.v ?? ''}>{m.label}</option>
        ))}
      </select>
    </div>
  )
}
