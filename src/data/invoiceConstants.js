// インボイス制度（適格請求書等保存方式）定数

export const TAX_CATEGORIES = [
  { code: 'TAX10',  label: '課税10%（標準税率）',  rate: 0.10, taxable: true  },
  { code: 'TAX8',   label: '課税8%（軽減税率）',   rate: 0.08, taxable: true  },
  { code: 'EXEMPT', label: '非課税',               rate: 0,    taxable: false },
  { code: 'NON',    label: '不課税',               rate: 0,    taxable: false },
  { code: 'FREE',   label: '免税',                 rate: 0,    taxable: false },
]

export const TRANSITIONAL_MEASURES = [
  { code: 'TRANS80',    label: '経過措置80%控除（〜2026年9月）', rate: 0.80 },
  { code: 'TRANS50',    label: '経過措置50%控除（〜2029年9月）', rate: 0.50 },
  { code: 'NO_CREDIT',  label: '控除不可',                       rate: 0    },
]

// T + 13桁の数字
export const INVOICE_NO_REGEX = /^T\d{13}$/

export function validateInvoiceNo(no) {
  if (!no) return null
  return INVOICE_NO_REGEX.test(no) ? null : 'T + 13桁の数字で入力してください（例: T1234567890123）'
}

/**
 * 消費税計算
 * @param {number} amount    - 入力金額
 * @param {string} category  - TAX_CATEGORIES の code
 * @param {string} inputMode - 'inclusive'（税込）| 'exclusive'（税抜）
 */
export function calcTax(amount, category, inputMode) {
  const cat = TAX_CATEGORIES.find(c => c.code === category)
  if (!cat || !cat.taxable || amount <= 0) {
    return { base: amount, tax: 0, total: amount }
  }
  const r = cat.rate
  if (inputMode === 'inclusive') {
    const base = Math.floor(amount * 100 / (100 + r * 100))
    const tax  = amount - base
    return { base, tax, total: amount }
  } else {
    const tax   = Math.floor(amount * r)
    const total = amount + tax
    return { base: amount, tax, total }
  }
}

/**
 * 仕入税額控除額の計算
 * @param {number}  taxAmount    - 消費税額
 * @param {boolean} qualified    - 適格かどうか
 * @param {string|null} transitional - 経過措置コード
 */
export function calcInputCredit(taxAmount, qualified, transitional) {
  if (qualified) return taxAmount
  const t = TRANSITIONAL_MEASURES.find(m => m.code === transitional)
  return Math.floor(taxAmount * (t?.rate ?? 0))
}

export const INVOICE_DEFAULTS = {
  enabled:      false,
  invoiceNo:    '',
  qualified:    true,
  taxCategory:  'TAX10',
  taxInput:     'inclusive',
  transitional: 'TRANS80',
  baseAmount:   0,
  taxAmount:    0,
  totalAmount:  0,
  creditAmount: 0,
}
