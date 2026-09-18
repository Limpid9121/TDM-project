// test_aed_calc_p2.js
// Unit tests for the AED module's P2 pure logic functions (phenytoin Michaelis-Menten
// dosing, VPA proportional dosing) — docs/AED_SPEC_v1.md §2.2/§3.3/§4, P2 scope.
// Run via: node test_aed_calc_p2.js
// This exercises the real functions inside index.html (via load_harness.js), not the
// standalone dev prototype (aed_calc_p2_dev.js) — any drift between the prototype and
// the spliced-in code would show up as a failure here.

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function ok(desc, cond) { if (cond) { pass++; } else { fail++; console.error('FAIL:', desc); } }
function near(a, b, eps = 0.5) { return Math.abs(a - b) <= eps; }

async function main() {
  const { exports: X } = await loadHarness();
  const {
    phtMmSinglePoint, phtMmTwoPoint, phtPredictCss, phtDoseForTarget, phtKmSensitivity,
    phtT90, phtLoadingDose, vpaProportionalDose
  } = X;

  // ---- phtMmSinglePoint: spec §2.2 worked table (S=0.92, 300mg/day, Css=8, target=15) ----
  const R = 0.92 * 300; // 276
  {
    const r = phtMmSinglePoint({ R, Css: 8, km: 2 });
    ok('single-point Km=2 -> Vmax=345', near(r.vmax, 345, 0.5));
  }
  {
    const r = phtMmSinglePoint({ R, Css: 8, km: 4 });
    ok('single-point Km=4 -> Vmax=414', near(r.vmax, 414, 0.5));
  }
  {
    const r = phtMmSinglePoint({ R, Css: 8, km: 6 });
    ok('single-point Km=6 -> Vmax=483', near(r.vmax, 483, 0.5));
  }
  {
    const r = phtMmSinglePoint({ R: 100, Css: NaN, km: 4 });
    ok('single-point with missing Css is invalid, never fabricates a Vmax', r.valid === false && r.vmax === null);
  }

  // ---- phtMmTwoPoint: spec §2.2 worked example (300mg->8, 400mg->20) ----
  {
    const R1 = 0.92 * 300, R2 = 0.92 * 400; // 276, 368
    const r = phtMmTwoPoint({ R1, C1: 8, R2, C2: 20 });
    ok('two-point Km ~5.71', r.valid === true && near(r.km, 5.71, 0.05));
    ok('two-point Vmax ~473', near(r.vmax, 473, 1));
  }
  {
    // same dose twice -> invalid, must say why, never silently divide by zero
    const r = phtMmTwoPoint({ R1: 276, C1: 8, R2: 276, C2: 20 });
    ok('two-point rejects identical doses', r.valid === false && r.reasons.length > 0);
  }
  {
    // dose up but level down -> physiologically inconsistent, must be rejected not silently computed
    const r = phtMmTwoPoint({ R1: 276, C1: 20, R2: 368, C2: 8 });
    ok('two-point rejects inconsistent direction (dose up, level down)', r.valid === false && r.reasons.length > 0);
  }

  // ---- phtPredictCss ----
  {
    const r = phtPredictCss({ vmax: 414, km: 4, R: 276 });
    ok('predictCss at R=276 with Vmax=414/Km=4 -> Css=8 (round-trip of single-point demo)', near(r.css, 8, 0.1) && r.unattainable === false);
  }
  {
    const r = phtPredictCss({ vmax: 400, km: 4, R: 400 });
    ok('predictCss when R>=Vmax is unattainable (Infinity), never a finite fabricated number', r.css === Infinity && r.unattainable === true);
  }
  {
    const r = phtPredictCss({ vmax: 400, km: 4, R: 450 });
    ok('predictCss when R>Vmax is also unattainable', r.css === Infinity && r.unattainable === true);
  }

  // ---- phtDoseForTarget ----
  {
    // target 15, Vmax=414, Km=4 -> Rnew = 414*15/19 = 326.84; dose = Rnew/0.92 = 355.3
    const r = phtDoseForTarget({ vmax: 414, km: 4, target: 15, S: 0.92 });
    ok('doseForTarget Vmax414/Km4/target15 -> ~355 mg/day (matches spec §2.2 table row Km=4)', near(r.dailyDoseMg, 355, 1));
  }

  // ---- phtKmSensitivity: Q5 resolved candidate band, never a single "best" Km ----
  {
    const kms = [
      { km: 1.45, label: '韓國' }, { km: 2.307, label: '新加坡華人' }, { km: 4, label: '教科書' },
      { km: 6, label: '教科書上緣' }, { km: 9.19, label: '日本' }
    ];
    const rows = phtKmSensitivity({ R, Css: 8, target: 15, S: 0.92, kms });
    ok('Km sensitivity returns all 5 candidates, not a single winner', rows.length === 5);
    ok('every row carries its own source label', rows.every(r => typeof r.label === 'string' && r.label.length > 0));
    ok('every row has its own independently-computed Vmax', new Set(rows.map(r => r.vmax.toFixed(2))).size === 5);
  }

  // ---- phtT90: spec worked demo (Vmax=414, Km=4, Vd=49, target=15 -> Rnew=326.84 -> ~16.98 days) ----
  {
    const rNew = 414 * 15 / 19;
    const r = phtT90({ vmax: 414, km: 4, vd: 49, R: rNew });
    ok('t90 ~16.98 days (spec §7 test-plan reference value)', near(r.days, 16.98, 0.1));
  }
  {
    const r = phtT90({ vmax: 400, km: 4, vd: 49, R: 400 });
    ok('t90 is unattainable when R>=Vmax (no new steady state), never a finite fabricated day count', r.days === null && r.unattainable === true);
  }

  // ---- phtLoadingDose (Q9: supplemental only, never a from-zero SE loading dose) ----
  {
    // Vd = 0.7 L/kg * 70kg = 49L; target 15, current 8, S=0.92 -> (49*7)/0.92 = 372.8 mg
    const r = phtLoadingDose({ vd: 49, target: 15, current: 8, S: 0.92 });
    ok('supplemental loading dose = Vd*(target-current)/S', near(r.doseMg, 372.8, 1));
  }
  {
    const r = phtLoadingDose({ vd: 49, target: 10, current: 12, S: 0.92 });
    ok('loading dose refuses to suggest a negative/zero top-up when already at or above target', r.doseMg === null && /已達或超過目標/.test(r.reason));
  }

  // ---- vpaProportionalDose (Q3: withholds a number entirely when a risk flag is active) ----
  {
    const r = vpaProportionalDose({ dose: 1000, total: 60, target: 80, riskFlags: [] });
    ok('VPA proportional dose scales linearly and rounds to 250mg (1000*80/60=1333 -> 1250)', r.doseMg === 1250 && r.roundedTo === 250);
  }
  {
    const r = vpaProportionalDose({ dose: 1000, total: 60, target: 80, riskFlags: [{ text: 'uremia' }] });
    ok('VPA proportional dose is withheld (null) when any free-fraction risk flag is present', r.doseMg === null && r.direction === 'up');
  }
  {
    const r = vpaProportionalDose({ dose: 1000, total: 110, target: 80, riskFlags: [{ text: 'total>90' }] });
    ok('VPA proportional dose direction is "down" when current total is above target, even while withheld', r.doseMg === null && r.direction === 'down');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
