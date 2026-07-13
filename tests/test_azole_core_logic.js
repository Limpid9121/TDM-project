// test_azole_core_logic.js
// Unit tests for the azole module's pure logic functions — spec sections 3-5.6
// of AZOLE_MODULE_SPEC_v6.md. Run via: node test_azole_core_logic.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}
function assertClose(actual, expected, tol, msg) {
  assert(Math.abs(actual - expected) <= tol, `${msg} (got ${actual}, expected ~${expected})`);
}

async function main() {
  const { exports: X } = await loadHarness();
  const {
    checkAzoleTrough, computeAzoleSteadyState, inferInfectionTrend, classifyToxicitySigns,
    crossCheckClinical, checkCypInteractionsAzole, suggestPoDoseAzole, AZOLE_TARGETS
  } = X;

  // ---------------------------------------------------------------
  // 1. checkAzoleTrough — thresholds (spec section 3)
  // ---------------------------------------------------------------
  // Voriconazole: prophylaxis 0.5-5.5, treatment 1.0-5.5 (prefer 2-5.5), toxicity >5.5
  let r = checkAzoleTrough('voriconazole', 'treatment', 0.9);
  assert(r.tag === 'warn' && r.lowFlag, 'voriconazole treatment: 0.9 below 1.0 floor -> warn/low');

  r = checkAzoleTrough('voriconazole', 'treatment', 1.0);
  assert(r.tag === 'ok', 'voriconazole treatment: exactly 1.0 is NOT below floor -> ok');

  r = checkAzoleTrough('voriconazole', 'prophylaxis', 0.6);
  assert(r.tag === 'ok', 'voriconazole prophylaxis: 0.6 is within 0.5-5.5 -> ok (prophylaxis floor is 0.5, not 1.0)');

  r = checkAzoleTrough('voriconazole', 'treatment', 5.5);
  assert(r.tag === 'ok' && !r.highFlag, 'voriconazole: exactly 5.5 is NOT above the ceiling -> ok');

  r = checkAzoleTrough('voriconazole', 'treatment', 5.6);
  assert(r.tag === 'warn' && r.highFlag, 'voriconazole: 5.6 exceeds 5.5 -> warn/high (neurotoxicity line)');

  r = checkAzoleTrough('voriconazole', 'treatment', 6.0);
  assert(r.tagText.includes('5.5'), 'voriconazole high tagText cites 5.5 (not the old incorrect 6)');

  // Posaconazole: prophylaxis >=0.7, treatment >=1.0 (prefer 2-3), hepato-watch 1.83 (soft), hard ceiling 4
  r = checkAzoleTrough('posaconazole', 'prophylaxis', 0.65);
  assert(r.tag === 'warn' && r.lowFlag, 'posaconazole prophylaxis: 0.65 below 0.7 -> warn');

  r = checkAzoleTrough('posaconazole', 'treatment', 0.9);
  assert(r.tag === 'warn' && r.lowFlag, 'posaconazole treatment: 0.9 below 1.0 -> warn');

  r = checkAzoleTrough('posaconazole', 'treatment', 2.0);
  assert(r.tag === 'ok', 'posaconazole treatment: 2.0 (within preferred 2-3) -> ok, no hard threshold crossed');

  r = checkAzoleTrough('posaconazole', 'treatment', 2.5);
  assert(r.tag === 'ok' && r.notes.some(n => n.includes('1.83')), 'posaconazole: 2.5 (>1.83, <=4) -> tag stays ok, soft note about 1.83 present');

  r = checkAzoleTrough('posaconazole', 'treatment', 4.5);
  assert(r.tag === 'warn' && r.highFlag, 'posaconazole: 4.5 exceeds hard ceiling 4 -> warn');
  assert(r.tagText.includes('4'), 'posaconazole high tagText cites the 4 mg/L ceiling');

  // Isavuconazole: no efficacy floor (>1 descriptive only), toxicity 4.6-5.1
  r = checkAzoleTrough('isavuconazole', 'general', 0.5);
  assert(r.tag === 'ok', 'isavuconazole: 0.5 (below the descriptive "most patients reach >1") is still tag=ok, NOT a warn (not an efficacy floor)');
  assert(r.notes.length > 0, 'isavuconazole low value still produces an informational note, just not a warn');

  r = checkAzoleTrough('isavuconazole', 'general', 3.0);
  assert(r.tag === 'ok', 'isavuconazole: 3.0 is comfortably below the 4.6-5.1 toxicity zone -> ok');

  r = checkAzoleTrough('isavuconazole', 'general', 5.0);
  assert(r.tag === 'warn' && r.highFlag, 'isavuconazole: 5.0 is within/above 4.6-5.1 toxicity zone -> warn');

  // guard: no trough entered
  r = checkAzoleTrough('voriconazole', 'treatment', NaN);
  assert(r.tag === 'ok' && !r.lowFlag && !r.highFlag, 'no trough entered -> tag ok, no flags fired');

  // ---------------------------------------------------------------
  // 2. computeAzoleSteadyState — spec section 4
  // ---------------------------------------------------------------
  const now = Date.parse('2026-07-11T12:00:00');
  let s = computeAzoleSteadyState('voriconazole', now - 6*86400000, now);
  assert(s.applicable && s.isSteady === true, 'voriconazole: 6 days elapsed >= 5-day requirement -> steady');

  s = computeAzoleSteadyState('voriconazole', now - 3*86400000, now);
  assert(s.applicable && s.isSteady === false, 'voriconazole: 3 days elapsed < 5-day requirement -> not steady');

  s = computeAzoleSteadyState('posaconazole', now - 8*86400000, now);
  assert(s.applicable && s.isSteady === true, 'posaconazole: 8 days >= 7-day requirement -> steady');

  s = computeAzoleSteadyState('posaconazole', now - 5*86400000, now);
  assert(s.applicable && s.isSteady === false, 'posaconazole: 5 days < 7-day requirement -> not steady');

  s = computeAzoleSteadyState('isavuconazole', now - 20*86400000, now);
  assert(s.applicable === false, 'isavuconazole: steady-state gate not applicable at all (TDM not routine)');

  s = computeAzoleSteadyState('voriconazole', NaN, now);
  assert(s.isSteady === null, 'no therapy-start date entered -> isSteady is null, not a guess');

  // ---------------------------------------------------------------
  // 3. inferInfectionTrend — spec 5.0.1 (objective inputs -> tool-inferred trend)
  // ---------------------------------------------------------------
  let t = inferInfectionTrend({});
  assert(t.trend === 'unknown', 'no objective inputs at all -> unknown, tool does not guess');

  t = inferInfectionTrend({fever:'improving', anc:'rising'});
  assert(t.trend === 'improving', 'fever improving + ANC rising, no worsening signals -> improving');

  t = inferInfectionTrend({fever:'improving', imaging:'growing'});
  assert(t.trend === 'worsening', 'ANY worsening signal (imaging growing) overrides an improving fever -> worsening (conservative)');
  assert(t.reasons.some(r => r.includes('影像')), 'worsening reason names the imaging finding specifically, not a generic message');

  t = inferInfectionTrend({fever:'na', anc:'na'});
  assert(t.trend === 'unknown', 'all inputs explicitly "not applicable" -> still unknown (no real signal)');

  t = inferInfectionTrend({mycology:'clearing'});
  assert(t.trend === 'improving', 'mycology clearing alone -> improving');

  t = inferInfectionTrend({local:'flat', fever:'persistent'});
  assert(t.trend === 'stable', 'persistent (unchanged) fever alone maps to stable, not worsening — only "worsening" input value counts as a worsening signal');

  t = inferInfectionTrend({fever:'worsening'});
  assert(t.trend === 'worsening', 'explicit new/worsening fever correctly maps to worsening');

  // ---------------------------------------------------------------
  // 4. classifyToxicitySigns — spec 5.0.2 (three-tier)
  // ---------------------------------------------------------------
  let tox = classifyToxicitySigns('voriconazole', {photopsia:true});
  assert(!tox.hasAlert && tox.benign.length===1, 'voriconazole: isolated photopsia is benign-only, does NOT trigger an alert');

  tox = classifyToxicitySigns('voriconazole', {hallucination:true});
  assert(tox.hasAlert, 'voriconazole: hallucination triggers an alert regardless of trough value');

  tox = classifyToxicitySigns('voriconazole', {jaundice:true, darkUrine:true});
  assert(tox.hasAlert && tox.alerts[0].includes('黃疸') && tox.alerts[0].includes('茶色尿'), 'hepatotoxicity alert names the specific signs present');

  tox = classifyToxicitySigns('voriconazole', {skinLesion:true});
  assert(!tox.hasAlert && tox.longTerm.length===1, 'voriconazole: skin lesion is long-term-tracking only, does not fire an acute alert');

  // posaconazole pseudohyperaldosteronism combination logic — the key "named combination" feature
  tox = classifyToxicitySigns('posaconazole', {htn:true});
  assert(!tox.hasAlert, 'posaconazole: a SINGLE pseudohyperaldosteronism-related sign alone does not meet the named-combination threshold');

  tox = classifyToxicitySigns('posaconazole', {htn:true, edema:true});
  assert(tox.hasAlert && tox.alerts[0].includes('假性醛固酮增多症'), 'posaconazole: TWO or more signs together fire the named pseudohyperaldosteronism alert');
  assert(tox.alerts[0].includes('renin') || tox.alerts[0].includes('aldosterone'), 'the alert recommends the specific confirmatory labs');

  tox = classifyToxicitySigns('posaconazole', {htn:true, edema:true, weakness:true});
  assert(tox.hasAlert, 'posaconazole: all three signs together still fire (not an exact-match-only rule)');

  tox = classifyToxicitySigns('isavuconazole', {chills:true, hypotension:true});
  assert(tox.hasAlert && tox.alerts[0].includes('輸注反應'), 'isavuconazole: IV infusion-reaction signs fire an alert naming infusion reaction');

  // ---------------------------------------------------------------
  // 5. crossCheckClinical — spec 5.0.3 (the "read the patient" mechanism)
  // ---------------------------------------------------------------
  const okTrough = {tag:'ok'};
  const warnTrough = {tag:'warn'};

  let cc = crossCheckClinical(okTrough, {trend:'worsening', reasons:['影像學顯示病灶增大']}, {hasAlert:false, alerts:[]});
  assert(cc.length===1 && cc[0].level==='danger', 'trough OK but infection worsening -> still surfaces an independent danger-level message (the core "read the patient" case)');
  assert(cc[0].text.includes('即使濃度落在目標區間內'), 'the message explicitly says this overrides a normal-looking concentration');

  cc = crossCheckClinical(warnTrough, {trend:'improving', reasons:['退燒中']}, {hasAlert:false, alerts:[]});
  assert(cc.length===1 && cc[0].level==='ok', 'trough abnormal but patient clinically improving with no toxicity -> softening message, not a hard warning');

  cc = crossCheckClinical(okTrough, {trend:'stable', reasons:[]}, {hasAlert:false, alerts:[]});
  assert(cc.length===0, 'trough OK, trend stable, no toxicity -> no cross-check message needed');

  cc = crossCheckClinical(okTrough, {trend:'unknown', reasons:[]}, {hasAlert:true, alerts:['疑似肝毒性臨床表現']});
  assert(cc.length===1 && cc[0].level==='danger', 'toxicity alert alone (even with unknown trend) still triggers the override message');

  // ---------------------------------------------------------------
  // 6. checkCypInteractionsAzole — spec 5.5
  // ---------------------------------------------------------------
  let hits = checkCypInteractionsAzole('Tacrolimus 2mg BID, Rifampin 600mg QD');
  assert(hits.some(h => h.includes('tacrolimus')), 'detects CYP3A4 substrate tacrolimus');
  assert(hits.some(h => h.includes('rifampin')), 'detects CYP3A4 inducer rifampin');

  hits = checkCypInteractionsAzole('Warfarin 5mg QD');
  assert(hits.some(h => h.includes('warfarin') && h.includes('INR')), 'detects CYP2C9 substrate warfarin with INR-specific wording');

  hits = checkCypInteractionsAzole('Vincristine 1mg IV weekly');
  assert(hits.some(h => h.includes('三日窗')), 'vincristine triggers the specific 3-day-window reminder');

  hits = checkCypInteractionsAzole('Acetaminophen PRN');
  assert(hits.length===0, 'a non-interacting drug produces no hits (no false positives)');

  hits = checkCypInteractionsAzole('');
  assert(hits.length===0, 'empty input produces no hits, no crash');

  // ---------------------------------------------------------------
  // 7. suggestPoDoseAzole — spec 5.6 (whole/half-unit dose rounding, BID asymmetry)
  // ---------------------------------------------------------------
  // Voriconazole: unit=100mg (can be halved), current 200+200=400mg BID, increase 25-50% -> target 500-600
  let dose = suggestPoDoseAzole('voriconazole', 200, 200, 'bid', 'increase');
  assert(dose.unit === 100, 'voriconazole PO unit is 100mg (halving allowed)');
  assert(dose.candidates.some(c => c.totalMg===500), 'voriconazole: 500mg is achievable within the 500-600 target range');
  assert(dose.candidates.some(c => c.totalMg===600), 'voriconazole: 600mg is also achievable (symmetric 300+300)');
  const c500 = dose.candidates.find(c => c.totalMg===500);
  assert(!c500.symmetric, '500mg total is only achievable asymmetrically (250+250 would need quarter-tablets)');
  assert(c500.amMg + c500.pmMg === 500, '500mg candidate AM+PM sums correctly');
  const c600 = dose.candidates.find(c => c.totalMg===600);
  assert(c600.symmetric && c600.amMg===300 && c600.pmMg===300, '600mg total achieved symmetrically as 300+300 (1.5 tablets each)');

  // Posaconazole: unit=100mg, cannot halve — QD only in this test
  dose = suggestPoDoseAzole('posaconazole', 300, null, 'qd', 'increase');
  assert(dose.unit === 100, 'posaconazole PO unit is 100mg (no halving)');
  // current 300, increase 25-50% -> target 375-450; achievable multiples of 100: 400
  assert(dose.candidates.some(c => c.totalMg===400), 'posaconazole: 400mg achievable within 375-450 target range');
  assert(dose.candidates.every(c => c.pmMg===null), 'posaconazole QD candidates have no PM dose');

  // decrease direction
  dose = suggestPoDoseAzole('voriconazole', 200, 200, 'bid', 'decrease');
  // current 400, decrease 25-50% -> target 200-300mg
  assert(dose.candidates.some(c => c.totalMg===200) || dose.candidates.some(c => c.totalMg===300), 'voriconazole decrease: candidates fall within the 200-300mg target range');

  // guard: no current dose entered
  dose = suggestPoDoseAzole('voriconazole', NaN, NaN, 'bid', 'increase');
  assert(dose === null, 'no current dose entered -> function returns null rather than fabricating a target');

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
