// test_f4_notes.js — v3 F4：注意事項一行化、AI Prompt 收合（純顯示；flagList、aiPromptOut 的內容由 golden 把關）
//
//   · 「健全性檢查與假設」改成一行：左邊小標「注意事項」，右邊就是旗標；沒有大標題與 A–D 編號框
//   · 有警示時逐條列出（同一個格線，不帶大標題）
//   · 沒有任何旗標（空白頁）時整個區塊不顯示
//   · AI Prompt 預設收合成一行：標題＋一句副標＋複製鈕＋「展開」；點標題才展開；複製鈕在收合列上也能用，結果顯示在收合列
//   · 四個模組都一樣
//
// Run: node test_f4_notes.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness(undefined, {
    beforeParse(w) { w.__copied = []; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: t => { w.__copied.push(t); return Promise.resolve(); } }, configurable: true }); }
  });
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.replace(/\s+/g, ' ');

  const MODS = [['vancomycin', 'azl', 'flagList', 'aiPromptOut', 'vancoCopyPromptBtnTop', 'copyPromptBtn'], ['aminoglycoside', 'vanco', 'amgFlagList', 'amgAiPromptOut', 'amgCopyPromptBtnTop', 'amgCopyPromptBtn'],
    ['azole', 'amg', 'azlFlagList', 'azlAiPromptOut', 'azlCopyPromptBtnTop', 'azlCopyPromptBtn'], ['aed', 'azl', 'aedFlagList', 'aedAiPromptOut', 'aedCopyPromptBtnTop', 'aedCopyPromptBtn']];

  // ---------- 1. 注意事項 ----------
  assert(/\.panel > \.section-block:has\(> :is\(#flagList,#amgFlagList,#azlFlagList,#aedFlagList\)\)\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*auto minmax\(0,\s*1fr\)/.test(css), '注意事項：左小標、右旗標的兩欄格線');
  assert(/:is\(#flagList,#amgFlagList,#azlFlagList,#aedFlagList\)\):not\(:has\(\.flag-item\)\)\s*\{[^}]*display:\s*none/.test(css), '沒有任何旗標時整個區塊不顯示（E3）');
  assert(/\.section-block:has\(> \.monitor-grid:empty\)\s*\{[^}]*display:\s*none/.test(css), '沒有監測內容時整個區塊不顯示');
  assert(!/\.panel > \.section-block:has\(> \.flag-list\)/.test(css), '規則只套在四個「注意事項」區塊，不波及 Azole 的劑量建議、AED 的濃度校正判讀等也用 flag-list 的區塊');
  assert(/\.panel > \.section-block h3 \.idx\s*\{[^}]*display:\s*none/.test(css), '右區區塊標題的 A–D 編號框隱藏（編號沒有帶資訊）');
  for (const [drug, key, flagId, aiId, topId, btnId] of MODS) {
    if (drug !== 'vancomycin') await sw(drug, key);
    const sec = $(flagId).closest('.section-block');
    assert(sec.querySelector(':scope > h3').textContent.replace(/\s+/g, '').replace(/^[A-E]/, '') === '注意事項', drug + '：小標是「注意事項」（' + sec.querySelector(':scope > h3').textContent.trim() + '）');
    assert(!/健全性檢查/.test(sec.querySelector(':scope > h3').textContent), drug + '：沒有「健全性檢查與假設」大標題');
  }
  // 空白頁：旗標區沒有內容 → CSS 會把整區隱藏
  await sw('vancomycin', 'azl');
  $('clearAllBtn').click(); await tick(200);
  assert(!$('flagList').querySelector('.flag-item'), '空白頁：旗標區沒有任何旗標（所以整區不顯示）');
  $('loadDemoBtn').click(); await tick(250);
  assert($('flagList').querySelectorAll('.flag-item').length >= 1, '示範病例：有旗標，區塊顯示');

  // ---------- 2. AI Prompt 收合 ----------
  assert(/\.ai-fold:not\(\.open\) > :not\(h3\)\s*\{[^}]*display:\s*none/.test(css), '收合時只剩標題列（CSS）');
  assert(/\.ai-fold > h3 \.h3-sub\s*\{[^}]*color:\s*var\(--ink-soft\)/.test(css), '副標用次要墨色');
  for (const [drug, key, flagId, aiId, topId, btnId] of MODS) {
    if (drug !== 'vancomycin') await sw(drug, key);
    $('loadDemoBtn').click(); await tick(250);
    const ta = $(aiId), sec = ta.closest('.section-block'), h3 = sec.querySelector(':scope > h3');
    assert(sec.classList.contains('ai-fold') && !sec.classList.contains('open'), drug + '：AI Prompt 預設收合');
    assert(h3.getAttribute('role') === 'button' && h3.getAttribute('tabindex') === '0' && h3.getAttribute('aria-expanded') === 'false', drug + '：標題列是按鈕、aria-expanded=false');
    assert(!!h3.querySelector('.h3-sub') && /\S/.test(h3.querySelector('.h3-sub').textContent), drug + '：有一句副標');
    assert(/展開/.test(h3.querySelector('.ai-toggle').textContent), drug + '：收合時寫「展開」');
    assert(ta.value.length > 50, drug + '：收合時 prompt 內容照樣產生（' + ta.value.length + ' 字）');
    // 複製鈕在收合列上
    win.__copied.length = 0;
    $(topId).click(); await tick(60);
    assert(win.__copied.length === 1 && win.__copied[0] === ta.value, drug + '：收合列的複製鈕複製整份 prompt');
    assert(/已複製/.test(h3.querySelector('.ai-copy-note').textContent), drug + '：複製結果顯示在收合列（' + h3.querySelector('.ai-copy-note').textContent + '）');
    assert(!sec.classList.contains('open'), drug + '：按複製鈕不會展開');
    // 點標題展開、再點收合
    h3.click();
    assert(sec.classList.contains('open') && h3.getAttribute('aria-expanded') === 'true' && /收合/.test(h3.querySelector('.ai-toggle').textContent), drug + '：點標題展開');
    h3.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert(!sec.classList.contains('open'), drug + '：Enter 鍵收合');
    h3.dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    assert(sec.classList.contains('open'), drug + '：空白鍵展開');
    h3.click();
  }

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
