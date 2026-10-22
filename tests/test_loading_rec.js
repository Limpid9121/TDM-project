// test_loading_rec.js — vancomycin Loading 劑量建議（Brandon 2026-10-22）
//   成人：20–25 mg/kg 一次（重症或 ESRD 用 25 mg/kg），肥胖用實際體重，單次上限 3000 mg
//   · 卡片 03 的 loading 區塊顯示建議（#vancoLoadingRec），有「採用」鈕（#vancoLoadingRecApply）
//   · 重症（sepsis／septic shock）、透析（ESRD）、深部／難清除感染 → 25 mg/kg；其他 20 mg/kg；取整到 250 mg、上限 3000
//   · 選「第一筆紀錄就是療程第一劑」（預設勾 loading）時，Loading 劑量自動帶入建議，輸注時間跟著劑量依規則帶入
//   · 使用者自己改過 Loading 劑量就不再自動更新；按「採用」可重新帶入
//
// Run: node test_loading_rec.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom, exports } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const pick = async id => { $(id).checked = true; fire($(id)); await tick(); };
  const chk = async (id, v) => { $(id).checked = v; fire($(id)); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const r250 = exports.roundDoseTo250;
  const rec = (perKg, tbw) => Math.min(r250(perKg * tbw), 3000);
  const recText = () => $('vancoLoadingRec').textContent.replace(/\s+/g, ' ').trim();

  $('clearAllBtn').click(); await tick();
  assert(!!$('vancoLoadingRec') && !!$('vancoLoadingRecApply') && $('vancoLoadingBlock').contains($('vancoLoadingRec')), '有 #vancoLoadingRec 與「採用」鈕，在 loading 區塊裡');
  assert(recText() === '', '沒有體重：不顯示建議');

  // ---------- 建議文字 ----------
  await set('tbw', '65'); await set('severity', '穩定');
  assert(/20.{1}25 mg\/kg/.test(recText()) && /3000/.test(recText()) && /實際體重/.test(recText()), '寫出 20–25 mg/kg、實際體重、上限 3000：' + recText());
  assert(recText().includes(String(rec(20, 65))), '穩定、65 kg：建議 ' + rec(20, 65) + ' mg（20 mg/kg）：' + recText());
  await set('severity', 'septic shock');
  assert(recText().includes(String(rec(25, 65))) && /25 mg\/kg/.test(recText()), 'septic shock：25 mg/kg → ' + rec(25, 65) + ' mg：' + recText());
  await set('severity', '穩定');
  await set('dialysis', 'HD');
  assert(recText().includes(String(rec(25, 65))), '透析（ESRD）：25 mg/kg → ' + rec(25, 65) + ' mg');
  await set('dialysis', 'none');
  await chk('deepInfection', true);
  assert(recText().includes(String(rec(25, 65))), '深部／難清除感染：25 mg/kg');
  await chk('deepInfection', false);
  await set('tbw', '150'); await set('severity', 'sepsis');
  assert(recText().includes('3000') && rec(25, 150) === 3000, '肥胖 150 kg：25 mg/kg ＝ 3750，封頂 3000：' + recText());
  await set('tbw', '45'); await set('severity', '穩定');
  assert(recText().includes(String(rec(20, 45))), '45 kg：' + rec(20, 45) + ' mg');

  // ---------- 選「第一劑」→ 自動帶入 ----------
  await set('tbw', '65');
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === true, '選療程第一劑：勾 loading');
  assert($('loadingDose').value === String(rec(20, 65)), 'Loading 劑量自動帶入建議 ' + rec(20, 65) + '（實際 ' + $('loadingDose').value + '）');
  assert($('loadingInf').value === String(exports.inferInfusionMinutes(rec(20, 65))), '輸注時間跟著劑量依規則帶入：' + $('loadingInf').value);

  // ---------- 條件改變 → 跟著更新（沒自己改過） ----------
  await set('severity', 'septic shock');
  assert($('loadingDose').value === String(rec(25, 65)), '改成 septic shock：Loading 劑量跟著更新為 ' + rec(25, 65));
  await set('tbw', '80');
  assert($('loadingDose').value === String(rec(25, 80)), '體重改 80：跟著更新為 ' + rec(25, 80));

  // ---------- 自己改過 → 不再更新；採用 → 重新帶入 ----------
  await set('loadingDose', '2000');
  await set('tbw', '70');
  assert($('loadingDose').value === '2000', '自己改過 Loading 劑量：體重變動不覆蓋');
  $('vancoLoadingRecApply').click(); await tick();
  assert($('loadingDose').value === String(rec(25, 70)), '按「採用」：帶入建議 ' + rec(25, 70));
  assert($('loadingInf').value === String(exports.inferInfusionMinutes(rec(25, 70))), '採用後輸注時間依規則');
  await set('tbw', '60');
  assert($('loadingDose').value === String(rec(25, 60)), '採用後恢復自動跟隨');

  // ---------- 清空後重來 ----------
  $('clearAllBtn').click(); await tick();
  assert(recText() === '', '清空後沒有體重：建議消失');

  // ---------- 示範病例（程式載入）loading 不被動 ----------
  $('loadDemoBtn').click(); await tick(200);
  assert($('useLoading').checked === false, '示範病例仍然不勾 loading');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
