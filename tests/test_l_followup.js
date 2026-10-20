// test_l_followup.js — REDESIGN L 系列驗收後修正（Brandon 2026-10-20 核可）
//
//   1  性別空白時 AI prompt 不再寫成「女」，改寫「未填」（vancomycin HD、azole、AED 性別非必填）
//   2  AMG 填乾體重時，Vd 說明只有一則，且與實際用的體重一致
//   4  vancomycin 穩態說明不再寫「請勿勾選」
//   5  「第一筆給藥是不是療程第一劑」不放在收合的「進階」區裡
//
// Run: node test_l_followup.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom, exports: X } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = (id, v) => { $(id).value = v; fire($(id)); };
  const addRow = (btn, table, vals) => { $(btn).click(); const rows = doc.querySelectorAll('#' + table + ' .entry-row'); const row = rows[rows.length - 1]; Object.entries(vals).forEach(([c, v]) => { const el = row.querySelector('.' + c); el.value = v; fire(el); }); };
  const sw = (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  // ---------- 1 性別空白 → AI prompt 寫「未填」 ----------
  sw('azole', 'vanco'); $('clearAllBtn').click();
  set('azlAge', '60'); set('azlHeight', '170'); set('azlTbw', '65'); set('azlTroughVal', '2.0');
  let line = ($('azlAiPromptOut').value.match(/【人口學】[^\n]*/) || [''])[0];
  assert(/／未填／/.test(line) && !/女/.test(line), 'azole 性別空白 → prompt 寫「未填」：' + line);
  set('azlSex', 'F');
  assert(/／女／/.test(($('azlAiPromptOut').value.match(/【人口學】[^\n]*/) || [''])[0]), 'azole 選女 → prompt 寫女');
  set('azlSex', 'M');
  assert(/／男／/.test(($('azlAiPromptOut').value.match(/【人口學】[^\n]*/) || [''])[0]), 'azole 選男 → prompt 寫男');

  sw('aed', 'azl'); $('clearAllBtn').click();
  set('aedAge', '60'); set('aedHeight', '170'); set('aedTbw', '65'); set('aedScr', '1.0');
  line = ($('aedAiPromptOut').value.match(/【人口學】[^\n]*/) || [''])[0];
  assert(/／未填／/.test(line) && !/女/.test(line), 'AED 性別空白 → prompt 寫「未填」：' + line);

  sw('vancomycin', 'aed'); $('clearAllBtn').click();
  set('age', '67'); set('height', '158'); set('tbw', '72'); set('dialysis', 'HD');
  set('therapyStart', '2026-09-14T00:00'); set('expandTo', '2026-09-19T11:00');
  $('hdGenerateSessionsBtn').click();
  set('hdMaintDose', '750'); set('hdFixedTime', '21:00'); set('hdMaintInf', '90');
  $('expandDosesHD').click();
  addRow('addLevelRow', 'levelTable', { 'level-date': '2026-09-18T07:30', 'level-val': '17.3' });
  line = ($('aiPromptOut').value.match(/- 年齡[^\n]*/) || [''])[0];
  assert(/性別 未填/.test(line), 'vanco HD 性別空白 → prompt 寫「性別 未填」：' + line);
  set('dialysis', 'none');

  // ---------- 2 AMG 乾體重：Vd 說明只有一則，且和實際體重一致 ----------
  sw('aminoglycoside', 'vanco'); $('clearAllBtn').click();
  set('amgAge', '58'); set('amgSex', 'M'); set('amgHeight', '172'); set('amgTbw', '80'); set('amgDryWeight', '72');
  addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.0' });
  set('amgDrug', 'gentamicin'); set('amgStrategy', 'conventional'); set('amgIndication', 'severe');
  set('amgMaintDose', '120'); set('amgMaintInf', '30'); set('amgMaintInterval', '8');
  const vdFlags = Array.from($('amgFlagList').querySelectorAll('.flag-item')).map(f => f.textContent).filter(t => /Vd 先驗/.test(t));
  assert(vdFlags.length === 1, `AMG 填乾體重時 Vd 說明只有一則（目前 ${vdFlags.length} 則）`);
  const sel = X.weightForCG(72, X.ibwDevine(172, 'M'));
  assert(vdFlags[0] && vdFlags[0].includes('72 kg') && vdFlags[0].includes(sel.weight.toFixed(1) + ' kg'), `說明同時寫出乾體重 72 kg 與實際使用的 ${sel.weight.toFixed(1)} kg：` + vdFlags[0]);
  assert(vdFlags[0] && !/改用你輸入的乾／平常體重/.test(vdFlags[0]), '不再寫「改用乾體重」這種與實際不符的說法');
  // 乾體重低於 IBW 時，不把乾體重稱為「TBW」
  set('amgDryWeight', '55');
  const low = Array.from($('amgFlagList').querySelectorAll('.flag-item')).map(f => f.textContent).find(t => /Vd 先驗/.test(t)) || '';
  assert(/乾／平常體重/.test(low) && !/TBW（實際體重 < IBW）/.test(low), '乾體重 < IBW 時說明寫乾／平常體重，不寫 TBW：' + low);
  set('amgDryWeight', '');
  const noDry = Array.from($('amgFlagList').querySelectorAll('.flag-item')).map(f => f.textContent).filter(t => /Vd 先驗/.test(t));
  assert(noDry.length === 1 && /體重選擇後的體重/.test(noDry[0]), '沒填乾體重時仍是原本那一則');

  // ---------- 4 說明文字 ----------
  assert(!/請勿勾選/.test($('steadyStateHint').textContent), 'vanco 穩態說明不再寫「請勿勾選」');
  assert(/第一筆紀錄就是本療程第一劑/.test($('steadyStateHint').textContent), 'vanco 穩態說明改指向「第一筆紀錄就是本療程第一劑」選項');

  // ---------- 5 必答題不在收合區 ----------
  ['vancoFirstDoseKindGroup', 'amgFirstDoseKindGroup'].forEach(id => {
    assert(!$(id).closest('details'), id + ' 不在 <details> 裡（不會被收合藏起來）');
    assert(!$(id).closest('.field'), id + ' 不在 .field 裡（不吃欄位標題的 11.5px 樣式）');
  });
  assert($('amgAdv').hidden === true, 'amgAdv 已沒有內容，隱藏起來（id 保留）');

  // ---------- 首劑 loading 也直接放在外面（Brandon 2026-10-20） ----------
  sw('vancomycin', 'amg');
  assert(!$('useLoading').closest('details'), '「首劑為獨立 loading 劑量」不在 <details> 裡');
  assert(!$('loadingFields').closest('details'), 'loading 劑量欄位不在 <details> 裡');
  assert($('vancoAdv').hidden === true, 'vancoAdv 已沒有內容，隱藏起來（id 保留）');
  $('useLoading').checked = false; fire($('useLoading'));
  assert($('loadingFields').style.display === 'none', '沒勾 loading 時，loading 劑量欄位隱藏');
  $('useLoading').checked = true; fire($('useLoading'));
  assert($('loadingFields').style.display !== 'none', '勾了 loading 後，loading 劑量欄位出現');
  $('useLoading').checked = false; fire($('useLoading'));

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
