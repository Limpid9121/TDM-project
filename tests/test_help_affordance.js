// test_help_affordance.js — 第一次使用問題第 4 點：說明入口看得到（Brandon 2026-10-23 選三項，文字量不增加）
//
//   · 「ⓘ 詳細說明」改成小膠囊鈕：淺底、圓角、收起 ▸／打開 ▾
//   · 第一次使用提示條：左欄最上方一條，按「知道了」後四個模組都不再出現（記在 localStorage tdm_ui_tips_seen）
//   · 有滑過提示的短標籤：虛線底；滑過 0.3 秒或 Tab 到欄位就出現提示小卡；接著滑別的標籤立刻出現；原生 title 換成 aria-description
//
// Run: node test_help_affordance.js

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
  const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
  await tick(200);

  // ---------- 1. ⓘ 小膠囊鈕 ----------
  assert(/\.hint-more > summary\{[^}]*border-radius:999px[^}]*background:var\(--navy-tint\)/.test(css), 'ⓘ 是淺底圓角小膠囊');
  assert(/\.hint-more > summary::after\{content:"▸"/.test(css) && /\.hint-more\[open\] > summary::after\{content:"▾"/.test(css), '收起 ▸、打開 ▾');
  assert(/\.hint-more > summary:hover\{/.test(css), '滑過有回饋');
  assert(/\.hint-more > summary::-webkit-details-marker\{display:none/.test(css), '不顯示瀏覽器預設三角形');

  // ---------- 2. 第一次使用提示條 ----------
  const tips = Array.from(doc.querySelectorAll('.first-tip'));
  assert(tips.length === 4, '四個模組各有一條（' + tips.length + '）');
  const vt = $('inputPanel').querySelector('.first-tip');
  assert(vt && !vt.hidden, '第一次打開：顯示');
  assert(vt && /詳細說明/.test(vt.textContent) && /虛線/.test(vt.textContent), '寫 ⓘ 與虛線兩件事：' + (vt && vt.textContent.replace(/\s+/g, ' ')));
  const sb = $('inputPanel').querySelector(':scope > .sec-bar');
  assert(sb && sb.nextElementSibling === vt, '在左欄最上方（收合列下面）');
  vt.querySelector('button').click(); await tick();
  assert(tips.every(t => t.hidden), '按「知道了」：四個模組都收起');
  assert(win.localStorage.getItem('tdm_ui_tips_seen') === '1', '記在 tdm_ui_tips_seen');

  // ---------- 3. 虛線底＋快速提示 ----------
  assert(/label\[data-tip\][^{]*\{[^}]*text-decoration:underline dotted/.test(css), '有提示的標籤：虛線底');
  const lab = $('therapyStartLabel');
  assert(lab && lab.dataset.tip && !lab.hasAttribute('title') && lab.getAttribute('aria-description') === lab.dataset.tip, '標籤的 title 換成 data-tip＋aria-description（不跳原生慢提示）');
  const pop = doc.querySelector('.tip-pop');
  assert(pop && pop.hidden, '提示小卡平常收起');
  lab.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true })); await tick(100);
  assert(pop.hidden, '滑過不到 0.3 秒還不出現');
  await tick(300);
  assert(!pop.hidden && /第一筆給藥時間/.test(pop.textContent), '滑過 0.3 秒出現：' + pop.textContent);
  lab.dispatchEvent(new win.MouseEvent('mouseout', { bubbles: true, relatedTarget: doc.body })); await tick(40);
  assert(pop.hidden, '滑走收起');
  const lab2 = $('expandTo').closest('.field').querySelector(':scope > label');
  lab2.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true })); await tick(30);
  assert(!pop.hidden && /最後一次抽血/.test(pop.textContent), '剛看過提示，接著滑別的標籤立刻出現');
  lab2.dispatchEvent(new win.MouseEvent('mouseout', { bubbles: true, relatedTarget: doc.body })); await tick(700);
  // Tab 到欄位
  const d = $('expandTo').parentElement.querySelector('.dt24-d');
  d.focus(); d.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true })); await tick(60);
  assert(!pop.hidden && /最後一次抽血/.test(pop.textContent), 'Tab 到欄位也出現提示');
  d.dispatchEvent(new win.FocusEvent('focusout', { bubbles: true })); await tick(40);
  assert(pop.hidden, '離開欄位收起');
  // 勾選框的標籤
  const cl = doc.querySelector('.checkline > label[for="useLoading"]');
  assert(cl && cl.dataset.tip && /劑量與維持劑量不同/.test(cl.dataset.tip), '勾選框標籤也換成快速提示');
  // JS 之後又寫 title（勾 loading 會改分析起點的說明）：下次滑過照樣換掉
  $('useLoading').checked = !$('useLoading').checked; $('useLoading').dispatchEvent(new win.Event('change', { bubbles: true })); await tick();
  lab.dispatchEvent(new win.MouseEvent('mouseover', { bubbles: true })); await tick(400);
  assert(!lab.hasAttribute('title') && !pop.hidden, 'JS 重寫 title 後滑過仍用快速提示');
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  assert(pop.hidden, 'Esc 收起');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
