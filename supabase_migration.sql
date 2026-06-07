-- ============================================================
-- 会計システム Supabase マイグレーション
-- Supabaseのダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ① 会社マスタ
CREATE TABLE IF NOT EXISTS companies (
  id                 TEXT PRIMARY KEY,
  code               TEXT NOT NULL,
  name               TEXT NOT NULL,
  name_kana          TEXT,
  fiscal_start_month TEXT DEFAULT '01',
  fiscal_start_day   TEXT DEFAULT '01',
  address            TEXT,
  tel                TEXT,
  is_active          BOOLEAN DEFAULT TRUE,
  is_default         BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ② 勘定科目マスタ
CREATE TABLE IF NOT EXISTS accounts (
  id             TEXT PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  category       TEXT NOT NULL,   -- ASSET / LIABILITY / EQUITY / REVENUE / EXPENSE
  normal_balance TEXT NOT NULL,   -- DEBIT / CREDIT
  is_active      BOOLEAN DEFAULT TRUE,
  sub_accounts   JSONB DEFAULT '[]'
);

-- ③ 部門マスタ
CREATE TABLE IF NOT EXISTS departments (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  parent_id  TEXT REFERENCES departments(id),
  sort_order INTEGER DEFAULT 0,
  is_active  BOOLEAN DEFAULT TRUE
);

-- ④ ユーザー
CREATE TABLE IF NOT EXISTS users (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'USER',  -- USER / APPROVER / ADMIN
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⑤ 仕訳ヘッダー
CREATE TABLE IF NOT EXISTS journals (
  id           TEXT PRIMARY KEY,
  date         DATE NOT NULL,
  voucher_type TEXT NOT NULL DEFAULT 'NORMAL',
  description  TEXT,
  dept_code    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ⑥ 仕訳明細行
CREATE TABLE IF NOT EXISTS journal_lines (
  id            BIGSERIAL PRIMARY KEY,
  journal_id    TEXT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  line_no       INTEGER NOT NULL,
  debit_code    TEXT,
  debit_amount  NUMERIC(15,2) DEFAULT 0,
  credit_code   TEXT,
  credit_amount NUMERIC(15,2) DEFAULT 0,
  memo          TEXT,
  UNIQUE (journal_id, line_no)
);

-- ⑦ 予算ヘッダー
CREATE TABLE IF NOT EXISTS budgets (
  id          TEXT PRIMARY KEY,
  fiscal_year TEXT NOT NULL,
  version     TEXT NOT NULL,   -- INITIAL / REVISED / FORECAST
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fiscal_year, version)
);

-- ⑧ 予算明細
CREATE TABLE IF NOT EXISTS budget_entries (
  id           BIGSERIAL PRIMARY KEY,
  budget_id    TEXT NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  dept_code    TEXT NOT NULL,
  account_code TEXT NOT NULL,
  month        INTEGER NOT NULL,  -- 1-12
  amount       NUMERIC(15,2) DEFAULT 0
);

-- ⑨ 承認
CREATE TABLE IF NOT EXISTS approvals (
  id           TEXT PRIMARY KEY,
  journal_id   TEXT NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT / PENDING / APPROVED / REJECTED
  requested_by TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_by  TEXT,
  reviewed_at  TIMESTAMPTZ,
  comment      TEXT,
  note         TEXT,
  history      JSONB DEFAULT '[]'
);

-- ⑩ 監査ログ（訂正削除履歴）
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,   -- CREATE / EDIT / DELETE
  journal_id  TEXT,
  user_id     TEXT,
  user_name   TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  before_data JSONB,
  after_data  JSONB
);

-- ⑪ 操作ログ
CREATE TABLE IF NOT EXISTS op_logs (
  id          BIGSERIAL PRIMARY KEY,
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  user_id     TEXT,
  user_name   TEXT,
  action      TEXT,
  target      TEXT,
  detail      TEXT
);

-- ⑫ 子会社（連結用）
CREATE TABLE IF NOT EXISTS subsidiaries (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT,
  country     TEXT,
  currency    TEXT DEFAULT 'JPY',
  ownership   NUMERIC(5,2) DEFAULT 100,
  is_active   BOOLEAN DEFAULT TRUE
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_journals_date        ON journals(date);
CREATE INDEX IF NOT EXISTS idx_journal_lines_jid    ON journal_lines(journal_id);
CREATE INDEX IF NOT EXISTS idx_budget_entries_bid   ON budget_entries(budget_id);
CREATE INDEX IF NOT EXISTS idx_approvals_journal_id ON approvals(journal_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_journal   ON audit_logs(journal_id);

-- RLS（Row Level Security）- 全ユーザーが読み書き可能（必要に応じて制限してください）
ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE op_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE subsidiaries    ENABLE ROW LEVEL SECURITY;

-- ポリシー：anon キーでも全操作を許可（デモ用。本番ではSupabase Authと組み合わせてください）
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['companies','accounts','departments','users','journals',
    'journal_lines','budgets','budget_entries','approvals','audit_logs','op_logs','subsidiaries']
  LOOP
    -- 既存ポリシーを削除してから再作成（IF NOT EXISTS は POLICY に未対応のため）
    EXECUTE format('DROP POLICY IF EXISTS "allow_all_%s" ON %I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "allow_all_%s" ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);',
      tbl, tbl
    );
  END LOOP;
END $$;
