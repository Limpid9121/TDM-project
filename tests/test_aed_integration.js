// test_aed_integration.js
// End-to-end smoke test through the REAL DOM wiring for the AED (phenytoin/valproate)
// module. Run via: node test_aed_integration.js

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

  // switch to the aed module the way a user would (via the drug-switch button)
  const aedBtn = Array.from(doc.querySelectorAll('.drug-switch-btn')).find(b => b.dataset.drug === 'aed');
  assert(!!aedBtn && !aedBtn.disabled, 'aed switcher button exists and is enabled (not "coming soon")');
  aedBtn.click();
  assert(doc.getElementById('drug-aed').classList.contains('active'), 'aed module becomes the active panel after clicking its switcher button');
  assert(doc.getElementById('appTitle').textContent === '抗癲癇藥物 TDM 判讀引擎', 'header title switches to the AED module title');

  // default state sanity
  assert(doc.getElementById('aedDrug').value === 'phenytoin', 'default drug is phenytoin');
  assert(doc.getElementById('aedPhtSubtable').style.display !== 'none', 'phenytoin subtable visible by default');
  assert(doc.getElementById('aedVpaSubtable').style.display === 'none', 'valproate subtable hidden when phenytoin selected');

  // ---- phenytoin: albumin correction is the suggested candidate (spec §7: 12/2.5 -> 20.0) ----
  setAndFire(win, doc, 'aedAlbumin', '2.5');
  setAndFire(win, doc, 'aedLevelType', 'total');
  setAndFire(win, doc, 'aedLevelValue', '12');
  let corrHtml = doc.getElementById('aedCorrList').innerHTML;
  assert(/【建議採用】白蛋白校正/.test(corrHtml), 'hypoalbuminemia correction is marked as the suggested candidate');
  assert(/20\.00/.test(corrHtml), 'hypoalbuminemia-corrected value 20.00 mcg/mL is shown (12/2.5 albumin)');
  assert(/Cheng 衍生式/.test(corrHtml) && /不參與建議與計算/.test(corrHtml), 'Cheng derivative row appears as a non-actionable grey reference');

  // renal failure correction overrides once dialysis is checked
  setAndFire(win, doc, 'aedDialysis', true);
  corrHtml = doc.getElementById('aedCorrList').innerHTML;
  assert(/【建議採用】腎衰竭校正/.test(corrHtml), 'renal-failure correction becomes the suggested candidate once dialysis is checked');
  assert(/34\.29/.test(corrHtml), 'renal-failure corrected value 34.29 mcg/mL is shown (12/(0.1*2.5+0.1))');
  setAndFire(win, doc, 'aedDialysis', false);

  // HLA-B*15:02 positive fires a danger-level flag
  setAndFire(win, doc, 'aedHlab1502', 'pos');
  let flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/HLA-B\*15:02 陽性/.test(flagsHtml), 'HLA-B*15:02 positive fires the SJS/TEN risk flag');
  setAndFire(win, doc, 'aedHlab1502', '');

  // CYP2C9 poor metabolizer fires a dose-reduction info flag
  setAndFire(win, doc, 'aedCyp2c9', 'PM');
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/CYP2C9 PM.*減 50%/.test(flagsHtml), 'CYP2C9 PM fires the ~50% dose-reduction informational flag');
  setAndFire(win, doc, 'aedCyp2c9', '');

  // toxicity signs -> STAT prompt, regardless of concentration
  setAndFire(win, doc, 'aedSxNystagmus', true);
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/30 分鐘/.test(flagsHtml) && /有中毒證據時應立即測濃度/.test(flagsHtml), 'nystagmus triggers the STAT-level phenytoin toxicity prompt');
  setAndFire(win, doc, 'aedSxNystagmus', false);

  // co-administered VPA switches the suggested candidate to the Haidukewych correction
  setAndFire(win, doc, 'aedVpaLevel', '80');
  corrHtml = doc.getElementById('aedCorrList').innerHTML;
  assert(/【建議採用】Haidukewych/.test(corrHtml), 'Haidukewych VPA co-med correction becomes suggested once a VPA level is entered');
  assert(/21\.00/.test(corrHtml), 'Haidukewych-corrected value 21.00 mcg/mL is shown (total12/vpa80)');
  setAndFire(win, doc, 'aedVpaLevel', '');

  // interaction scan via the concomitant-meds textarea
  setAndFire(win, doc, 'aedConcomitant', 'Depakine Chrono 500mg BID');
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/併用 valproic acid/.test(flagsHtml), 'concomitant-med textarea feeds into the phenytoin interaction flags (valproate mention)');
  setAndFire(win, doc, 'aedConcomitant', '');

  // ---- switch to valproate ----
  setAndFire(win, doc, 'aedDrug', 'valproate');
  assert(doc.getElementById('aedPhtSubtable').style.display === 'none', 'phenytoin subtable hidden after switching to valproate');
  assert(doc.getElementById('aedVpaSubtable').style.display !== 'none', 'valproate subtable visible after switching to valproate');

  setAndFire(win, doc, 'aedLevelType', 'total');
  setAndFire(win, doc, 'aedLevelValue', '70');
  corrHtml = doc.getElementById('aedCorrList').innerHTML;
  assert(/Hermida-Tutor 白蛋白校正/.test(corrHtml), 'Hermida-Tutor gate row is shown for valproate');
  assert(!/normalized/.test(corrHtml), 'Hermida row never leaks a fabricated numeric field name');

  // carbapenem co-administration -> danger flag
  setAndFire(win, doc, 'aedCarbapenem', true);
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/併用 carbapenem/.test(flagsHtml), 'carbapenem checkbox fires the VPA-carbapenem interaction danger flag');
  setAndFire(win, doc, 'aedCarbapenem', false);

  // encephalopathy sign -> ammonia-check danger flag, independent of total level
  setAndFire(win, doc, 'aedSxEncephalopathy', true);
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/高血氨腦病/.test(flagsHtml) && /ammonia/.test(flagsHtml), 'encephalopathy sign fires the hyperammonemic-encephalopathy flag with an ammonia recommendation');
  setAndFire(win, doc, 'aedSxEncephalopathy', false);

  // pregnancy -> teratogenicity danger flag
  setAndFire(win, doc, 'aedPregnancy', 'pregnant');
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/致畸性/.test(flagsHtml), 'pregnancy fires the VPA teratogenicity flag');
  setAndFire(win, doc, 'aedPregnancy', 'no');

  // VPA interaction scan: carbapenem mention in free text
  setAndFire(win, doc, 'aedConcomitant', 'Meropenem 1g q8h');
  flagsHtml = doc.getElementById('aedFlagList').innerHTML;
  assert(/VPA 濃度可在數日內大幅下降/.test(flagsHtml), 'concomitant-med textarea feeds into the valproate interaction flags (carbapenem mention)');
  setAndFire(win, doc, 'aedConcomitant', '');

  // AI prompt reflects current state
  const promptText = doc.getElementById('aedAiPromptOut').value;
  assert(promptText.includes('Valproic Acid'), 'AI prompt includes the current drug');
  assert(promptText.length > 100, 'AI prompt is a substantive structured document, not a stub');

  // lab schedule / TAT reminders are static text, never computed dates
  const monitorHtml = doc.getElementById('aedMonitorGrid').innerHTML;
  assert(/週二、週五/.test(monitorHtml) && /3 天/.test(monitorHtml), 'VPA free-level schedule note (W2/W5, 3-day TAT) appears verbatim in the monitor grid');
  assert(!/下次可送日期|預計報告日/.test(monitorHtml), 'monitor grid never computes a "next available date" (Q11: static text only)');

  // switch back to phenytoin, confirm subtable swap reverses cleanly
  setAndFire(win, doc, 'aedDrug', 'phenytoin');
  assert(doc.getElementById('aedPhtSubtable').style.display !== 'none', 'phenytoin subtable visible again after switching back');
  assert(doc.getElementById('aedVpaSubtable').style.display === 'none', 'valproate subtable hidden again after switching back');

  // patient save/load round-trip (own localStorage key, independent of vanco/AMG/azole)
  setAndFire(win, doc, 'aedPatientLabel', 'TESTAED001');
  doc.getElementById('aedSavePatientBtn').click();
  const metaAfterSave = doc.getElementById('aedPatientMeta').textContent;
  assert(/已存為新收案/.test(metaAfterSave), 'patient save produces a confirmation message');
  const savedRaw = win.localStorage.getItem('aed_tdm_patients_v2');
  assert(!!savedRaw, 'patient record actually persisted to localStorage under its own key (separate from vanco/AMG/azole)');
  if (savedRaw) {
    const savedList = JSON.parse(savedRaw);
    assert(savedList.length === 1 && savedList[0].label === 'TESTAED001', 'saved record has the expected label');
    const visit = savedList[0].visits && savedList[0].visits[0];
    assert(!!visit && visit.data && visit.data.drug === 'phenytoin', 'saved visit captures the current drug selection');
  }

  // clearAllFn wired through the shared clear button + registry dispatch
  const before = doc.getElementById('aedAlbumin').value;
  win.confirm = () => true; // jsdom has no native confirm(); stub it so clearAllFnAed's guard doesn't throw
  doc.getElementById('clearAllBtn').click();
  assert(doc.getElementById('aedAlbumin').value === '', `shared clear button (via DRUG_MODULE_REGISTRY.aed.clear) empties AED fields (was "${before}")`);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
