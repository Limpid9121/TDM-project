// test_f2_params.js — v3 F2：參數區照 C3 重排（純顯示；paramGrid 的文字由 golden 把關，這裡只看結構）
//
//   · AUC₂₄,ss（AMG 是 Cmax,ss）大字跨兩列；旁邊兩列、每列 4 格：
//       Vancomycin 第一列 Cmin、Cmax、AUC/MIC、近 24h AUC；第二列 t½（下附 ke）、CL、Vd、CrCl
//       AMG 第一列 Cmin、參考 Cmax(T1)、近 24h AUC（、Cmax/MIC）；第二列同上
//   · ke 併進 t½ 那一格（ke 是 t½ 格裡的小字）；標籤只留短名，括號裡的說明移到數字下面
//   · 每一列的格子加起來剛好 4 欄：沒有空格、沒有孤兒格（最後一格拉寬補滿）
//   · HD（無 key 格）、Azole／AED（2 格）各有自己的格線
//   · 數字不換行、標籤不換行（CSS）
//
// Run: node test_f2_params.js

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

  const cellsOf = id => Array.from($(id).children).filter(e => e.classList.contains('param-cell'));
  const mainOf = c => ((c.querySelector(':scope > .label .lbl-main') || {}).textContent || '').trim();
  const rowsOf = id => {
    const rows = {};
    cellsOf(id).filter(c => !c.classList.contains('pc-key') && c.dataset.r).forEach(c => { (rows[c.dataset.r] = rows[c.dataset.r] || []).push(c); });
    return Object.keys(rows).sort((a, b) => a - b).map(k => rows[k].sort((a, b) => a.dataset.c - b.dataset.c));
  };
  // 右側內容區是 12 欄：一列有 n 格就各佔 12/n 欄（4 格各 3 欄、3 格各 4 欄、1 格佔滿），所以沒有空格也沒有孤兒格
  const rowFilled = cells => {
    let next = 1;
    for (const c of cells) { if (+c.dataset.c !== next) return false; next += +c.dataset.cs; }
    return next === 13 && cells.every(c => +c.dataset.cs === 12 / cells.length);
  };

  // ---------- 1. Vancomycin 示範病例 ----------
  $('loadDemoBtn').click(); await tick(250);
  const g = $('paramGrid');
  assert(g.classList.contains('pg') && g.classList.contains('pg-key'), 'vanco：參數格有 pg 與 pg-key');
  const keyCell = g.querySelector('.pc-key');
  assert(!!keyCell && /AUC₂₄,ss/.test(mainOf(keyCell)), 'key 格是 AUC₂₄,ss：' + (keyCell && mainOf(keyCell)));
  const rows = rowsOf('paramGrid');
  assert(rows.length === 2, 'key 格旁邊兩列（' + rows.length + '）');
  const names = rows.map(r => r.map(mainOf).join('｜'));
  assert(names[0] === 'Cmin,ss｜Cmax,ss｜AUC/MIC｜近 24h 實際 AUC', '第一列：' + names[0]);
  assert(names[1] === 't½｜CL｜Vd｜CrCl', '第二列：' + names[1]);
  assert(rows.every(r => rowFilled(r)), '每列 4 格各佔 3 欄（12 欄的 1/4），沒有空格也沒有孤兒格');
  assert(g.style.getPropertyValue('--pg-rows') === '2', 'key 格跨 2 列（--pg-rows）');
  // ke 併進 t½
  const thalf = rows[1][0];
  assert(!cellsOf('paramGrid').some(c => /^ke/.test(mainOf(c))), '沒有獨立的 ke 格');
  const keSub = thalf.querySelector('.ke-sub');
  assert(!!keSub && /^ke/.test(keSub.textContent.trim()) && /0\.\d{3}/.test(keSub.textContent), 't½ 格內有 ke 小字：' + (keSub && keSub.textContent.trim()));
  // 標籤短名、說明移到下面
  const cmin = rows[0][0];
  assert(mainOf(cmin) === 'Cmin,ss' && /現行處方推算/.test((cmin.querySelector('.lbl-note') || {}).textContent || ''), 'Cmin：短名「Cmin,ss」，說明在 .lbl-note');
  assert(cmin.querySelectorAll('.lbl-paren').length === 2, '括號用 .lbl-paren 包起來（CSS 隱藏），文字仍在');
  assert(cmin.getAttribute('title') && /現行處方推算/.test(cmin.getAttribute('title')), '格子 title 有完整標籤');
  // 純顯示：重畫兩次結果一樣（idempotent）
  const snap = g.innerHTML;
  await set('maintDose', '1000'); await tick(100);
  assert(g.innerHTML === snap, '同樣輸入重畫後版面標記一致（沒有累積）');
  assert(rowsOf('paramGrid').length === 2 && rowsOf('paramGrid').every(r => rowFilled(r)), '改輸入後仍是兩列、每列補滿');

  // 預測模式（沒有濃度）：標籤有「預測 」前綴，格線一樣
  doc.querySelectorAll('#levelTable .entry-row .row-del').forEach(b => b.click()); await tick(120);
  const gp = $('paramGrid');
  if (gp.querySelector('.pc-key')) {
    const rp = rowsOf('paramGrid');
    assert(rp.length === 2 && rp.every(r => rowFilled(r)), '預測模式：兩列、每列補滿（' + rp.map(r => r.map(mainOf).join('｜')).join(' ／ ') + '）');
  } else { assert(false, '前提：預測模式仍有 key 格'); }

  // ---------- 2. HD：沒有 key 格 ----------
  $('loadDemoBtn').click(); await tick(250);
  await set('dialysis', 'HD'); await tick(250);
  const hd = $('paramGrid');
  assert(hd.classList.contains('pg') && !hd.classList.contains('pg-key'), 'HD：有 pg、沒有 pg-key');
  const hdCells = cellsOf('paramGrid');
  assert(hdCells.length >= 4 && hdCells.length <= 6, 'HD：格數 ' + hdCells.length + '（ke 併進 t½ 後 5 格上下）');
  const hdRows = {}; hdCells.forEach(c => { (hdRows[c.dataset.r] = hdRows[c.dataset.r] || []).push(c); });
  assert(Object.values(hdRows).every(r => r.length >= 1 && r.length <= 3 && rowFilled(r.sort((a, b) => a.dataset.c - b.dataset.c))), 'HD：每列最多 3 格、補滿 12 欄，沒有孤兒格');
  assert(!!hdCells.find(c => c.querySelector('.ke-sub')), 'HD：ke 也併進 t½');
  await set('dialysis', 'none');

  // ---------- 3. AMG：Cmax 與 Cmin 同等重要，兩個都是大字 ----------
  await sw('aminoglycoside', 'vanco');
  $('loadDemoBtn').click(); await tick(250);
  const ag = $('amgParamGrid');
  const keys = Array.from(ag.querySelectorAll(':scope > .pc-key'));
  assert(ag.classList.contains('pg-key') && ag.classList.contains('pg-key2') && ag.style.getPropertyValue('--pg-ko') === '2', 'AMG：兩個大字格（pg-key2，內容區右移 2 欄）');
  assert(keys.length === 2 && /^Cmax,ss/.test(mainOf(keys[0])) && /^Cmin,ss/.test(mainOf(keys[1])), 'AMG：大字格是 Cmax,ss 與 Cmin,ss（' + keys.map(mainOf).join('｜') + '）');
  assert(keys[0].style.getPropertyValue('--kc') === '1' && keys[1].style.getPropertyValue('--kc') === '2', '兩個大字格並排（--kc 1、2）');
  const ar = rowsOf('amgParamGrid');
  assert(ar[0].map(mainOf).join('｜') === 't½｜CL｜Vd｜CrCl', 'AMG 第一列是藥動參數：' + ar[0].map(mainOf).join('｜'));
  assert(ar.every(r => rowFilled(r)), 'AMG：每列補滿 12 欄');
  assert(!!ar[0][0].querySelector('.ke-sub'), 'AMG：ke 併進 t½');
  // 參考 Cmax(T1)：輸注 30 分鐘時 T1（開始輸注後 1 小時）就是輸注結束後 30 分＝Cmax,ss，數字一樣，所以不重複顯示
  const refCell = Array.from(cellsOf('amgParamGrid')).find(c => /^參考/.test(mainOf(c)));
  assert(!!refCell && refCell.classList.contains('pc-dup') && !refCell.dataset.r, '輸注 30 分：參考 Cmax(T1) 與 Cmax,ss 相同 → 標 pc-dup、不排進格線');
  assert(/display:\s*none/.test((html.match(/\.param-cell\.pc-dup\s*\{[^}]*\}/) || [''])[0]), '.pc-dup 隱藏（DOM 與文字還在）');
  await set('amgMaintInf', '60'); await tick(120);
  const ref2 = Array.from(cellsOf('amgParamGrid')).find(c => /^參考/.test(mainOf(c)));
  assert(!!ref2 && !ref2.classList.contains('pc-dup') && !!ref2.dataset.r, '輸注 60 分：T1 落在輸注結束時、與 Cmax,ss 不同 → 參考 Cmax 顯示在下面一列');
  assert(rowsOf('amgParamGrid').every(r => rowFilled(r)), '顯示參考 Cmax 後仍每列補滿');
  await set('amgMaintInf', '30');
  // MIC 填了會多一格 Cmax/MIC
  await set('amgMic', '1'); await tick(120);
  const ar2 = rowsOf('amgParamGrid');
  assert(ar2.every(r => rowFilled(r)) && ar2.some(r => r.some(c => /^Cmax\/MIC/.test(mainOf(c)))), 'AMG 填 MIC：多一格 Cmax/MIC，仍每列補滿');

  // ---------- 4. Azole／AED：2 格 ----------
  await sw('azole', 'amg');
  $('loadDemoBtn').click(); await tick(250);
  const az = $('azlParamGrid');
  assert(az.classList.contains('pg') && !az.classList.contains('pg-key') && cellsOf('azlParamGrid').length === 2 && cellsOf('azlParamGrid').every(c => c.dataset.cs === '6'), 'Azole：2 格各佔 6 欄（一半）');
  assert(cellsOf('azlParamGrid').every(c => c.dataset.r === '1'), 'Azole：同一列');
  await sw('aed', 'azl');
  $('loadDemoBtn').click(); await tick(250);
  const ae = $('aedParamGrid');
  const aeCells = cellsOf('aedParamGrid');
  assert(ae.classList.contains('pg') && aeCells.length >= 1, 'AED：有 pg（' + aeCells.length + ' 格）');
  const aeRows = {}; aeCells.forEach(c => { (aeRows[c.dataset.r] = aeRows[c.dataset.r] || []).push(c); });
  assert(Object.values(aeRows).every(r => rowFilled(r.sort((a, b) => a.dataset.c - b.dataset.c))), 'AED：每列補滿，沒有孤兒格');

  // ---------- 5. CSS ----------
  assert(/\.lbl-paren\s*\{\s*display:\s*none/.test(html), '.lbl-paren 隱藏');
  assert(/\.param-cell \.value\s*\{[^}]*white-space:\s*nowrap/.test(html), '數字不換行');
  assert(/\.param-cell \.lbl-main\s*\{[^}]*white-space:\s*nowrap/.test(html), '標籤短名不換行');
  assert(/grid-row:\s*var\(--r\)/.test(html) && /grid-column:\s*calc\(var\(--c\) \+ var\(--pg-ko,1\)\) \/ span var\(--cs\)/.test(html), '桌機：格子依 --r／--c／--cs 排進格線');

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
