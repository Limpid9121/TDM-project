// test_ui_golden.js
// ---------------------------------------------------------------------------------------
// UI/UX 翻修期間的「計算輸出不變」安全網（golden master）。
//
// 目的：UI/UX 翻修只能動版面、互動、文案，不能動任何計算結果。這支測試用固定的時鐘
// （2026-09-19 12:00 Asia/Taipei）與一組「完全由 DOM 操作填入」的情境，把四個模組的
// 計算輸出（參數格、旗標、劑量表、監測建議、AI prompt、曲線 SVG、存檔 data/derived）
// 抓成快照，和 tests/golden/ui_golden_baseline.json 逐字比對。
//
// 設計重點：
//   * 不依賴開頁時的示範病人——每個情境都先「清空目前藥物」再自己填值，所以就算之後
//     示範資料改成手動載入，這支測試也不受影響。
//   * 不依賴 load_harness.js 的 ANCHOR——自己載入 index.html，只在 <head> 注入固定時鐘
//     與 alert/confirm stub，index.html 本身完全不修改。
//   * 只透過元素 id 操作：UI 翻修可以任意搬移元素位置、包新的容器，只要 id 不改、
//     計算不改，快照就會一模一樣。
//
// 用法：
//   node test_ui_golden.js            # 比對（翻修期間每個工作包做完都要跑，必須 0 diff）
//   node test_ui_golden.js --update   # 重建基準（只在 Brandon 明確同意某項輸出變更後才可執行）
// ---------------------------------------------------------------------------------------
process.env.TZ = 'Asia/Taipei';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM } = require('jsdom');

const INDEX = fs.existsSync(path.join(__dirname, 'index.html'))
  ? path.join(__dirname, 'index.html')
  : path.join(__dirname, '..', 'index.html');
const BASELINE = path.join(__dirname, 'golden', 'ui_golden_baseline.json');
const UPDATE = process.argv.includes('--update');

const HEAD_STUB = `<script>
window.__TDM_AUTOLOAD_DEMO__=true;
(function(){
  var FIX = new Date(2026, 8, 19, 12, 0, 0, 0).getTime();
  var _D = Date;
  function FD(){
    var a = Array.prototype.slice.call(arguments);
    if(!(this instanceof FD)) return new _D(FIX).toString();
    if(a.length === 0) return new _D(FIX);
    return new (Function.prototype.bind.apply(_D, [null].concat(a)))();
  }
  FD.prototype = _D.prototype;
  FD.now = function(){ return FIX; };
  FD.parse = _D.parse; FD.UTC = _D.UTC;
  window.Date = FD;
  window.alert = function(m){ (window.__alerts = window.__alerts || []).push(String(m)); };
  window.confirm = function(){ return true; };
  var seed = 1; Math.random = function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
})();
</script>`;

async function loadPage() {
  let html = fs.readFileSync(INDEX, 'utf-8');
  html = html.replace('<head>', '<head>' + HEAD_STUB);
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
  await new Promise(r => {
    if (dom.window.document.readyState !== 'loading') return setTimeout(r, 50);
    dom.window.document.addEventListener('DOMContentLoaded', () => setTimeout(r, 50));
  });
  return dom;
}

// ---------- DOM helpers (id-based only) ----------
function mk(win) {
  const doc = win.document;
  const $ = id => { const el = doc.getElementById(id); if (!el) throw new Error('missing #' + id); return el; };
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = (id, v) => { const el = $(id); el.value = v; fire(el); };
  const chk = (id, v) => { const el = $(id); el.checked = v; fire(el); };
  const click = id => $(id).click();
  const tab = name => doc.querySelector(`.drug-switch-btn[data-drug="${name}"]`).click();
  const reset = () => click('clearAllBtn');
  // fill the LAST row of an entry table; rowSel values keyed by the row's own input class
  const fillLastRow = (tableId, vals) => {
    const rows = doc.querySelectorAll('#' + tableId + ' .entry-row');
    const row = rows[rows.length - 1];
    Object.entries(vals).forEach(([cls, v]) => { const el = row.querySelector('.' + cls); el.value = v; fire(el); });
  };
  const addRow = (btnId, tableId, vals) => { click(btnId); fillLastRow(tableId, vals); };
  return { doc, $, set, chk, click, tab, reset, addRow };
}

const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const hash = s => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 16);

