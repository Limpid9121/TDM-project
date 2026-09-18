// test_aed_integration_p2.js
// End-to-end smoke test through the REAL DOM wiring for the AED module's P2 additions:
// card 07 (steady-state dose/level pairs for the two-point method), the phenytoin
// Michaelis-Menten results panel (single-point vs two-point, Km sensitivity band,
// candidate-dose table with radio pick), and the VPA proportional-dose panel (both the
// "gives a number" and "withheld with direction" branches). Also covers the save/load
// round-trip of the new fields (ssPairs, pickedCandidate).
// Run via: node test_aed_integration_p2.js

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

  const aedBtn = Array.from(doc.querySelectorAll('.drug-switch-btn')).find(b => b.dataset.drug === 'aed');
  aedBtn.click();
  assert(doc.getElementById('drug-aed').classList.contains('active'), 'aed module active after clicking its switcher button');

  // ---- default state: phenytoin, regimen started 10 days ago -> already steady ----
  assert(doc.getElementById('aedDrug').value === 'phenytoin', 'default drug is phenytoin');
  assert(doc.getElementById('aedSsPairsCard').style.display !== 'none', 'card 07 (ss pairs) visible for phenytoin');
  assert(doc.getElementById('aedPkBlock').style.display !== 'none', 'phenytoin PK block visible by default');
  assert(doc.getElementById('aedVpaDoseBlock').style.display === 'none', 'VPA dose block hidden while phenytoin selected');

  // ---- single-point MM: dose 300mg/day (S=1.0, Aleviatin Tablet), total level 8, no albumin ----
  setAndFire(win, doc, 'aedDose', '300');
  setAndFire(win, doc, 'aedLevelType', 'total');
  setAndFire(win, doc, 'aedLevelValue', '8');

  let pkHtml = doc.getElementById('aedPkContent').innerHTML;
  assert(/單點法/.test(pkHtml), 'single-point method is used when card 07 has no confirmed two-different-dose pairs');
  assert(/Km 候選值來源/.test(pkHtml), 'Km sensitivity table is rendered');
  // Vmax = R*(Km+Css)/Css = 300*(4+8)/8 = 450 (population Km=4)
  assert(/450/.test(pkHtml), 'single-point Vmax (~450 mg/day at population Km=4) appears in the panel');
  assert(/候選劇量/.test(pkHtml) || doc.getElementById('aedPkContent').querySelectorAll('.aed-cand-radio').length > 0,
    'candidate-dose table with radio picks is rendered');

  const radios = Array.from(doc.querySelectorAll('#aedPkContent .aed-cand-radio'));
  assert(radios.length >= 3, `candidate dose table has at least 3 rows (got ${radios.length})`);

  // ---- pick a candidate via the delegated #aedPkBlock change listener ----
  radios[0].checked = true;
  radios[0].dispatchEvent(new win.Event('change', { bubbles: true }));
  pkHtml = doc.getElementById('aedPkContent').innerHTML;
  assert(doc.querySelector('#aedPkContent tr.picked') !== null, 'picking a candidate radio marks its row with the .picked class after re-render');

  let promptText = doc.getElementById('aedAiPromptOut').value;
  assert(/藥師已勾選候選劇量/.test(promptText), 'AI prompt reflects the picked candidate dose');
  assert(/PK／劇量估算/.test(promptText), 'AI prompt includes the new PK/dose-estimate section header');
  assert(!/尚未提供 phenytoin MM 劑量推估/.test(promptText), 'stale P1-era "not yet provided" disclaimer is gone now that P2 ships MM dosing');

  // ---- card 07: add two confirmed rows with different doses -> two-point method activates ----
  doc.getElementById('aedAddSsPairBtn').click();
  doc.getElementById('aedAddSsPairBtn').click();
  const rows = Array.from(doc.querySelectorAll('#aedSsPairsTable .entry-row'));
  assert(rows.length === 2, 'two rows added to card 07');

  function fillSsRow(row, date, dose, level, confirmed) {
    setAndFireEl(row.querySelector('.ssp-date'), date);
    setAndFireEl(row.querySelector('.ssp-dose'), dose);
    setAndFireEl(row.querySelector('.ssp-level'), level);
    row.querySelector('.ssp-confirmed').checked = confirmed;
    row.querySelector('.ssp-confirmed').dispatchEvent(new win.Event('change', { bubbles: true }));
  }
  function setAndFireEl(el, value) {
    el.value = value;
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  }

  fillSsRow(rows[0], '2026-09-08', '300', '8', true);
  fillSsRow(rows[1], '2026-09-15', '400', '20', true);

  pkHtml = doc.getElementById('aedPkContent').innerHTML;
  assert(/兩點法/.test(pkHtml), 'two-point method activates once card 07 has two confirmed rows with different doses');
  assert(/5\.7/.test(pkHtml), 'two-point Km (~5.71) appears in the panel');
  // Vmax = R1 + Km*R1/C1 with R=S*dose, S=1.0 for the default PO tablet (Aleviatin Tablet, acid salt) -> 300+5.71*37.5 = ~514
  assert(/514/.test(pkHtml), 'two-point Vmax (~514, S=1.0 for the default PO tablet) appears in the panel');

  // uncheck one row's confirmation -> falls back to single-point again
  rows[1].querySelector('.ssp-confirmed').checked = false;
  rows[1].querySelector('.ssp-confirmed').dispatchEvent(new win.Event('change', { bubbles: true }));
  pkHtml = doc.getElementById('aedPkContent').innerHTML;
  assert(/單點法/.test(pkHtml), 'unconfirming a row drops back to single-point (only 1 confirmed row left)');
  assert(/只有 1 列已確認達穩態/.test(pkHtml), 'panel explains why two-point is unavailable with only 1 confirmed row');

  // ---- not-yet-steady gating: push regimen start to "yesterday" -> PK block should say "not steady" ----
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 3600000);
  function toLocalInputValue(d) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  setAndFire(win, doc, 'aedRegimenStart', toLocalInputValue(yesterday));
  pkHtml = doc.getElementById('aedPkContent').innerHTML;
  assert(/尚未確認達穩態/.test(pkHtml), 'PK panel refuses to compute MM dosing when not yet at steady state');
  // restore steady state for the rest of the test
  setAndFire(win, doc, 'aedRegimenStart', toLocalInputValue(new Date(now.getTime() - 10 * 24 * 3600000)));

  // ---- switch to valproate: proportional dose, no risk flags -> gives a number ----
  setAndFire(win, doc, 'aedDrug', 'valproate');
  assert(doc.getElementById('aedVpaDoseBlock').style.display !== 'none', 'VPA dose block visible after switching to valproate');
  assert(doc.getElementById('aedPkBlock').style.display === 'none', 'phenytoin PK block hidden after switching to valproate');

  setAndFire(win, doc, 'aedDose', '500');
  setAndFire(win, doc, 'aedTauH', '12');
  setAndFire(win, doc, 'aedLevelType', 'total');
  setAndFire(win, doc, 'aedLevelValue', '60');

  let vpaHtml = doc.getElementById('aedVpaDoseContent').innerHTML;
  assert(/比例估算/.test(vpaHtml) && /mg\/day/.test(vpaHtml), 'VPA proportional dose gives a concrete number when no risk flags are present');
  promptText = doc.getElementById('aedAiPromptOut').value;
  assert(/比例劇量估算：/.test(promptText), 'AI prompt reflects the VPA proportional dose estimate');

  // ---- trigger a free-fraction risk flag (propofol) -> number withheld, direction-only ----
  setAndFire(win, doc, 'aedPropofol', true);
  vpaHtml = doc.getElementById('aedVpaDoseContent').innerHTML;
  assert(/不提供具體劇量數字/.test(vpaHtml), 'VPA proportional dose is withheld once a free-fraction risk flag is active');
  assert(/方向：/.test(vpaHtml), 'a direction-only recommendation is still shown when withheld');
  promptText = doc.getElementById('aedAiPromptOut').value;
  assert(/比例劇量估算已因風險因子暫停/.test(promptText), 'AI prompt reflects that the proportional estimate was withheld, with the reason');
  setAndFire(win, doc, 'aedPropofol', false);

  // ---- save/load round-trip: ssPairs and pickedCandidate must survive ----
  // restore the phenytoin scenario's own dose/level (the valproate steps above changed
  // aedDose/aedTauH/aedLevelValue to 500/12/60, which belong to the valproate branch)
  setAndFire(win, doc, 'aedDrug', 'phenytoin');
  setAndFire(win, doc, 'aedDose', '300');
  setAndFire(win, doc, 'aedTauH', '24');
  setAndFire(win, doc, 'aedLevelType', 'total');
  setAndFire(win, doc, 'aedLevelValue', '8');
  const freshRadios = Array.from(doc.querySelectorAll('#aedPkContent .aed-cand-radio'));
  assert(freshRadios.length > 0, 'candidate radios re-render after restoring the phenytoin dose/level scenario');
  freshRadios[0].checked = true;
  freshRadios[0].dispatchEvent(new win.Event('change', { bubbles: true }));
  const pickedKeyBeforeSave = freshRadios[0].value;

  setAndFire(win, doc, 'aedPatientLabel', 'TESTAEDP2001');
  doc.getElementById('aedSavePatientBtn').click();
  const metaAfterSave = doc.getElementById('aedPatientMeta').textContent;
  assert(/已存為新收案/.test(metaAfterSave), 'patient save (with P2 fields in state) produces a confirmation message');

  // clear the screen, then reload the saved visit
  win.confirm = () => true; // jsdom has no native confirm(); loadSelected()'s guard needs it
  doc.getElementById('clearAllBtn').click();
  assert(doc.querySelectorAll('#aedSsPairsTable .entry-row').length === 0, 'clear button empties card 07');

  setAndFire(win, doc, 'aedPatientSelect', Array.from(doc.getElementById('aedPatientSelect').options).find(o => /TESTAEDP2001/.test(o.textContent)).value);
  doc.getElementById('aedLoadPatientBtn').click();
  const metaAfterLoad = doc.getElementById('aedPatientMeta').textContent;
  assert(/已載入/.test(metaAfterLoad), 'patient load produces a confirmation message');
  const reloadedRows = doc.querySelectorAll('#aedSsPairsTable .entry-row');
  assert(reloadedRows.length === 2, `card 07's 2 rows are restored on load (got ${reloadedRows.length})`);
  assert(doc.querySelector('#aedPkContent tr.picked') !== null, 'the previously-picked candidate dose is restored and re-marked as .picked on load');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
