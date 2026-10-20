// test_l_f_minor.js — REDESIGN L-F：小修
//
//   L-10  監測建議的 SCr 頻率改看趨勢，不再用「SCr <1.2」判斷
//   L-11  roundDoseTo250／roundDoseAmino 加 1e-9，避開浮點誤差
//   L-13  共用電腦提醒與「清除本機所有病人資料」按鈕；匯出按鈕加 title
//   L-14  最新 SCr 比最早一筆濃度晚超過 48 小時 → 旗標區加一則說明
//
// Run: node test_l_f_minor.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom, exports: X } = await loadHarness();
  const { window: win } = dom;
  const doc = win.document;
  let confirmMsg = null, confirmAnswer = true;
  win.confirm = (m) => { confirmMsg = m; return confirmAnswer; };
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
  const switchTo = (drug, key) => {
    doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click();
    const d = $(key + 'GuardDiscard');
    if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click();
  };
  const text = id => $(id).textContent.replace(/\s+/g, ' ');
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ================= L-11 進位浮點 =================
  assert(X.roundDoseTo250(1124.9999999999998) === 1250, 'roundDoseTo250(1124.9999999999998) → 1250（原本因浮點誤差變 1000）');
  assert(X.roundDoseTo250(1125) === 1250, 'roundDoseTo250(1125) → 1250');
  assert(X.roundDoseTo250(1124) === 1000, 'roundDoseTo250(1124) → 1000（一般情況不變）');
  assert(X.roundDoseTo250(100) === 250, 'roundDoseTo250 最少 250');
  assert(X.roundDoseAmino(124.99999999999999) === 130, 'roundDoseAmino(124.99999999999999) → 130（原本變 120）');
  assert(X.roundDoseAmino(124) === 120 && X.roundDoseAmino(126) === 130, 'roundDoseAmino 一般情況不變');
  assert(X.roundDoseAmino(5) === 20, 'roundDoseAmino 最少 20');

  // ================= L-10 SCr 監測頻率（vanco） =================
  const vancoSetup = scrs => {
    switchTo('vancomycin', 'vanco');
    $('clearAllBtn').click();
    set('age', '67'); set('sex', 'F'); set('height', '158'); set('tbw', '72');
    scrs.forEach(([d, v]) => addRow('addScrRow', 'scrTable', { 'scr-date': d, 'scr-val': String(v) }));
    set('maintDose', '1000'); set('maintInterval', '12'); set('maintInf', '120');
    set('therapyStart', '2026-09-17T09:00'); set('expandTo', '2026-09-19T09:00');
    $('expandDoses').click();
    $('vancoFirstDoseFirst').checked = true; fire($('vancoFirstDoseFirst'));
    addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T20:45', 'level-val': '14.2' });
    addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T00:30', 'level-val': '27.5' });
  };
  vancoSetup([['2026-09-17', 1.0], ['2026-09-19', 1.5]]);
  let m = text('monitorGrid');
  assert(/SCr：每 1–2 天（腎功能變動中）/.test(m), 'vanco: SCr 1.0→1.5（>1.3 倍）→「每 1–2 天（腎功能變動中）」');
  vancoSetup([['2026-09-17', 1.5], ['2026-09-19', 1.0]]);
  assert(/每 1–2 天（腎功能變動中）/.test(text('monitorGrid')), 'vanco: SCr 1.5→1.0（<0.7 倍）→ 每 1–2 天');
  vancoSetup([['2026-09-17', 1.8], ['2026-09-19', 1.85]]);
  m = text('monitorGrid');
  assert(/SCr：每 2–3 天至每週/.test(m) && !/變動中/.test(m), 'vanco: SCr 穩定在 1.8 → 每 2–3 天至每週（舊版因 ≥1.2 一律說不穩定）');
  vancoSetup([['2026-09-17', 1.0], ['2026-09-19', 1.2]]);
  assert(/SCr：每 2–3 天至每週/.test(text('monitorGrid')), 'vanco: SCr 1.0→1.2（1.2 倍，未達 1.3）→ 每 2–3 天至每週');
  vancoSetup([['2026-09-18', 1.0]]);
  m = text('monitorGrid');
  assert(/每 2–3 天至每週（僅一筆 SCr，無法判斷趨勢）/.test(m), 'vanco: 只有一筆 SCr → 加註「（僅一筆 SCr，無法判斷趨勢）」');

  // ================= L-14 SCr 日期說明（vanco） =================
  vancoSetup([['2026-09-16', 1.2], ['2026-09-22', 1.2]]);
  let flags = text('flagList');
  assert(/族群先驗用的是最新 SCr（2026-09-22）；較早的濃度抽血時腎功能可能不同/.test(flags), 'vanco: 最新 SCr 比最早濃度晚超過 48 小時 → 旗標說明');
  assert(/flag-item "><span class="dot"><\/span><span>族群先驗用的是最新 SCr/.test($('flagList').innerHTML), 'vanco: 這則是 ok 等級（沒有 warn／danger class）');
  vancoSetup([['2026-09-16', 1.2], ['2026-09-19', 1.2]]);
  assert(!/族群先驗用的是最新 SCr/.test(text('flagList')), 'vanco: 最新 SCr 距最早濃度 ≤48 小時 → 沒有這則');
  // 沒有濃度資料時不顯示
  switchTo('vancomycin', 'vanco');
  doc.querySelectorAll('#levelTable .row-del').forEach(b => b.click());
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-30', 'scr-val': '1.2' });
  assert(doc.querySelectorAll('#levelTable .entry-row').length === 0, '前提：已刪光濃度');
  assert(!/族群先驗用的是最新 SCr/.test(text('flagList')), 'vanco: 沒有濃度資料 → 沒有這則');

  // ================= AMG：L-10、L-14 =================
  const amgSetup = scrs => {
    switchTo('aminoglycoside', 'vanco');
    $('clearAllBtn').click();
    set('amgAge', '58'); set('amgSex', 'M'); set('amgHeight', '172'); set('amgTbw', '80');
    scrs.forEach(([d, v]) => addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': d, 'scr-val': String(v) }));
    set('amgDrug', 'gentamicin'); set('amgStrategy', 'conventional'); set('amgIndication', 'severe');
    set('amgMaintDose', '120'); set('amgMaintInf', '30'); set('amgMaintInterval', '8');
  };
  amgSetup([['2026-09-17', 1.0], ['2026-09-19', 1.5]]);
  assert(/每 1–2 天（腎功能變動中）/.test(text('amgMonitorGrid')), 'amg（預測模式）: SCr 上升 → 每 1–2 天（腎功能變動中）');
  amgSetup([['2026-09-17', 1.8], ['2026-09-19', 1.8]]);
  assert(/SCr／BUN：每 2–3 天至每週/.test(text('amgMonitorGrid')) && !/變動中/.test(text('amgMonitorGrid')), 'amg: SCr 穩定 → 每 2–3 天至每週');
  amgSetup([['2026-09-18', 1.0]]);
  assert(/（僅一筆 SCr，無法判斷趨勢）/.test(text('amgMonitorGrid')), 'amg: 一筆 SCr → 加註無法判斷趨勢');
  // 有給藥與濃度的資料擬合路徑
  amgSetup([['2026-09-16', 1.0], ['2026-09-22', 1.0]]);
  set('amgTherapyStart', '2026-09-17T09:00'); set('amgExpandTo', '2026-09-19T09:00');
  $('amgExpandDoses').click();
  $('amgFirstDoseFirst').checked = true; fire($('amgFirstDoseFirst'));
  addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T02:00', 'level-val': '6.8' });
  addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T08:45', 'level-val': '1.4' });
  assert(/族群先驗用的是最新 SCr（2026-09-22）/.test(text('amgFlagList')), 'amg: 最新 SCr 比最早濃度晚超過 48 小時 → 旗標說明');
  assert(/SCr／BUN：每 2–3 天至每週/.test(text('amgMonitorGrid')), 'amg: 擬合路徑的 SCr 頻率同樣依趨勢');

  // ================= L-13 共用電腦提醒與清除 =================
  assert(!!$('tdmClearAllLocal'), '有 #tdmClearAllLocal 按鈕');
  assert(/清除本機所有病人資料/.test($('tdmClearAllLocal').textContent), '按鈕文字「清除本機所有病人資料」');
  assert(/病人資料以病歷號存在這台電腦的瀏覽器裡。共用電腦請用完清除/.test(doc.body.innerHTML), '頁面有共用電腦提醒文字');
  ['exportPatientsBtn', 'amgExportPatientsBtn', 'azlExportPatientsBtn', 'aedExportPatientsBtn'].forEach(id => {
    assert(/匯出檔含病歷號/.test($(id).getAttribute('title') || ''), id + ' 有 title「匯出檔含病歷號」');
  });
  const mk = (n) => JSON.stringify(Array.from({ length: n }, (_, i) => ({ id: 'x' + i, label: 'L' + i, schemaVersion: 2, visits: [] })));
  const KEYS = { vanco: 'vanco_tdm_patients_v2', amg: 'amino_tdm_patients_v2', azl: 'azole_tdm_patients_v2', aed: 'aed_tdm_patients_v2' };
  win.localStorage.setItem(KEYS.vanco, mk(2)); win.localStorage.setItem(KEYS.amg, mk(1));
  win.localStorage.setItem(KEYS.azl, mk(3)); win.localStorage.setItem(KEYS.aed, mk(0));
  win.localStorage.setItem('tdm_ui_pref_test', 'keep');
  // 先按取消：什麼都不動
  confirmAnswer = false; confirmMsg = null;
  $('tdmClearAllLocal').click();
  assert(!!confirmMsg, '按下去先跳 confirm');
  assert(/Vancomycin[^\d]*2/.test(confirmMsg) && /Aminoglycoside[^\d]*1/.test(confirmMsg) && /Azole[^\d]*3/.test(confirmMsg) && /抗癲癇[^\d]*0/.test(confirmMsg), 'confirm 列出四個模組各有幾位病人：' + confirmMsg);
  assert(Object.values(KEYS).every(k => win.localStorage.getItem(k) !== null), '按取消 → 四個 key 都還在');
  // 確認：清掉四個病人 key，tdm_ui_ 設定不動
  confirmAnswer = true;
  $('tdmClearAllLocal').click();
  assert(Object.values(KEYS).every(k => win.localStorage.getItem(k) === null), '確認後四個病人紀錄 key 都被清掉');
  assert(win.localStorage.getItem('tdm_ui_pref_test') === 'keep', 'tdm_ui_ 設定不動');
  assert(Array.from($('patientSelect').options).length === 1, '清掉後 Vancomycin 已存病人下拉只剩預設項目');
  // 四個模組都沒有資料時
  confirmMsg = null;
  $('tdmClearAllLocal').click();
  assert(confirmMsg === null || /沒有/.test(confirmMsg), '沒有任何資料時不跳「確定清除」的 confirm');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
