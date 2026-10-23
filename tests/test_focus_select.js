// test_focus_select.js — 點一下輸入格就全選，直接鍵入取代（照 TPN 調配試算.html 的做法）
//
//   · number、text 的 input：focusin 先全選一次，緊接著的第一個 click 再全選一次（number 的 select() 會被 click 定位游標蓋掉）；
//     期間按過鍵就不再全選（避免打字到一半又被全選）
//   · 不處理：唯讀、停用、datetime-local／date／select／checkbox／radio、textarea
//   · 動態新增的列（給藥、濃度、SCr）也生效（事件委派）
//   · number 欄位在聚焦中時，滑鼠滾輪不改值（交出焦點，頁面照常捲動）
//
// Run: node test_focus_select.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const selected = [];
  const { dom } = await loadHarness(undefined, {
    beforeParse(w) {
      const orig = w.HTMLInputElement.prototype.select;
      w.HTMLInputElement.prototype.select = function () { selected.push(this); return orig.call(this); };
    }
  });
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const focusin = el => el.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
  const click = el => el.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  const count = el => selected.filter(x => x === el).length;

  $('loadDemoBtn').click(); await tick(250);

  // number
  const age = $('age');
  assert(age.type === 'number' && age.value !== '', '前提：年齡是 number 欄位且有值');
  selected.length = 0;
  focusin(age);
  assert(count(age) === 1, 'number：focusin 先全選一次');
  click(age);
  assert(count(age) === 2, 'number：緊接著的第一個 click 再全選一次');
  click(age);
  assert(count(age) === 2, 'number：之後的 click 不再全選（讓使用者可以移動游標）');

  // 打字之後不再全選
  selected.length = 0;
  focusin(age);
  age.dispatchEvent(new win.KeyboardEvent('keydown', { key: '5', bubbles: true }));
  click(age);
  assert(count(age) === 1, '按過鍵之後，click 不再全選（只有 focusin 那一次）');
  age.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true }));

  // text
  const site = $('site');
  assert(site && site.type === 'text', '前提：感染部位是 text 欄位');
  selected.length = 0;
  focusin(site);
  assert(count(site) === 1, 'text：focusin 全選');

  // 不處理的類型
  const dt = doc.querySelector('input[type="datetime-local"]');
  selected.length = 0;
  focusin(dt);
  assert(selected.length === 0, 'datetime-local 不全選');
  const sel = doc.querySelector('select');
  focusin(sel);
  const cb = doc.querySelector('input[type="checkbox"]');
  focusin(cb);
  assert(selected.length === 0, 'select、checkbox 不全選');
  const ta = $('concomitant');
  focusin(ta);
  assert(selected.length === 0, 'textarea 不全選');
  const ro = $('aiPromptOut');
  focusin(ro);
  assert(selected.length === 0, '唯讀欄位不全選');
  const dis = doc.createElement('input'); dis.type = 'number'; dis.disabled = true; doc.body.appendChild(dis);
  focusin(dis);
  assert(selected.length === 0, '停用的欄位不全選');
  const rdo = doc.createElement('input'); rdo.type = 'text'; rdo.readOnly = true; doc.body.appendChild(rdo);
  focusin(rdo);
  assert(selected.length === 0, 'readOnly 的 text 不全選');

  // 動態新增的列
  $('addLevelRow').click(); await tick();
  const rows = doc.querySelectorAll('#levelTable .entry-row');
  const lastVal = rows[rows.length - 1].querySelector('.level-val');
  selected.length = 0;
  focusin(lastVal);
  assert(count(lastVal) === 1, '動態新增的濃度列，數值欄也會全選');
  $('addDoseRow') && $('addDoseRow').click(); await tick();
  const dm = Array.from(doc.querySelectorAll('#doseTable .dose-mg')).pop();
  selected.length = 0;
  focusin(dm);
  assert(count(dm) === 1, '動態新增的給藥列，劑量欄也會全選');

  // 其他模組也一樣（事件委派在 document 上）
  doc.querySelector('.drug-switch-btn[data-drug="aminoglycoside"]').click(); await tick();
  const amgAge = $('amgAge');
  selected.length = 0;
  focusin(amgAge);
  assert(count(amgAge) === 1, 'AMG 的欄位也全選');

  // 滾輪防呆
  const target = $('age');
  doc.querySelector('.drug-switch-btn[data-drug="vancomycin"]').click(); await tick();
  let blurred = 0;
  const origBlur = target.blur.bind(target);
  target.blur = () => { blurred++; origBlur(); };
  target.focus();
  target.dispatchEvent(new win.WheelEvent('wheel', { bubbles: true, deltaY: 100 }));
  assert(blurred === 1, 'number 欄位聚焦中滾動滾輪：交出焦點（不改值）');
  const before = target.value;
  assert(target.value === before, '值沒變');

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
