// test_amg_mic_efficacy.js
// Covers the new Cmax/MIC>=8 gram-negative efficacy check added to the aminoglycoside
// module: scope (which indications it applies to), threshold behavior, integration into
// regimenTagAmino/computeCandidateAmino, non-regression when MIC is not entered, and the
// new "MIC×8" reference line in drawCurve.
//
// Run via: node test_amg_mic_efficacy.js  (loads the real index.html through jsdom via
// load_harness.js — see that file for how internals are captured without modifying the
// shipped index.html itself).

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
    checkCmaxMicEfficacy, regimenTagAmino, AMINO_TARGETS, CMAX_MIC_EFFICACY_FLOOR,
    computeCandidateAmino, drawCurve, GENT_CONVENTIONAL, GENT_ODD
  } = X;

  // ---------------------------------------------------------------
  // 1. Threshold constant sanity
  // ---------------------------------------------------------------
  assert(CMAX_MIC_EFFICACY_FLOOR === 8, 'efficacy floor constant is 8 as agreed');

  // ---------------------------------------------------------------
  // 2. Scope lock — exactly the agreed indications carry micRatioApplicable:true.
  //    This is a "spec lock" test: if someone edits AMINO_TARGETS later and
  //    accidentally flips scope, this test should catch it.
  // ---------------------------------------------------------------
  const applicableIds = (list) => list.filter(t => t.micRatioApplicable).map(t => t.id).sort();
  const notApplicableIds = (list) => list.filter(t => !t.micRatioApplicable).map(t => t.id).sort();

  assert(JSON.stringify(applicableIds(GENT_CONVENTIONAL)) === JSON.stringify(['gnr_other', 'gnr_uti', 'severe']),
    'GENT_CONVENTIONAL: gnr_uti/gnr_other/severe applicable, synergy excluded — got ' + applicableIds(GENT_CONVENTIONAL));
  assert(JSON.stringify(notApplicableIds(GENT_CONVENTIONAL)) === JSON.stringify(['synergy']),
    'GENT_CONVENTIONAL: only synergy excluded');

  assert(JSON.stringify(applicableIds(GENT_ODD)) === JSON.stringify(['gnr_other', 'gnr_uti', 'severe']),
    'GENT_ODD: gnr_uti/gnr_other/severe applicable, gpc excluded — got ' + applicableIds(GENT_ODD));
  assert(JSON.stringify(notApplicableIds(GENT_ODD)) === JSON.stringify(['gpc']),
    'GENT_ODD: only gpc excluded');

  const amkConv = AMINO_TARGETS.amikacin.conventional;
  const amkOdd = AMINO_TARGETS.amikacin.odd;
  assert(JSON.stringify(applicableIds(amkConv)) === JSON.stringify(['gnr_general', 'severe']),
    'amikacin conventional: gnr_general/severe applicable, ntm excluded — got ' + applicableIds(amkConv));
  assert(JSON.stringify(notApplicableIds(amkConv)) === JSON.stringify(['ntm']),
    'amikacin conventional: only ntm excluded');

  assert(JSON.stringify(applicableIds(amkOdd)) === JSON.stringify(['gnr']),
    'amikacin ODD: only gnr applicable — got ' + applicableIds(amkOdd));
  assert(JSON.stringify(notApplicableIds(amkOdd)) === JSON.stringify(['ntm_alt', 'tb_ntm']),
    'amikacin ODD: tb_ntm/ntm_alt excluded');

  // tobramycin shares gentamicin's table object by reference — confirm that still holds
  // (a prior design decision; this check would fail if someone accidentally forked the table).
  assert(AMINO_TARGETS.tobramycin.conventional === GENT_CONVENTIONAL, 'tobramycin still shares GENT_CONVENTIONAL by reference');
  assert(AMINO_TARGETS.tobramycin.odd === GENT_ODD, 'tobramycin still shares GENT_ODD by reference');

  // amikacin ODD 'gnr' has peak:null — this is the indication that previously had ZERO
  // efficacy check at all. Confirm it's specifically the one wired to micRatioApplicable.
  const amkOddGnr = amkOdd.find(t => t.id === 'gnr');
  assert(amkOddGnr.peak === null && amkOddGnr.micRatioApplicable === true,
    'amikacin ODD gnr (peak:null) is now covered by the MIC ratio check');

  // ---------------------------------------------------------------
  // 3. checkCmaxMicEfficacy — threshold behavior
  // ---------------------------------------------------------------
  const gnrSevereGent = GENT_CONVENTIONAL.find(t => t.id === 'severe'); // micRatioApplicable, peak [8,10]
  const synergyTarget = GENT_CONVENTIONAL.find(t => t.id === 'synergy'); // NOT applicable

  assert(checkCmaxMicEfficacy(7.9, 1, gnrSevereGent) !== null, 'ratio 7.9 (<8) fires a warning');
  assert(checkCmaxMicEfficacy(8.0, 1, gnrSevereGent) === null, 'ratio exactly 8.0 does NOT fire (>= floor)');
  assert(checkCmaxMicEfficacy(16, 2, gnrSevereGent) === null, 'ratio 8.0 via mic=2 does NOT fire');
  assert(checkCmaxMicEfficacy(15, 2, gnrSevereGent) !== null, 'ratio 7.5 via mic=2 DOES fire');
  assert(checkCmaxMicEfficacy(9, 1, gnrSevereGent) === null, 'ratio 9 (within 8-10) does not fire');

  // this is the exact clinical scenario Brandon originally raised: peak within the fixed
  // "OK" band (18-20 for ODD severe) but MIC elevated enough that the ratio falls short.
  const gnrSevereOdd = GENT_ODD.find(t => t.id === 'severe'); // peak [18,20]
  assert(checkCmaxMicEfficacy(18.5, 4, gnrSevereOdd) !== null,
    'peak 18.5 (within fixed 18-20 OK band) but MIC=4 -> ratio 4.6 < 8 -> still fires a warning');

  // scope exclusions: even a terrible ratio must NOT fire for synergy / NTM indications
  const ntmTarget = amkConv.find(t => t.id === 'ntm');
  assert(checkCmaxMicEfficacy(3, 4, synergyTarget) === null, 'synergy indication never fires regardless of ratio');
  assert(checkCmaxMicEfficacy(20, 64, ntmTarget) === null, 'NTM indication never fires regardless of ratio (different MIC scale entirely)');

  // guards
  assert(checkCmaxMicEfficacy(5, undefined, gnrSevereGent) === null, 'undefined mic -> no check (not silently assuming mic=1)');
  assert(checkCmaxMicEfficacy(5, 0, gnrSevereGent) === null, 'mic=0 -> no check (avoid divide-by-zero / nonsense ratio)');
  assert(checkCmaxMicEfficacy(5, -1, gnrSevereGent) === null, 'negative mic -> no check');
  assert(checkCmaxMicEfficacy(NaN, 1, gnrSevereGent) === null, 'non-finite cmax -> no check');
  assert(checkCmaxMicEfficacy(5, 1, null) === null, 'null target -> no check');
  assert(checkCmaxMicEfficacy(5, 1, {}) === null, 'target without micRatioApplicable -> no check');

  // ---------------------------------------------------------------
  // 4. regimenTagAmino — merge behavior
  // ---------------------------------------------------------------
  // (a) MIC not entered at all -> identical to pre-change behavior (pure regression check)
  const r1 = regimenTagAmino(9, 1.5, gnrSevereGent);           // peak/trough both fine, mic omitted
  assert(r1.tag === 'ok', 'no mic supplied: falls back to peak/trough-only judgement (still ok)');

  // (b) peak/trough fine, but mic supplied and ratio inadequate -> should now warn
  const r2 = regimenTagAmino(9, 1.5, gnrSevereGent, 2);         // ratio = 4.5
  assert(r2.tag === 'warn', 'peak/trough fine but Cmax/MIC<8 now escalates tag to warn');
  assert(/Cmax\/MIC/.test(r2.tagText), 'tagText mentions the Cmax/MIC shortfall');

  // (c) trough already 'danger' (ototoxicity/nephrotoxicity risk) -> mic warning must NOT
  //     downgrade a danger tag back down to warn
  const r3 = regimenTagAmino(9, 10, gnrSevereGent, 2);          // trough 10 >> troughHi(2)*1.5=3 -> danger; ratio also bad
  assert(r3.tag === 'danger', 'existing danger tag (trough toxicity) is preserved, not downgraded by the mic check');
  assert(/Cmax\/MIC/.test(r3.tagText), 'the mic shortfall reason is still appended to the explanation even under danger');

  // (d) non-applicable indication: bad ratio must never move the tag
  const r4 = regimenTagAmino(3.5, 0.5, synergyTarget, 0.1);     // peak in-range 3-4, ratio would be 35 anyway but irrelevant
  assert(r4.tag === 'ok', 'synergy indication unaffected by mic regardless of value');

  // (e) amikacin ODD 'gnr' (peak:null) — previously ALWAYS 'ok' with no efficacy signal at all.
  //     Confirm the mic check is now the only thing that can flag it.
  const r5a = regimenTagAmino(30, 1, amkOddGnr);                // no mic -> still just 'ok' (trough fine, no peak check)
  assert(r5a.tag === 'ok', 'amikacin ODD gnr with no mic entered: unchanged (still no peak check exists)');
  const r5b = regimenTagAmino(30, 1, amkOddGnr, 8);             // ratio = 3.75 -> should now warn
  assert(r5b.tag === 'warn', 'amikacin ODD gnr: mic check is now the ONLY efficacy signal, and it fires correctly');

  // ---------------------------------------------------------------
  // 5. computeCandidateAmino — ratio field + tag both reflect mic
  // ---------------------------------------------------------------
  // CL/ke chosen so the dose-solving math is simple to reason about; we mainly care that
  // mic correctly threads through to both `ratio` and `tag`/`tagText`.
  const CL = 4.0, ke = 0.25, infHrCurrent = 1, dailyDoseNow = 480, drug = 'gentamicin';
  const cand = computeCandidateAmino(24, CL, ke, infHrCurrent, gnrSevereOdd, dailyDoseNow, 4, drug); // mic=4 -> likely ratio <8 given peak target ~19
  assert(cand.ratio !== null && isFinite(cand.ratio), 'candidate row computes a numeric ratio when mic supplied');
  assertClose(cand.ratio, cand.cmax / 4, 0.01, 'candidate ratio = cmax/mic');
  if (cand.ratio < CMAX_MIC_EFFICACY_FLOOR) {
    assert(cand.tag === 'warn' || cand.tag === 'danger', 'candidate tag reflects an inadequate ratio when peak target itself was hit');
  }

  const candNoMic = computeCandidateAmino(24, CL, ke, infHrCurrent, gnrSevereOdd, dailyDoseNow, undefined, drug);
  assert(candNoMic.ratio === null, 'candidate row: ratio is null (not fabricated) when mic not supplied');

  // ---------------------------------------------------------------
  // 6. drawCurve — MIC×8 reference line
  // ---------------------------------------------------------------
  // drawCurve injects SVG markup directly into the DOM element (no return value), so this
  // needs its own harness instance with a live DOM handle to read the result back from —
  // done inside runSvgAssertions() below.
  await runSvgAssertions(CL, ke);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

