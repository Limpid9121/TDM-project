// test_regimen_tags.js — REDESIGN L-C：達標標籤照實分類
//
// 修正前：regimenTag() 把 AUC <420 與 >580 都標「略接近邊界」（AUC 334 也一樣），420／580
// 沒有出處；regimenTagAmino() 的 peak 有 0.85／1.25 的容許帶（gentamicin 嚴重感染目標 8–10，
// peak 7.0 仍顯示符合）。修正後依工具既有規則照實分類：
//   vancomycin：AUC >600 或 Cmin >20 → danger；AUC <400 → warn；Cmin >15 → warn；其餘 ok
//   AMG：trough 超過上限 → warn（>1.5 倍 → danger）；peak 低於下限／高於上限 → warn，無容許帶
//
// Run: node test_regimen_tags.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { exports: X } = await loadHarness();
  const { regimenTag, regimenTagAmino, AMINO_TARGETS } = X;

  // ---------- vancomycin ----------
  const v = (cmin, auc) => regimenTag(cmin, auc);
  assert(v(10, 334).tag === 'warn' && /低於目標 AUC 400/.test(v(10, 334).tagText), 'AUC 334 → warn「低於目標 AUC 400」（舊版只說略接近邊界）');
  assert(v(10, 399).tag === 'warn', 'AUC 399 → warn');
  assert(v(10, 400).tag === 'ok', 'AUC 400 → ok（目標下限含 400）');
  assert(v(10, 410).tag === 'ok', 'AUC 410 → ok（舊版因 <420 標 warn）');
  assert(v(10, 590).tag === 'ok', 'AUC 590 → ok（舊版因 >580 標 warn）');
  assert(v(10, 600).tag === 'ok' && /AUC 400–600/.test(v(10, 600).tagText), 'AUC 600 → ok，文字寫明目標 AUC 400–600');
  assert(v(10, 601).tag === 'danger', 'AUC 601 → danger');
  assert(v(20, 500).tag === 'warn' && /Cmin 15–20/.test(v(20, 500).tagText), 'Cmin 20（15–20 區間）→ warn，文字寫 Cmin 15–20');
  assert(v(21, 500).tag === 'danger', 'Cmin 21 → danger');
  assert(v(15, 500).tag === 'ok', 'Cmin 15 → ok');
  assert(v(16, 500).tag === 'warn', 'Cmin 16 → warn');
  assert(v(16, 334).tag === 'warn' && /低於目標 AUC 400/.test(v(16, 334).tagText), '同時 AUC 偏低與 Cmin 偏高時，先講 AUC 偏低（依序判斷）');
  assert(v(25, 700).tag === 'danger' && /腎毒性疑慮升高/.test(v(25, 700).tagText), 'danger 文字為「腎毒性疑慮升高」');

  // ---------- aminoglycoside ----------
  const sev = AMINO_TARGETS.gentamicin.conventional.find(t => t.id === 'severe'); // peak 8–10, trough <2
  assert(sev && sev.peak[0] === 8 && sev.peak[1] === 10 && sev.troughHi === 2, '前提：gentamicin 傳統給藥嚴重感染目標 peak 8–10、trough <2');
  const a = (peak, trough) => regimenTagAmino(peak, trough, sev);
  assert(a(7.0, 1).tag === 'warn' && /Peak 7\.0 低於目標下限 8/.test(a(7.0, 1).tagText), 'gentamicin 嚴重感染 peak 7.0 → warn「低於目標下限 8」（舊版顯示符合）');
  assert(a(6.9, 1).tag === 'warn', 'peak 6.9（舊版容許帶 6.8 以下才警示）→ warn');
  assert(a(8, 1).tag === 'ok' && /符合目標範圍/.test(a(8, 1).tagText), 'peak 8.0 → ok');
  assert(a(10, 1).tag === 'ok', 'peak 10.0 → ok');
  assert(a(10.5, 1).tag === 'warn' && /Peak 10\.5 高於目標上限 10/.test(a(10.5, 1).tagText), 'peak 10.5 → warn（舊版容許到 12.5）');
  assert(a(9, 2.5).tag === 'warn' && /Trough 2\.5 超過目標上限 2/.test(a(9, 2.5).tagText), 'trough 2.5 → warn「超過目標上限 2」');
  assert(!/明顯/.test(a(9, 2.5).tagText), 'warn 的 trough 文字不再用「明顯超過」');
  assert(a(9, 3).tag === 'warn', 'trough 剛好 1.5 倍（3.0）→ 仍是 warn（要「超過」1.5 倍才 danger）');
  const d = a(9, 3.5);
  assert(d.tag === 'danger' && /超過上限 50% 為本工具自訂的危險分級/.test(d.tagText), 'trough 3.5（>1.5 倍）→ danger，文字註明 50% 為本工具自訂分級');
  assert(a(7, 3.5).tag === 'danger', 'trough danger 時 peak 偏低不會把 danger 降級');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
