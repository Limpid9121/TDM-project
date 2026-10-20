// test_infusion_rule.js — REDESIGN L-D：vancomycin 每 500 mg 至少輸注 1 小時（院內規則）
//
// 修正前：inferInfusionMinutes() 以 1000／1500 mg 為界給 60／90／120 分；1000 mg 只要 60 分，
// 與院內規則（每 500 mg 至少 1 小時，即 1000 mg 至少 120 分）不符。
// 修正後：每 250 mg 30 分鐘、向上取整、最少 60 分。另外，實際給藥紀錄裡若有一劑比這個規則
// 快，旗標區出現 warn（只提示，計算照輸入的實際輸注時間，不改）。
//
// Run: node test_infusion_rule.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom, exports: X } = await loadHarness();
  const { window: win } = dom;
  const doc = win.document;
  win.confirm = () => true;
  win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = (id, v) => { const el = $(id); el.value = v; fire(el); };
  const addRow = (btn, table, vals) => {
    $(btn).click();
    const rows = doc.querySelectorAll('#' + table + ' .entry-row');
    const row = rows[rows.length - 1];
    Object.entries(vals).forEach(([cls, v]) => { const el = row.querySelector('.' + cls); el.value = v; fire(el); });
  };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ---------- 對照表 ----------
  const table = { 250: 60, 500: 60, 750: 90, 1000: 120, 1250: 150, 1500: 180, 2000: 240, 2500: 300, 3000: 360 };
  Object.entries(table).forEach(([mg, min]) => {
    assert(X.inferInfusionMinutes(Number(mg)) === min, `${mg} mg → ${min} 分（得到 ${X.inferInfusionMinutes(Number(mg))}）`);
  });
  assert(X.inferInfusionMinutes(1250.0000000001) === 150, '浮點誤差：1250.0000000001 mg 仍為 150 分，不會跳到 180');
  assert(X.inferInfusionMinutes(1000.0000000001) === 120, '浮點誤差：1000.0000000001 mg 仍為 120 分');
  assert(X.inferInfusionMinutes(100) === 60, '小於 250 mg 最少 60 分');
  assert(X.inferInfusionMinutes(1251) === 180, '1251 mg 向上取整 → 180 分');

  const RULE = /快於院內規則（每 500 mg 至少 1 小時）/;

  // ---------- 非 HD：60 分輸注 1000 mg 出現提示 ----------
  doc.querySelector('.drug-switch-btn[data-drug="vancomycin"]').click();
  $('clearAllBtn').click();
  set('age', '67'); set('sex', 'F'); set('height', '158'); set('tbw', '72');
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.2' });
  set('maintDose', '1000'); set('maintInterval', '12'); set('maintInf', '60');
  set('therapyStart', '2026-09-17T09:00'); set('expandTo', '2026-09-19T09:00');
  $('expandDoses').click();
  $('vancoFirstDoseFirst').checked = true; fire($('vancoFirstDoseFirst'));
  const n = doc.querySelectorAll('#doseTable .entry-row').length;
  assert(n >= 4, `前提：展開了 ${n} 劑`);
  let flags = $('flagList').innerHTML;
  assert(RULE.test(flags), 'vanco: 1000 mg 輸注 60 分 → 旗標區出現「快於院內規則」');
  assert(/1000 mg 輸注 60 分鐘/.test(flags), 'vanco: 提示寫出劑量與實際輸注分鐘');
  assert(/第 1[–、-]/.test(flags) || /第 1 劑/.test(flags), 'vanco: 提示寫出第幾劑');
  assert((flags.match(/快於院內規則/g) || []).length === 1, 'vanco: 相同劑量與輸注的多劑合併成一則，不逐劑洗版');
  assert(/flag-item warn"><span class="dot"><\/span><span>第 [^<]*快於院內規則/.test(flags), 'vanco: 這則是 warn 等級');

  // 計算照輸入的實際輸注時間：分鐘數改 120 後提示消失
  doc.querySelectorAll('#doseTable .entry-row .dose-inf').forEach(el => { el.value = '120'; fire(el); });
  assert(!RULE.test($('flagList').innerHTML), 'vanco: 改成 120 分後提示消失');

  // 只有其中一劑太快：只提示那一劑
  const infs = doc.querySelectorAll('#doseTable .entry-row .dose-inf');
  infs[2].value = '90'; fire(infs[2]);
  flags = $('flagList').innerHTML;
  assert(/第 3 劑 1000 mg 輸注 90 分鐘/.test(flags), 'vanco: 只有第 3 劑 90 分 → 提示「第 3 劑 1000 mg 輸注 90 分鐘」');

  // ---------- 候選方案的輸注分鐘 ----------
  const rows = Array.from(doc.querySelectorAll('#regimenTable tbody tr')).map(r => r.textContent.replace(/\s+/g, ' '));
  const candMatch = rows.map(t => t.match(/(\d+) mg／(\d+) min輸注/)).filter(Boolean);
  assert(candMatch.length > 0, '前提：候選方案表有列');
  candMatch.forEach(m => assert(Number(m[2]) === X.inferInfusionMinutes(Number(m[1])), `候選方案 ${m[1]} mg 輸注 ${m[2]} 分符合規則`));

  // ---------- HD 路徑同樣檢查 ----------
  $('clearAllBtn').click();
  set('age', '67'); set('sex', 'F'); set('height', '158'); set('tbw', '72');
  set('dialysis', 'HD');
  set('therapyStart', '2026-09-14T00:00'); set('expandTo', '2026-09-19T11:00');
  $('hdGenerateSessionsBtn').click();
  set('hdMaintDose', '750'); set('hdFixedTime', '21:00'); set('hdMaintInf', '60');
  $('expandDosesHD').click();
  assert(doc.querySelectorAll('#doseTable .entry-row').length > 0, '前提：HD 展開了給藥紀錄');
  assert(RULE.test($('flagList').innerHTML), 'HD: 750 mg 輸注 60 分（規則要 90 分）→ 出現提示');
  set('hdMaintInf', '90'); $('expandDosesHD').click();
  assert(!RULE.test($('flagList').innerHTML), 'HD: 750 mg 輸注 90 分 → 沒有提示');

  // ---------- 示範病例本身不違規 ----------
  win.localStorage.clear();
  set('dialysis', 'none');
  $('clearAllBtn').click();
  const demo = doc.querySelector('[data-req-demo="vancomycin"]');
  assert(!!demo, '前提：空白頁有「載入示範病例」按鈕');
  if (demo) {
    demo.click();
    assert(doc.querySelectorAll('#doseTable .entry-row').length > 0, '前提：示範病例有給藥紀錄');
    assert(!RULE.test($('flagList').innerHTML), '示範病例的給藥紀錄不違反輸注規則（示範資料已改 120 分）');
    assert($('maintInf').value === '120', '示範病例維持劑量輸注時間為 120 分');
  }

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
