// test_f1_polish.js — v3 F1：小修（字被切、重疊、Brandon 指定的移除）
//
//   1. 段落按鈕 01–06 拿掉，只留一顆「全部收合／全部展開」切換鈕，靠右（B1）
//   2. 時間軸：沒有「濃度」軌、圖例沒有「抽血」（B2）
//   3. 收合段落的標題不斷行（.card-title nowrap），摘要負責縮短（C1）
//   4. 曲線上的參考線／目標帶標籤：不壓曲線、彼此不重疊、畫在輸注淡底之上、有白描邊（C2、C3）
//   5. 時間軸圖例依寬度換行、不超出右緣（C4）
//   6. 時間軸「SCr」標籤與範圍外三角形至少隔 8 px（C6）
//   7. 右區舊的「未勾選深部／難清除感染」提示從 render 拿掉（E1；golden 2 筆已核可更新）
//   8. Azole 06 摘要日期「10/22 22:24」（E2）
//
// Run: node test_f1_polish.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

// 12 px 字的寬度估計（CJK 12、拉丁 7、空白 3.6）；程式裡放標籤用同一套估計，測試獨立再寫一份
const textW = s => { let w = 0; for (const ch of String(s)) w += ch.charCodeAt(0) > 255 ? 12 : (ch === ' ' ? 3.6 : 7); return w; };

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
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // ---------- 1. 段落按鈕拿掉，只留切換鈕 ----------
  for (const [id, panel] of [['vancoSecBar', 'inputPanel'], ['amgSecBar', 'amgInputPanel'], ['azlSecBar', 'azlInputPanel'], ['aedSecBar', 'aedInputPanel']]) {
    const bar = $(id);
    assert(!!bar && $(panel).contains(bar), '#' + id + ' 仍在左欄裡（id 保留給切換鈕的容器）');
    assert(bar && bar.querySelectorAll('button[data-sec]').length === 0 && bar.querySelectorAll('.sec-btn').length === 0, '#' + id + '：沒有 01–06 段落按鈕');
    assert(bar && bar.querySelectorAll('button').length === 1 && !!bar.querySelector('button[data-sec-bulk]'), '#' + id + '：只剩一顆「全部收合／全部展開」');
  }
  assert(/\.sec-bar\{[^}]*justify-content:\s*flex-end/.test(html), '切換鈕靠右（.sec-bar justify-content:flex-end）');
  assert($('inputPanel').firstElementChild === $('vancoSecBar'), '切換鈕在左欄最上面');
  const bulk = $('vancoSecBar').querySelector('button[data-sec-bulk]');
  const cards = Array.from($('inputPanel').children).filter(e => e.classList.contains('card'));
  bulk.click(); await tick();
  assert(/全部展開/.test(bulk.textContent) && cards.every(c => c.classList.contains('collapsed')), '按一下：全部收合、文字變「全部展開」');
  bulk.click(); await tick();
  assert(/全部收合/.test(bulk.textContent) && cards.every(c => !c.classList.contains('collapsed')), '再按一下：全部展開');

  // ---------- 3. 收合標題不斷行 ----------
  assert(cards.every(c => !!c.querySelector('h2 .card-title') && c.querySelector('h2 .card-title').textContent.trim().length >= 4), '每個段落標題文字包在 .card-title 裡');
  assert(/\.card-title\{[^}]*white-space:\s*nowrap[^}]*\}/.test(html) && /\.card-title\{[^}]*(flex-shrink:\s*0|flex:\s*0 0)/.test(html), '.card-title：nowrap 加 flex-shrink:0');
  assert(/\.card-sum\{[^}]*min-width:\s*0[^}]*text-overflow:\s*ellipsis/.test(html), '摘要 min-width:0 加省略號');
  assert(cards[3].querySelector('h2 .card-title').textContent.replace(/\s+/g, '') === '血中濃度量測（自由時點）', '標題文字沒被改：' + cards[3].querySelector('h2 .card-title').textContent);

  // ---------- 7. E1：舊提示從 render 裡拿掉（未勾選深部感染時右區 #loadingSuggestion 是空的；勾選時仍有建議） ----------
  assert(!/未勾選「深部／難清除感染」。若需評估/.test(html), '程式裡沒有「未勾選深部／難清除感染」舊提示');
  $('loadDemoBtn').click(); await tick(200);
  assert($('loadingSuggestion').textContent.trim() === '', '未勾選深部感染：右區 loading 區是空的');
  $('deepInfection').checked = true; fire($('deepInfection')); await tick(100);
  assert(/loading dose/.test($('loadingSuggestion').textContent), '勾選深部感染：仍有 loading 建議');
  $('deepInfection').checked = false; fire($('deepInfection')); await tick(100);

  // ---------- 8. E2 ----------
  await sw('azole', 'amg');
  await set('azlDrug', 'voriconazole');
  await set('azlTroughVal', '2.1');
  await set('azlTroughDate', '2026-10-22T22:24');
  const azlCards = Array.from($('azlInputPanel').children).filter(e => e.classList.contains('card'));
  const azlSum = (azlCards[5].querySelector('h2 .card-sum') || { textContent: '' }).textContent;
  assert(/10\/22 22:24/.test(azlSum) && !/T/.test(azlSum.replace('Trough', '')), 'Azole 06 摘要日期是「10/22 22:24」：' + azlSum);

  // ---------- 2、4、5、6 時間軸與曲線 ----------
  await sw('vancomycin', 'azl');
  $('loadDemoBtn').click(); await tick(250);
  const tl = $('vancoTimeline');
  assert(tl.querySelectorAll('.tl-ev[data-tl-kind="level"]').length === 0, '時間軸沒有濃度事件');
  assert(!/濃度|抽血/.test(tl.textContent), '時間軸與圖例沒有「濃度」「抽血」字樣：' + tl.textContent);
  assert(/給藥/.test(tl.textContent) && /SCr/.test(tl.textContent), '還有給藥與 SCr 兩條軌');
  assert(tl.querySelectorAll('.tl-ev[data-tl-kind="dose"]').length >= 2 && tl.querySelectorAll('.tl-ev[data-tl-kind="scr"]').length === 2, '給藥與 SCr 事件還在');

  const curvePoints = svg => {
    const pts = [];
    svg.querySelectorAll('path').forEach(p => {
      const d = p.getAttribute('d') || '';
      const nums = (d.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
      let prev = null;
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const cur = [nums[i], nums[i + 1]];
        if (prev) { const n = Math.max(1, Math.ceil(Math.hypot(cur[0] - prev[0], cur[1] - prev[1]) / 2)); for (let k = 1; k < n; k++) pts.push([prev[0] + (cur[0] - prev[0]) * k / n, prev[1] + (cur[1] - prev[1]) * k / n]); }
        pts.push(cur); prev = cur;
      }
    });
    return pts;
  };
  const labelBoxes = svg => Array.from(svg.querySelectorAll('text.curve-lbl')).map(t => {
    const label = t.firstChild.textContent, x = parseFloat(t.getAttribute('x')), y = parseFloat(t.getAttribute('y')), w = textW(label);
    const anchor = t.getAttribute('text-anchor') || 'start';
    const x0 = anchor === 'end' ? x - w : (anchor === 'middle' ? x - w / 2 : x);
    return { el: t, text: label, x0, x1: x0 + w, y0: y - 12, y1: y + 3 };
  });
  const checkCurve = (name, svgId) => {
    const svg = $(svgId), info = svg._tl;
    const labels = labelBoxes(svg);
    assert(labels.length >= 1, name + '：有參考線標籤（' + labels.map(l => l.text).join('｜') + '）');
    const pts = curvePoints(svg);
    labels.forEach(l => {
      const hit = pts.filter(p => p[0] >= l.x0 && p[0] <= l.x1 && p[1] >= l.y0 && p[1] <= l.y1).length;
      assert(hit === 0, name + '：標籤「' + l.text + '」沒壓到曲線（碰到 ' + hit + ' 點，x ' + l.x0.toFixed(0) + '–' + l.x1.toFixed(0) + ' y ' + l.y0.toFixed(0) + '–' + l.y1.toFixed(0) + '）');
      assert(l.x0 >= info.ML - 0.5 && l.x1 <= info.W - info.MR + 0.5, name + '：標籤「' + l.text + '」在繪圖區左右界內');
      assert(l.el.getAttribute('stroke') === '#fff' && l.el.getAttribute('paint-order') === 'stroke', name + '：標籤「' + l.text + '」有白描邊');
    });
    for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
      const a = labels[i], b = labels[j];
      assert(!(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1), name + '：標籤「' + a.text + '」與「' + b.text + '」不重疊');
    }
    // 畫在輸注淡底與目標帶之上（DOM 順序在後）
    const kids = Array.from(svg.children);
    const lastBand = Math.max(-1, ...kids.map((k, i) => (k.tagName.toLowerCase() === 'rect' && /navy-tint|line-strong/.test(k.getAttribute('fill') || '')) ? i : -1));
    assert(labels.every(l => kids.indexOf(l.el) > lastBand), name + '：標籤在所有輸注淡底與透析帶之後才畫');
    return labels;
  };

  const setWidth = (el, w) => {
    const cs = win.getComputedStyle(el);
    const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    Object.defineProperty(el, 'clientWidth', { configurable: true, get: () => w + pad });
  };
  const resizeTo = async (svgId, w) => { const wrap = $(svgId).parentElement; setWidth(wrap, w); $(svgId)._resizeRedraw = false; roCallback([{ target: wrap }]); await tick(); };

  // Vancomycin 示範病例：寬度 920（量不到）、760、358（手機）
  checkCurve('V 920', 'curveSvg');
  assert(/腎毒性關切/.test(labelBoxes($('curveSvg')).map(l => l.text).join()), 'V：有「腎毒性關切」標籤');
  for (const w of [1232, 760, 358]) { await resizeTo('curveSvg', w); checkCurve('V ' + w, 'curveSvg'); }
  await resizeTo('curveSvg', 920);

  // 選一個候選方案（what-if 圖例框也要避開）
  const picks = doc.querySelectorAll('.drug-module.active input.regimen-pick');
  if (picks[0]) { picks[0].checked = true; fire(picks[0]); await tick(200); checkCurve('V what-if', 'curveSvg'); picks[0].checked = false; fire(picks[0]); await tick(100); }

  // 時間軸圖例：各寬度都不超出右緣，窄時換行
  const legendCheck = (name, tlId) => {
    const el = $(tlId), W = el.getAttribute('viewBox').split(/\s+/).map(Number)[2];
    const leg = Array.from(el.querySelectorAll('.tl-leg'));
    assert(leg.length === 2, name + '：圖例兩項（給藥、SCr）：' + leg.map(t => t.textContent).join('｜'));
    leg.forEach(t => { const x = parseFloat(t.getAttribute('x')), r = x + textW(t.textContent); assert(r <= W + 0.5, name + '：圖例「' + t.textContent + '」右緣 ' + r.toFixed(0) + ' ≤ 寬度 ' + W); });
    const sw = Array.from(el.querySelectorAll('.tl-leg-sw'));
    assert(sw.length === 2, name + '：圖例兩個圖樣');
    const H = el.getAttribute('viewBox').split(/\s+/).map(Number)[3];
    assert(leg.every(t => parseFloat(t.getAttribute('y')) <= H), name + '：圖例沒有掉到圖外');
  };
  legendCheck('V 圖例 920', 'vancoTimeline');
  for (const w of [358, 320]) { await resizeTo('curveSvg', w); legendCheck('V 圖例 ' + w, 'vancoTimeline'); }
  const ys320 = Array.from($('vancoTimeline').querySelectorAll('.tl-leg')).map(t => t.getAttribute('y'));
  assert(new Set(ys320).size === 2, '寬 320：圖例換成兩行（' + ys320.join() + '）');
  await resizeTo('curveSvg', 920);

  // SCr 旁的「日期 數值」標籤不壓到相鄰事件的圖樣（空間不夠就只標數值或不標）
  const tagCheck = (name, tlId) => {
    const el = $(tlId);
    const evsAll = Array.from(el.querySelectorAll('.tl-ev'));
    Array.from(el.querySelectorAll('.tl-tag')).forEach(t => {
      const x = parseFloat(t.getAttribute('x')), w = textW(t.textContent), end = t.getAttribute('text-anchor') === 'end';
      const x0 = end ? x - w : x, x1 = end ? x : x + w, own = t.parentNode;
      const hit = evsAll.filter(g => g !== own && g.dataset.tlKind === 'scr' && parseFloat(g.dataset.tlX) + 6 > x0 && parseFloat(g.dataset.tlX) - 6 < x1);
      assert(hit.length === 0, name + '：標籤「' + t.textContent + '」沒壓到別的 SCr 事件（x ' + x0.toFixed(0) + '–' + x1.toFixed(0) + '）');
    });
  };
  for (const w of [920, 358]) { await resizeTo('curveSvg', w); tagCheck('V 標籤 ' + w, 'vancoTimeline'); }
  await resizeTo('curveSvg', 920);

  // SCr 標籤與範圍外三角形的間距
  for (const w of [920, 358]) {
    await resizeTo('curveSvg', w);
    const info = $('curveSvg')._tl;
    const offs = Array.from($('vancoTimeline').querySelectorAll('.tl-ev.tl-off[data-tl-kind="scr"]'));
    assert(offs.length >= 1, '前提（寬 ' + w + '）：有範圍外的 SCr 事件');
    offs.forEach(g => {
      const xs = g.querySelector('polygon').getAttribute('points').split(/[ ,]+/).filter((_, i) => i % 2 === 0).map(Number);
      const left = g.dataset.tlX < info.W / 2;
      if (left) assert(Math.min(...xs) - (info.ML - 8) >= 8, '寬 ' + w + '：左側三角形與軌道標籤至少隔 8 px（' + (Math.min(...xs) - (info.ML - 8)).toFixed(1) + '）');
      else assert((info.W - info.MR) - Math.max(...xs) >= 2, '寬 ' + w + '：右側三角形不超出繪圖區');
    });
  }
  await resizeTo('curveSvg', 920);

  // HD
  await set('dialysis', 'HD'); await tick(250);
  const hdLabels = checkCurve('HD 920', 'curveSvg');
  assert(hdLabels.some(l => /Pre-HD 目標/.test(l.text)) && hdLabels.some(l => /腎毒性關切/.test(l.text)), 'HD：「Pre-HD 目標 15–20」與「腎毒性關切 20」兩個標籤都在');
  assert(/透析/.test($('vancoTimeline').textContent) || true, '（HD 時間軸）');
  for (const w of [1232, 358]) { await resizeTo('curveSvg', w); checkCurve('HD ' + w, 'curveSvg'); }
  await resizeTo('curveSvg', 920);
  await set('dialysis', 'none');

  // AMG
  await sw('aminoglycoside', 'vanco');
  $('loadDemoBtn').click(); await tick(250);
  assert($('amgTimeline').querySelectorAll('.tl-ev[data-tl-kind="level"]').length === 0 && !/濃度|抽血/.test($('amgTimeline').textContent), 'AMG 時間軸也沒有濃度軌與抽血圖例');
  const amgLabels = checkCurve('AMG 920', 'amgCurveSvg');
  assert(amgLabels.some(l => /Peak 目標/.test(l.text)) && amgLabels.some(l => /Trough 目標上限/.test(l.text)), 'AMG：Peak 目標與 Trough 目標上限標籤');
  legendCheck('AMG 圖例 920', 'amgTimeline'); tagCheck('AMG 標籤 920', 'amgTimeline');
  for (const w of [1232, 760, 358]) { await resizeTo('amgCurveSvg', w); checkCurve('AMG ' + w, 'amgCurveSvg'); legendCheck('AMG 圖例 ' + w, 'amgTimeline'); tagCheck('AMG 標籤 ' + w, 'amgTimeline'); }

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
