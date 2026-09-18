// test_aed_calc.js
// Unit tests for the AED (phenytoin/valproate) module's pure logic functions —
// docs/AED_SPEC_v1.md §3.2/§3.3, P1 scope. Run via: node test_aed_calc.js
// This exercises the real functions inside index.html (via load_harness.js), not a
// standalone dev copy — any drift between the dev prototype and the spliced-in code
// would show up as a failure here.

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function ok(desc, cond) { if (cond) { pass++; } else { fail++; console.error('FAIL:', desc); } }
function near(a, b, eps = 0.05) { return Math.abs(a - b) <= eps; }

async function main() {
  const { exports: X } = await loadHarness();
  const {
    phtSaltFactor, phtNormalize, aedSamplingCheck, aedLabScheduleNote,
    phtToxicityStatPrompt, vpaAssess, vpaHermidaCorrect, aedSteadyStateCheck, aedInteractionScan
  } = X;

  // ---- phtSaltFactor ----
  ok('salt acid = 1.0', phtSaltFactor('acid') === 1.0);
  ok('salt sodium = 0.92', phtSaltFactor('sodium') === 0.92);

  // ---- phtNormalize: hospital hand-calculated values from spec §7 ----
  {
    const r = phtNormalize({ total: 12, albumin: 2.5 });
    const hypoAlb = r.candidates.find(c => c.method === 'hypoAlb');
    ok('hypoAlb total12/alb2.5 -> 20.0', near(hypoAlb.value, 20.0));
    ok('suggested is hypoAlb when only albumin known', r.suggested === 'hypoAlb');
    const ref = r.refOnly.find(c => c.method === 'hypoAlbRef');
    ok('hypoAlbRef (Cheng 0.275) computed, not suggested', ref && !near(ref.value, hypoAlb.value, 0.01));
  }
  {
    const r = phtNormalize({ total: 12, albumin: 2.5, renalFailure: true });
    const renal = r.candidates.find(c => c.method === 'renal');
    ok('renal total12/alb2.5 -> 34.3', near(renal.value, 34.3, 0.1));
    ok('suggested is renal when renalFailure flagged', r.suggested === 'renal');
  }
  {
    // spec §7: "VPA 80 -> 21.0" == Haidukewych co-med correction with C_VPA=80, C_PHT=12
    const r = phtNormalize({ total: 12, vpaLevel: 80 });
    const vc = r.candidates.find(c => c.method === 'vpaCorrected');
    ok('vpaCorrected total12/vpa80 -> 21.0', near(vc.value, 21.0));
    ok('suggested is vpaCorrected when VPA level given (no albumin)', r.suggested === 'vpaCorrected');
  }
  {
    // free level always wins regardless of other inputs
    const r = phtNormalize({ total: 12, albumin: 2.5, renalFailure: true, vpaLevel: 80, free: 1.5 });
    ok('free level takes priority over all correction formulas', r.suggested === 'free');
  }
  {
    const r = phtNormalize({ total: 12 });
    ok('total-only path when no albumin', r.suggested === 'totalOnly');
  }

  // ---- aedSamplingCheck ----
  {
    const dose = new Date('2026-09-18T08:00:00').getTime();
    const draw = new Date('2026-09-18T07:30:00').getTime(); // 30min before next dose
    const r = aedSamplingCheck({ doseTime: dose, drawTime: draw, windowMinBeforeDose: 60 });
    ok('trough drawn 30min before dose is OK (within 60min window)', r.ok === true);
  }
  {
    const dose = new Date('2026-09-18T08:00:00').getTime();
    const draw = new Date('2026-09-18T06:00:00').getTime(); // 120min before -> outside 60min window
    const r = aedSamplingCheck({ doseTime: dose, drawTime: draw, windowMinBeforeDose: 60 });
    ok('trough drawn 120min before dose fails 60min window', r.ok === false);
  }
  {
    const dose = new Date('2026-09-18T08:00:00').getTime();
    const draw = new Date('2026-09-18T11:00:00').getTime(); // 3h after dose
    const r = aedSamplingCheck({ doseTime: dose, drawTime: draw, route: 'iv', ivFromH: 2, ivToH: 4 });
    ok('IV peak drawn 3h after dose is within 2-4h window', r.ok === true);
  }

  // ---- aedLabScheduleNote (Q11: static text only, no date math) ----
  ok('phenytoin routine schedule note mentions 1 day TAT', /1 天/.test(aedLabScheduleNote({ drug: 'phenytoin', levelType: 'routine' })));
  ok('phenytoin STAT schedule note mentions ER/ward times', /30 分鐘/.test(aedLabScheduleNote({ drug: 'phenytoin', levelType: 'stat' })));
  ok('VPA free schedule note mentions W2/W5 and 3 days',
    /週二、週五/.test(aedLabScheduleNote({ drug: 'valproate', levelType: 'free' })) &&
    /3 天/.test(aedLabScheduleNote({ drug: 'valproate', levelType: 'free' })));
  ok('VPA has no STAT order', aedLabScheduleNote({ drug: 'valproate', levelType: 'stat' }) === '本院擷取資料未見 VPA STAT 醫令');

  // ---- phtToxicityStatPrompt ----
  ok('no toxicity signs -> no STAT prompt', phtToxicityStatPrompt({ sxFlags: { nystagmus: false } }).show === false);
  ok('any toxicity sign -> STAT prompt shown', phtToxicityStatPrompt({ sxFlags: { nystagmus: true } }).show === true);

  // ---- vpaAssess ----
  {
    const r = vpaAssess({ total: 70 });
    ok('VPA total 70 in range, no risk flags -> recommendFree false', r.status === 'inRange' && r.recommendFree === false);
  }
  {
    const r = vpaAssess({ total: 70, uremia: true });
    ok('uremia alone triggers recommendFree', r.recommendFree === true && r.freeRiskFlags.some(f => f.text.includes('尿毒症')));
  }
  {
    const r = vpaAssess({ total: 95 });
    ok('total>90 (still in 50-100 range) triggers literature-sourced risk flag', r.status === 'inRange' && r.recommendFree === true && r.freeRiskFlags.some(f => f.src === 'literature'));
  }
  {
    const r = vpaAssess({ total: 110 });
    ok('total>100 is flagged high AND triggers literature risk flag', r.status === 'high' && r.recommendFree === true);
  }

  // ---- vpaHermidaCorrect: gate only, never fabricates a number ----
  {
    const r = vpaHermidaCorrect({ total: 60, albumin: 2.0 });
    ok('Hermida reliable gate true when total<=75 and no exclusions', r.reliable === true);
    ok('Hermida never returns a fabricated normalized number', r.normalized === null);
  }
  {
    const r = vpaHermidaCorrect({ total: 90, albumin: 2.0 });
    ok('Hermida reliable gate false when total>75', r.reliable === false);
  }
  {
    const r = vpaHermidaCorrect({ total: 60, albumin: 2.0, jaundice: true });
    ok('Hermida reliable gate false when jaundice present', r.reliable === false);
  }

  // ---- aedSteadyStateCheck ----
  {
    const last = new Date('2026-09-01T00:00:00').getTime();
    const draw = new Date('2026-09-03T00:00:00').getTime(); // 2 days later
    const r = aedSteadyStateCheck({ drug: 'phenytoin', lastChangeMs: last, drawMs: draw });
    ok('phenytoin at day 2 (<5) is not steady', r.status === 'notSteady');
  }
  {
    const last = new Date('2026-09-01T00:00:00').getTime();
    const draw = new Date('2026-09-03T00:00:00').getTime(); // 2 days later, VPA ssDays lo=2
    const r = aedSteadyStateCheck({ drug: 'valproate', lastChangeMs: last, drawMs: draw });
    ok('VPA at day 2 (>=2) is steady', r.status === 'steady');
  }

  // ---- aedInteractionScan ----
  ok('phenytoin scan detects valproate mention', aedInteractionScan('depakine chrono 500mg qd', 'phenytoin').length === 1);
  ok('VPA scan detects carbapenem mention', aedInteractionScan('meropenem 1g q8h', 'valproate').length === 1);
  ok('VPA scan finds nothing for unrelated text', aedInteractionScan('acetaminophen prn', 'valproate').length === 0);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
