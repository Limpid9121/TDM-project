// test_amg_prospective_fix.js
// Regression test for F-1: renderProspectiveAmg() used an undeclared `drug` variable
// (ctx destructuring was missing it), which threw a ReferenceError as soon as AMG was
// in "prescription only, no dosing history yet" state -- the prospective population-PK
// prediction path. Reproduces the exact repro steps from docs/UIUX_IMPL_SPEC_v1.md
// WP0.3: switch to AMG, clear, fill age/height/weight + one SCr, fill a planned
// maintenance regimen, do NOT expand a dosing history -> must not throw, and the
// candidate regimen table must actually render rows.
//
// Run via: node test_amg_prospective_fix.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

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

  // count any uncaught script errors (this is how F-1's ReferenceError originally
  // surfaced: jsdom reports it via the window error event / console, but does not
  // throw synchronously out of dispatchEvent, so we must listen for it explicitly)
  let errCount = 0;
  const errMsgs = [];
  win.addEventListener('error', (e) => { errCount++; errMsgs.push(e.message || String(e.error)); });
  win.confirm = () => true; // jsdom has no native confirm(); clearAllFnAmg's guard needs it

  // switch to the aminoglycoside module the way a user would
  const amgBtn = Array.from(doc.querySelectorAll('.drug-switch-btn')).find(b => b.dataset.drug === 'aminoglycoside');
  assert(!!amgBtn && !amgBtn.disabled, 'aminoglycoside switcher button exists and is enabled');
  amgBtn.click();
  assert(doc.getElementById('drug-aminoglycoside').classList.contains('active'), 'aminoglycoside module becomes the active panel');

  // clear the module (demo/default values would otherwise mask the repro)
  doc.getElementById('clearAllBtn').click();
  assert(doc.getElementById('amgAge').value === '', 'module cleared: age field is blank');
  assert(doc.getElementById('amgMaintDose').value === '', 'module cleared: maintenance dose field is blank');
  assert(doc.querySelectorAll('#amgScrTable .entry-row').length === 0, 'module cleared: no SCr rows remain');

  // repro steps per docs/UIUX_IMPL_SPEC_v1.md WP0.3
  setAndFire(win, doc, 'amgAge', '60');
  setAndFire(win, doc, 'amgHeight', '170');
  setAndFire(win, doc, 'amgTbw', '70');

  doc.getElementById('amgAddScrRow').click();
  const scrRow = doc.querySelector('#amgScrTable .entry-row');
  assert(!!scrRow, 'one SCr row was added');
  const scrDate = scrRow.querySelector('.scr-date');
  const scrVal = scrRow.querySelector('.scr-val');
  scrDate.value = '2026-09-20';
  scrDate.dispatchEvent(new win.Event('input', { bubbles: true }));
  scrVal.value = '1.0';
  scrVal.dispatchEvent(new win.Event('input', { bubbles: true }));

  // planned maintenance regimen only -- deliberately do NOT expand a dosing history
  // (amgDoseTable stays empty), which is what puts renderProspectiveAmg on the
  // prospective (pre-dose) population-PK path where F-1 fired
  setAndFire(win, doc, 'amgMaintDose', '400');
  setAndFire(win, doc, 'amgMaintInf', '30');
  setAndFire(win, doc, 'amgMaintInterval', '24');

  assert(doc.querySelectorAll('#amgDoseTable .entry-row').length === 0, 'no dosing history rows were added (staying on the prospective/pre-dose path)');

  assert(errCount === 0, `no uncaught script errors after filling the prospective-only scenario (got ${errCount}: ${errMsgs.join(' | ')})`);
  const regimenRows = doc.querySelectorAll('#amgRegimenTable tbody tr');
  assert(regimenRows.length > 0, `candidate regimen table actually renders rows once a planned regimen + renal function are filled (got ${regimenRows.length})`);

  // WP0.3 option B: renderProspectiveAmg must also thread the already-computed ODD/HDEI
  // suggested-interval (oddSuggestedTau, computed earlier in renderAmino from strategy +
  // exclusion checkboxes + crcl) through to renderRegimenTableAmino on this prospective
  // path too -- not just avoid crashing on it. Switch strategy to ODD/HDEI (still no dosing
  // history: stays on the prospective path) and confirm it renders without error and can
  // surface a "建議" suggestion tag same as the data-fit path does.
  setAndFire(win, doc, 'amgStrategy', 'odd');
  assert(errCount === 0, `no uncaught script errors after switching to ODD/HDEI strategy on the prospective path (got ${errCount}: ${errMsgs.join(' | ')})`);
  const regimenRowsOdd = doc.querySelectorAll('#amgRegimenTable tbody tr');
  assert(regimenRowsOdd.length > 0, `candidate regimen table still renders rows under ODD/HDEI strategy on the prospective path (got ${regimenRowsOdd.length})`);
  const regimenHtmlOdd = doc.querySelector('#amgRegimenTable tbody').innerHTML;
  const flagHtmlOdd = doc.getElementById('amgFlagList').innerHTML;
  assert(/建議/.test(regimenHtmlOdd) || /建議起始間隔|不建議 ODD/.test(flagHtmlOdd),
    'ODD suggested-interval reasoning (a "建議" tag on a candidate row, or the ODD-suitability flag text) reaches the prospective view same as it already did on the data-fit view -- confirms oddSuggestedTau is actually threaded through, not just defaulted to a harmless null');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