function snap(h, ids, extra) {
  const out = {};
  ids.forEach(id => {
    const el = h.doc.getElementById(id);
    if (!el) { out[id] = '__MISSING__'; return; }
    if (el.tagName === 'TEXTAREA') out[id] = norm(el.value);
    else if (el.tagName.toLowerCase() === 'svg') out[id] = 'sha1:' + hash(el.innerHTML);
    else out[id] = norm(el.textContent);
  });
  return Object.assign(out, extra || {});
}

function savedRecord(h, win, labelId, saveBtnId, storeKey) {
  h.set(labelId, 'GOLDEN');
  h.click(saveBtnId);
  const list = JSON.parse(win.localStorage.getItem(storeKey) || '[]');
  const p = list.find(x => x.label === 'GOLDEN');
  const v = p && p.visits[p.visits.length - 1];
  win.localStorage.removeItem(storeKey);
  return v ? { data: v.data, derived: v.derived, asOf: v.asOf } : '__NOT_SAVED__';
}

const VANCO_OUT = ['fitModeBadge', 'paramGrid', 'flagList', 'loadingSuggestion', 'regimenTable', 'monitorGrid', 'aiPromptOut', 'curveSvg', 'headerMeta'];
const AMG_OUT = ['amgFitModeBadge', 'amgParamGrid', 'amgFlagList', 'amgRegimenTable', 'amgMonitorGrid', 'amgAiPromptOut', 'amgCurveSvg', 'amgTargetDisplay', 'headerMeta'];
const AZL_OUT = ['azlFitModeBadge', 'azlParamGrid', 'azlFlagList', 'azlDoseSuggestList', 'azlMonitorGrid', 'azlAiPromptOut', 'azlDoseHint', 'headerMeta'];
const AED_OUT = ['aedFitModeBadge', 'aedParamGrid', 'aedCorrList', 'aedPkContent', 'aedVpaDoseContent', 'aedFlagList', 'aedMonitorGrid', 'aedAiPromptOut', 'aedTargetDisplay', 'aedRenalDisplay', 'aedSamplingCheckDisplay', 'headerMeta'];

