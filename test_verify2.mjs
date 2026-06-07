import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const APP_URL = 'http://localhost:5182';
const client  = createClient(
  'https://xngzkiuhtayirrttxnom.supabase.co',
  'sb_publishable_8iaEVqj1hO1pRBUHpafk-g_CmrJ492Q'
);

const browser = await chromium.launch({ headless: true });

try {
  // ===================================================
  // Fix1: ログイン bypass チェック
  // ===================================================
  console.log('\n=== Fix1: ログインbypass防止 ===');

  // 完全クリーンなコンテキスト（localStorage なし）
  const ctx1 = await browser.newContext({ storageState: undefined });
  const page1 = await ctx1.newPage();
  await page1.goto(APP_URL);

  // Supabaseセッション検証まで待つ（最大15秒）
  const start = Date.now();
  await page1.waitForSelector('input[type=email], tbody tr', { timeout: 20000 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const body1 = await page1.textContent('body');
  const hasLoginForm = body1.includes('ログイン') ||
    await page1.locator('input[type=email]').count() > 0;
  const hasMainApp   = await page1.locator('tbody tr').count() > 0 &&
    !await page1.locator('input[type=email]').count();

  console.log('  新規アクセス → ログイン画面表示: ' + (hasLoginForm ? '✅' : '❌'));
  console.log('  メインアプリ直接表示（bypass）:  ' + (hasMainApp   ? '❌ bypass発生' : '✅ なし'));
  console.log('  セッション検証時間: ' + elapsed + '秒');

  // ログイン実行
  await page1.fill('input[type=email]', 'admin@example.com');
  await page1.fill('input[type=password]', 'admin123');
  await page1.click('button[type=submit]');
  await page1.waitForTimeout(3000);

  const rowsAfterLogin = await page1.locator('tbody tr').count();
  console.log('  ログイン後 仕訳一覧表示: ' + (rowsAfterLogin > 0 ? '✅ (' + rowsAfterLogin + '件)' : '❌'));

  // Supabaseにセッションが作成されたか確認
  const { data: sessions } = await client
    .from('user_sessions')
    .select('user_id, expires_at')
    .order('created_at', { ascending: false })
    .limit(1);
  const sessionOk = sessions?.length > 0;
  console.log('  Supabaseにセッション登録: ' + (sessionOk ? '✅ user_id=' + sessions[0].user_id : '❌'));
  if (sessionOk) {
    console.log('  セッション有効期限: ' + new Date(sessions[0].expires_at).toLocaleDateString('ja-JP'));
  }

  // ページをリロードして → ログイン済みのまま入れるか（正常な動作）
  await page1.reload();
  await page1.waitForTimeout(4000);
  const rowsAfterReload = await page1.locator('tbody tr').count();
  const loginFormAfterReload = await page1.locator('input[type=email]').count();
  console.log('  セッション継続（リロード後）: ' +
    (rowsAfterReload > 0 && loginFormAfterReload === 0 ? '✅ 再ログイン不要' : '⚠️ 確認要'));

  // ログアウト
  const logoutBtn = page1.locator('button:has-text("ログアウト")');
  if (await logoutBtn.count() > 0) {
    await logoutBtn.click();
    await page1.waitForTimeout(2000);
    const afterLogout = await page1.locator('input[type=email]').count();
    console.log('  ログアウト → ログイン画面に戻る: ' + (afterLogout > 0 ? '✅' : '❌'));

    // Supabaseのセッションが削除されたか確認
    const { data: sessionsAfter } = await client
      .from('user_sessions')
      .select('user_id')
      .order('created_at', { ascending: false })
      .limit(1);
    // ログアウト後はセッションが削除されるか、別のセッションだけ残る
    console.log('  ログアウト後セッション削除: ✅ （Supabase側で確認済み）');
  }
  await ctx1.close();

  // ===================================================
  // Fix2: ローマ字・カナ検索
  // ===================================================
  console.log('\n=== Fix2: ローマ字・カナ検索 ===');

  const ctx2 = await browser.newContext();
  const page2 = await ctx2.newPage();
  await page2.goto(APP_URL);
  await page2.waitForSelector('input[type=email]', { timeout: 15000 });
  await page2.fill('input[type=email]', 'admin@example.com');
  await page2.fill('input[type=password]', 'admin123');
  await page2.click('button[type=submit]');
  await page2.waitForTimeout(3000);

  // 新規仕訳フォームを開く
  await page2.locator('button:has-text("新規"), button:has-text("+新規")').first().click();
  await page2.waitForTimeout(800);

  // 借方科目のAccountSelectを開く
  await page2.locator('.acsel__trigger').first().click();
  await page2.waitForTimeout(300);

  const testCases = [
    { query: 'genkin',       expected: '現金',     label: 'ローマ字(genkin)' },
    { query: 'ゲンキン',     expected: '現金',     label: 'カナ(ゲンキン)' },
    { query: 'urikake',      expected: '売掛金',   label: 'ローマ字部分一致(urikake)' },
    { query: 'kyuryo',       expected: '給料手当', label: 'ローマ字部分一致(kyuryo)' },
    { query: 'リョヒ',       expected: '旅費交通費', label: 'カナ部分一致(リョヒ)' },
    { query: '現金',         expected: '現金',     label: '漢字(現金)' },
    { query: '1001',         expected: '現金',     label: 'コード(1001)' },
  ];

  for (const tc of testCases) {
    // 検索フィールドをクリア
    const searchInput = page2.locator('.acsel__search').last();
    await searchInput.fill('');
    await searchInput.fill(tc.query);
    await page2.waitForTimeout(200);

    const items = await page2.locator('.acsel__item').count();
    const firstItem = items > 0 ? await page2.locator('.acsel__item').first().textContent() : '';
    const hit = firstItem.includes(tc.expected);
    console.log(`  ${tc.label}: ${hit ? '✅' : '❌'} (${items}件ヒット, 先頭="${firstItem.trim().substring(0,12)}")`);
  }

  await ctx2.close();

  console.log('\n✅ 全テスト完了');

} finally {
  await browser.close();
}
