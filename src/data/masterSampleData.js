const ts = new Date().toISOString()

export const SAMPLE_COMPANIES = [
  {
    id: 'CO-001',
    code: 'SMPL',
    name: '株式会社サンプル商事',
    nameKana: 'カブシキガイシャサンプルショウジ',
    fiscalStartMonth: '04',
    address: '東京都千代田区大手町1-1-1',
    tel: '03-1234-5678',
    isActive: true,
    isDefault: true,
    createdAt: ts,
  },
  {
    id: 'CO-002',
    code: 'TEST',
    name: '有限会社テスト工業',
    nameKana: 'ユウゲンガイシャテストコウギョウ',
    fiscalStartMonth: '01',
    address: '大阪府大阪市北区梅田2-2-2',
    tel: '06-2345-6789',
    isActive: true,
    isDefault: false,
    createdAt: ts,
  },
]

export const SAMPLE_MASTER_ACCOUNTS = [
  // 資産
  {
    id: 'ACC-1001', code: '1001', name: '現金',
    category: 'ASSET', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [
      { id: 'SA-1001-01', code: '01', name: '手元現金' },
      { id: 'SA-1001-02', code: '02', name: '小口現金' },
    ],
  },
  {
    id: 'ACC-1102', code: '1102', name: '普通預金',
    category: 'ASSET', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [
      { id: 'SA-1102-01', code: '01', name: '○○銀行 普通預金' },
      { id: 'SA-1102-02', code: '02', name: '△△銀行 普通預金' },
    ],
  },
  {
    id: 'ACC-1202', code: '1202', name: '売掛金',
    category: 'ASSET', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-1401', code: '1401', name: '商品',
    category: 'ASSET', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  // 負債
  {
    id: 'ACC-2002', code: '2002', name: '買掛金',
    category: 'LIABILITY', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-2201', code: '2201', name: '未払金',
    category: 'LIABILITY', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-2101', code: '2101', name: '借入金',
    category: 'LIABILITY', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [
      { id: 'SA-2101-01', code: '01', name: '○○銀行借入' },
    ],
  },
  // 純資産
  {
    id: 'ACC-3001', code: '3001', name: '資本金',
    category: 'EQUITY', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-3301', code: '3301', name: '繰越利益剰余金',
    category: 'EQUITY', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [],
  },
  // 収益
  {
    id: 'ACC-4001', code: '4001', name: '売上高',
    category: 'REVENUE', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [
      { id: 'SA-4001-01', code: '01', name: '商品売上' },
      { id: 'SA-4001-02', code: '02', name: 'サービス売上' },
    ],
  },
  {
    id: 'ACC-4101', code: '4101', name: '受取利息',
    category: 'REVENUE', normalBalance: 'CREDIT', isActive: true,
    subAccounts: [],
  },
  // 費用
  {
    id: 'ACC-5001', code: '5001', name: '仕入高',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-5101', code: '5101', name: '給料手当',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-5203', code: '5203', name: '通信費',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-5204', code: '5204', name: '旅費交通費',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-5205', code: '5205', name: '消耗品費',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
  {
    id: 'ACC-5301', code: '5301', name: '支払利息',
    category: 'EXPENSE', normalBalance: 'DEBIT', isActive: true,
    subAccounts: [],
  },
]

export const SAMPLE_DEPARTMENTS = [
  { id: 'DEPT-00', code: '0000', name: '全社共通', parentId: null, sortOrder: 0,  isActive: true },
  { id: 'DEPT-01', code: '0100', name: '営業部',   parentId: null, sortOrder: 10, isActive: true },
  { id: 'DEPT-0101', code: '0101', name: '営業一課', parentId: 'DEPT-01', sortOrder: 11, isActive: true },
  { id: 'DEPT-0102', code: '0102', name: '営業二課', parentId: 'DEPT-01', sortOrder: 12, isActive: true },
  { id: 'DEPT-02', code: '0200', name: '総務部',   parentId: null, sortOrder: 20, isActive: true },
  { id: 'DEPT-03', code: '0300', name: '経理部',   parentId: null, sortOrder: 30, isActive: true },
  { id: 'DEPT-04', code: '0400', name: '製造部',   parentId: null, sortOrder: 40, isActive: true },
  { id: 'DEPT-0401', code: '0401', name: '製造一課', parentId: 'DEPT-04', sortOrder: 41, isActive: true },
  { id: 'DEPT-0402', code: '0402', name: '製造二課', parentId: 'DEPT-04', sortOrder: 42, isActive: true },
]
