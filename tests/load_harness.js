// load_harness.js
// Reusable jsdom test harness for index.html's internal functions.
//
// index.html wraps everything in an IIFE nested inside a DOMContentLoaded handler, so
// nothing is normally reachable from outside. This harness builds an IN-MEMORY
// instrumented copy (index.html itself is never modified on disk) by:
//   1. injecting a tiny capture stub into <head>, defined before the main script runs
//   2. inserting one export call at the very end of the DOMContentLoaded handler body,
//      right before it closes, handing back references to whatever internals the
//      caller asks for
// then loads that copy into jsdom and resolves once the app's own startup has finished
// (proven by the export call having fired) and returns {dom, exports}.
//
// Requires: npm install jsdom  (not part of index.html's own runtime deps — dev-only)
//
// Usage:
//   const { loadHarness } = require('./load_harness.js');
//   const { dom, exports } = await loadHarness();
//   // exports.<name> is available for every name listed in EXPORT_NAMES below.
//   // dom.window.document is a live DOM you can also drive directly (set .value,
//   // dispatchEvent('input'), then re-read innerHTML) for end-to-end checks.

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Add names here as future tests need access to more internals — no changes to
// index.html itself are ever required for this list to grow.
const EXPORT_NAMES = [
  'checkCmaxMicEfficacy', 'regimenTagAmino', 'AMINO_TARGETS', 'CMAX_MIC_EFFICACY_FLOOR',
  'computeCandidateAmino', 'updateCustomRowAmg', 'drawCurve', 'predictConc',
  'GENT_CONVENTIONAL', 'GENT_ODD',
  'AZOLE_TARGETS', 'AZOLE_FORMULATIONS', 'AZOLE_PO_UNIT_MG',
  'checkAzoleTrough', 'computeAzoleSteadyState', 'inferInfectionTrend', 'classifyToxicitySigns',
  'crossCheckClinical', 'checkCypInteractionsAzole', 'suggestPoDoseAzole', 'azoleIndicationList',
  'AED_RULES', 'phtSaltFactor', 'phtNormalize', 'aedSamplingCheck', 'aedLabScheduleNote',
  'phtToxicityStatPrompt', 'vpaAssess', 'vpaHermidaCorrect', 'aedSteadyStateCheck', 'aedInteractionScan',
  'phtMmSinglePoint', 'phtMmTwoPoint', 'phtPredictCss', 'phtDoseForTarget', 'phtKmSensitivity',
  'phtT90', 'phtLoadingDose', 'vpaProportionalDose'
];

// tests/ 內若有 index.html（舊用法：手動複製進來）就用它；否則用 repo 根目錄的 index.html
// （2026-09-18 整理成 git repo 後 index.html 位於上一層，舊寫法會找不到檔案）。
const INDEX_HTML_PATH = fs.existsSync(path.join(__dirname, 'index.html'))
  ? path.join(__dirname, 'index.html')
  : path.join(__dirname, '..', 'index.html');

// The exact tail of the DOMContentLoaded handler in index.html, used as the insertion
// anchor. If this stops matching (because index.html's drug-switcher wiring section was
// edited), loadHarness() throws immediately with a clear message rather than silently
// capturing nothing — update this constant to match the new tail when that happens.
const ANCHOR = `    document.querySelectorAll('.drug-switch-btn[data-drug]').forEach(btn=>{
      btn.addEventListener('click', ()=>{ if(!btn.disabled) guardSwitchDrugModule(btn.dataset.drug); });
    });
  });

})();`;

function buildInstrumentedHtml(indexHtmlPath) {
  let html = fs.readFileSync(indexHtmlPath, 'utf-8');

  // WP1.1：示範資料改手動載入後，開頁預設不再自動帶入示範資料；既有測試多半依賴開頁
  // 就是示範狀態（等同舊版 initDefaults() 的行為），故測試環境一律強制走 loadDemo(...,true)
  // 開頁路徑，維持這些測試原有的行為與斷言不必改動。
  const hookStub = '<script>window.__TDM_AUTOLOAD_DEMO__=true;window.__TDM_TEST_EXPORTS__=function(e){window.__captured=e;};</script>\n';
  html = html.replace('</head>', hookStub + '</head>');

  if (!html.includes(ANCHOR)) {
    throw new Error(
      'load_harness.js: ANCHOR text no longer found in index.html — the drug-switcher ' +
      'wiring section at the end of the DOMContentLoaded handler was edited. Update the ' +
      'ANCHOR constant in load_harness.js to match the current tail before re-running tests.'
    );
  }
  const exportCall = ANCHOR.replace(
    '  });\n\n})();',
    `\n    if (typeof window.__TDM_TEST_EXPORTS__ === 'function') {\n` +
    `      window.__TDM_TEST_EXPORTS__({ ${EXPORT_NAMES.join(', ')} });\n` +
    `    }\n  });\n\n})();`
  );
  html = html.replace(ANCHOR, exportCall);
  return html;
}

async function loadHarness(indexHtmlPath = INDEX_HTML_PATH) {
  const html = buildInstrumentedHtml(indexHtmlPath);
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    url: 'http://localhost/'
  });
  await new Promise(resolve => {
    if (dom.window.__captured) return resolve();
    dom.window.document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 0));
    setTimeout(resolve, 300); // fallback in case DOMContentLoaded already fired
  });
  if (!dom.window.__captured) {
    throw new Error('load_harness.js: DOMContentLoaded fired but window.__captured was never set — check ANCHOR still matches and EXPORT_NAMES are all real identifiers in scope at that point.');
  }
  return { dom, exports: dom.window.__captured };
}

module.exports = { loadHarness, EXPORT_NAMES };
