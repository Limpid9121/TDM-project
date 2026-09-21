// test_hd_schedule.js — coverage for this round's HD (dialysis) weekly-pattern schedule
// generator: batch session generation from a weekday+slot+duration rule, the vancomycin
// "fixed clock time" TIWQN dose expansion (replacing the old session-end-offset mechanism),
// and the aminoglycoside HD wiring that reuses the existing amgTiwDay/amgTiwTime fields.
//
// All internal engine functions live inside the top-level IIFE and are not exposed on
// `window`, so — consistent with how this project's other test files exercise the UI —
// everything here drives real DOM events (click/change) on the wired elements rather than
// calling internals directly.
//
// Run: node test_hd_schedule.js

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
function ok(cond, label){
  if(cond){ pass++; }
  else { fail++; console.log('FAIL:', label); }
}

const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
window.alert = ()=>{};
window.confirm = ()=>true;

function fireChange(el){ el.dispatchEvent(new window.Event('change', {bubbles:true})); }
function fireClick(el){ el.dispatchEvent(new window.Event('click', {bubbles:true})); }

setTimeout(()=>{
  const document = window.document;
  const $ = id => document.getElementById(id);

  // =================================================================
  // VANCOMYCIN
  // =================================================================

  // ---- weekday preset buttons ----
  fireClick($('hdPresetMWF'));
  ok($('hdDay1').checked && $('hdDay3').checked && $('hdDay5').checked && !$('hdDay2').checked && !$('hdDay0').checked,
    '套用一三五 checks Mon/Wed/Fri and unchecks the rest (vanco hdDay)');
  fireClick($('hdPresetTTS'));
  ok($('hdDay2').checked && $('hdDay4').checked && $('hdDay6').checked && !$('hdDay1').checked,
    '套用二四六 checks Tue/Thu/Sat and unchecks Monday (vanco hdDay)');
  fireClick($('hdPresetMWF')); // back to MWF for the rest of the vanco tests

  // ---- switching dialysis to HD reveals the batch generator + HD dose fields ----
  $('dialysis').value = 'HD';
  fireChange($('dialysis'));
  ok($('hdDoseFields').style.display === 'block', 'switching dialysis to HD reveals hdDoseFields');
  ok($('hdInfoBlock').style.display === 'block', 'switching dialysis to HD reveals hdInfoBlock (pre-existing behavior, unaffected)');
  ok($('fixedRegimenFields').style.display === 'none', 'switching dialysis to HD hides the normal fixed-interval fields (pre-existing behavior, unaffected)');

  // ---- 上午/下午 slot selector defaults the start time ----
  $('hdSlot').value = 'pm'; fireChange($('hdSlot'));
  ok($('hdSlotStart').value === '13:00', '選下午 defaults start time to 13:00');
  $('hdSlot').value = 'am'; fireChange($('hdSlot'));
  ok($('hdSlotStart').value === '08:00', '選上午 defaults start time to 08:00');

  // ---- batch session generation replaces stale manually-entered rows ----
  $('hdDurationHr').value = '4';
  $('therapyStart').value = '2026-07-06T00:00'; // Monday
  $('expandTo').value = '2026-07-19T23:59';     // 2 weeks later (Sunday)

  fireClick($('addHdSessionRow'));
  document.querySelector('#hdSessionTable .entry-row .hd-start').value = '2020-01-01T00:00';
  document.querySelector('#hdSessionTable .entry-row .hd-end').value = '2020-01-01T04:00';
  ok(document.querySelectorAll('#hdSessionTable .entry-row').length === 1, 'a stale manually-added row exists before batch generation');

  fireClick($('hdGenerateSessionsBtn'));
  let rows = document.querySelectorAll('#hdSessionTable .entry-row');
  ok(rows.length === 6, `批次產生 replaces stale rows -> 6 MWF sessions over 2 weeks (got ${rows.length})`);
  if(rows.length){
    ok(rows[0].querySelector('.hd-start').value === '2026-07-06T08:00',
      `first session starts 2026-07-06 08:00 (got ${rows[0].querySelector('.hd-start').value})`);
    ok(rows[0].querySelector('.hd-end').value === '2026-07-06T12:00',
      `first session ends 4h later at 12:00 (got ${rows[0].querySelector('.hd-end').value})`);
  }
  ok(!Array.from(rows).some(r=>r.querySelector('.hd-start').value.startsWith('2020')),
    'the stale 2020 row was cleared, not appended to');
  ok(Array.from(rows).every(r=>[1,3,5].includes(new Date(r.querySelector('.hd-start').value).getDay())),
    'every generated session lands on Mon/Wed/Fri');

  // ---- fixed-clock-time dose expansion (replaces the old session-end-offset mechanism) ----
  $('hdMaintDose').value = '750';
  $('hdMaintInf').value = '60';
  $('hdFixedTime').value = '21:00';
  $('useLoading').checked = false;
  fireClick($('expandDosesHD'));
  let doseRows = document.querySelectorAll('#doseTable .entry-row');
  ok(doseRows.length === 6, `依透析時程展開給藥 -> one dose per session (got ${doseRows.length})`);
  doseRows.forEach((row,i)=>{
    const v = row.querySelector('.dose-date').value;
    ok(v.endsWith('T21:00'), `dose #${i+1} lands at the fixed clock time 21:00, not session.end+offset (got ${v})`);
    ok(parseFloat(row.querySelector('.dose-mg').value)===750, `dose #${i+1} uses hdMaintDose (750mg)`);
  });
  if(doseRows.length) ok(doseRows[0].querySelector('.dose-date').value.startsWith('2026-07-06'),
    'fixed-time dose stays on the SAME calendar day as the AM dialysis session (not shifted by session timing)');

  // ---- loading dose still applies to the first generated HD dose ----
  $('useLoading').checked = true;
  $('loadingDose').value = '2000';
  $('loadingInf').value = '120';
  fireClick($('expandDosesHD'));
  doseRows = document.querySelectorAll('#doseTable .entry-row');
  ok(parseFloat(doseRows[0].querySelector('.dose-mg').value)===2000, 'first HD dose uses the loading dose when useLoading is checked');
  ok(parseFloat(doseRows[1].querySelector('.dose-mg').value)===750, 'subsequent HD doses revert to the maintenance dose');
  $('useLoading').checked = false;

  // ---- PM slot sanity: dose still lands at the fixed time on the session's calendar day ----
  fireClick($('hdPresetTTS'));
  $('hdSlot').value = 'pm'; fireChange($('hdSlot'));
  $('hdDurationHr').value = '4';
  $('therapyStart').value = '2026-07-06T00:00';
  $('expandTo').value = '2026-07-12T23:59'; // 1 week
  fireClick($('hdGenerateSessionsBtn'));
  fireClick($('expandDosesHD'));
  doseRows = document.querySelectorAll('#doseTable .entry-row');
  ok(doseRows.length === 3, `PM-slot 二四六 pattern over 1 week -> 3 doses (got ${doseRows.length})`);
  ok(Array.from(doseRows).every(r=>r.querySelector('.dose-date').value.endsWith('T21:00')),
    'PM-session doses still land at the fixed 21:00, independent of the 13:00–17:00 session window');

  // ---- patient save/load round-trip for the new HD scheduling fields ----
  fireClick($('hdPresetMWF'));
  $('hdSlot').value = 'pm'; fireChange($('hdSlot'));
  $('hdSlotStart').value = '14:00';
  $('hdDurationHr').value = '3.5';
  $('hdFixedTime').value = '20:30';
  $('patientLabel').value = 'TEST_HD_PATIENT_001';
  fireClick($('savePatientBtn'));
  ok(($('patientMeta').textContent||'').includes('已存為新收案'), 'HD patient record saved via the normal save flow');

  // mutate the on-screen form away from the saved values
  $('hdSlot').value = 'am'; $('hdSlotStart').value = '08:00'; $('hdDurationHr').value = '4'; $('hdFixedTime').value = '21:00';
  [1,3,5].forEach(d=>{ $('hdDay'+d).checked = false; });
  [0,2,4,6].forEach(d=>{ $('hdDay'+d).checked = true; });

  const patientSelect = $('patientSelect');
  const savedOption = Array.from(patientSelect.options).find(o=>o.textContent.includes('TEST_HD_PATIENT_001'));
  ok(!!savedOption, 'the saved HD patient appears in the patient dropdown');
  if(savedOption){
    patientSelect.value = savedOption.value;
    fireClick($('loadPatientBtn'));
    ok($('hdSlot').value==='pm' && $('hdSlotStart').value==='14:00' && $('hdDurationHr').value==='3.5',
      'loading the saved patient restores slot/start/duration');
    ok($('hdFixedTime').value==='20:30', 'loading the saved patient restores hdFixedTime');
    ok($('hdDay1').checked && $('hdDay3').checked && $('hdDay5').checked && !$('hdDay2').checked,
      'loading the saved patient restores the Mon/Wed/Fri weekday pattern');

    // ---- backward compatibility: an OLD-style saved record (hdOffsetMin, no new fields) ----
    const KEY = 'vanco_tdm_patients_v2';
    const list = JSON.parse(window.localStorage.getItem(KEY));
    const patientRec = list.find(p=>p.id===savedOption.value);
    const rec = patientRec.visits[patientRec.visits.length-1];
    const oldStyleData = Object.assign({}, rec.data);
    delete oldStyleData.hdFixedTime; delete oldStyleData.hdDayPattern;
    delete oldStyleData.hdSlot; delete oldStyleData.hdSlotStart; delete oldStyleData.hdDurationHr;
    oldStyleData.hdOffsetMin = '30'; // what a pre-this-round record actually had
    rec.data = oldStyleData;
    window.localStorage.setItem(KEY, JSON.stringify(list));

    let threw = false;
    try { fireClick($('loadPatientBtn')); } catch(e){ threw = true; console.log('loading old-style record threw:', e.message); }
    ok(!threw, 'loading an old-style record (hdOffsetMin, no hdFixedTime) does not throw');
    ok($('hdFixedTime').value==='21:00', 'old-style record without hdFixedTime falls back to the 21:00 default');
    ok($('hdDay1').checked && $('hdDay3').checked && $('hdDay5').checked,
      'old-style record without hdDayPattern falls back to the Mon/Wed/Fri default');

    fireClick($('deletePatientBtn')); // cleanup
  }

  $('dialysis').value = 'none'; fireChange($('dialysis'));
  ok($('hdDoseFields').style.display === 'none', 'switching dialysis back to none hides hdDoseFields again');

  // =================================================================
  // AMINOGLYCOSIDE
  // =================================================================

  // ---- switching amgDialysis to HD nudges scheduleType to 'tiw' and defaults amgTiwTime ----
  $('amgScheduleType').value = 'fixed'; fireChange($('amgScheduleType'));
  $('amgTiwTime').value = '09:00';
  $('amgDialysis').value = 'HD';
  fireChange($('amgDialysis'));
  ok($('amgScheduleType').value === 'tiw', 'switching amgDialysis to HD auto-switches scheduleType to 每週固定星期 (tiw)');
  ok($('amgTiwTime').value === '21:00', 'amgTiwTime defaults to 21:00 on switching to HD (was still the generic 09:00 default)');
  ok($('amgTiwRow').style.display === 'block', 'amgTiwRow becomes visible');
  ok($('amgHdScheduleBlock').style.display === 'block', 'amgHdScheduleBlock becomes visible once both tiw AND HD are true');
  ok($('amgFixedIntervalRow').style.display === 'none', 'the normal fixed-interval field row hides (existing tiw-toggle behavior, unaffected)');

  // ---- does not clobber an already-customized amgTiwTime ----
  $('amgDialysis').value = 'none'; fireChange($('amgDialysis'));
  $('amgScheduleType').value = 'tiw'; fireChange($('amgScheduleType'));
  $('amgTiwTime').value = '18:00'; // user's own custom time, deliberately not the 09:00 default
  $('amgDialysis').value = 'HD'; fireChange($('amgDialysis'));
  ok($('amgTiwTime').value === '18:00', 'a user-customized amgTiwTime is NOT overwritten when switching to HD');

  // ---- amgHdScheduleBlock hides again if scheduleType is switched away from tiw, even if still HD ----
  $('amgScheduleType').value = 'fixed'; fireChange($('amgScheduleType'));
  ok($('amgHdScheduleBlock').style.display === 'none', 'amgHdScheduleBlock hides when scheduleType switches back to fixed, even while amgDialysis is still HD');
  $('amgScheduleType').value = 'tiw'; fireChange($('amgScheduleType'));
  ok($('amgHdScheduleBlock').style.display === 'block', 'amgHdScheduleBlock reappears once scheduleType is tiw again (still HD)');

  // ---- weekday preset buttons act on the SAME amgTiwDay checkboxes used for dosing ----
  fireClick($('amgTiwPresetMWF'));
  ok($('amgTiwDay1').checked && $('amgTiwDay3').checked && $('amgTiwDay5').checked && !$('amgTiwDay2').checked,
    '套用一三五 (amino) checks Mon/Wed/Fri on the shared amgTiwDay checkboxes');
  fireClick($('amgTiwPresetTTS'));
  ok($('amgTiwDay2').checked && $('amgTiwDay4').checked && $('amgTiwDay6').checked && !$('amgTiwDay1').checked,
    '套用二四六 (amino) checks Tue/Thu/Sat');
  fireClick($('amgTiwPresetMWF'));

  // ---- batch-generate the aminoglycoside HD session table (record-only; does not touch dosing) ----
  $('amgHdSlot').value = 'am'; fireChange($('amgHdSlot'));
  ok($('amgHdSlotStart').value === '08:00', 'amino 選上午 defaults start time to 08:00');
  $('amgHdDurationHr').value = '4';
  $('amgTherapyStart').value = '2026-07-06T00:00';
  $('amgExpandTo').value = '2026-07-19T23:59';
  $('amgTiwTime').value = '21:00';

  const amgDoseTableSnapshotBefore = document.getElementById('amgDoseTable').innerHTML;
  fireClick($('amgHdGenerateSessionsBtn'));
  const amgHdRows = document.querySelectorAll('#amgHdSessionTable .entry-row');
  ok(amgHdRows.length === 6, `aminoglycoside HD session table gets 6 MWF sessions (got ${amgHdRows.length})`);
  ok(document.getElementById('amgDoseTable').innerHTML === amgDoseTableSnapshotBefore,
    'generating the HD session table does NOT itself touch amgDoseTable (that still needs the explicit expand-doses step)');

  // manual add row for the amino HD session table
  fireClick($('addAmgHdSessionRow'));
  ok(document.querySelectorAll('#amgHdSessionTable .entry-row').length === 7, '+ 手動新增一次透析時程 (amino) adds one row on top of the generated ones');
  document.querySelectorAll('#amgHdSessionTable .entry-row')[6].querySelector('.row-del').click();
  ok(document.querySelectorAll('#amgHdSessionTable .entry-row').length === 6, 'row delete (×) works on the amino HD session table');

  // ---- the EXISTING (unmodified) tiw dose-expansion engine drives actual dosing from the
  //      SAME weekday checkboxes + amgTiwTime — confirming the single-entry design ----
  $('amgMaintDose').value = '400';
  $('amgMaintInf').value = '30';
  fireClick($('amgExpandDoses'));
  const amgDoseRows = document.querySelectorAll('#amgDoseTable .entry-row');
  ok(amgDoseRows.length === 6, `依上述處方自動展開給藥紀錄 (tiw branch) yields 6 doses from the same MWF pattern (got ${amgDoseRows.length})`);
  amgDoseRows.forEach(row=>{
    const v = row.querySelector('.dose-date').value;
    ok(v.endsWith('T21:00'), `amino HD dose lands at 21:00 (got ${v})`);
    ok([1,3,5].includes(new Date(v).getDay()), 'amino HD dose falls on Mon/Wed/Fri, matching the session table pattern');
  });

  // ---- aminoglycoside patient save/load round-trip for the new fields ----
  $('amgHdSlot').value = 'pm'; fireChange($('amgHdSlot'));
  $('amgHdSlotStart').value = '13:30';
  $('amgHdDurationHr').value = '4.5';
  $('amgPatientLabel').value = 'TEST_AMG_HD_PATIENT_001';
  fireClick($('amgSavePatientBtn'));
  ok(($('amgPatientMeta').textContent||'').includes('已存為新收案'), 'amino HD patient record saved');

  document.querySelectorAll('#amgHdSessionTable .entry-row').forEach(r=>r.remove());
  $('amgHdSlot').value = 'am';

  const amgPatientSelect = $('amgPatientSelect');
  const amgSavedOption = Array.from(amgPatientSelect.options).find(o=>o.textContent.includes('TEST_AMG_HD_PATIENT_001'));
  ok(!!amgSavedOption, 'the saved amino HD patient appears in its patient dropdown');
  if(amgSavedOption){
    amgPatientSelect.value = amgSavedOption.value;
    fireClick($('amgLoadPatientBtn'));
    ok($('amgHdSlot').value==='pm' && $('amgHdSlotStart').value==='13:30' && $('amgHdDurationHr').value==='4.5',
      'loading the amino HD patient restores slot/start/duration');
    ok(document.querySelectorAll('#amgHdSessionTable .entry-row').length===6,
      'loading the amino HD patient restores amgHdSessionRows into the table');

    // backward compatibility: a record with none of the new amgHd fields at all
    const AKEY = 'amino_tdm_patients_v2';
    const alist = JSON.parse(window.localStorage.getItem(AKEY));
    const amgPatientRec = alist.find(p=>p.id===amgSavedOption.value);
    const arec = amgPatientRec.visits[amgPatientRec.visits.length-1];
    const bareData = Object.assign({}, arec.data);
    delete bareData.amgHdSlot; delete bareData.amgHdSlotStart; delete bareData.amgHdDurationHr; delete bareData.amgHdSessionRows;
    arec.data = bareData;
    window.localStorage.setItem(AKEY, JSON.stringify(alist));
    let threwAmg = false;
    try { fireClick($('amgLoadPatientBtn')); } catch(e){ threwAmg = true; console.log('amino old-style load threw:', e.message); }
    ok(!threwAmg, 'loading an amino record without any amgHd fields does not throw');
    ok($('amgHdSlot').value==='am', 'missing amgHdSlot falls back to the am default');

    fireClick($('amgDeletePatientBtn')); // cleanup
  }

  $('amgDialysis').value = 'none'; fireChange($('amgDialysis'));

  // =================================================================
  // clearAllFn / clearAllFnAmg reset the new fields (via the shared reset button,
  // switching the active module tab first since the button is context-sensitive)
  // =================================================================
  document.querySelector('.drug-switch-btn[data-drug="vancomycin"]').click();
  $('dialysis').value = 'HD'; fireChange($('dialysis'));
  fireClick($('clearAllBtn'));
  ok($('hdFixedTime').value==='21:00', 'clearAllFn resets hdFixedTime to the 21:00 default');
  ok($('hdDay1').checked && !$('hdDay2').checked, 'clearAllFn resets the weekday pattern to Mon/Wed/Fri');
  ok(document.querySelectorAll('#hdSessionTable .entry-row').length===0, 'clearAllFn empties hdSessionTable');
  ok($('dialysis').value==='none', 'clearAllFn resets dialysis to none');

  document.querySelector('.drug-switch-btn[data-drug="aminoglycoside"]').click();
  $('amgDialysis').value = 'HD'; fireChange($('amgDialysis'));
  fireClick($('clearAllBtn'));
  ok($('amgHdSlot').value==='am', 'clearAllFnAmg resets amgHdSlot to the am default');
  ok(document.querySelectorAll('#amgHdSessionTable .entry-row').length===0, 'clearAllFnAmg empties amgHdSessionTable');
  ok($('amgDialysis').value==='none', 'clearAllFnAmg resets amgDialysis to none');
  ok($('amgTiwDay1').checked && $('amgTiwDay3').checked && $('amgTiwDay5').checked, 'clearAllFnAmg resets amgTiwDay pattern to the Mon/Wed/Fri default');

  // =================================================================
  console.log(`\n${pass} passed, ${fail} failed`);
  console.log(fail===0 ? 'ALL TESTS PASSED — DONE OK' : 'SOME TESTS FAILED');
  if(fail>0) process.exitCode = 1;
}, 100);
