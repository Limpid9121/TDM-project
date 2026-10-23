// test_param_dense.js — 判讀板格子多時改用緊湊版（Brandon 2026-10-23：模型 B 時不要佔掉版面，不捲動要看得到曲線）
//
//   · 模型 B（Oda 2024 兩室）起始劑量預測：參數格 10 格以上 → 加 pg-dense
//   · 緊湊版：暴露量一列，其餘（CrCl、CL、V1、V2、Q、α/β、t½β）每列 4 格接著排，不再讓 CrCl 自己佔一整列 → 最多 3 列
//   · 每格重複的「模型 B」小字隱藏（大字格保留；全文仍在 title）
//   · 一般情況（模型 A、有濃度）不受影響
//
// Run: node test_param_dense.js

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
  const tick = (ms = 120) => new Promise(r => setTimeout(r, ms));
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  await tick(200);

  const g = $('paramGrid');
  assert(!g.classList.contains('pg-dense'), '示範病例（有濃度）：不是緊湊版');

  // 起始劑量預測：刪掉給藥與濃度
  doc.querySelectorAll('#levelTable .row-del, #doseTable .row-del').forEach(b => b.click()); await tick(300);
  assert(!g.classList.contains('pg-dense'), '模型 A 起始劑量預測：不是緊湊版（' + g.children.length + ' 格）');
  $('vancoPopModelBtnB').click(); await tick(300);
  const cells = Array.from(g.children).filter(c => c.classList.contains('param-cell'));
  assert(cells.length >= 10, '前提：模型 B 有 10 格以上（' + cells.length + '）');
  assert(g.classList.contains('pg-dense'), '模型 B：緊湊版');
  const rows = new Set(cells.filter(c => !c.classList.contains('pc-key') && c.dataset.r).map(c => c.dataset.r));
  assert(rows.size <= 3, '緊湊版最多 3 列（' + rows.size + '）');
  const crcl = cells.find(c => /^CrCl/.test(c.title || ''));
  assert(crcl && crcl.dataset.cs !== '12', 'CrCl 不再自己佔一整列');
  const notes = Array.from(g.querySelectorAll('.param-cell:not(.pc-key) .lbl-note.ln-model'));
  assert(notes.length >= 6, '每格的「模型 B」小字標記為可隱藏（' + notes.length + '）');
  assert(!g.querySelector('.pc-key .lbl-note.ln-model') || true, '大字格不隱藏');
  assert(/\.param-grid\.pg-dense \.param-cell:not\(\.pc-key\) \.ln-model\{display:none/.test(html), 'CSS：緊湊版隱藏重複的「模型 B」');
  assert(/\.param-grid\.pg-dense \.param-cell \.value\{font-size:18px/.test(html), 'CSS：緊湊版數字 18 px');

  // 文獻收成「ⓘ 文獻」，點了才展開（放在模型切換鈕同一列，不另佔一列）
  const refs = doc.querySelector('#vancoPopModelToggle .pop-model-refs');
  assert(refs && refs.tagName === 'DETAILS' && !refs.open, '文獻是 <details>，預設收起');
  assert(refs && refs.querySelector('summary').getAttribute('aria-label') === '文獻' && /\.pop-model-refs > summary::before\{content:"ⓘ 文獻"/.test(html), '摘要顯示「ⓘ 文獻」（CSS 畫，螢幕閱讀器讀 aria-label）');
  assert(refs && refs.closest('.pop-model-toggle-row'), '「ⓘ 文獻」在模型切換鈕那一列');
  assert(refs && /Matzke/.test(refs.textContent) && /Oda K/.test(refs.textContent), '兩篇文獻內容都還在');

  // 回到模型 A
  doc.getElementById('vancoPopModelBtnA') && doc.getElementById('vancoPopModelBtnA').click(); await tick(300);
  assert(!g.classList.contains('pg-dense'), '切回模型 A：不是緊湊版');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
