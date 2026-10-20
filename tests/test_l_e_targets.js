// test_l_e_targets.js — REDESIGN L-E：依院內 protocol 校正目標與族群參數
//
//   E1  Azole 目標：院內 protocol 為判定依據，UpToDate 數值只顯示（ref 欄位）
//   E2  分布體積的體重：AMG 用體重選擇後的體重（IBW／AdjBW）；vancomycin 極度肥胖用 0.52 L/kg
//   E3  ODD peak 以輸注結束後 30 分鐘比較（計算不改，只改顯示）
//
// Run: node test_l_e_targets.js

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
  const addScr = (btn, table) => {
    $(btn).click();
    const rows = doc.querySelectorAll('#' + table + ' .entry-row');
    const row = rows[rows.length - 1];
    row.querySelector('.scr-date').value = '2026-09-18'; fire(row.querySelector('.scr-date'));
    row.querySelector('.scr-val').value = '1.0'; fire(row.querySelector('.scr-val'));
  };
  const switchTo = (drug, key) => {
    doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click();
    const d = $(key + 'GuardDiscard');
    if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click();
  };
  const cellValue = (gridId, labelStart) => {
    const cell = Array.from($(gridId).querySelectorAll('.param-cell')).find(c => c.querySelector('.label').textContent.startsWith(labelStart));
    return cell ? parseFloat(cell.querySelector('.value').textContent) : NaN;
  };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ================= E1 Azole =================
  const T = (drug, ind, v) => X.checkAzoleTrough(drug, ind, v);
  const has = (r, re) => r.notes.some(n => re.test(n)) || re.test(r.tagText);

  // voriconazole：院內 1.0–6.0，5 以上 note，UpToDate 5.5 只加註
  assert(T('voriconazole', 'treatment', 0.9).tag === 'warn', 'vori 治療 0.9 → warn');
  assert(T('voriconazole', 'prophylaxis', 0.9).tag === 'warn', 'vori 預防 0.9 → warn（院內預防下限 1.0，UpToDate 為 0.5）');
  assert(T('voriconazole', 'prophylaxis', 1.0).tag === 'ok', 'vori 預防 1.0 → ok');
  assert(T('voriconazole', 'treatment', 4.9).notes.length === 0 && T('voriconazole', 'treatment', 4.9).tag === 'ok', 'vori 4.9 → ok 且沒有 note');
  let r = T('voriconazole', 'treatment', 5.0);
  assert(r.tag === 'ok' && !r.highFlag && has(r, /接近上限（5 以上毒性風險開始升高），主動評估/), 'vori 5.0 → note「接近上限（5 以上…），主動評估」，不 warn');
  assert(!has(r, /UpToDate 上限為 5\.5/), 'vori 5.0 的 note 沒有 UpToDate 加註');
  r = T('voriconazole', 'treatment', 5.5);
  assert(r.tag === 'ok' && has(r, /接近上限/) && !has(r, /UpToDate 上限/), 'vori 5.5（等於 UpToDate 上限，沒超過）→ note，無 UpToDate 加註');
  r = T('voriconazole', 'treatment', 5.8);
  assert(r.tag === 'ok' && !r.highFlag && has(r, /接近上限/) && has(r, /UpToDate 上限為 5\.5/), 'vori 5.8 → note（不 warn），加註「UpToDate 上限為 5.5」');
  r = T('voriconazole', 'treatment', 6.0);
  assert(r.tag === 'ok' && has(r, /接近上限/), 'vori 6.0（剛好院內上限）→ 仍是 note');
  r = T('voriconazole', 'treatment', 6.2);
  assert(r.tag === 'warn' && r.highFlag && /超過院內上限 6/.test(r.tagText) && /應主動評估/.test(r.tagText), 'vori 6.2 → warn「超過院內上限 6，神經／肝毒性風險升高，應主動評估」');
  assert(T('voriconazole', 'treatment', 1.5).notes.some(n => /低於最適區間下限 2/.test(n)), 'vori 治療 1.5 → 仍提示低於最適區間下限 2');

  // posaconazole：預防 ≥0.7、治療 ≥1.25；>1.83 院內警戒（warn）；>4 毒性
  assert(T('posaconazole', 'prophylaxis', 0.65).tag === 'warn', 'posa 預防 0.65 → warn');
  assert(T('posaconazole', 'prophylaxis', 0.7).tag === 'ok', 'posa 預防 0.7 → ok');
  assert(T('posaconazole', 'treatment', 1.1).tag === 'warn' && T('posaconazole', 'treatment', 1.1).lowFlag, 'posa 治療 1.1 → warn（院內下限 1.25，UpToDate 為 1.0）');
  assert(T('posaconazole', 'treatment', 1.25).tag === 'ok', 'posa 治療 1.25 → ok');
  assert(T('posaconazole', 'treatment', 1.8).tag === 'ok', 'posa 治療 1.8 → ok');
  r = T('posaconazole', 'treatment', 1.9);
  assert(r.tag === 'warn' && r.highFlag && /超過院內肝毒性警戒值 1\.83，須評估 LFT/.test(r.tagText), 'posa 治療 1.9 → warn「超過院內肝毒性警戒值 1.83，須評估 LFT」（原本只是 note）');
  assert(T('posaconazole', 'treatment', 2.5).tag === 'warn', 'posa 2.5 → warn（舊版 ok）');
  r = T('posaconazole', 'treatment', 4.5);
  assert(r.tag === 'warn' && /整體毒性上限 4/.test(r.tagText), 'posa 4.5 → warn，仍是原本「整體毒性上限 4」文字');
  assert(!X.AZOLE_TARGETS.posaconazole.indications.some(i => i.preferLo != null || i.preferHi != null), 'posa 不再有 preferLo／preferHi');

  // isavuconazole：院內 2–5；4.6–5.1 UpToDate 區間只是 note；不再有 typicalFloor
  r = T('isavuconazole', 'general', 1.8);
  assert(r.tag === 'warn' && r.lowFlag && /低於院內目標 2；isavuconazole 一般不以濃度滴定，調整前請與感染科討論/.test(r.tagText), 'isavu 1.8 → warn「低於院內目標 2；…與感染科討論」');
  assert(T('isavuconazole', 'general', 2.0).tag === 'ok', 'isavu 2.0 → ok');
  r = T('isavuconazole', 'general', 3.0);
  assert(r.tag === 'ok' && r.notes.length === 0, 'isavu 3.0 → ok 且沒有 note');
  r = T('isavuconazole', 'general', 4.7);
  assert(r.tag === 'ok' && has(r, /毒性關切區間（4\.6–5\.1）/), 'isavu 4.7 → note（UpToDate 毒性關切區間），不 warn');
  r = T('isavuconazole', 'general', 5.0);
  assert(r.tag === 'ok' && has(r, /毒性關切區間/), 'isavu 5.0（院內上限內）→ note');
  r = T('isavuconazole', 'general', 5.2);
  assert(r.tag === 'warn' && r.highFlag && /超過院內上限 5，評估肝毒性/.test(r.tagText), 'isavu 5.2 → warn「超過院內上限 5，評估肝毒性」');
  assert(!('typicalFloor' in X.AZOLE_TARGETS.isavuconazole), 'isavu 不再有 typicalFloor');

  // ref 欄位（UpToDate 數值只顯示）
  const vt = X.AZOLE_TARGETS.voriconazole.indications.find(i => i.id === 'treatment');
  assert(vt.lo === 1.0 && vt.hi === 6.0 && vt.preferLo === 2 && /1\.0–5\.5/.test(vt.ref), 'vori 治療：判定 1.0–6.0、preferLo 2，ref 存 UpToDate 1.0–5.5');
  assert(X.AZOLE_TARGETS.voriconazole.cautionLine === 5 && X.AZOLE_TARGETS.voriconazole.toxicityLine === 6, 'vori cautionLine 5、toxicityLine 6');

  // 畫面顯示
  switchTo('azole', 'vanco');
  $('clearAllBtn').click();
  set('azlDrug', 'voriconazole'); set('azlIndication', 'treatment');
  let disp = $('azlTargetDisplay').textContent;
  assert(/目前目標（院內）/.test(disp) && /UpToDate 參考：1\.0–5\.5，偏好 ≥2/.test(disp), 'vori 目標顯示「目前目標（院內）… ｜UpToDate 參考：1.0–5.5，偏好 ≥2」');
  set('azlDrug', 'isavuconazole');
  disp = $('azlTargetDisplay').textContent;
  assert(/目前目標（院內）/.test(disp) && /2–5/.test(disp) && /UpToDate 參考：不依濃度滴定/.test(disp), 'isavu 目標顯示院內 2–5 與 UpToDate 參考');
  assert(!/Thresholds sourced from UpToDate/.test(doc.body.textContent), '頁面沒有「Thresholds sourced from UpToDate」');
  assert(/院內 TDM protocol 為主、UpToDate/.test(doc.body.textContent), '頁面說明改成「院內 TDM protocol 為主、UpToDate 為輔」');

  // ================= E2 Vd 體重 =================
  // AMG：TBW 120、身高 165、男 → 體重選擇後 AdjBW，Vd = 0.26 × AdjBW
  switchTo('aminoglycoside', 'azl');
  $('clearAllBtn').click();
  set('amgAge', '50'); set('amgSex', 'M'); set('amgHeight', '165'); set('amgTbw', '120');
  addScr('amgAddScrRow', 'amgScrTable');
  set('amgDrug', 'gentamicin'); set('amgStrategy', 'conventional'); set('amgIndication', 'severe');
  set('amgMaintDose', '400'); set('amgMaintInf', '30'); set('amgMaintInterval', '24');
  const ibw = X.ibwDevine(165, 'M');
  const sel = X.weightForCG(120, ibw);
  assert(/AdjBW/.test(sel.method), '前提：TBW 120／身高 165 男 → 體重選擇為 AdjBW');
  const expectVd = 0.26 * sel.weight;
  const vdShown = cellValue('amgParamGrid', 'Vd');
  assert(Math.abs(vdShown - expectVd) < 0.06, `AMG 肥胖族群 Vd = 0.26 × AdjBW = ${expectVd.toFixed(1)} L（畫面 ${vdShown}）`);
  assert(/AdjBW/.test($('amgFlagList').textContent) && /族群 Vd 先驗以體重選擇後的體重/.test($('amgFlagList').textContent), 'AMG 旗標標出 Vd 用的是 AdjBW');
  // 體重 < IBW：用 TBW
  set('amgTbw', '55');
  const sel2 = X.weightForCG(55, ibw);
  assert(/TBW/.test(sel2.method) && Math.abs(cellValue('amgParamGrid', 'Vd') - 0.26 * 55) < 0.06, 'AMG TBW < IBW → Vd = 0.26 × TBW');
  // 正常體重（TBW 在 IBW 到 1.2 IBW）：用 IBW
  set('amgTbw', String(Math.round(ibw * 1.1)));
  const sel3 = X.weightForCG(Math.round(ibw * 1.1), ibw);
  assert(/IBW/.test(sel3.method) && Math.abs(cellValue('amgParamGrid', 'Vd') - 0.26 * ibw) < 0.06, 'AMG 體重介於 IBW 到 1.2×IBW → Vd = 0.26 × IBW');

  // vancomycin：BMI 45、TBW 130 → Vpop = 0.52 × 130
  switchTo('vancomycin', 'amg');
  $('clearAllBtn').click();
  set('age', '55'); set('sex', 'M'); set('height', '170'); set('tbw', '130');
  addScr('addScrRow', 'scrTable');
  set('maintDose', '1500'); set('maintInterval', '12'); set('maintInf', '180');
  const bmi = 130 / (1.7 * 1.7);
  assert(bmi >= 40, `前提：BMI ${bmi.toFixed(1)} ≥ 40`);
  assert(Math.abs(cellValue('paramGrid', 'Vd') - 0.52 * 130) < 0.06, `vanco BMI 45、TBW 130 → Vpop = 0.52 × 130 = 67.6 L（畫面 ${cellValue('paramGrid', 'Vd')}）`);
  assert(/極度肥胖，族群 Vd 採 0\.52 L\/kg TBW（Adane 2015）/.test($('flagList').textContent), 'vanco 旗標說明極度肥胖 Vd 0.52（Adane 2015）');
  // BMI <40（身高 190）：維持 0.7
  set('height', '190');
  assert(Math.abs(cellValue('paramGrid', 'Vd') - 0.7 * 130) < 0.06, 'vanco BMI <40 → 維持 0.7 × TBW');
  assert(!/極度肥胖/.test($('flagList').textContent), 'vanco BMI <40 沒有極度肥胖旗標');
  // BMI ≥40 但體重 <120：維持 0.7
  set('height', '150'); set('tbw', '95');
  assert(95 / (1.5 * 1.5) >= 40, '前提：BMI ≥40 但體重 95 <120');
  assert(Math.abs(cellValue('paramGrid', 'Vd') - 0.7 * 95) < 0.06, 'vanco BMI ≥40 但體重 <120 → 維持 0.7 × TBW');

  // ================= E3 ODD peak 顯示 =================
  switchTo('aminoglycoside', 'vanco');
  set('amgStrategy', 'odd');
  assert(/ODD 目標 peak 以輸注結束後 30 分鐘比較；文獻定義不一，院內指引未明定（2026-10-19 查證）/.test($('amgTargetDisplay').textContent), 'ODD 策略時目標顯示加一行 30 分鐘說明');
  set('amgStrategy', 'conventional');
  assert(!/輸注結束後 30 分鐘比較/.test($('amgTargetDisplay').textContent), '傳統給藥沒有這行說明');
  assert(/Cmax\(peak，輸注結束後 30 分\)/.test($('amgRegimenTable').querySelector('thead').textContent), 'AMG 候選方案表 Cmax 欄位標題標明「輸注結束後 30 分」');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