// ---------- scenarios ----------
function vancoBase(h) {
  h.tab('vancomycin'); h.reset();
  h.set('age', '67'); h.set('sex', 'F'); h.set('height', '158'); h.set('tbw', '72');
  h.addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-16', 'scr-val': '1.2' });
  h.addRow('addScrRow', 'scrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.4' });
  h.set('site', '菌血症'); h.set('organism', 'MRSA');
}
const SCENARIOS = {
  V1_vanco_fixed_two_levels(h, win) {
    vancoBase(h);
    h.set('therapyStart', '2026-09-16T09:00'); h.set('expandTo', '2026-09-19T09:00');
    h.set('maintDose', '1000'); h.set('maintInterval', '12'); h.set('maintInf', '60');
    h.click('expandDoses');
    h.addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T20:45', 'level-val': '14.2' });
    h.addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T00:30', 'level-val': '27.5' });
    const s = snap(h, VANCO_OUT);
    h.set('customDose', '1250'); h.set('customInf', '90'); h.set('customTau', '12');
    s.custom = snap(h, ['customCmax', 'customCmin', 'customAuc', 'customReason']);
    s.saved = savedRecord(h, win, 'patientLabel', 'savePatientBtn', 'vanco_tdm_patients_v2');
    return s;
  },
  V2_vanco_loading_steady_state(h, win) {
    vancoBase(h);
    h.set('therapyStart', '2026-09-17T08:00'); h.set('expandTo', '2026-09-19T11:00');
    h.chk('useLoading', true); h.set('loadingDose', '2000'); h.set('loadingInf', '120');
    h.set('firstMaintDoseTime', '2026-09-17T21:00');
    h.set('maintDose', '1250'); h.set('maintInterval', '12'); h.set('maintInf', '90');
    h.click('expandDoses');
    h.chk('assumeSteadyState', true);
    h.addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-19T08:40', 'level-val': '16.1' });
    h.chk('deepInfection', true);
    return snap(h, VANCO_OUT);
  },
  V3_vanco_prospective(h) {
    vancoBase(h);
    h.set('maintDose', '1000'); h.set('maintInterval', '12'); h.set('maintInf', '60');
    return snap(h, VANCO_OUT.concat(['vancoPopModelToggle']));
  },
  V4_vanco_hd(h, win) {
    vancoBase(h);
    h.set('dialysis', 'HD');
    h.set('therapyStart', '2026-09-14T00:00'); h.set('expandTo', '2026-09-19T11:00');
    h.click('hdGenerateSessionsBtn');
    h.set('hdMaintDose', '750'); h.set('hdFixedTime', '21:00'); h.set('hdMaintInf', '60');
    h.click('expandDosesHD');
    h.addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T07:30', 'level-val': '17.3' });
    const s = snap(h, VANCO_OUT.concat(['hdSessionTable']));
    s.saved = savedRecord(h, win, 'patientLabel', 'savePatientBtn', 'vanco_tdm_patients_v2');
    return s;
  },
  A1_amg_gent_conventional(h, win) {
    h.tab('aminoglycoside'); h.reset();
    h.set('amgAge', '58'); h.set('amgSex', 'M'); h.set('amgHeight', '172'); h.set('amgTbw', '80');
    h.addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.0' });
    h.set('amgDrug', 'gentamicin'); h.set('amgStrategy', 'conventional');
    h.set('amgTherapyStart', '2026-09-17T09:00'); h.set('amgExpandTo', '2026-09-19T09:00');
    h.set('amgMaintDose', '120'); h.set('amgMaintInf', '30'); h.set('amgMaintInterval', '8');
    h.click('amgExpandDoses');
    h.addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T02:00', 'level-val': '6.8' });
    h.addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T08:45', 'level-val': '1.4' });
    h.set('amgMic', '1'); h.set('amgOrganism', 'Pseudomonas aeruginosa');
    const s = snap(h, AMG_OUT);
    s.saved = savedRecord(h, win, 'amgPatientLabel', 'amgSavePatientBtn', 'amino_tdm_patients_v2');
    return s;
  },
  A2_amg_amikacin_odd(h) {
    h.tab('aminoglycoside'); h.reset();
    h.set('amgAge', '45'); h.set('amgSex', 'F'); h.set('amgHeight', '160'); h.set('amgTbw', '55');
    h.addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '0.8' });
    h.set('amgDrug', 'amikacin'); h.set('amgStrategy', 'odd');
    h.set('amgTherapyStart', '2026-09-17T10:00'); h.set('amgExpandTo', '2026-09-19T11:00');
    h.set('amgMaintDose', '825'); h.set('amgMaintInf', '30'); h.set('amgMaintInterval', '24');
    h.click('amgExpandDoses');
    h.addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T12:30', 'level-val': '38' });
    h.addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T16:30', 'level-val': '16' });
    return snap(h, AMG_OUT);
  },
  A3_amg_tiw_hd(h) {
    h.tab('aminoglycoside'); h.reset();
    h.set('amgAge', '72'); h.set('amgSex', 'M'); h.set('amgHeight', '165'); h.set('amgTbw', '60');
    h.addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '6.5' });
    h.set('amgDrug', 'amikacin');
    h.set('amgDialysis', 'HD');
    h.set('amgTherapyStart', '2026-09-14T00:00'); h.set('amgExpandTo', '2026-09-19T11:00');
    h.set('amgMaintDose', '500'); h.set('amgMaintInf', '30');
    h.click('amgExpandDoses');
    h.click('amgHdGenerateSessionsBtn');
    h.addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-18T07:30', 'level-val': '4.1' });
    return snap(h, AMG_OUT.concat(['amgScheduleType', 'amgTiwTime']));
  },
  Z1_azole_vori(h, win) {
    h.tab('azole'); h.reset();
    h.set('azlDrug', 'voriconazole');
    h.set('azlAge', '61'); h.set('azlSex', 'M'); h.set('azlHeight', '170'); h.set('azlTbw', '66');
    h.set('azlAstAlt', '88 / 120'); h.set('azlBilirubin', '1.8'); h.set('azlCrp', '12 mg/dL'); h.set('azlLabDate', '2026-09-18');
    h.set('azlFeverTrend', 'persistent'); h.set('azlImaging', 'growing');
    h.set('azlDoseAm', '200'); h.set('azlDosePm', '200');
    h.set('azlTherapyStart', '2026-09-12T09:00');
    h.set('azlTroughVal', '0.7'); h.set('azlTroughDate', '2026-09-19T08:30');
    h.set('azlCyp2c19', 'UM');
    h.chk('azlSxHallucination', true);
    h.set('azlConcomitant', 'tacrolimus 1mg BID\nomeprazole 40mg QD');
    const s = snap(h, AZL_OUT);
    s.saved = savedRecord(h, win, 'azlPatientLabel', 'azlSavePatientBtn', 'azole_tdm_patients_v2');
    return s;
  },
  Z2_azole_posa(h) {
    h.tab('azole'); h.reset();
    h.set('azlDrug', 'posaconazole');
    h.set('azlAge', '50'); h.set('azlSex', 'F'); h.set('azlHeight', '155'); h.set('azlTbw', '50');
    h.set('azlDoseAm', '300');
    h.set('azlTherapyStart', '2026-09-10T09:00');
    h.set('azlTroughVal', '3.9'); h.set('azlTroughDate', '2026-09-19T08:30');
    h.chk('azlSxHtn', true); h.chk('azlSxEdema', true);
    return snap(h, AZL_OUT);
  },
  E1_aed_phenytoin(h, win) {
    h.tab('aed'); h.reset();
    h.set('aedDrug', 'phenytoin'); h.set('aedPurpose', 'titration');
    h.set('aedAge', '70'); h.set('aedSex', 'M'); h.set('aedHeight', '168'); h.set('aedTbw', '62');
    h.set('aedAlbumin', '2.6'); h.set('aedScr', '1.1'); h.set('aedLabDate', '2026-09-18');
    h.set('aedTauH', '8'); h.set('aedDose', '100'); h.set('aedRegimenStart', '2026-09-05T09:00');
    h.set('aedLevelType', 'total'); h.set('aedLevelRoute', 'po');
    h.set('aedLevelValue', '7.5'); h.set('aedLevelDrawAt', '2026-09-19T08:30'); h.set('aedLevelLastDoseAt', '2026-09-19T01:00');
    h.set('aedConcomitant', 'valproate 500mg BID');
    const s = snap(h, AED_OUT);
    s.saved = savedRecord(h, win, 'aedPatientLabel', 'aedSavePatientBtn', 'aed_tdm_patients_v2');
    return s;
  },
  E2_aed_vpa(h) {
    h.tab('aed'); h.reset();
    h.set('aedDrug', 'valproate');
    h.set('aedAge', '35'); h.set('aedSex', 'F'); h.set('aedHeight', '160'); h.set('aedTbw', '55');
    h.set('aedAlbumin', '3.0'); h.set('aedNh3', '95'); h.set('aedPlatelet', '120');
    h.set('aedTauH', '12'); h.set('aedDose', '500'); h.set('aedRegimenStart', '2026-09-10T09:00');
    h.set('aedLevelValue', '42'); h.set('aedLevelDrawAt', '2026-09-19T08:30'); h.set('aedLevelLastDoseAt', '2026-09-18T21:00');
    h.chk('aedCarbapenem', true);
    return snap(h, AED_OUT);
  }
};

