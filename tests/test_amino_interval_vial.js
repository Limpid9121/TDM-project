// test_amino_interval_vial.js — coverage for this round's two aminoglycoside additions:
// (1) ODD/HDEI suggested starting interval derived from CrCl bands (Hartford nomogram's
//     documented basis) + override by the 4 ODD exclusion checkboxes, surfaced as a
//     "建議" tag in the candidate table; (2) hospital-formulary vial-aware dose rounding
//     (Acemycin 500mg/2mL for amikacin, V-Genta 80mg/2mL for gentamicin, nearest 0.1mL;
//     tobramycin has no local vial info and falls back to generic rounding + a flag).
//
// Run: node test_amino_interval_vial.js

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// tests/ 內若有 index.html 就用它，否則用上一層（repo 根目錄）——與 load_harness.js 的 fallback 一致
const INDEX_HTML_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
  ? path.join(__dirname, 'index.html')
  : path.join(__dirname, '..', 'index.html');
// WP1.1：index.html 開頁預設不再自動帶入示範資料；這支測試直接建構 JSDOM（不經過
// load_harness.js），故在此比照 load_harness.js 的作法自行注入同一個旗標，維持測試
// 原本依賴「開頁即示範狀態」的既有行為與斷言不必改動。
const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8')
  .replace('</head>', '<script>window.__TDM_AUTOLOAD_DEMO__=true;<\/script>\n</head>');
let pass = 0, fail = 0;
function ok(cond, label){ if(cond) pass++; else { fail++; console.log('FAIL:', label); } }

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.alert = ()=>{};
window.confirm = ()=>true;

function fireChange(el){ el.dispatchEvent(new window.Event('change', {bubbles:true})); }
function fireInput(el){ el.dispatchEvent(new window.Event('input', {bubbles:true})); }
function fireClick(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); }

