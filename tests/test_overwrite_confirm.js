// test_overwrite_confirm.js — 「這會清空並重建…確定嗎？」只在真的會蓋掉手動修改時才問（Brandon 2026-10-24）
//
//   · 給藥表是上一次「自動展開」產生的、之後沒人動過 → 重新展開不問（例：右邊「展開給藥紀錄並更新」）
//   · 展開後手動改過（打字、−／+ 微調、手動新增一劑）→ 照舊先問；按取消就不動
//   · 載入存檔或示範病例後還沒展開過（不知道有沒有手動改過）→ 照舊先問一次
//   · 透析時程、AMG 給藥表一樣
//
// Run: node test_overwrite_confirm.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  let asked = 0, answer = true;
  win.confirm = () => { asked++; return answer; };
  win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 150) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const times = () => Array.from(doc.querySelectorAll('#doseTable .entry-row .dose-date')).map(i => i.value).join();
  await tick(200);
  $('loadDemoBtn').click(); await tick(300);

  // 示範病例載入後還沒展開過：問一次
  asked = 0; $('expandDoses').click(); await tick(200);
  assert(asked === 1, '載入後第一次重新展開：先問（' + asked + '）');

  // 剛展開完、沒人動過：改處方後從右邊橫幅重新展開，不問
  $('maintDose').value = '1250'; fire($('maintDose')); await tick(300);
  const bar = doc.querySelector('#resultsPanel > .rp-stale');
  assert(bar && !bar.hidden, '前提：右邊出現尚未更新');
  asked = 0; bar.querySelector('button').click(); await tick(300);
  assert(asked === 0, '給藥表沒手動改過：「展開給藥紀錄並更新」不問');
  assert(doc.querySelector('#doseTable .entry-row:last-of-type .dose-mg').value === '1250', '而且確實重新展開了');
  asked = 0; $('expandDoses').click(); await tick(200);
  assert(asked === 0, '左邊的展開鈕也不問');

  // 用 −／+ 微調過：要問；按取消不動
  const row = doc.querySelector('#doseTable .entry-row:last-of-type');
  row.querySelector('.dose-nudge[data-dir="1"]').click(); await tick(200);
  const before = times();
  answer = false; asked = 0; $('expandDoses').click(); await tick(200);
  assert(asked === 1, '微調過時間：先問');
  assert(times() === before, '按取消：給藥表不動');
  answer = true; asked = 0; $('expandDoses').click(); await tick(200);
  assert(asked === 1 && times() !== before, '按確定：重新展開');

  // 手動改劑量：要問
  asked = 0; const mg = doc.querySelector('#doseTable .entry-row .dose-mg'); mg.value = '900'; fire(mg); await tick();
  $('expandDoses').click(); await tick(200);
  assert(asked === 1, '手動改過劑量：先問');

  // 手動新增一劑：要問
  asked = 0; $('addDoseRow').click(); await tick();
  $('expandDoses').click(); await tick(200);
  assert(asked === 1, '手動新增一劑：先問');

  // AMG
  doc.querySelector('.drug-switch-btn[data-drug="aminoglycoside"]').click(); await tick();
  const g = $('vancoGuardDiscard'); if (g && !$('vancoGuardModal').classList.contains('hide')) g.click(); await tick(200);
  $('loadDemoBtn').click(); await tick(300);
  asked = 0; $('amgExpandDoses').click(); await tick(200);
  asked = 0; $('amgExpandDoses').click(); await tick(200);
  assert(asked === 0, 'AMG：剛展開完再展開，不問');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
