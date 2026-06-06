// 令和8年度 サンプル仕訳データ
// 期末残高: 現金 145,000 / 普通預金 2,247,000 / 売掛金 1,500,000
// 当期純利益: 492,000 / 資産合計 = 負債純資産合計 = 3,892,000
export const SAMPLE_JOURNALS = [
  {
    id: 'JV-20260101-001',
    date: '2026-01-01',
    voucherType: 'OPENING',
    description: '期首残高',
    lines: [
      { id: 1, debitCode: '1001', debitAmount: 200000, creditCode: '3001', creditAmount: 200000, memo: '現金 期首' },
      { id: 2, debitCode: '1102', debitAmount: 800000, creditCode: '3001', creditAmount: 800000, memo: '普通預金 期首' },
    ],
  },
  {
    id: 'JV-20260110-001',
    date: '2026-01-10',
    voucherType: 'NORMAL',
    description: '商品仕入（掛）',
    lines: [
      { id: 1, debitCode: '5001', debitAmount: 300000, creditCode: '2002', creditAmount: 300000, memo: '1月分仕入' },
    ],
  },
  {
    id: 'JV-20260115-001',
    date: '2026-01-15',
    voucherType: 'NORMAL',
    description: '商品売上（掛）',
    lines: [
      { id: 1, debitCode: '1202', debitAmount: 500000, creditCode: '4001', creditAmount: 500000, memo: '1月売上' },
    ],
  },
  {
    id: 'JV-20260120-001',
    date: '2026-01-20',
    voucherType: 'NORMAL',
    description: '買掛金支払',
    lines: [
      { id: 1, debitCode: '2002', debitAmount: 300000, creditCode: '1102', creditAmount: 300000, memo: '1月仕入分' },
    ],
  },
  {
    id: 'JV-20260125-001',
    date: '2026-01-25',
    voucherType: 'NORMAL',
    description: '売掛金回収',
    lines: [
      { id: 1, debitCode: '1102', debitAmount: 500000, creditCode: '1202', creditAmount: 500000, memo: '1月売上分' },
    ],
  },
  {
    id: 'JV-20260201-001',
    date: '2026-02-01',
    voucherType: 'NORMAL',
    description: '1月分給与支払',
    lines: [
      { id: 1, debitCode: '5101', debitAmount: 250000, creditCode: '1102', creditAmount: 250000, memo: '1月給与' },
    ],
  },
  {
    id: 'JV-20260205-001',
    date: '2026-02-05',
    voucherType: 'NORMAL',
    description: '通信費支払',
    lines: [
      { id: 1, debitCode: '5203', debitAmount: 12000, creditCode: '1001', creditAmount: 12000, memo: '電話・インターネット' },
    ],
  },
  {
    id: 'JV-20260210-001',
    date: '2026-02-10',
    voucherType: 'NORMAL',
    description: '商品仕入（掛）',
    lines: [
      { id: 1, debitCode: '5001', debitAmount: 400000, creditCode: '2002', creditAmount: 400000, memo: '2月分仕入' },
    ],
  },
  {
    id: 'JV-20260215-001',
    date: '2026-02-15',
    voucherType: 'NORMAL',
    description: '商品売上（掛）',
    lines: [
      { id: 1, debitCode: '1202', debitAmount: 700000, creditCode: '4001', creditAmount: 700000, memo: '2月売上' },
    ],
  },
  {
    id: 'JV-20260220-001',
    date: '2026-02-20',
    voucherType: 'NORMAL',
    description: '旅費交通費精算',
    lines: [
      { id: 1, debitCode: '5204', debitAmount: 35000, creditCode: '1001', creditAmount: 35000, memo: '出張費' },
    ],
  },
  {
    id: 'JV-20260301-001',
    date: '2026-03-01',
    voucherType: 'NORMAL',
    description: '銀行借入',
    lines: [
      { id: 1, debitCode: '1102', debitAmount: 2000000, creditCode: '2101', creditAmount: 2000000, memo: '運転資金借入' },
    ],
  },
  {
    id: 'JV-20260310-001',
    date: '2026-03-10',
    voucherType: 'NORMAL',
    description: '商品売上（掛）',
    lines: [
      { id: 1, debitCode: '1202', debitAmount: 800000, creditCode: '4001', creditAmount: 800000, memo: '3月売上' },
    ],
  },
  {
    id: 'JV-20260315-001',
    date: '2026-03-15',
    voucherType: 'NORMAL',
    description: '消耗品購入',
    lines: [
      { id: 1, debitCode: '5205', debitAmount: 8000, creditCode: '1001', creditAmount: 8000, memo: '事務用品' },
    ],
  },
  {
    id: 'JV-20260320-001',
    date: '2026-03-20',
    voucherType: 'NORMAL',
    description: '借入金利息支払',
    lines: [
      { id: 1, debitCode: '5301', debitAmount: 5000, creditCode: '1102', creditAmount: 5000, memo: '2月分利息' },
    ],
  },
  {
    id: 'JV-20260325-001',
    date: '2026-03-25',
    voucherType: 'NORMAL',
    description: '受取利息',
    lines: [
      { id: 1, debitCode: '1102', debitAmount: 2000, creditCode: '4101', creditAmount: 2000, memo: '普通預金利息' },
    ],
  },
  {
    id: 'JV-20260331-001',
    date: '2026-03-31',
    voucherType: 'NORMAL',
    description: '2・3月分給与支払',
    lines: [
      { id: 1, debitCode: '5101', debitAmount: 500000, creditCode: '1102', creditAmount: 500000, memo: '給与' },
    ],
  },
]