setTimeout(()=>{
  const document = window.document;
  const $ = id => document.getElementById(id);

  // common baseline: young, good renal function patient (CrCl should land well above 60)
  $('amgAge').value = '30'; fireInput($('amgAge'));
  $('amgSex').value = 'M'; fireChange($('amgSex'));
  $('amgHeight').value = '175'; fireInput($('amgHeight'));
  $('amgTbw').value = '70'; fireInput($('amgTbw'));
  document.querySelectorAll('#amgScrTable .entry-row').forEach(r=>r.remove());
  fireClick($('amgAddScrRow'));
  const scrRow = document.querySelector('#amgScrTable .entry-row');
  scrRow.querySelector('.scr-date').value = '2026-07-01';
  scrRow.querySelector('.scr-val').value = '0.8';
  fireInput(scrRow.querySelector('.scr-val'));

  // =================================================================
  // 1. ODD suggested interval — good renal function, no exclusions -> q24h suggested
  // =================================================================
  $('amgDrug').value = 'gentamicin'; fireChange($('amgDrug'));
  $('amgStrategy').value = 'odd'; fireChange($('amgStrategy'));
  ['amgOddExclPregnancy','amgOddExclFluid','amgOddExclNeutropenia','amgOddExclEndocarditisCns'].forEach(id=>{
    $(id).checked = false;
  });
  fireChange($('amgOddExclPregnancy')); // trigger a render after ensuring all unchecked

  let regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  ok(regimenHtml.includes('q24h') && regimenHtml.includes('建議'), 'good renal function + ODD, no exclusions -> q24h is tagged 建議');
  ok(document.getElementById('amgFlagList').innerHTML.includes('q24h'), 'flag list explains the q24h suggestion');

  // =================================================================
  // 2. Poor renal function -> q48h suggested
  // =================================================================
  scrRow.querySelector('.scr-val').value = '3.5'; // pushes CrCl well down
  fireInput(scrRow.querySelector('.scr-val'));
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  const flagHtml = document.getElementById('amgFlagList').innerHTML;
  ok(flagHtml.includes('q48h') || flagHtml.includes('不建議 ODD'), `poor renal function suggestion reflects q48h or ODD-not-recommended (got snippet: ${flagHtml.slice(0,400)})`);

  // =================================================================
  // 3. ODD exclusion checkbox overrides the CrCl-based suggestion entirely
  // =================================================================
  scrRow.querySelector('.scr-val').value = '0.8'; // back to good renal function (would suggest q24h)
  fireInput(scrRow.querySelector('.scr-val'));
  $('amgOddExclNeutropenia').checked = true;
  fireChange($('amgOddExclNeutropenia'));
  const flagHtmlExcl = document.getElementById('amgFlagList').innerHTML;
  ok(flagHtmlExcl.includes('嗜中性球低下'), 'flag list names the checked exclusion factor');
  ok(flagHtmlExcl.includes('PAE'), 'flag list explains the PAE mechanism specifically for neutropenia');
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  ok(!regimenHtml.includes('建議'), 'candidate table shows NO 建議 tag once an exclusion factor is checked, even though CrCl alone would suggest q24h');
  $('amgOddExclNeutropenia').checked = false;
  fireChange($('amgOddExclNeutropenia'));

  // =================================================================
  // 4. Suggestion only applies under ODD strategy, not conventional
  // =================================================================
  $('amgStrategy').value = 'conventional'; fireChange($('amgStrategy'));
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  ok(!regimenHtml.includes('建議'), 'no 建議 tag under conventional strategy (suggestion is ODD-specific)');
  $('amgStrategy').value = 'odd'; fireChange($('amgStrategy'));

  // =================================================================
  // 5. Pseudomonas organism note (informational, only shown when NOT already on ODD)
  // =================================================================
  $('amgStrategy').value = 'conventional'; fireChange($('amgStrategy'));
  $('amgOrganism').value = 'Pseudomonas aeruginosa'; fireInput($('amgOrganism'));
  ok(document.getElementById('amgFlagList').innerHTML.includes('adaptive resistance'), 'Pseudomonas organism triggers the adaptive-resistance informational note under conventional strategy');
  $('amgStrategy').value = 'odd'; fireChange($('amgStrategy'));
  ok(!document.getElementById('amgFlagList').innerHTML.includes('adaptive resistance'), 'Pseudomonas note does not repeat once strategy is already ODD');
  $('amgOrganism').value = ''; fireInput($('amgOrganism'));

  // =================================================================
  // 6. Vial-aware dose rounding — gentamicin (V-Genta 80mg/2mL = 40mg/mL)
  // =================================================================
  $('amgDrug').value = 'gentamicin'; fireChange($('amgDrug'));
  $('amgCand24').checked = true; $('amgCand36').checked = false; $('amgCand48').checked = false;
  $('amgCand8').checked = false; $('amgCand12').checked = false;
  fireChange($('amgCand24'));
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  ok(/mL/.test(regimenHtml), `gentamicin candidate row shows an mL volume alongside mg (snippet: ${regimenHtml.slice(0,300)})`);
  // extract the mL figure and confirm it's a clean one-decimal number consistent with 40mg/mL
  const mlMatchGent = regimenHtml.match(/（([\d.]+)\s*mL）/);
  ok(!!mlMatchGent, 'a parseable mL figure is present for gentamicin');
  if(mlMatchGent){
    const mgMatch = regimenHtml.match(/([\d.]+)\s*mg（/);
    const mg = parseFloat(mgMatch[1]);
    const ml = parseFloat(mlMatchGent[1]);
    ok(Math.abs(mg/40 - ml) < 0.05, `gentamicin mg/mL is internally consistent with 40mg/mL concentration (mg=${mg}, mL=${ml})`);
    ok(Math.abs(ml*10 - Math.round(ml*10)) < 1e-6, 'gentamicin mL is rounded to the nearest 0.1 mL');
  }

  // =================================================================
  // 7. Vial-aware dose rounding — amikacin (Acemycin 500mg/2mL = 250mg/mL)
  // =================================================================
  $('amgDrug').value = 'amikacin'; fireChange($('amgDrug'));
  fireChange($('amgCand24'));
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  const mlMatchAmk = regimenHtml.match(/（([\d.]+)\s*mL）/);
  ok(!!mlMatchAmk, 'a parseable mL figure is present for amikacin');
  if(mlMatchAmk){
    const mgMatch = regimenHtml.match(/([\d.]+)\s*mg（/);
    const mg = parseFloat(mgMatch[1]);
    const ml = parseFloat(mlMatchAmk[1]);
    ok(Math.abs(mg/250 - ml) < 0.05, `amikacin mg/mL is internally consistent with 250mg/mL concentration (mg=${mg}, mL=${ml})`);
  }
  ok(!regimenHtml.includes('恰為整數瓶') && !regimenHtml.includes('整瓶'), 'no whole-vial-multiple annotation is shown (explicitly out of scope per instruction)');

  // =================================================================
  // 8. Tobramycin — no vial info, falls back to generic rounding + flag
  // =================================================================
  $('amgDrug').value = 'tobramycin'; fireChange($('amgDrug'));
  fireChange($('amgCand24'));
  regimenHtml = document.querySelector('#amgRegimenTable tbody').innerHTML;
  ok(!/mL/.test(regimenHtml), 'tobramycin candidate rows show mg only, no mL (no local vial info)');
  const flagHtmlTobra = document.getElementById('amgFlagList').innerHTML;
  ok(flagHtmlTobra.includes('無 tobramycin 品項'), 'flag list warns that tobramycin is not stocked at this hospital');
  $('amgDrug').value = 'gentamicin'; fireChange($('amgDrug'));

  // =================================================================
  // 9. State round-trip: save/load preserves the 4 ODD exclusion checkboxes
  // =================================================================
  $('amgOddExclFluid').checked = true; fireChange($('amgOddExclFluid'));
  $('amgOddExclEndocarditisCns').checked = true; fireChange($('amgOddExclEndocarditisCns'));
  $('amgPatientLabel').value = 'TEST_AMG_ODD_PATIENT_001';
  fireClick($('amgSavePatientBtn'));
  ok(($('amgPatientMeta').textContent||'').includes('已存為新收案'), 'ODD-exclusion test patient saved');

  $('amgOddExclFluid').checked = false;
  $('amgOddExclEndocarditisCns').checked = false;

  const sel = $('amgPatientSelect');
  const opt = Array.from(sel.options).find(o=>o.textContent.includes('TEST_AMG_ODD_PATIENT_001'));
  ok(!!opt, 'saved patient appears in dropdown');
  if(opt){
    sel.value = opt.value;
    fireClick($('amgLoadPatientBtn'));
    ok($('amgOddExclFluid').checked === true, 'loading restores amgOddExclFluid checkbox state');
    ok($('amgOddExclEndocarditisCns').checked === true, 'loading restores amgOddExclEndocarditisCns checkbox state');
    ok($('amgOddExclPregnancy').checked === false, 'loading restores an unchecked exclusion box correctly (not left stale-checked)');

    // backward compatibility: an old-style record without any of the 4 new fields
    const AKEY = 'amino_tdm_patients_v2';
    const list = JSON.parse(window.localStorage.getItem(AKEY));
    const patientRec = list.find(p=>p.id===opt.value);
    const rec = patientRec.visits[patientRec.visits.length-1];
    const bareData = Object.assign({}, rec.data);
    delete bareData.oddExclPregnancy; delete bareData.oddExclFluid; delete bareData.oddExclNeutropenia; delete bareData.oddExclEndocarditisCns;
    rec.data = bareData;
    window.localStorage.setItem(AKEY, JSON.stringify(list));
    let threw = false;
    try { fireClick($('amgLoadPatientBtn')); } catch(e){ threw = true; console.log('old-style load threw:', e.message); }
    ok(!threw, 'loading an old-style record without the 4 new fields does not throw');
    ok($('amgOddExclFluid').checked === false, 'missing field falls back to unchecked, not left in a stale/undefined state');

    fireClick($('amgDeletePatientBtn')); // cleanup
  }

  // =================================================================
  // 10. clearAllFnAmg resets the 4 new checkboxes
  // =================================================================
  document.querySelector('.drug-switch-btn[data-drug="aminoglycoside"]').click();
  $('amgOddExclPregnancy').checked = true; fireChange($('amgOddExclPregnancy'));
  fireClick($('clearAllBtn'));
  ok($('amgOddExclPregnancy').checked === false, 'clearAllFnAmg resets the ODD exclusion checkboxes');

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail===0 ? 'ALL TESTS PASSED — DONE OK' : 'SOME TESTS FAILED');
  if(fail>0) process.exitCode = 1;
}, 100);
