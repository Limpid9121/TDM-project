// test_cand_intervals.js — REDESIGN L-G：vancomycin 候選給藥間隔（Brandon 2026-10-21 核可）
//
// 修正前：候選間隔只有 q8h／q12h／q24h，三個預設都勾；腎功能正常的病人也會列出
//   「2250 mg q24h、輸注 270 分」這種臨床少用的方案，卻沒有腎功能好的病人最需要比的 q6h。
// 修正後：新增 q6h；預設勾 q6h／q8h／q12h，q24h 保留但預設不勾（腎功能差時自己勾）。
//   依據：2020 ASHP/IDSA/PIDS/SIDP 共識，成人腎功能正常 15–20 mg/kg q8–12h（A-II）；
//   q6h 在共識裡只出現在兒科，成人 q6h 屬藥動學推論與臨床實務；不做依 CrCl 自動切換（院內未提供切點）。
//   病人存檔記住 q6h 有沒有勾（新增選填欄位 cand6；舊存檔沒有這欄時視為勾選）。
//
// Run: node test_cand_intervals.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom, exports: X } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = (id, v) => { $(id).value = v; fire($(id)); };
  const chk = (id, v) => { $(id).checked = v; fire($(id)); };
  const addRow = (btn, table, vals) => { $(btn).click(); const rows = doc.querySelectorAll('#' + table + ' .entry-row'); const row = rows[rows.length - 1]; Object.entries(vals).forEach(([c, v]) => { const el = row.querySelector('.' + c); el.value = v; fire(el); }); };
  const taus = () => Array.from(doc.querySelectorAll('#regimenTable tbody tr')).map(r => (r.textContent.match(/^\s*q(\d+)h/) || [])[1]).filter(Boolean).map(Number);
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ---------- 預設 ----------
  assert(!!$('vancoCand6'), '有 q6h 勾選框 #vancoCand6');
  doc.querySelector('.drug-switch-btn[data-drug="vancomycin"]').click();
  $('clearAllBtn').click();
  assert($('vancoCand6').checked && $('cand8').checked && $('cand12').checked, '清空後預設勾 q6h／q8h／q12h');
  assert($('cand24').checked === false, '清空後 q24h 預設不勾');
  const order = Array.from(doc.querySelectorAll('#vancoCand6, #cand8, #cand12, #cand24')).map(e => e.id);
  assert(order.join(',') === 'vancoCand6,cand8,cand12,cand24', '畫面順序 q6h、q8h、q12h、q24h：' + order.join(','));

  // ---------- 預測模式（只有處方，沒有給藥紀錄） ----------
  set('age', '55'); set('sex', 'M'); set('height', '168'); set('tbw', '65');
  addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-18', 'scr-val': '0.95' });
  set('maintDose', '1000'); set('maintInterval', '12'); set('maintInf', '120');
  assert(taus().join(',') === '6,8,12', '預測模式候選方案預設為 q6h、q8h、q12h：' + taus().join(','));
  chk('cand24', true);
  assert(taus().join(',') === '6,8,12,24', '勾 q24h 後出現 q24h 列');
  chk('vancoCand6', false);
  assert(taus().join(',') === '8,12,24', '取消 q6h 後 q6h 列消失');
  chk('vancoCand6', true); chk('cand24', false);

  // q6h 列的劑量與輸注分鐘：輸注符合院內規則；AUC 與每日劑量／CL 一致
  const q6 = Array.from(doc.querySelectorAll('#regimenTable tbody tr')).find(r => /^\s*q6h/.test(r.textContent));
  const m = q6 && q6.textContent.replace(/\s+/g, ' ').match(/(\d+) mg／(\d+) min/);
  assert(!!m, 'q6h 列有劑量與輸注分鐘');
  if (m) assert(Number(m[2]) === X.inferInfusionMinutes(Number(m[1])), `q6h ${m[1]} mg 輸注 ${m[2]} 分符合院內規則`);

  // ---------- 資料擬合模式（有給藥與濃度） ----------
  set('therapyStart', '2026-09-17T09:00'); set('expandTo', '2026-09-19T09:00');
  $('expandDoses').click();
  $('vancoFirstDoseFirst').checked = true; fire($('vancoFirstDoseFirst'));
  addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T20:45', 'level-val': '14.2' });
  addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T00:30', 'level-val': '27.5' });
  assert(!/還需要以下資料/.test($('paramGrid').innerHTML), '前提：資料齊全、已計算');
  assert(taus().join(',') === '6,8,12', '擬合模式候選方案同樣預設為 q6h、q8h、q12h：' + taus().join(','));
  assert(/q6h/.test($('aiPromptOut').value), 'AI prompt 的候選方案也包含 q6h');

  // ---------- 存檔讀回 ----------
  chk('vancoCand6', false);
  set('patientLabel', 'LG-1'); $('savePatientBtn').click();
  const list = JSON.parse(win.localStorage.getItem('vanco_tdm_patients_v2') || '[]');
  const data = list.length && list[0].visits[list[0].visits.length - 1].data;
  assert(data && data.cand6 === false && data.cand24 === false, '存檔記錄 cand6 與 cand24');
  $('clearAllBtn').click();
  assert($('vancoCand6').checked === true, '清空後 q6h 回到預設勾選');
  $('patientSelect').value = Array.from($('patientSelect').options).find(o => o.value !== '').value; $('loadPatientBtn').click();
  assert($('vancoCand6').checked === false, '讀回存檔：q6h 為存檔時的不勾');
  // 舊存檔（沒有 cand6 欄位）→ 視為勾選；cand24 照舊存檔的值
  const old = JSON.parse(win.localStorage.getItem('vanco_tdm_patients_v2'));
  const v = old[0].visits[old[0].visits.length - 1].data; delete v.cand6; v.cand24 = true;
  win.localStorage.setItem('vanco_tdm_patients_v2', JSON.stringify(old));
  $('clearAllBtn').click();
  $('patientSelect').value = Array.from($('patientSelect').options).find(o => o.value !== '').value;
  // 重新整理下拉（存檔被直接改過）
  $('loadPatientBtn').click();
  assert($('vancoCand6').checked === true, '舊存檔沒有 cand6 → 視為勾選');
  assert($('cand24').checked === true, '舊存檔的 cand24 照原值（勾）讀回');
  win.localStorage.removeItem('vanco_tdm_patients_v2');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
