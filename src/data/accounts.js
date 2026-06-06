export const CATEGORIES = {
  ASSET:     { code: 'ASSET',     name: '資産',   order: 1 },
  LIABILITY: { code: 'LIABILITY', name: '負債',   order: 2 },
  EQUITY:    { code: 'EQUITY',    name: '純資産', order: 3 },
  REVENUE:   { code: 'REVENUE',   name: '収益',   order: 4 },
  EXPENSE:   { code: 'EXPENSE',   name: '費用',   order: 5 },
}

export const accounts = [
  // 資産
  { code: '1001', name: '現金',           category: 'ASSET',     normalBalance: 'DEBIT'  },
  { code: '1102', name: '普通預金',       category: 'ASSET',     normalBalance: 'DEBIT'  },
  { code: '1202', name: '売掛金',         category: 'ASSET',     normalBalance: 'DEBIT'  },
  { code: '1401', name: '商品',           category: 'ASSET',     normalBalance: 'DEBIT'  },
  // 負債
  { code: '2002', name: '買掛金',         category: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '2201', name: '未払金',         category: 'LIABILITY', normalBalance: 'CREDIT' },
  { code: '2101', name: '借入金',         category: 'LIABILITY', normalBalance: 'CREDIT' },
  // 純資産
  { code: '3001', name: '資本金',         category: 'EQUITY',    normalBalance: 'CREDIT' },
  { code: '3301', name: '繰越利益剰余金', category: 'EQUITY',    normalBalance: 'CREDIT' },
  // 収益
  { code: '4001', name: '売上高',         category: 'REVENUE',   normalBalance: 'CREDIT' },
  { code: '4101', name: '受取利息',       category: 'REVENUE',   normalBalance: 'CREDIT' },
  // 費用
  { code: '5001', name: '仕入高',         category: 'EXPENSE',   normalBalance: 'DEBIT'  },
  { code: '5101', name: '給料手当',       category: 'EXPENSE',   normalBalance: 'DEBIT'  },
  { code: '5203', name: '通信費',         category: 'EXPENSE',   normalBalance: 'DEBIT'  },
  { code: '5204', name: '旅費交通費',     category: 'EXPENSE',   normalBalance: 'DEBIT'  },
  { code: '5205', name: '消耗品費',       category: 'EXPENSE',   normalBalance: 'DEBIT'  },
  { code: '5301', name: '支払利息',       category: 'EXPENSE',   normalBalance: 'DEBIT'  },
]

export function getAccountByCode(code) {
  return accounts.find(a => a.code === code)
}
