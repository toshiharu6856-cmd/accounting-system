-- ============================================================
-- 追加マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- ① セッション管理テーブル（ログイン bypass 防止）
CREATE TABLE IF NOT EXISTS user_sessions (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "allow_all_user_sessions" ON user_sessions;
CREATE POLICY "allow_all_user_sessions"
  ON user_sessions FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

-- ② 勘定科目テーブルにローマ字・カナ列を追加
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS romaji TEXT DEFAULT '';
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS kana   TEXT DEFAULT '';

-- ③ 既存レコードにローマ字・カナを設定
UPDATE accounts SET romaji = 'genkin',                  kana = 'ゲンキン'             WHERE code = '1001';
UPDATE accounts SET romaji = 'futsuuyokin',             kana = 'フツウヨキン'          WHERE code = '1102';
UPDATE accounts SET romaji = 'urikakekin',              kana = 'ウリカケキン'          WHERE code = '1202';
UPDATE accounts SET romaji = 'shohin',                  kana = 'ショウヒン'            WHERE code = '1401';
UPDATE accounts SET romaji = 'kaikakekin',              kana = 'カイカケキン'          WHERE code = '2002';
UPDATE accounts SET romaji = 'miharaikin',              kana = 'ミハライキン'          WHERE code = '2201';
UPDATE accounts SET romaji = 'kariirekin',              kana = 'カリイレキン'          WHERE code = '2101';
UPDATE accounts SET romaji = 'shihonkin',               kana = 'シホンキン'            WHERE code = '3001';
UPDATE accounts SET romaji = 'kurikoshirieki',          kana = 'クリコシリエキ'        WHERE code = '3301';
UPDATE accounts SET romaji = 'uriagedaka',              kana = 'ウリアゲダカ'          WHERE code = '4001';
UPDATE accounts SET romaji = 'uketoriririsoku',         kana = 'ウケトリリソク'        WHERE code = '4101';
UPDATE accounts SET romaji = 'shiiredaka',              kana = 'シイレダカ'            WHERE code = '5001';
UPDATE accounts SET romaji = 'kyuryoteate',             kana = 'キュウリョウテアテ'    WHERE code = '5101';
UPDATE accounts SET romaji = 'tsushinhi',               kana = 'ツウシンヒ'            WHERE code = '5203';
UPDATE accounts SET romaji = 'ryohikotsuhi',            kana = 'リョヒコウツウヒ'      WHERE code = '5204';
UPDATE accounts SET romaji = 'shomohinhi',              kana = 'ショウモウヒンヒ'      WHERE code = '5205';
UPDATE accounts SET romaji = 'shiharairirisoku',        kana = 'シハライリソク'        WHERE code = '5301';
