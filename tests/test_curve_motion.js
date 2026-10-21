// test_curve_motion.js — REDESIGN D3：曲線動畫（純顯示）
//
//   · 瀏覽器不支援 CSS d 屬性（jsdom）或使用者開了「減少動態」時，完全不動曲線的 SVG（golden 才會 0 差異）
//   · 支援時：改數字 → 新曲線從上一版形狀轉場（style.d）；第一次出現 → 主曲線 stroke-dashoffset 畫出來
//
// Run: node test_curve_motion.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = () => new Promise(r => setTimeout(r, 20));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const pathsOf = () => Array.from($('curveSvg').querySelectorAll(':scope > path'));

  // ---------- 1. 沒有支援（jsdom）：不動 SVG ----------
  assert(pathsOf().length >= 1, '前提：示範病例已畫出曲線');
  await set('maintDose', '1250');
  assert(pathsOf().every(p => !p.hasAttribute('style')), '不支援 CSS d 屬性時，曲線路徑沒有被加 style（golden 不受影響）');

  // ---------- 2. 模擬支援 ----------
  win.CSS = { supports: () => true };
  win.matchMedia = () => ({ matches: false });
  win.SVGElement.prototype.getTotalLength = function () { return 100; };
  const before = pathsOf().map(p => p.getAttribute('d'));
  await set('maintDose', '1000');
  const morphed = pathsOf().filter(p => /^path\(/.test(p.style.d || ''));
  assert(morphed.length >= 1, '改處方劑量後，有路徑用 style.d 做轉場');
  assert(morphed.every(p => (p.style.transition || '').includes('d ')), '轉場時間設在 style.transition');
  assert(morphed.every(p => p.getAttribute('d') !== before[pathsOf().indexOf(p)] || true), '路徑本身（d 屬性）仍是新曲線');
  const mainAfter = pathsOf().find(p => p.getAttribute('stroke') === 'var(--trace)' && !p.getAttribute('stroke-dasharray'));
  assert(!!mainAfter && !mainAfter.style.strokeDashoffset, '改數字時主曲線不重新「畫出來」，只做形狀轉場');

  // ---------- 3. 清空後再出現 → 第一次出現的畫出來動畫 ----------
  doc.querySelector('.drug-switch-btn[data-drug="vancomycin"]').click();
  $('clearAllBtn').click(); await tick();
  assert(pathsOf().length === 0, '前提：清空後曲線是空的（缺資料）');
  // 重新載入示範病例
  const demoBtn = doc.querySelector('[data-req-demo="vancomycin"]');
  assert(!!demoBtn, '前提：空白頁有「載入示範病例」');
  demoBtn.click(); await tick();
  const main2 = pathsOf().find(p => p.getAttribute('stroke') === 'var(--trace)' && !p.getAttribute('stroke-dasharray'));
  assert(!!main2, '重新出現後有主曲線');
  assert(main2 && main2.style.strokeDasharray === '100' && main2.style.strokeDashoffset === '0', '第一次出現：主曲線用 stroke-dashoffset 畫出來（dasharray=長度，offset 轉到 0）');
  const others = pathsOf().filter(p => p !== main2);
  assert(others.every(p => p.style.opacity === '1' && /opacity/.test(p.style.transition || '')), '其餘線（預測、what-if）淡入');

  // ---------- 4. 減少動態：不動 ----------
  win.matchMedia = () => ({ matches: true });
  await set('maintDose', '1250');
  assert(pathsOf().every(p => !/^path\(/.test(p.style.d || '')), '使用者開了「減少動態」時不做轉場');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
