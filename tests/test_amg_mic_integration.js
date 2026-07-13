// test_amg_mic_integration.js
// End-to-end smoke test through the REAL DOM wiring (not calling internal functions
// directly) — confirms the new Cmax/MIC>=8 check is actually reachable from user input,
// not just correct as an isolated function. Uses the default page state that
// initDefaultsAmg() sets up on load: gentamicin / conventional / indication "severe"
// (peak target 8-10, micRatioApplicable:true) — a real scenario, not synthetic.

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

function setAndFire(win, doc, id, value) {
  const el = doc.getElementById(id);
  el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

async function main() {
  const { dom } = await loadHarness();
  const { window: win } = dom;
  const doc = win.document;

  // sanity: confirm the default scenario is what we expect before touching MIC at all
  assert(doc.getElementById('amgDrug').value === 'gentamicin', 'default drug is gentamicin');
  assert(doc.getElementById('amgStrategy').value === 'conventional', 'default strategy is conventional');
  assert(doc.getElementById('amgIndication').value === 'severe', 'default indication is severe (peak 8-10, GNR-applicable)');

  const flagListBefore = doc.getElementById('amgFlagList').innerHTML;
  const paramGridBefore = doc.getElementById('amgParamGrid').innerHTML;
  const curveBefore = doc.getElementById('amgCurveSvg').innerHTML;
  assert(!paramGridBefore.includes('Cmax/MIC'), 'with MIC blank, no Cmax/MIC cell is rendered at all (pre-existing behavior, unaffected)');
  assert(!curveBefore.includes('2,3'), 'with MIC blank, no MIC×8 line on the curve');

  // enter a MIC high enough that, against an 8-10 peak target, the ratio is well under 8
  // (worst case ratio = 10/4 = 2.5)
  setAndFire(win, doc, 'amgMic', '4');

  const flagListAfter = doc.getElementById('amgFlagList').innerHTML;
  const paramGridAfter = doc.getElementById('amgParamGrid').innerHTML;
  const regimenTableAfter = doc.querySelector('#amgRegimenTable tbody').innerHTML;
  const curveAfter = doc.getElementById('amgCurveSvg').innerHTML;

  assert(paramGridAfter.includes('Cmax/MIC'), 'Cmax/MIC cell now appears once MIC is entered');
  assert(/param-cell flag-warn[^>]*>[\s\S]*?Cmax\/MIC/.test(paramGridAfter) || /Cmax\/MIC[\s\S]{0,300}/.test(paramGridAfter),
    'Cmax/MIC cell rendered (checking flag-warn class below more precisely)');

  // more precise: match the Cmax/MIC cell's own class directly (anchored right after its
  // label), rather than a lazy span that can accidentally cross into an earlier sibling cell
  const cellMatch = paramGridAfter.match(/<div class="param-cell ([^"]*)"><div class="label">Cmax\/MIC<\/div>/);
  assert(!!cellMatch, 'found the Cmax/MIC param-cell block in the rendered grid');
  if (cellMatch) {
    assert(cellMatch[1].includes('flag-warn'), `Cmax/MIC param-cell carries flag-warn class when ratio<8 (got class="${cellMatch[1]}")`);
  }

  assert(/reason">[^<]*Cmax\/MIC/.test(regimenTableAfter) || regimenTableAfter.includes('革蘭氏陰性菌殺菌效益門檻'),
    'at least one regimen candidate row explains the Cmax/MIC shortfall in its reason text');

  assert(curveAfter.includes('2,3'), 'curve now shows the MIC×8 dashed reference line');
  assert(/MIC×8 效益門檻/.test(curveAfter), 'curve shows the MIC×8 label text');
  assert(curveAfter.includes('Peak 目標'), 'the fixed institutional peak band is STILL shown alongside the new line (additive, per confirmed design — not replaced)');

  const flagsMentionMic = flagListAfter.includes('Cmax/MIC') || flagListAfter.includes('革蘭氏陰性菌殺菌效益門檻');
  assert(flagsMentionMic, 'top-level flag list now surfaces the Cmax/MIC shortfall for the current regimen prediction');

  // now switch to a synergy indication (gram-positive) with the SAME bad MIC — must NOT fire
  setAndFire(win, doc, 'amgIndication', 'synergy');
  const paramGridSynergy = doc.getElementById('amgParamGrid').innerHTML;
  const curveSynergy = doc.getElementById('amgCurveSvg').innerHTML;
  assert(!curveSynergy.includes('2,3'), 'switching to synergy indication: MIC×8 line disappears even though MIC field still has a value');
  const cellMatchSynergy = paramGridSynergy.match(/<div class="param-cell ([^"]*)"><div class="label">Cmax\/MIC<\/div>/);
  if (cellMatchSynergy) {
    assert(!cellMatchSynergy[1].includes('flag-warn'), 'synergy indication: Cmax/MIC cell (if shown at all) is never flag-warn regardless of value');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
