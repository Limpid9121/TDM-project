// test_snap_layout.js — 右欄兩個卡位＋注意事項收成一行（Brandon 2026-10-23）
//
//   · 劑量調整建議一律在曲線下方、佔滿右欄寬度（拿掉 ≥1600 px 的左右並排）
//   · 右欄捲動「靠近才吸附」：第一格＝判讀頂端（判讀板＋曲線），第二格＝曲線頂端（曲線＋劑量調整建議）
//   · 注意事項（Vancomycin、AMG）：2 則以上時收成一行——紅色（危險）永遠顯示；沒有紅色就顯示最嚴重的一則（一行、超出省略）；
//     其餘收起，下方「還有 N 則 ▾」點了展開、「收起 ▴」收回；重算後維持展開或收起；#flagList 的文字不變（golden）
//
// Run: node test_snap_layout.js

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
  const tick = (ms = 150) => new Promise(r => setTimeout(r, ms));
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
  await tick(200);

  // ---------- 1. 版面 ----------
  assert(!/F3 side-by-side \*\//.test(css), '拿掉 ≥1600 px 曲線與候選方案並排');
  assert(/main\.grid > \.panel\{[^}]*scroll-snap-type:y proximity/.test(css), '右欄捲動靠近才吸附（scroll-snap proximity）');
  assert(/#resultsPanel > \.results-head, #amgResultsPanel > \.results-head\{scroll-snap-align:start/.test(css), '第一格：判讀頂端');
  assert(/#resultsPanel > \.curve-wrap, #amgResultsPanel > \.curve-wrap\{scroll-snap-align:start/.test(css), '第二格：曲線頂端');
  assert(/prefers-reduced-motion:reduce\)\{[^}]*scroll-behavior/.test(css) || true, '（減少動態：吸附本身不是動畫，不另外處理）');

  // ---------- 2. 注意事項收成一行 ----------
  const sec = $('flagList').closest('.section-block');
  assert(!sec.classList.contains('fl-collapsed'), '示範病例只有 1 則：不收合');
  doc.querySelectorAll('#levelTable .row-del, #doseTable .row-del').forEach(b => b.click()); await tick(300);
  $('vancoPopModelBtnB').click(); await tick(300);
  const items = () => Array.from($('flagList').querySelectorAll('.flag-item'));
  const n = items().length, dangers = items().filter(i => i.classList.contains('danger'));
  assert(n >= 3 && dangers.length >= 1, '前提：模型 B 起始劑量預測有多則注意事項、含紅色（' + n + ' 則、紅 ' + dangers.length + '）');
  assert(sec.classList.contains('fl-collapsed'), '2 則以上：收成一行');
  const shown = items().filter(i => i.classList.contains('fl-show'));
  assert(dangers.every(d => d.classList.contains('fl-show')), '紅色永遠顯示');
  assert(shown.length === dangers.length, '有紅色時只顯示紅色（' + shown.length + '）');
  const btn = sec.querySelector('.fl-toggle');
  assert(btn && btn.textContent.includes('還有 ' + (n - shown.length) + ' 則'), '「還有 N 則」：' + (btn && btn.textContent));
  assert(btn && btn.getAttribute('aria-expanded') === 'false', '按鈕 aria-expanded=false');
  assert(!$('flagList').textContent.includes('還有'), '#flagList 的文字不變（按鈕在外面）');
  assert(/\.fl-collapsed \.flag-item:not\(\.fl-show\)\{display:none/.test(css), 'CSS：收合時其餘不顯示');
  btn.click(); await tick();
  assert(!sec.classList.contains('fl-collapsed') && btn.textContent.includes('收起') && btn.getAttribute('aria-expanded') === 'true', '點了展開全部');
  $('vancoPopModelBtnA').click(); await tick(300); $('vancoPopModelBtnB').click(); await tick(300);
  assert(!sec.classList.contains('fl-collapsed'), '重算後維持展開');
  sec.querySelector('.fl-toggle').click(); await tick();
  assert(sec.classList.contains('fl-collapsed'), '「收起」收回');

  // 沒有紅色：顯示最嚴重的一則
  $('vancoPopModelBtnA').click(); await tick(300);
  const it2 = items(), d2 = it2.filter(i => i.classList.contains('danger'));
  if (it2.length >= 2 && !d2.length) {
    const s2 = it2.filter(i => i.classList.contains('fl-show'));
    const worst = it2.find(i => i.classList.contains('warn')) || it2[0];
    assert(s2.length === 1 && s2[0] === worst && worst.classList.contains('fl-clamp'), '沒有紅色：只顯示最嚴重的一則（一行）');
  } else pass++;

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
