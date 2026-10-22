// test_a11y_names.js — REDESIGN D8 無障礙：每個可操作的元件都有名字（讀屏、語音控制用），焦點在深色底上看得到
//   · 按鈕／連結／輸入欄位／下拉都要有可存取名稱（文字、aria-label、<label for>、包在 <label> 裡、title）
//   · 動態產生的列（給藥、濃度、SCr）的刪除鈕有名字
//   · 深色底（頂列、手機底部摘要）上的焦點外框是白色（全站預設是深藍，在深藍上看不到）
//   · 時間軸事件可 Tab、有名稱（test_d5 另測）；撞色色票有名稱
//
// Run: node test_a11y_names.js

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
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  const nameOf = el => {
    const al = el.getAttribute('aria-label'); if (al && al.trim()) return al.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) { const t = lb.split(/\s+/).map(id => doc.getElementById(id)).filter(Boolean).map(e => e.textContent).join(' ').trim(); if (t) return t; }
    if (el.id) { const l = doc.querySelector('label[for="' + el.id + '"]'); if (l && l.textContent.trim()) return l.textContent.trim(); }
    const wrap = el.closest('label'); if (wrap && wrap.textContent.trim()) return wrap.textContent.trim();
    const tag = el.tagName.toLowerCase();
    if (tag === 'button' || tag === 'summary' || el.getAttribute('role') === 'button' || tag === 'a') { const t = el.textContent.trim(); if (t) return t; }
    const ti = el.getAttribute('title'); if (ti && ti.trim()) return ti.trim();
    if (el.getAttribute('placeholder') && tag !== 'select') return el.getAttribute('placeholder');
    // 同一個 .field 裡的 <label>（沒有 for 的舊寫法）
    const f = el.closest('.field'); if (f) { const l = f.querySelector('label'); if (l && l.textContent.trim()) return l.textContent.trim(); }
    return '';
  };
  const unnamed = root => Array.from(root.querySelectorAll('button, input:not([type="hidden"]), select, textarea, a[href], [role="button"], summary'))
    .filter(el => !el.hidden && el.type !== 'file' && !nameOf(el))
    .map(el => (el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ')[0] : '') + (el.type ? '[' + el.type + ']' : '')));

  // 四個模組都載入示範病例（含動態列），逐一檢查
  const sw = async d => { doc.querySelector('.drug-switch-btn[data-drug="' + d + '"]').click(); await tick(); doc.querySelectorAll('.guard-modal:not(.hide) [id$="GuardDiscard"]').forEach(b => b.click()); await tick(); };
  for (const d of ['vancomycin', 'aminoglycoside', 'azole', 'aed']) {
    await sw(d);
    $('loadDemoBtn').click(); await tick(200);
    const mod = $('drug-' + d);
    const bad = unnamed(mod);
    assert(bad.length === 0, d + '：沒有「沒有名字」的可操作元件（' + bad.length + '）：' + bad.slice(0, 8).join(', '));
  }
  const hbad = unnamed(doc.querySelector('header.top'));
  assert(hbad.length === 0, '頂列沒有「沒有名字」的可操作元件：' + hbad.join(', '));
  assert(unnamed($('mSwitch')).length === 0 && unnamed($('mSummary')).length === 0, '手機切換與底部摘要的按鈕有名字');

  // 刪除鈕
  await sw('vancomycin');
  const del = doc.querySelector('#doseTable .row-del');
  assert(!!del && /刪除/.test(del.getAttribute('aria-label') || ''), '給藥列的刪除鈕有名字：' + (del && del.getAttribute('aria-label')));

  // 焦點外框
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/header\.top\s+:focus-visible\s*\{[^}]*outline-color:\s*#fff/.test(html) || /header\.top\s+:focus-visible\s*\{[^}]*outline:\s*2px solid #fff/.test(html), '頂列（深藍底）上的焦點外框是白色');
  assert(/#mSummary[^{]*:focus-visible\s*\{[^}]*#fff/.test(html), '手機底部摘要（深藍底）上的焦點外框是白色');
  assert(/:focus-visible\s*\{\s*outline:\s*2px solid var\(--navy\)/.test(html), '全站預設焦點外框 2 px 深藍');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
