// test_d7_mobile.js — REDESIGN D7：手機（≤640 px）
//   · 頂端「輸入／結果」切換（#mSwitch；body[data-mview]）：只切換顯示哪一塊，不改任何資料
//   · 底部固定一條結論摘要（#mSummary）：目前模組最重要的那一格（vancomycin＝AUC₂₄、AMG＝Cmax）＋狀態字；點了跳到結果
//   · 摘要隨模組切換、隨輸入更新；沒有結果時隱藏
//   · 輸入欄位字級 16 px（避免 iOS 聚焦時放大頁面）等觸控設定都在 ≤640 的樣式裡
//
// Run: node test_d7_mobile.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const scrolls = [];
  win.scrollTo = (...a) => { scrolls.push(a); };
  win.Element.prototype.scrollIntoView = function () { scrolls.push(['into', this.id]); };
  const sumText = () => $('mSummary').textContent.replace(/\s+/g, ' ').trim();

  // ---------- 1. 切換 ----------
  const sw1 = $('mSwitch');
  assert(!!sw1, '有 #mSwitch');
  const btns = sw1 ? Array.from(sw1.querySelectorAll('button[data-mview]')) : [];
  assert(btns.map(b => b.dataset.mview).join() === 'input,result', '兩個按鈕：輸入、結果');
  assert(doc.body.dataset.mview === 'input' && btns[0].getAttribute('aria-pressed') === 'true' && btns[1].getAttribute('aria-pressed') === 'false', '預設顯示輸入');
  btns[1].click(); await tick();
  assert(doc.body.dataset.mview === 'result' && btns[1].getAttribute('aria-pressed') === 'true' && btns[0].getAttribute('aria-pressed') === 'false', '按「結果」：切到結果');
  assert(scrolls.length >= 1, '切換後捲到頁面上方');
  btns[0].click(); await tick();
  assert(doc.body.dataset.mview === 'input', '按「輸入」切回');
  // 切換不改資料
  const ageBefore = $('age').value;
  btns[1].click(); btns[0].click(); await tick();
  assert($('age').value === ageBefore, '切換不改任何欄位');

  // ---------- 2. 底部摘要：vancomycin ----------
  assert(!!$('mSummary'), '有 #mSummary');
  assert($('mSummary').hidden === false, '示範病例有結果：摘要顯示');
  assert(/AUC/.test(sumText()) && /\d{3}/.test(sumText()), 'vancomycin 摘要有 AUC 與數值：' + sumText());
  assert(/目標內|留意|超標/.test(sumText()), '摘要有狀態字：' + sumText());
  assert(/400.{0,3}600/.test(sumText()), 'vancomycin 摘要寫出目標 400–600：' + sumText());
  const aucCell = $('paramGrid').querySelector('.pc-key .value').textContent.replace(/\s+/g, ' ').trim();
  assert(sumText().includes(aucCell.split(' ')[0]), '摘要數值與右邊參數格一致（' + aucCell + '）');
  // 輸入一改，摘要跟著變
  const t0 = sumText();
  await set('maintDose', '500');
  assert(sumText() !== t0, '改處方劑量後摘要跟著更新：' + sumText());
  await set('maintDose', '1000');
  // 點摘要 → 切到結果並捲到上方
  scrolls.length = 0;
  doc.body.dataset.mview = 'input';
  $('mSummary').querySelector('button, [role="button"]').click(); await tick();
  assert(doc.body.dataset.mview === 'result', '點摘要：切到結果');
  assert(scrolls.length >= 1, '點摘要：捲到結果');
  btns[0].click(); await tick();

  // ---------- 3. 隨模組切換 ----------
  await sw('aminoglycoside', 'vanco');
  $('clearAllBtn').click(); await tick();
  assert($('mSummary').hidden === true, 'AMG 空白（沒有結果）：摘要隱藏');
  $('loadDemoBtn').click(); await tick(200);
  assert($('mSummary').hidden === false && /Cmax/.test(sumText()), 'AMG 示範病例：摘要是 Cmax：' + sumText());
  await sw('vancomycin', 'amg');
  assert(/AUC/.test(sumText()), '切回 vancomycin：摘要回到 AUC');
  await sw('azole', 'vanco');
  $('loadDemoBtn').click(); await tick(200);
  assert($('mSummary').hidden === false && sumText().length > 6, 'Azole 示範病例：摘要有內容：' + sumText());
  await sw('aed', 'azl');
  $('loadDemoBtn').click(); await tick(200);
  assert($('mSummary').hidden === true || /\d/.test(sumText()), 'AED：沒有數字時隱藏摘要，有數字時顯示：' + sumText());

  // ---------- 4. 樣式（≤640 的媒體查詢裡） ----------
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const m = html.match(/@media \(max-width:640px\)\{\s*\/\* D7[\s\S]*?\n  \}\n/);
  assert(!!m, 'index.html 有 D7 的 ≤640 樣式區塊');
  const css = m ? m[0] : '';
  assert(/body\[data-mview="result"\]/.test(css) && /body\[data-mview="input"\]/.test(css), '依 data-mview 顯示輸入或結果');
  assert(/font-size:\s*16px/.test(css), '輸入欄位字級 16 px（避免 iOS 放大）');
  assert(/touch-action:\s*manipulation/.test(css), '觸控：touch-action: manipulation（去點擊延遲）');
  assert(/env\(safe-area-inset-bottom/.test(css), '底部摘要避開手機底部安全區');
  assert(/#mSummary/.test(css) && /position:\s*fixed/.test(css), '摘要固定在底部');
  assert(/dvh/.test(css), '用 dvh 而不是 100vh');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
