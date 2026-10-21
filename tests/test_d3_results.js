// test_d3_results.js — REDESIGN D3：右區重排（純顯示）
//
//   1. 判讀標題列：現行處方、濃度點數與相距小時（#vancoConclusion／#amgConclusion），由純顯示 helper 讀既有欄位
//   2. 參數格依標籤加上 pc-* class（key 格＝vancomycin 的 AUC₂₄,ss、AMG 的 Cmax,ss），供 CSS 排成兩列
//   3. 既有 id 全部還在；paramGrid 文字不變（golden 另外保證）
//
// Run: node test_d3_results.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = () => new Promise(r => setTimeout(r, 20));   // MutationObserver 是微工作，等一個 tick
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const addRow = async (btn, table, vals) => { $(btn).click(); const rows = doc.querySelectorAll('#' + table + ' .entry-row'); const row = rows[rows.length - 1]; Object.entries(vals).forEach(([c, v]) => { const el = row.querySelector('.' + c); el.value = v; fire(el); }); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const cls = (gridId, prefix) => { const c = Array.from($(gridId).querySelectorAll('.param-cell')).find(e => e.querySelector('.label').textContent.replace(/^預測 /, '').startsWith(prefix)); return c ? c.className : null; };

  // ---------- 既有 id ----------
  ['resultsPanel', 'amgResultsPanel', 'paramGrid', 'amgParamGrid', 'flagList', 'amgFlagList', 'regimenTable', 'amgRegimenTable',
   'monitorGrid', 'amgMonitorGrid', 'aiPromptOut', 'amgAiPromptOut', 'curveSvg', 'amgCurveSvg', 'fitModeBadge', 'amgFitModeBadge',
   'customDose', 'customInf', 'customTau', 'customCmax', 'customCmin', 'customAuc'].forEach(id => assert(!!$(id), '既有 id 還在：#' + id));
  assert(!!$('vancoConclusion') && !!$('amgConclusion'), '有判讀標題列 #vancoConclusion、#amgConclusion');

  // ---------- vancomycin：示範病例（開頁已載入） ----------
  await sw('vancomycin', 'amg');
  $('clearAllBtn').click(); await tick();
  assert($('vancoConclusion').textContent.trim() === '', '清空後（缺資料）判讀標題列是空的');
  await set('age', '55'); await set('sex', 'M'); await set('height', '168'); await set('tbw', '65');
  await addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-18', 'scr-val': '0.95' });
  await set('maintDose', '1000'); await set('maintInterval', '12'); await set('maintInf', '120');
  let t = $('vancoConclusion').textContent.replace(/\s+/g, ' ');
  assert(/現行 1000 mg q12h/.test(t) && /輸注 120 分/.test(t), '預測模式判讀列寫出現行處方：' + t);
  assert(!/濃度 \d 點/.test(t), '沒有濃度時不寫濃度點數');
  await set('therapyStart', '2026-09-17T09:00'); await set('expandTo', '2026-09-19T09:00');
  $('expandDoses').click(); await tick();
  $('vancoFirstDoseFirst').checked = true; fire($('vancoFirstDoseFirst')); await tick();
  await addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T20:45', 'level-val': '14.2' });
  await addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T00:30', 'level-val': '27.5' });
  t = $('vancoConclusion').textContent.replace(/\s+/g, ' ');
  assert(/濃度 2 點，相距 3\.8 h/.test(t), '有兩點濃度時寫「濃度 2 點，相距 3.8 h」：' + t);
  const before = $('paramGrid').textContent;
  assert((cls('paramGrid', 'AUC₂₄,ss') || '').includes('pc-auc') && (cls('paramGrid', 'AUC₂₄,ss') || '').includes('pc-key'), 'AUC₂₄,ss 格有 pc-auc 與 pc-key');
  assert((cls('paramGrid', 'Cmin,ss') || '').includes('pc-cmin'), 'Cmin,ss 格有 pc-cmin');
  assert((cls('paramGrid', 'Cmax,ss') || '').includes('pc-cmax'), 'Cmax,ss 格有 pc-cmax');
  assert((cls('paramGrid', 'AUC/MIC') || '').includes('pc-aucmic'), 'AUC/MIC 格有 pc-aucmic');
  assert((cls('paramGrid', '近 24h') || '').includes('pc-auc24a'), '近 24h 實際 AUC 格有 pc-auc24a');
  ['t½', 'ke', 'Vd', 'CL', 'CrCl'].forEach(k => assert(!!cls('paramGrid', k) && /pc-/.test(cls('paramGrid', k)), k + ' 格有 pc-* class'));
  assert((cls('paramGrid', 'CL') || '').includes('pc-cl') && !(cls('paramGrid', 'CrCl') || '').includes('pc-cl '), 'CL 與 CrCl 分得開');
  assert(Array.from($('paramGrid').querySelectorAll('.param-cell')).filter(c => c.classList.contains('pc-key')).length === 1, '只有一個 key 格');
  assert($('paramGrid').textContent === before, '加 class 不改變 paramGrid 的文字');
  // HD：沒有 AUC 格也不出錯、判讀列清掉
  await set('dialysis', 'HD');
  assert(!Array.from($('paramGrid').querySelectorAll('.pc-key')).length, 'HD 沒有 AUC 格就沒有 key 格');
  await set('dialysis', 'none');

  // ---------- AMG ----------
  await sw('aminoglycoside', 'vanco');
  $('clearAllBtn').click(); await tick();
  await set('amgAge', '58'); await set('amgSex', 'M'); await set('amgHeight', '172'); await set('amgTbw', '80');
  await addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.0' });
  await set('amgDrug', 'gentamicin'); await set('amgStrategy', 'conventional'); await set('amgIndication', 'severe');
  await set('amgMaintDose', '120'); await set('amgMaintInf', '30'); await set('amgMaintInterval', '8');
  t = $('amgConclusion').textContent.replace(/\s+/g, ' ');
  assert(/現行 120 mg q8h/.test(t) && /輸注 30 分/.test(t), 'AMG 判讀列寫出現行處方：' + t);
  assert((cls('amgParamGrid', 'Cmax,ss') || '').includes('pc-key'), 'AMG 的 key 格是 Cmax,ss');
  assert((cls('amgParamGrid', 'Cmin,ss') || '').includes('pc-cmin'), 'AMG Cmin,ss 有 pc-cmin');
  assert(!Array.from($('amgParamGrid').querySelectorAll('.param-cell')).some(c => c.className.includes('pc-auc ')), 'AMG 沒有 pc-auc');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
