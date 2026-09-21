// test_hd_window_fix.js — reproduces the exact bug report: a pre-HD trough drawn before
// the most recently completed dialysis session was being silently excluded from the fit
// because the window anchor was based on "latest event (dose OR level)" rather than
// "latest level". Covers the root-cause fix in findCurrentHDWindow and its three
// downstream ripples (current-dose label split, AI prompt note, curve session markers).
//
// Run: node test_hd_window_fix.js

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

function fireInput(el){ el.dispatchEvent(new window.Event('input', {bubbles:true})); }
function fireChange(el){ el.dispatchEvent(new window.Event('change', {bubbles:true})); }
function fireClick(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); }

setTimeout(()=>{
  const document = window.document;
  const $ = id => document.getElementById(id);

  // ---- reproduce the reported patient exactly ----
  $('age').value = '55'; $('sex').value = '男'; $('height').value = '168'; $('tbw').value = '65';
  $('dialysis').value = 'HD'; fireChange($('dialysis'));

  // clear whatever demo rows exist, start clean
  document.querySelectorAll('#hdSessionTable .entry-row').forEach(r=>r.remove());
  document.querySelectorAll('#doseTable .entry-row').forEach(r=>r.remove());
  document.querySelectorAll('#levelTable .entry-row').forEach(r=>r.remove());

  // 3 already-completed sessions: 07/03, 07/06, 07/08, all 08:00-12:00
  ['2026-07-03', '2026-07-06', '2026-07-08'].forEach(d=>{
    fireClick($('addHdSessionRow'));
    const row = document.querySelectorAll('#hdSessionTable .entry-row');
    const last = row[row.length-1];
    last.querySelector('.hd-start').value = d+'T08:00';
    last.querySelector('.hd-end').value = d+'T12:00';
  });

  // doses: 1500mg / 60min infusion at 21:00 on each dialysis day (TIWQN)
  ['2026-07-03T21:00','2026-07-06T21:00','2026-07-08T21:00'].forEach(dt=>{
    fireClick($('addDoseRow'));
    const rows = document.querySelectorAll('#doseTable .entry-row');
    const last = rows[rows.length-1];
    last.querySelector('.dose-date').value = dt;
    last.querySelector('.dose-mg').value = '1500';
    last.querySelector('.dose-inf').value = '60';
  });

  // the reported pre-HD trough: 07/08 07:08, 15 µg/mL — BEFORE the 07/08 08:00 session
  fireClick($('addLevelRow'));
  const levelRow = document.querySelector('#levelTable .entry-row');
  levelRow.querySelector('.level-date').value = '2026-07-08T07:08';
  levelRow.querySelector('.level-val').value = '15';
  fireInput(levelRow.querySelector('.level-val')); // triggers render()

  // =================================================================
  // 1. root cause: the level must now be picked up by the fit (no longer
  //    silently dropped into "population only")
  // =================================================================
  const badge = ($('fitModeBadge').textContent||'');
  ok(!badge.includes('僅族群估算'), `fit mode is no longer pure population-only (got: "${badge}")`);
  ok(badge.includes('單點貝氏校正'), `fit mode correctly shows single-level Bayesian correction (got: "${badge}")`);

  const paramGridText = $('paramGrid').innerHTML;
  ok(paramGridText.includes('最近一次實測 pre-HD trough'), 'param grid now shows the measured pre-HD trough row');
  ok(paramGridText.includes('15.0'), `param grid shows the actual measured value 15.0 (got a snippet: ${paramGridText.slice(0,300)})`);

  // =================================================================
  // 2. current-dose label split: the dose the trough is anchored to (07/06, 1500mg)
  //    vs. the newer not-yet-evaluated dose (07/08, 1500mg) are shown separately
  // =================================================================
  const regimenHtml = document.querySelector('#regimenTable tbody').innerHTML;
  ok(regimenHtml.includes('本次濃度所依據劑量'), 'regimen table uses the new, unambiguous "本次濃度所依據劑量" label');
  ok(!regimenHtml.includes('>現行透析後劑量<'), 'the old ambiguous "現行透析後劑量" label is gone');
  ok(regimenHtml.includes('最近一次實際給藥'), 'regimen table separately surfaces the newer (07/08) dose that has no trough evaluating it yet');
  ok(regimenHtml.includes('建議下次透析後劑量'), 'a suggested next post-HD dose is still produced from the measured trough');

  // =================================================================
  // 3. AI prompt: mentions the newer unevaluated dose instead of silently omitting it
  // =================================================================
  const aiPrompt = $('aiPromptOut').value;
  ok(aiPrompt.includes('另有一劑'), 'AI prompt notes that a newer dose exists beyond the fitted window');
  ok(aiPrompt.includes('本次濃度所依據劑量'), 'AI prompt dosing section uses the same unambiguous wording as the UI');
  ok(!aiPrompt.includes('現行透析後劑量'), 'AI prompt no longer uses the old ambiguous label');

  // =================================================================
  // 4. curve: the dialysis session(s) within the plotted horizon are marked
  // =================================================================
  const curveHtml = $('curveSvg').innerHTML;
  ok(curveHtml.includes('透析'), `curve SVG includes a dialysis-session marker/band label (got length ${curveHtml.length})`);

  // =================================================================
  // 5. sanity: a normal (non-edge-case) HD patient — level drawn AFTER the most
  //    recent completed session, the ordinary/originally-intended case — must still
  //    work exactly as before (no regression from the anchor-selection change)
  // =================================================================
  document.querySelectorAll('#levelTable .entry-row').forEach(r=>r.remove());
  fireClick($('addLevelRow'));
  const normalLevelRow = document.querySelector('#levelTable .entry-row');
  normalLevelRow.querySelector('.level-date').value = '2026-07-09T18:00'; // after the 07/08 session, before any next one
  normalLevelRow.querySelector('.level-val').value = '17';
  fireInput(normalLevelRow.querySelector('.level-val'));

  const badge2 = ($('fitModeBadge').textContent||'');
  ok(badge2.includes('單點貝氏校正'), `ordinary post-session trough still fits correctly (got: "${badge2}")`);
  const regimenHtml2 = document.querySelector('#regimenTable tbody').innerHTML;
  ok(!regimenHtml2.includes('最近一次實際給藥'), 'for the ordinary case, the "newer unevaluated dose" row correctly does NOT appear (the trough IS anchored to the latest dose)');
  ok(regimenHtml2.includes('1500'), 'ordinary-case regimen table still shows the 1500mg dose the trough is based on');

  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail===0 ? 'ALL TESTS PASSED — DONE OK' : 'SOME TESTS FAILED');
  if(fail>0) process.exitCode = 1;
}, 100);
