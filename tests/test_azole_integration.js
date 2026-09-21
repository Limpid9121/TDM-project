// test_azole_integration.js
// End-to-end smoke test through the REAL DOM wiring for the azole module.
// Run via: node test_azole_integration.js

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

  // switch to the azole module the way a user would (via the drug-switch button)
  const azoleBtn = Array.from(doc.querySelectorAll('.drug-switch-btn')).find(b => b.dataset.drug === 'azole');
  assert(!!azoleBtn && !azoleBtn.disabled, 'azole switcher button exists and is enabled (not "coming soon")');
  azoleBtn.click();
  assert(doc.getElementById('drug-azole').classList.contains('active'), 'azole module becomes the active panel after clicking its switcher button');

  // default state sanity
  assert(doc.getElementById('azlDrug').value === 'voriconazole', 'default drug is voriconazole');
  assert(doc.getElementById('azlFreq').value === 'bid', 'voriconazole defaults to BID');
  assert(doc.getElementById('azlDosePmField').style.display !== 'none', 'PM dose field visible for BID');
  assert(doc.getElementById('azlVoriSubtable').style.display !== 'none', 'voriconazole subtable visible by default');
  assert(doc.getElementById('azlIsaSubtable').style.display === 'none', 'isavuconazole subtable hidden when voriconazole selected');

  // enter a low trough for voriconazole treatment indication, with steady state already reached (default therapy start is 6 days ago)
  setAndFire(win, doc, 'azlIndication', 'treatment');
  setAndFire(win, doc, 'azlFormulation', 'po');
  setAndFire(win, doc, 'azlTroughVal', '0.7');

  let flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/低於目標下限/.test(flagsHtml), 'low voriconazole trough (0.7 < 1.0 treatment floor) is flagged');

  let paramHtml = doc.getElementById('azlParamGrid').innerHTML;
  assert(paramHtml.includes('flag-warn'), 'trough param cell shows flag-warn styling when below target');

  // dose suggestion block should now be visible with achievable PO candidates (voriconazole PO, BID, 200/200 default)
  assert(doc.getElementById('azlDoseSuggestBlock').style.display !== 'none', 'dose suggestion block appears for a warn-level trough once steady');
  let doseHtml = doc.getElementById('azlDoseSuggestList').innerHTML;
  assert(/總日劑量/.test(doseHtml), 'dose suggestion lists concrete total-daily-dose candidates');
  assert(/早上.*晚上|每日一次/.test(doseHtml), 'dose suggestion gives AM/PM (or QD) breakdown, not just a total number');

  // now test the "read the patient" cross-check: mark infection as worsening via imaging
  setAndFire(win, doc, 'azlImaging', 'growing');
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/影像學顯示病灶增大/.test(flagsHtml), 'worsening imaging is named specifically in the flag list');
  assert(/即使濃度落在目標區間內/.test(flagsHtml) || /建議以臨床整體評估為主/.test(flagsHtml), 'cross-check override message present when infection is worsening');

  // reset imaging, test toxicity alert path: hallucination should fire regardless of trough
  setAndFire(win, doc, 'azlImaging', '');
  setAndFire(win, doc, 'azlTroughVal', '3.0'); // well within normal range
  setAndFire(win, doc, 'azlSxHallucination', true);
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/神經毒性徵候/.test(flagsHtml), 'hallucination triggers a neurotoxicity alert even with an in-range trough');
  setAndFire(win, doc, 'azlSxHallucination', false);

  // switch to posaconazole, confirm subtable/formulation swap and suspension special-case
  setAndFire(win, doc, 'azlDrug', 'posaconazole');
  assert(doc.getElementById('azlVoriSubtable').style.display === 'none', 'voriconazole subtable hidden after switching to posaconazole');
  assert(doc.getElementById('azlPosaSigns').style.display !== 'none', 'posaconazole-specific toxicity signs visible');
  assert(doc.getElementById('azlFreq').value === 'qd', 'posaconazole defaults to QD');

  const formOptions = Array.from(doc.getElementById('azlFormulation').options).map(o => o.value);
  assert(formOptions.includes('suspension'), 'suspension remains a selectable (non-default) formulation option');
  assert(formOptions.includes('tablet'), 'delayed-release tablet is a formulation option');

  // posaconazole pseudohyperaldosteronism named-combination check
  setAndFire(win, doc, 'azlSxHtn', true);
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(!/建議加驗 renin/.test(flagsHtml), 'a single pseudohyperaldosteronism-related sign alone does not fire the named alert (only the benign "not yet met" note)');
  assert(/單一項目，未達假性醛固酮增多症具名組合門檻/.test(flagsHtml), 'single sign instead produces the benign "not yet at combination threshold" note');
  setAndFire(win, doc, 'azlSxEdema', true);
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/建議加驗 renin/.test(flagsHtml), 'two pseudohyperaldosteronism-related signs together DO fire the named alert with the confirmatory-lab recommendation');
  setAndFire(win, doc, 'azlSxHtn', false);
  setAndFire(win, doc, 'azlSxEdema', false);

  // isavuconazole: dose-suggestion block must NEVER appear (spec: no dosing-magnitude advice for this drug)
  setAndFire(win, doc, 'azlDrug', 'isavuconazole');
  assert(doc.getElementById('azlIsaBanner').style.display !== 'none', 'isavuconazole "TDM not routine" banner shown');
  setAndFire(win, doc, 'azlTroughVal', '6.0'); // above the 4.6-5.1 toxicity zone
  assert(/本工具不提供 isavuconazole 的劑量調整幅度建議/.test(doc.getElementById('azlDoseSuggestList').textContent) && !/mg/.test(doc.getElementById('azlDoseSuggestList').textContent), 'isavuconazole never shows a dose-adjustment-magnitude suggestion, even with an out-of-range trough (block stays visible but explains why; no mg magnitude)');
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/毒性關切區間/.test(flagsHtml), 'isavuconazole high trough still flags the toxicity concern zone');

  // CYP interaction detection through the actual concomitant-meds textarea
  setAndFire(win, doc, 'azlDrug', 'voriconazole');
  setAndFire(win, doc, 'azlConcomitant', 'Tacrolimus 1mg BID\nRifampin 600mg QD');
  flagsHtml = doc.getElementById('azlFlagList').innerHTML;
  assert(/tacrolimus/.test(flagsHtml), 'concomitant-med textarea feeds into the rendered interaction flags (tacrolimus)');
  assert(/rifampin/.test(flagsHtml), 'concomitant-med textarea feeds into the rendered interaction flags (rifampin inducer)');

  // AI prompt reflects current state
  const promptText = doc.getElementById('azlAiPromptOut').value;
  assert(promptText.includes('Voriconazole'), 'AI prompt includes the current drug');
  assert(promptText.length > 100, 'AI prompt is a substantive structured document, not a stub');

  // patient save/load round-trip
  setAndFire(win, doc, 'azlPatientLabel', 'TEST001');
  doc.getElementById('azlSavePatientBtn').click();
  const metaAfterSave = doc.getElementById('azlPatientMeta').textContent;
  assert(/已存為新收案/.test(metaAfterSave), 'patient save produces a confirmation message');
  const savedRaw = win.localStorage.getItem('azole_tdm_patients_v2');
  assert(!!savedRaw, 'patient record actually persisted to localStorage under its own key (separate from vanco/AMG)');
  const savedList = JSON.parse(savedRaw);
  assert(savedList.length === 1 && savedList[0].label === 'TEST001', 'saved record has the expected label');
  assert(savedList[0].visits[0].data.drug === 'voriconazole', 'saved record captures the current drug selection');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