(async function main() {
  const results = {};
  for (const [name, fn] of Object.entries(SCENARIOS)) {
    const dom = await loadPage();            // fresh page per scenario: no cross-talk
    const h = mk(dom.window);
    try { results[name] = fn(h, dom.window); results[name].__alerts = dom.window.__alerts || []; }
    catch (e) { results[name] = { __CRASH__: String(e && e.stack || e) }; }
    dom.window.close();
  }
  if (UPDATE) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(BASELINE, JSON.stringify(results, null, 1));
    console.log(`baseline written: ${Object.keys(results).length} scenarios -> ${BASELINE}`);
    return;
  }
  if (!fs.existsSync(BASELINE)) { console.error('no baseline; run with --update on the PRE-CHANGE index.html first'); process.exit(1); }
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
  let pass = 0, fail = 0;
  for (const name of Object.keys(base)) {
    const a = base[name], b = results[name] || {};
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
      const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]);
      if (x === y) pass++;
      else {
        fail++;
        let i = 0; while (i < x.length && x[i] === y[i]) i++;
        console.error(`FAIL ${name}.${k}\n   baseline: …${(x || '').slice(Math.max(0, i - 60), i + 120)}\n   current : …${(y || '').slice(Math.max(0, i - 60), i + 120)}`);
      }
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
})();
