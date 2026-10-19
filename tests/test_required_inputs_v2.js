// test_required_inputs_v2.js — REDESIGN L-A：SCr、性別、成人年齡為必填
//
// 修正前：沒填 SCr 時 vancomycin／AMG 以 1.0 mg/dL 照算；性別預設「男」且非必填；
// 沒有年齡下限。修正後：三項任一缺失（或年齡 <18）右側顯示「還需要以下資料」，不給候選方案。
//
// Run: node test_required_inputs_v2.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

function setAndFire(win, doc, id, value) {
  const el = doc.getElementById(id);
  if (el.type === 'checkbox') el.checked = value; else el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}
async function main() {
  const { dom } = await loadHarness();
  const { window: win } = dom;
  const doc = win.document;
  win.confirm = () => true;
  win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const addScrRow = (btn, table, date, val) => {
    $(btn).click();
    const rows = doc.querySelectorAll('#' + table + ' .entry-row');
    const row = rows[rows.length - 1];
    row.querySelector('.scr-date').value = date; fire(row.querySelector('.scr-date'));
    row.querySelector('.scr-val').value = val; fire(row.querySelector('.scr-val'));
  };
  // 切換模組：若前一個模組有未存檔修改會跳確認視窗，按「不儲存，繼續」
  const switchTo = (drug, key) => {
    doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click();
    const d = $(key + 'GuardDiscard');
    if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click();
  };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ================= Vancomycin =================
  switchTo('vancomycin', 'vanco');
  $('clearAllBtn').click();
  assert($('sex').value === '', 'vanco: 清空後性別為空白（不是預設男）');
  setAndFire(win, doc, 'age', '60'); setAndFire(win, doc, 'height', '170'); setAndFire(win, doc, 'tbw', '70');
  setAndFire(win, doc, 'maintDose', '1000'); setAndFire(win, doc, 'maintInterval', '12'); setAndFire(win, doc, 'maintInf', '120');

  let grid = $('paramGrid').innerHTML;
  assert(/還需要以下資料/.test(grid), 'vanco: 沒填性別與 SCr → 顯示「還需要以下資料」');
  assert(/性別/.test(grid), 'vanco: 缺資料清單列出性別');
  assert(/SCr（至少一筆）/.test(grid), 'vanco: 缺資料清單列出 SCr（至少一筆）');
  assert(doc.querySelectorAll('#regimenTable tbody tr').length === 0, 'vanco: 缺資料時候選方案表為空');
  assert(!/暫以 1\.0 mg\/dL/.test($('flagList').innerHTML), 'vanco: 不再出現「暫以 1.0 mg/dL 估算」');

  setAndFire(win, doc, 'sex', 'F');
  grid = $('paramGrid').innerHTML;
  assert(/還需要以下資料/.test(grid) && !/<li[^>]*>性別/.test(grid) && /SCr（至少一筆）/.test(grid), 'vanco: 補性別後只剩 SCr 缺');

  addScrRow('addScrRow', 'scrTable', '2026-09-20', '1.0');
  assert(!/還需要以下資料/.test($('paramGrid').innerHTML), 'vanco: 補齊性別與 SCr 後恢復計算');
  assert(doc.querySelectorAll('#regimenTable tbody tr').length > 0, 'vanco: 補齊後候選方案表有列');

  setAndFire(win, doc, 'age', '17');
  grid = $('paramGrid').innerHTML;
  assert(/還需要以下資料/.test(grid) && /18 歲以上/.test(grid), 'vanco: 年齡 17 → 缺資料，提示本工具適用 18 歲以上');
  assert(doc.querySelectorAll('#regimenTable tbody tr').length === 0, 'vanco: 年齡 17 時候選方案表為空');
  setAndFire(win, doc, 'age', '18');
  assert(!/還需要以下資料/.test($('paramGrid').innerHTML), 'vanco: 年齡 18 可計算');

  // HD 路徑不要求 SCr
  setAndFire(win, doc, 'dialysis', 'HD');
  assert(!/SCr（至少一筆）/.test($('paramGrid').innerHTML), 'vanco HD: 不要求 SCr');
  setAndFire(win, doc, 'dialysis', 'none');

  // 存檔讀回：性別 F 存起來、清空後讀回仍為女（舊存檔都有存性別，讀回不受影響）
  setAndFire(win, doc, 'sex', 'F');
  setAndFire(win, doc, 'patientLabel', 'L-A-SEX');
  $('savePatientBtn').click();
  $('clearAllBtn').click();
  assert($('sex').value === '', 'vanco: 清空後性別回到空白');
  const opt = Array.from($('patientSelect').options).find(o => o.value !== '');
  $('patientSelect').value = opt.value;
  $('loadPatientBtn').click();
  assert($('sex').value === 'F', 'vanco: 存檔讀回後性別仍為女');
  win.localStorage.removeItem('vanco_tdm_patients_v2');

  // ================= Aminoglycoside =================
  switchTo('aminoglycoside', 'vanco');
  $('clearAllBtn').click();
  assert($('amgSex').value === '', 'amg: 清空後性別為空白');
  setAndFire(win, doc, 'amgAge', '60'); setAndFire(win, doc, 'amgHeight', '170'); setAndFire(win, doc, 'amgTbw', '70');
  const ind = $('amgIndication');
  const firstReal = Array.from(ind.options).find(o => o.value !== '');
  setAndFire(win, doc, 'amgIndication', firstReal.value);
  setAndFire(win, doc, 'amgMaintDose', '400'); setAndFire(win, doc, 'amgMaintInf', '30'); setAndFire(win, doc, 'amgMaintInterval', '24');

  grid = $('amgParamGrid').innerHTML;
  assert(/還需要以下資料/.test(grid) && /性別/.test(grid) && /SCr（至少一筆）/.test(grid), 'amg: 沒填性別與 SCr → 缺資料清單列出兩項');
  assert(doc.querySelectorAll('#amgRegimenTable tbody tr').length === 0, 'amg: 缺資料時候選方案表為空');
  assert(!/暫以 1\.0 mg\/dL/.test($('amgFlagList').innerHTML), 'amg: 不再出現「暫以 1.0 mg/dL 估算」');

  setAndFire(win, doc, 'amgSex', 'M');
  addScrRow('amgAddScrRow', 'amgScrTable', '2026-09-20', '1.0');
  assert(!/還需要以下資料/.test($('amgParamGrid').innerHTML), 'amg: 補齊後恢復計算');
  assert(doc.querySelectorAll('#amgRegimenTable tbody tr').length > 0, 'amg: 補齊後候選方案表有列');
  setAndFire(win, doc, 'amgAge', '17');
  grid = $('amgParamGrid').innerHTML;
  assert(/還需要以下資料/.test(grid) && /18 歲以上/.test(grid), 'amg: 年齡 17 → 缺資料');
  setAndFire(win, doc, 'amgAge', '60');

  // ================= Azole / AED：性別空白、年齡 <18 =================
  switchTo('azole', 'amg');
  $('clearAllBtn').click();
  assert(doc.getElementById('drug-azole').classList.contains('active'), 'azole 模組已切換');
  assert($('azlSex').value === '', 'azole: 清空後性別為空白');
  setAndFire(win, doc, 'azlAge', '15');
  assert(/成人為準/.test($('azlFlagList').innerHTML), 'azole: 年齡 <18 在旗標區出現成人警示');
  setAndFire(win, doc, 'azlAge', '40');
  assert(!/成人為準/.test($('azlFlagList').innerHTML), 'azole: 年齡 ≥18 沒有成人警示');

  switchTo('aed', 'azl');
  $('clearAllBtn').click();
  assert(doc.getElementById('drug-aed').classList.contains('active'), 'aed 模組已切換');
  assert($('aedSex').value === '', 'aed: 清空後性別為空白');
  setAndFire(win, doc, 'aedAge', '70'); setAndFire(win, doc, 'aedTbw', '60'); setAndFire(win, doc, 'aedHeight', '165'); setAndFire(win, doc, 'aedScr', '1.0');
  assert($('aedRenalDisplay').textContent === '', 'aed: 性別空白 → CrCl 不計算（不當作男性）');
  setAndFire(win, doc, 'aedSex', 'M');
  assert(/估算 CrCl/.test($('aedRenalDisplay').textContent), 'aed: 選了性別後 CrCl 才計算');
  setAndFire(win, doc, 'aedAge', '12');
  assert(/成人為準/.test($('aedFlagList').innerHTML), 'aed: 年齡 <18 在旗標區出現成人警示');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
