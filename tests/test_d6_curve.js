// test_d6_curve.js — REDESIGN D6：曲線依可用寬度重畫、字級、樣式（座標由 golden 把關）
//
//   · 量不到寬度（jsdom 預設）：仍是 920×340，座標與舊版一樣
//   · 量得到寬度：viewBox 與 svg._tl.W 跟著變；視窗寬度改變（ResizeObserver）時用同一組參數重畫，差不到 4 px 不重畫
//   · 重畫不做轉場動畫（_resizeRedraw）
//   · 時間軸跟著曲線的寬度走（viewBox 寬度相同，兩者才對得齊）
//   · 圖上所有文字 ≥ 12 px；有「現在」標籤；實測點旁有數值；實測點是黑色
//
// Run: node test_d6_curve.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  let roCallback = null;
  const { dom } = await loadHarness(undefined, {
    beforeParse(w) {
      w.ResizeObserver = class { constructor(cb) { roCallback = cb; } observe() {} disconnect() {} };
      w.requestAnimationFrame = cb => setTimeout(cb, 0);
    }
  });
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const svg = $('curveSvg'), wrap = svg.parentElement;
  const padOf = el => { const cs = win.getComputedStyle(el); return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0); };
  const vb = el => el.getAttribute('viewBox').split(/\s+/).map(Number);

  // ---------- 1. 量不到寬度：920×340 ----------
  assert(svg.children.length > 0, '前提：示範病例有曲線');
  assert(vb(svg).join() === '0,0,920,340' && svg._tl.W === 920, '量不到寬度時維持 920×340');
  assert(vb($('vancoTimeline'))[2] === 920, '時間軸寬度同為 920');
  assert(typeof roCallback === 'function', '有掛 ResizeObserver');

  // ---------- 2. 量得到寬度：重畫 ----------
  const setWidth = w => Object.defineProperty(wrap, 'clientWidth', { configurable: true, get: () => w });
  setWidth(760 + padOf(wrap));
  const nodeBefore = svg.querySelector('path');
  svg._resizeRedraw = false;
  roCallback([{ target: wrap }]);
  await tick();
  assert(svg._tl.W === 760, '寬度改變後用新寬度重畫（W=' + svg._tl.W + '）');
  const [, , w1, h1] = vb(svg);
  assert(w1 === 760 && h1 >= 280 && h1 <= 360, 'viewBox 跟著：' + vb(svg).join());
  assert(svg.querySelector('path') !== nodeBefore, '曲線節點已重畫');
  assert(vb($('vancoTimeline'))[2] === 760, '時間軸的 viewBox 寬度跟著曲線（760）');
  assert(svg._resizeRedraw === false, '重畫後旗標已清掉（MutationObserver 消耗掉，不做轉場）');
  // 重畫後的座標：x 軸比例與寬度一致（第一筆實測點）
  const info = svg._tl;
  const dot = Array.from(svg.querySelectorAll('circle')).find(c => c.getAttribute('r') === '5');
  const dotX = parseFloat(dot.getAttribute('cx'));
  assert(dotX >= info.ML && dotX <= info.W - info.MR, '實測點的 x 在繪圖區內（' + dotX.toFixed(1) + '）');
  // 差不到 4 px 不重畫
  const nodeNow = svg.querySelector('path');
  setWidth(762 + padOf(wrap));
  roCallback([{ target: wrap }]);
  await tick();
  assert(svg.querySelector('path') === nodeNow, '寬度只差 2 px：不重畫');
  // 縮窄（手機）
  setWidth(358 + padOf(wrap));
  roCallback([{ target: wrap }]);
  await tick();
  assert(svg._tl.W === 358 && vb(svg)[3] === 280, '窄到 358：高度取下限 280（' + vb(svg).join() + '）');
  // 寬到 1300：高度封頂 360
  setWidth(1300 + padOf(wrap));
  roCallback([{ target: wrap }]);
  await tick();
  assert(svg._tl.W === 1300 && vb(svg)[3] === 360, '寬到 1300：高度封頂 360（' + vb(svg).join() + '）');
  // 太窄（< 300）量測無效：不重畫
  const nodeWide = svg.querySelector('path');
  setWidth(120 + padOf(wrap));
  roCallback([{ target: wrap }]);
  await tick();
  assert(svg.querySelector('path') === nodeWide, '寬度小於 300 視為量不到：不重畫');

  // ---------- 3. 字級與樣式（用 1300 寬那一版） ----------
  const texts = Array.from(svg.querySelectorAll('text'));
  assert(texts.length > 5 && texts.every(t => parseFloat(t.getAttribute('font-size')) >= 12), '曲線上所有文字 ≥ 12：' + Array.from(new Set(texts.map(t => t.getAttribute('font-size')))).join());
  const tlTexts = Array.from($('vancoTimeline').querySelectorAll('text'));
  assert(tlTexts.length >= 3 && tlTexts.every(t => parseFloat(t.getAttribute('font-size')) >= 12), '時間軸上的文字 ≥ 12');
  assert(texts.some(t => /^現在( \d\d:\d\d)?$/.test(t.textContent)), '有「現在 hh:mm」標籤：' + texts.filter(t => /現在/.test(t.textContent)).map(t => t.textContent).join());
  const nowRect = Array.from(svg.querySelectorAll('rect')).find(r => r.getAttribute('fill') === 'var(--accent)');
  assert(!!nowRect, '「現在」標籤用撞色底');
  const dots = Array.from(svg.querySelectorAll('circle')).filter(c => c.getAttribute('r') === '5');
  assert(dots.length === 2 && dots.every(c => c.getAttribute('fill') === 'var(--ink)'), '實測點是黑色實心');
  const valLabels = texts.filter(t => /^\d+\.\d$/.test(t.textContent) && t.getAttribute('paint-order') === 'stroke');
  assert(valLabels.length === 2, '每個實測點旁有數值（白描邊）：' + valLabels.map(t => t.textContent).join());
  assert(!/stroke-dasharray="1,3"[^>]*opacity="0.5"/.test(svg.innerHTML), '「現在」不再是淡淡的點線');

  // ---------- 4. AMG ----------
  const sw = async drug => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); await tick(); };
  await sw('aminoglycoside');
  const amg = $('amgCurveSvg');
  assert(amg.parentElement.querySelector('#amgTimeline') !== null, 'AMG 曲線區有時間軸');
  // AMG 在 jsdom 載入時預設是空白；測資料需要補齊太多欄位，這裡只驗證重畫鉤子不會在空曲線上出錯
  Object.defineProperty(amg.parentElement, 'clientWidth', { configurable: true, get: () => 700 });
  roCallback([{ target: amg.parentElement }]);
  await tick();
  assert(amg.children.length === 0 || amg._tl.W === 700 - padOf(amg.parentElement), 'AMG 空曲線時重畫鉤子不動作；有曲線時依寬度重畫');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
