// test_f3_candidates.js — v3 F3：候選方案表照 C3（純顯示；regimenTable／amgRegimenTable 的文字由 golden 把關）
//
//   · 表格格線：方案、劑量／輸注、AUC₂₄、Cmin、Cmax、判讀；「間隔」併進方案欄（一般列隱藏、自訂列留在劑量旁）
//   · 判讀只顯示狀態字（目標內／留意／超標）加 8 px 小方塊，完整評語放 title
//   · 自訂列：mg、min、q…h 在同一條格線上，三個框對齊上面各列
//   · （≥1600 px 並排已於 2026-10-23 拿掉：候選方案一律在曲線下方）
//   · HD 的 3 欄表不受影響
//
// Run: node test_f3_candidates.js

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
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.replace(/\s+/g, ' ');

  // ---------- 1. Vancomycin ----------
  $('loadDemoBtn').click(); await tick(250);
  const t = $('regimenTable');
  assert(t.dataset.rg === 'cand', 'vanco：候選方案表標記 data-rg="cand"');
  assert(t.getAttribute('role') === 'table' && t.querySelector('tbody tr').getAttribute('role') === 'row' && t.querySelector('tbody td').getAttribute('role') === 'cell' && t.querySelector('thead th').getAttribute('role') === 'columnheader', '表格改用格線排版後，用 role 保留表格語意');
  const rows = Array.from(t.querySelectorAll('tbody tr'));
  assert(rows.length >= 3, '前提：有 3 列以上候選方案（' + rows.length + '）');
  rows.forEach((r, i) => {
    const reason = r.querySelector('td.reason');
    const tagWord = reason.querySelector('.tag').textContent;
    assert(reason.title && reason.title.length >= 4 && !/^(OK|留意|風險)$/.test(reason.title), '第 ' + (i + 1) + ' 列：判讀 title 是完整評語（' + reason.title + '）');
    assert(/^(OK|留意|風險)$/.test(tagWord), '第 ' + (i + 1) + ' 列：狀態字還在 DOM（' + tagWord + '），畫面上由 CSS 換成目標內／留意／超標');
    const dose = r.querySelector('td:nth-child(3)');
    assert(!!dose.querySelector('.rg-note') && dose.querySelector('.rg-note').textContent === '輸注' && !!dose.querySelector('.rg-slash'), '第 ' + (i + 1) + ' 列：劑量格拆成 mg ／ min ＋「輸注」（CSS 隱藏「輸注」）');
  });
  assert(rows.some(r => /現行/.test(r.querySelector('td:nth-child(2)').textContent)), '有「現行」標籤');
  // 自訂列
  const custom = t.querySelector('tfoot tr.custom-row');
  assert(!!custom.querySelector('td:nth-child(3) #customDose') && !!custom.querySelector('td:nth-child(3) #customInf') && !!custom.querySelector('td:nth-child(4) #customTau'), '自訂列：mg、min 在劑量格，q…h 在緊鄰的間隔格');
  const reasonC = $('customReason');
  assert(reasonC.hasAttribute('data-ph'), '自訂列沒輸入時：判讀格標記 data-ph（CSS 顯示「輸入即算」）');
  await set('customDose', '1250'); await set('customInf', '120'); await set('customTau', '12');
  assert(!!reasonC.querySelector('.tag') && !reasonC.hasAttribute('data-ph') && reasonC.title.length >= 4, '自訂列有結果後：狀態字＋title 評語（' + reasonC.title + '）');
  // HD：3 欄表不套候選格線
  await set('dialysis', 'HD'); await tick(250);
  assert(t.dataset.rg !== 'cand', 'HD：表頭換成「項目／數值／說明」，不套候選方案格線（data-rg=' + t.dataset.rg + '）');
  await set('dialysis', 'none'); await tick(250);
  assert(t.dataset.rg === 'cand' && !!t.querySelector('tbody tr td.reason[title]'), '回到一般模式：候選格線回來、title 重新補上');

  // ---------- 2. AMG ----------
  await sw('aminoglycoside', 'vanco');
  $('loadDemoBtn').click(); await tick(250);
  const ta = $('amgRegimenTable');
  assert(ta.dataset.rg === 'cand', 'AMG：data-rg="cand"');
  const hdrs = Array.from(ta.querySelectorAll('thead th'));
  const cmaxTh = hdrs.find(h => /^Cmax/.test(h.textContent));
  assert(!!cmaxTh && !!cmaxTh.querySelector('.lbl-main') && cmaxTh.querySelector('.lbl-main').textContent === 'Cmax' && /輸注結束後 30 分/.test(cmaxTh.title), 'AMG 表頭：短名「Cmax」，完整說明在 title');
  const aRows = Array.from(ta.querySelectorAll('tbody tr'));
  assert(aRows.length >= 2 && aRows.every(r => r.querySelector('td.reason').title.length >= 4), 'AMG：每列判讀有 title 評語');
  assert(aRows.every(r => !!r.querySelector('td:nth-child(3) .rg-note')), 'AMG：劑量格拆出「輸注」');
  assert(!!ta.querySelector('tfoot tr.custom-row td:nth-child(4) #amgCustomTau'), 'AMG 自訂列：q…h 在緊鄰劑量的間隔格');

  // ---------- 3. CSS ----------
  assert(/\.regimen-table\[data-rg="cand"\][^{]*\{[^}]*display:\s*block[^}]*min-width:\s*0/.test(css) && /\.regimen-table\[data-rg="cand"\] tr\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*var\(--rg-cols\)/.test(css), '候選表：tr 用格線、欄寬由 --rg-cols 定');
  assert(/#regimenTable\[data-rg="cand"\] (td|th):nth-child\(7\)[^{]*\{[^}]*grid-column:\s*5/.test(css) && /#regimenTable\[data-rg="cand"\] (td|th):nth-child\(5\)[^{]*\{[^}]*grid-column:\s*7/.test(css), 'vanco：AUC₂₄ 移到劑量後面、Cmax 移到最後（Cmin 居中）');
  assert(/\.regimen-table\[data-rg="cand"\] td:nth-child\(3\)\s*\{[^}]*grid-column:\s*3 \/ span 2/.test(css) && /\.regimen-table\[data-rg="cand"\] \.custom-row td:nth-child\(3\)\s*\{[^}]*grid-column:\s*3\b/.test(css), '一般列的劑量格橫跨劑量＋間隔欄，自訂列只佔劑量欄');
  assert(/td\.reason\s*\{[^}]*font-size:\s*0/.test(css) && /td\.reason \.tag\.ok::after\s*\{[^}]*content:\s*"目標內"/.test(css) && /td\.reason \.tag\.warn::after\s*\{[^}]*content:\s*"留意"/.test(css) && /td\.reason \.tag\.danger::after\s*\{[^}]*content:\s*"超標"/.test(css), '判讀：長評語隱藏、狀態字顯示目標內／留意／超標');
  assert(/td\.reason\[data-ph\]:not\(\[colspan\]\)::after\s*\{[^}]*content:\s*"輸入即算"/.test(css), '自訂列沒輸入：顯示「輸入即算」');
  assert(/\.rg-note\s*\{[^}]*display:\s*none/.test(css), '「輸注」二字隱藏（title 與 DOM 仍有）');
  // ≥1600 px 左右並排已拿掉（Brandon 2026-10-23：劑量調整建議一律在曲線下方，右欄兩個卡位，見 test_snap_layout.js）
  assert(!/F3 side-by-side \*\//.test(css), '沒有 ≥1600 px 並排區塊');

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