async function runSvgAssertions(CL, ke) {
  // Re-load a fresh harness instance with direct DOM access so we can read the SVG
  // element's innerHTML after calling drawCurve (the first loadHarness() call's `dom`
  // is what drawCurve's closure actually writes to, but we didn't keep a handle to it
  // in main() — reload here for a clean, self-contained check).
  const { dom, exports: X2 } = await loadHarness();
  const svgEl = dom.window.document.getElementById('amgCurveSvg');
  assert(!!svgEl, 'amgCurveSvg element exists in the real page markup');

  // (a) no micLine -> no MIC×8 dashed line present
  X2.drawCurve({
    doses: [{ t_rel: 0, doseMg: 400, infHr: 1 }], levels: [], CL, V: 20, ke, tau: 24,
    maintDose: 400, maintInf: 1, isFutureRel: 0, cMaxDomain: 30, svgId: 'amgCurveSvg', t0Ms: Date.now(),
    micLine: null
  });
  const htmlNoLine = svgEl.innerHTML;
  assert(!htmlNoLine.includes('2,3'), 'no micLine passed -> the MIC×8 dash pattern (2,3) is absent');

  // (b) micLine within domain -> dashed line + label text present
  X2.drawCurve({
    doses: [{ t_rel: 0, doseMg: 400, infHr: 1 }], levels: [], CL, V: 20, ke, tau: 24,
    maintDose: 400, maintInf: 1, isFutureRel: 0, cMaxDomain: 30, svgId: 'amgCurveSvg', t0Ms: Date.now(),
    micLine: { value: 16, label: 'MIC×8 效益門檻 16.0' }
  });
  const htmlWithLine = svgEl.innerHTML;
  assert(htmlWithLine.includes('2,3'), 'micLine within domain -> dash pattern (2,3) present');
  assert(htmlWithLine.includes('MIC×8 效益門檻 16.0'), 'micLine label text rendered');
  assert(htmlWithLine.includes('var(--trace-strong)'), 'micLine uses the distinct trace-strong color, not crimson/amber');
  assert(!htmlWithLine.includes(`fill="var(--crimson)">MIC×8`), 'micLine label is NOT colored as a toxicity(crimson) line');

  // (c) micLine value ABOVE the plotted domain -> should be clipped/omitted, same convention as toxLine
  X2.drawCurve({
    doses: [{ t_rel: 0, doseMg: 400, infHr: 1 }], levels: [], CL, V: 20, ke, tau: 24,
    maintDose: 400, maintInf: 1, isFutureRel: 0, cMaxDomain: 10, svgId: 'amgCurveSvg', t0Ms: Date.now(),
    micLine: { value: 999, label: 'MIC×8 效益門檻 999.0' }
  });
  const htmlClipped = svgEl.innerHTML;
  assert(!htmlClipped.includes('999.0'), 'micLine value above cMaxDomain is clipped (not drawn off-scale), matching toxLine convention');

  // (d) band and micLine coexist (option-1 requirement: additive, not replacing the fixed band)
  X2.drawCurve({
    doses: [{ t_rel: 0, doseMg: 400, infHr: 1 }], levels: [], CL, V: 20, ke, tau: 24,
    maintDose: 400, maintInf: 1, isFutureRel: 0, cMaxDomain: 30, svgId: 'amgCurveSvg', t0Ms: Date.now(),
    band: { lo: 18, hi: 20, label: 'Peak 目標 18–20' },
    micLine: { value: 16, label: 'MIC×8 效益門檻 16.0' }
  });
  const htmlBoth = svgEl.innerHTML;
  assert(htmlBoth.includes('Peak 目標 18–20') && htmlBoth.includes('MIC×8 效益門檻 16.0'),
    'fixed peak band and MIC×8 line render simultaneously (additive, per confirmed design)');
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
