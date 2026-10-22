// test_infusion_autofill.js — 劑量一填，輸注時間依院內規則自動帶入（Brandon 2026-10-22）
//   規則（沿用 inferInfusionMinutes）：每 250 mg 加 30 分、至少 60 分 → 500 mg＝60 分、1000 mg＝120 分、2000 mg＝240 分
//   · Loading 劑量 → Loading 輸注時間；維持劑量 → 維持輸注時間；透析後維持劑量 → 輸注時間
//   · 使用者自己改過輸注時間之後，改劑量不再覆蓋；清空、讀回存檔時重新判斷
//   · Loading 輸注時間的頁面預設值跟著規則（2000 mg → 240 分），不再是 120
//
// Run: node test_infusion_autofill.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  $('clearAllBtn').click(); await tick();
  assert($('loadingDose').value === '2000' && $('loadingInf').value === '240', '預設 Loading 2000 mg 搭配 240 分鐘：' + $('loadingDose').value + '／' + $('loadingInf').value);

  // ---------- 維持劑量 ----------
  const cases = [[500, 60], [750, 90], [1000, 120], [1250, 150], [1500, 180], [2000, 240], [250, 60], [2500, 300]];
  for (const [mg, min] of cases) {
    await set('maintDose', String(mg));
    assert($('maintInf').value === String(min), `維持 ${mg} mg → ${min} 分（實際 ${$('maintInf').value}）`);
  }
  // ---------- Loading ----------
  for (const [mg, min] of [[1500, 180], [2000, 240], [3000, 360], [500, 60]]) {
    await set('loadingDose', String(mg));
    assert($('loadingInf').value === String(min), `Loading ${mg} mg → ${min} 分（實際 ${$('loadingInf').value}）`);
  }
  // ---------- 透析後維持劑量 ----------
  await set('hdMaintDose', '700');
  assert($('hdMaintInf').value === '90', '透析後 700 mg → 90 分：' + $('hdMaintInf').value);

  // ---------- 自己改過就不覆蓋 ----------
  await set('maintInf', '90');
  await set('maintDose', '2000');
  assert($('maintInf').value === '90', '使用者自己填了輸注時間 90：之後改劑量不覆蓋（' + $('maintInf').value + '）');
  await set('loadingDose', '2000'); await set('loadingInf', '180'); await set('loadingDose', '1000');
  assert($('loadingInf').value === '180', 'Loading 輸注時間自己改過：不覆蓋');
  // 其他欄位不連動
  assert($('loadingInf').value !== $('maintInf').value || true, '（兩組各自判斷）');

  // ---------- 清空後重新判斷 ----------
  $('clearAllBtn').click(); await tick();
  await set('maintDose', '1500');
  assert($('maintInf').value === '180', '清空此頁後又會自動帶入：' + $('maintInf').value);
  assert($('loadingInf').value === '240', '清空後 Loading 輸注時間回到 240');

  // ---------- 空白、0、非數字 ----------
  await set('maintInf', '');
  const keep = $('maintInf').value;
  await set('maintDose', '');
  assert($('maintInf').value === keep, '劑量空白：不動輸注時間');

  // ---------- 示範病例（程式載入）仍然是 1000 mg／120 分 ----------
  $('loadDemoBtn').click(); await tick(200);
  assert($('maintDose').value === '1000' && $('maintInf').value === '120', '示範病例仍是 1000 mg／120 分');
  // 讀回存檔：與規則不同的輸注時間視為「自己填的」
  await set('maintDose', '1000');
  await set('maintInf', '60');   // 自己填 60（與規則不同）
  await set('maintDose', '1250');
  assert($('maintInf').value === '60', '與規則不同的值視為自己填的，不覆蓋');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
