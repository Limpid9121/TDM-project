// test_first_dose_kind.js — REDESIGN L-B：「第一筆給藥是不是療程第一劑」改成必答
//
// 修正前：assumeSteadyState／amgAssumeSteadyState 是預設不勾的 checkbox，穩態病人只登錄
// 最後幾劑又漏勾時，擬合 CL 低估約 24%、AUC 高估約 32%。修正後：給藥表有紀錄時必須在
// 二選一 radio 選一個，沒選就擋下；checkbox 保留但隱藏，是引擎唯一讀取的來源。
//
// Run: node test_first_dose_kind.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
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
  const pick = id => { $(id).checked = true; fire($(id)); };
  const switchTo = (drug, key) => {
    doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click();
    const d = $(key + 'GuardDiscard');
    if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click();
  };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const MISSING = /第一筆給藥是不是本療程第一劑/;

  // ================= Vancomycin =================
  switchTo('vancomycin', 'vanco');
  $('clearAllBtn').click();
  assert(!$('vancoFirstDoseFirst').checked && !$('vancoFirstDoseSteady').checked, 'vanco: 清空後兩個 radio 都沒選');
  assert($('assumeSteadyState').checked === false, 'vanco: 清空後隱藏的 checkbox 為未勾');
  set('age', '67'); set('sex', 'F'); set('height', '158'); set('tbw', '72');
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-16', 'scr-val': '1.2' });
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.4' });
  set('maintDose', '1000'); set('maintInterval', '12'); set('maintInf', '120');

  // 沒有給藥紀錄（計畫處方預測模式）不要求
  assert(doc.querySelectorAll('#doseTable .entry-row').length === 0, 'vanco: 目前沒有給藥紀錄');
  assert(!MISSING.test($('paramGrid').innerHTML), 'vanco: 沒有給藥紀錄時不要求這題');
  assert(doc.querySelectorAll('#regimenTable tbody tr').length > 0, 'vanco: 預測模式照常出候選方案');

  set('therapyStart', '2026-09-17T09:00'); set('expandTo', '2026-09-19T09:00');
  $('expandDoses').click();
  assert(doc.querySelectorAll('#doseTable .entry-row').length > 0, 'vanco: 已展開給藥紀錄');
  addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T20:45', 'level-val': '14.2' });
  addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T00:30', 'level-val': '27.5' });
  assert(MISSING.test($('paramGrid').innerHTML), 'vanco: 有給藥紀錄但沒選 → 擋下並列出「第一筆給藥是不是本療程第一劑」');
  assert(doc.querySelectorAll('#regimenTable tbody tr').length === 0, 'vanco: 擋下時候選方案表為空');

  pick('vancoFirstDoseSteady');
  assert($('assumeSteadyState').checked === true, 'vanco: 選「已達穩態」→ 隱藏 checkbox 為勾');
  assert(!MISSING.test($('paramGrid').innerHTML), 'vanco: 選了之後恢復計算');
  const gridSteady = $('paramGrid').innerHTML;
  const monitorSteady = $('monitorGrid').innerHTML;

  // 與直接勾 checkbox（radio 選 first 以通過守門）的結果相同
  pick('vancoFirstDoseFirst');
  assert($('assumeSteadyState').checked === false, 'vanco: 改選「第一劑」→ checkbox 取消勾選');
  const gridFirst = $('paramGrid').innerHTML;
  assert(gridFirst !== gridSteady, 'vanco: first 與 steady 的擬合結果不同（radio 真的影響計算）');
  $('assumeSteadyState').checked = true; fire($('assumeSteadyState'));
  assert($('paramGrid').innerHTML === gridSteady && $('monitorGrid').innerHTML === monitorSteady, 'vanco: 選 steady 的結果與直接勾 checkbox 完全相同');

  // 存檔讀回：勾＝steady，沒勾＝first
  pick('vancoFirstDoseSteady');
  set('patientLabel', 'LB-STEADY'); $('savePatientBtn').click();
  $('clearAllBtn').click();
  assert(!$('vancoFirstDoseFirst').checked && !$('vancoFirstDoseSteady').checked, 'vanco: 清空後 radio 回到未選');
  const optS = Array.from($('patientSelect').options).find(o => o.value !== '');
  $('patientSelect').value = optS.value; $('loadPatientBtn').click();
  assert($('vancoFirstDoseSteady').checked && !$('vancoFirstDoseFirst').checked, 'vanco: 讀回已勾穩態的存檔 → radio 為 steady');
  assert($('assumeSteadyState').checked === true, 'vanco: 讀回後 checkbox 仍為勾');
  $('clearAllBtn').click();
  set('age', '67'); set('sex', 'F'); set('height', '158'); set('tbw', '72');
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-16', 'scr-val': '1.2' });
  set('maintDose', '1000'); set('maintInterval', '12'); set('maintInf', '120');
  set('therapyStart', '2026-09-17T09:00'); set('expandTo', '2026-09-19T09:00');
  $('expandDoses').click();
  pick('vancoFirstDoseFirst');
  set('patientLabel', 'LB-FIRST'); $('savePatientBtn').click();
  $('clearAllBtn').click();
  $('patientSelect').value = Array.from($('patientSelect').options).find(o => o.textContent.includes('LB-FIRST')).value; $('loadPatientBtn').click();
  assert($('vancoFirstDoseFirst').checked && !$('vancoFirstDoseSteady').checked, 'vanco: 讀回沒勾穩態的存檔 → radio 為 first（等於維持舊行為）');
  win.localStorage.removeItem('vanco_tdm_patients_v2');

  // HD 路徑不要求
  set('dialysis', 'HD');
  assert(!MISSING.test($('paramGrid').innerHTML), 'vanco HD: 不要求這題');
  set('dialysis', 'none');

  // ================= Aminoglycoside =================
  switchTo('aminoglycoside', 'vanco');
  $('clearAllBtn').click();
  assert(!$('amgFirstDoseFirst').checked && !$('amgFirstDoseSteady').checked, 'amg: 清空後兩個 radio 都沒選');
  set('amgAge', '58'); set('amgSex', 'M'); set('amgHeight', '172'); set('amgTbw', '80');
  addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.0' });
  set('amgDrug', 'gentamicin'); set('amgStrategy', 'conventional'); set('amgIndication', 'severe');
  set('amgMaintDose', '120'); set('amgMaintInf', '30'); set('amgMaintInterval', '8');
  assert(!MISSING.test($('amgParamGrid').innerHTML), 'amg: 沒有給藥紀錄時不要求這題');
  set('amgTherapyStart', '2026-09-17T09:00'); set('amgExpandTo', '2026-09-19T09:00');
  $('amgExpandDoses').click();
  addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T02:00', 'level-val': '6.8' });
  addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T08:45', 'level-val': '1.4' });
  assert(MISSING.test($('amgParamGrid').innerHTML), 'amg: 有給藥紀錄但沒選 → 擋下');
  assert(doc.querySelectorAll('#amgRegimenTable tbody tr').length === 0, 'amg: 擋下時候選方案表為空');
  pick('amgFirstDoseSteady');
  assert($('amgAssumeSteadyState').checked === true, 'amg: 選「已達穩態」→ checkbox 為勾');
  assert(!MISSING.test($('amgParamGrid').innerHTML), 'amg: 選了之後恢復計算');
  assert($('amgSsBasis').textContent.trim() !== '', 'amg: 選 steady 時顯示虛擬劑次說明（引擎確實套用穩態假設）');
  pick('amgFirstDoseFirst');
  assert($('amgAssumeSteadyState').checked === false, 'amg: 改選「第一劑」→ checkbox 取消勾選');
  assert($('amgSsBasis').textContent === '', 'amg: 選 first 時沒有穩態假設說明');

  // TIW 排程：這一列被隱藏，不要求（radio 清成未選也不擋）
  $('amgFirstDoseFirst').checked = false; $('amgFirstDoseSteady').checked = false;
  set('amgScheduleType', 'tiw');
  assert($('amgSteadyStateRow').style.display === 'none', 'amg: TIW 時該列隱藏');
  assert(!MISSING.test($('amgParamGrid').innerHTML), 'amg: TIW 時不要求這題');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
