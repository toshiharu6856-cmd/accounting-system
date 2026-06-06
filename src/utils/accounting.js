import { accounts as _staticAccounts } from '../data/accounts'

export function parseAmt(val) {
  if (typeof val === 'number') return val >= 0 ? val : 0
  if (!val) return 0
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) || n < 0 ? 0 : n
}

export function fmtDisplay(n) {
  return '¥ ' + (n || 0).toLocaleString('ja-JP')
}

export function calcBalance(accountCode, journals, accounts = _staticAccounts) {
  const account = accounts.find(a => a.code === accountCode)
  if (!account) return 0

  let dr = 0, cr = 0
  journals.forEach(j => {
    j.lines.forEach(line => {
      if (line.debitCode  === accountCode) dr += parseAmt(line.debitAmount)
      if (line.creditCode === accountCode) cr += parseAmt(line.creditAmount)
    })
  })

  return account.normalBalance === 'DEBIT' ? dr - cr : cr - dr
}

export function getLedgerEntries(accountCode, journals, accounts = _staticAccounts) {
  const account = accounts.find(a => a.code === accountCode)
  if (!account) return []

  const sorted = [...journals].sort((a, b) =>
    a.date.localeCompare(b.date) || a.id.localeCompare(b.id)
  )

  const entries = []
  sorted.forEach(j => {
    j.lines.forEach(line => {
      const dr = line.debitCode  === accountCode ? parseAmt(line.debitAmount)  : 0
      const cr = line.creditCode === accountCode ? parseAmt(line.creditAmount) : 0
      if (dr === 0 && cr === 0) return
      entries.push({ date: j.date, journalId: j.id, description: line.memo || j.description, debit: dr, credit: cr })
    })
  })

  let balance = 0
  return entries.map(e => {
    balance += account.normalBalance === 'DEBIT' ? e.debit - e.credit : e.credit - e.debit
    return { ...e, balance }
  })
}

export function getPLSummary(journals, accounts = _staticAccounts) {
  const revenues = accounts
    .filter(a => a.category === 'REVENUE')
    .map(a => ({ ...a, amount: calcBalance(a.code, journals, accounts) }))
    .filter(a => a.amount !== 0)

  const expenses = accounts
    .filter(a => a.category === 'EXPENSE')
    .map(a => ({ ...a, amount: calcBalance(a.code, journals, accounts) }))
    .filter(a => a.amount !== 0)

  const totalRevenue = revenues.reduce((s, a) => s + a.amount, 0)
  const totalExpense = expenses.reduce((s, a) => s + a.amount, 0)

  return { revenues, expenses, totalRevenue, totalExpense, netIncome: totalRevenue - totalExpense }
}

export function getBSSummary(journals, accounts = _staticAccounts) {
  const { netIncome } = getPLSummary(journals, accounts)

  const assets      = accounts.filter(a => a.category === 'ASSET')
    .map(a => ({ ...a, amount: calcBalance(a.code, journals, accounts) }))
  const liabilities = accounts.filter(a => a.category === 'LIABILITY')
    .map(a => ({ ...a, amount: calcBalance(a.code, journals, accounts) }))
  const equities    = accounts.filter(a => a.category === 'EQUITY')
    .map(a => ({ ...a, amount: calcBalance(a.code, journals, accounts) }))

  const totalAssets      = assets.reduce((s, a) => s + a.amount, 0)
  const totalLiabilities = liabilities.reduce((s, a) => s + a.amount, 0)
  const totalEquities    = equities.reduce((s, a) => s + a.amount, 0)
  const totalLiabEquity  = totalLiabilities + totalEquities + netIncome

  return {
    assets, liabilities, equities,
    totalAssets, totalLiabilities, totalEquities,
    netIncome, totalLiabEquity,
    isBalanced: Math.abs(totalAssets - totalLiabEquity) < 1,
  }
}
