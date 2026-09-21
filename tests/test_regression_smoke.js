// test_regression_smoke.js — quick regression smoke test for paths NOT touched by this
// round's HD scheduling work, to catch any accidental collateral damage from the edits
// (shared helper refactors, toggle function changes, collectState/applyState field
// additions). This does NOT replace the project's full historical test suite (test_load.js,
// test_comprehensive.js, test_edge_cases.js, test_headermeta.js, test_new_features.js,
// test_ss_whatif.js, test_hd.js, test_audit_fixes.js per HANDOFF_v2.md) — those files were
// not part of this session's uploads and could not be re-run here. See chat summary for
// this caveat.
//
// Run: node test_regression_smoke.js

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

// tests/ 內若有 index.html 就用它，否則用上一層（repo 根目錄）——與 load_harness.js 的 fallback 一致
const INDEX_HTML_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
  ? path.join(__dirname, 'index.html')
  : path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(INDEX_HTML_PATH, 'utf-8');
let pass = 0, fail = 0;
function ok(cond, label){ if(cond) pass++; else { fail++; console.log('FAIL:', label); } }

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.alert = ()=>{};
window.confirm = ()=>true;

function fireChange(el){ el.dispatchEvent(new window.Event('change', {bubbles:true})); }
function fireClick(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); }

setTimeout(()=>{
  const document = window.document;
  const $ = id => document.getElementById(id);

  // ---- page loads clean with demo data on both modules ----
  ok(document.querySelectorAll('#doseTable .entry-row').length > 0, 'vancomycin demo doses loaded on init');
  ok(document.querySelectorAll('#amgDoseTable .entry-row').length > 0, 'aminoglycoside demo doses loaded on init');
  ok($('paramGrid').children.length > 0 || $('paramGrid').innerHTML.trim().length > 0, 'vancomycin param grid renders something on init');

  // ---- normal (non-HD) vancomycin fixed-interval flow still works ----
  ok($('dialysis').value === 'none', 'vancomycin dialysis defaults to none');
  ok($('hdDoseFields').style.display === 'none', 'hdDoseFields hidden by default');
  ok($('fixedRegimenFields').style.display !== 'none', 'normal fixed-interval fields visible by default');
  $('maintDose').value = '1000'; $('maintInterval').value = '12'; $('maintInf').value = '60';
  $('therapyStart').value = '2026-07-01T08:00';
  $('expandTo').value = '2026-07-03T08:00';
  fireClick($('expandDoses'));
  const normalDoses = document.querySelectorAll('#doseTable .entry-row');
  ok(normalDoses.length === 5, `normal q12h expand over 2 days yields 5 doses (got ${normalDoses.length})`);

  // toggling dialysis on then back off should not corrupt the normal dose table or fields
  $('dialysis').value = 'HD'; fireChange($('dialysis'));
  $('dialysis').value = 'none'; fireChange($('dialysis'));
  ok($('fixedRegimenFields').style.display !== 'none', 'fixed-interval fields reappear after toggling HD off again');
  ok(document.querySelectorAll('#doseTable .entry-row').length === 5, 'toggling dialysis on/off does not touch the already-entered dose table');

  // ---- normal (non-HD, non-TIW) aminoglycoside fixed-interval flow still works ----
  ok($('amgScheduleType').value === 'fixed', 'aminoglycoside scheduleType defaults to fixed');
  ok($('amgHdScheduleBlock').style.display === 'none', 'amgHdScheduleBlock hidden by default');
  $('amgMaintDose').value = '420'; $('amgMaintInf').value = '30'; $('amgMaintInterval').value = '24';
  $('amgTherapyStart').value = '2026-07-01T09:00';
  $('amgExpandTo').value = '2026-07-03T09:00';
  fireClick($('amgExpandDoses'));
  const amgFixedDoses = document.querySelectorAll('#amgDoseTable .entry-row');
  ok(amgFixedDoses.length === 3, `normal q24h expand over 2 days yields 3 doses (got ${amgFixedDoses.length})`);

  // ---- NTM-style TIW (non-HD) still works exactly as before, unaffected by the HD reuse ----
  $('amgScheduleType').value = 'tiw'; fireChange($('amgScheduleType'));
  ok($('amgDialysis').value === 'none', 'amgDialysis still none for this NTM-style patient');
  ok($('amgHdScheduleBlock').style.display === 'none', 'amgHdScheduleBlock stays hidden for a non-HD tiw (NTM) patient even though amgTiwRow is visible');
  fireClick($('amgTiwPresetMWF'));
  $('amgTiwTime').value = '09:00'; // NTM's own generic default, untouched by any HD logic
  $('amgTherapyStart').value = '2026-07-06T00:00';
  $('amgExpandTo').value = '2026-07-12T23:59';
  fireClick($('amgExpandDoses'));
  const ntmDoses = document.querySelectorAll('#amgDoseTable .entry-row');
  ok(ntmDoses.length === 3, `NTM-style MWF TIW over 1 week yields 3 doses (got ${ntmDoses.length})`);
  ok(Array.from(ntmDoses).every(r=>r.querySelector('.dose-date').value.endsWith('T09:00')),
    'NTM-style TIW doses still land at 09:00 (not silently defaulted to 21:00 — that only happens via the HD dialysis toggle)');
  $('amgScheduleType').value = 'fixed'; fireChange($('amgScheduleType'));

  // ---- render() / renderAmino() don't throw across a few state transitions ----
  let threw = false;
  try {
    $('dialysis').value = 'HD'; fireChange($('dialysis'));
    fireClick($('hdPresetMWF'));
    $('therapyStart').value = '2026-07-06T00:00'; $('expandTo').value = '2026-07-19T23:59';
    fireClick($('hdGenerateSessionsBtn'));
    $('hdMaintDose').value='750'; $('hdMaintInf').value='60';
    fireClick($('expandDosesHD'));
    $('dialysis').value = 'none'; fireChange($('dialysis'));
  } catch(e){ threw = true; console.log('render threw during HD on/off cycle:', e.message, e.stack); }
  ok(!threw, 'cycling vancomycin through HD-on -> generate -> expand -> HD-off does not throw');

  // ---- standard (non-HD) patient save/load still round-trips correctly ----
  $('dialysis').value = 'none'; fireChange($('dialysis'));
  $('maintDose').value = '1250'; $('maintInterval').value = '8';
  $('patientLabel').value = 'TEST_NORMAL_PATIENT_001';
  fireClick($('savePatientBtn'));
  ok(($('patientMeta').textContent||'').includes('已存為新收案'), 'normal (non-HD) patient saves correctly');
  $('maintDose').value = '9999';
  const sel = $('patientSelect');
  const opt = Array.from(sel.options).find(o=>o.textContent.includes('TEST_NORMAL_PATIENT_001'));
  ok(!!opt, 'normal patient appears in dropdown');
  if(opt){
    sel.value = opt.value;
    fireClick($('loadPatientBtn'));
    ok($('maintDose').value === '1250', 'loading the normal patient restores maintDose correctly (collectState/applyState additions did not break the base fields)');
    ok($('dialysis').value === 'none', 'loading the normal patient keeps dialysis at none');
    fireClick($('deletePatientBtn'));
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail===0 ? 'ALL TESTS PASSED — DONE OK' : 'SOME TESTS FAILED');
  if(fail>0) process.exitCode = 1;
}, 100);
