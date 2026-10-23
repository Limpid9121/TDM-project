// test_f7_accent.js — v3 F7：撞色角色＋深藍判讀板（純顯示；曲線座標由 golden 把關）
//
//   · token：每個撞色有 accent-ink（白底可讀的深版）與 accent-tint（淡底）；深底狀態色 ok／caution／danger-on-dark
//   · 對比：深底狀態色、navy-soft、白字在深藍上 ≥4.5:1；accent-ink 在白底與自己的淡底上 ≥4.5:1；撞色上的字 ≥4.5:1
//   · 判讀板：判讀標題列＋參數區是深藍板，上下緣各一條 3 px 撞色線；板上狀態色用深底版
//   · 六個角色：主要動作、目前所在、你的選擇、現在、判讀板的邊、瀏覽器表面
//   · 曲線 SVG：what-if 線、輸注條、起始線、圖例、游標點用撞色（不再用琥珀色，避免跟「留意」混淆）
//   · 沒有寬度超過 1 px 的彩色左邊框（.regimen-pick-bar、.demo-banner、.flag-item）
//   · F7 樣式區塊沒有 !important
//
// Run: node test_f7_accent.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

const lum = hex => { const c = hex.replace('#', ''); const v = [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16) / 255).map(x => x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const la = lum(a), lb = lum(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const squash = s => s.replace(/\s+/g, ' ');

  // ---------- 1. token ----------
  const rootRule = sel => { const m = html.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')); return m ? squash(m[1]) : ''; };
  const tok = (block, name) => { const m = block.match(new RegExp('--' + name + ':\\s*(#[0-9A-Fa-f]{6})')); return m ? m[1].toUpperCase() : null; };
  const base = rootRule(':root');
  const ACC = {
    magenta: { block: base, accent: '#C2185B', ink: '#C2185B', tint: '#FBE4EE', on: '#FFFFFF' },
    vermilion: { block: rootRule(':root[data-accent="vermilion"]'), accent: '#E4572E', ink: '#B23A12', tint: '#FCE6DE', on: '#14171C' },
    mustard: { block: rootRule(':root[data-accent="mustard"]'), accent: '#F2B705', ink: '#7A5800', tint: '#FFF3C4', on: '#14171C' },
    none: { block: rootRule(':root[data-accent="none"]'), accent: '#C9D2E3', ink: '#1B2A4A', tint: '#EEF1F6', on: '#14171C' }
  };
  Object.entries(ACC).forEach(([k, a]) => {
    assert(tok(a.block, 'accent') === a.accent, k + '：--accent ' + a.accent);
    assert(tok(a.block, 'accent-ink') === a.ink, k + '：--accent-ink ' + a.ink + '（實際 ' + tok(a.block, 'accent-ink') + '）');
    assert(tok(a.block, 'accent-tint') === a.tint, k + '：--accent-tint ' + a.tint + '（實際 ' + tok(a.block, 'accent-tint') + '）');
    assert(ratio(a.ink, '#FFFFFF') >= 4.5, k + '：accent-ink 在白底 ≥4.5:1（' + ratio(a.ink, '#FFFFFF').toFixed(2) + '）');
    assert(ratio(a.ink, a.tint) >= 4.5, k + '：accent-ink 在自己的淡底 ≥4.5:1（' + ratio(a.ink, a.tint).toFixed(2) + '）');
    assert(ratio(a.on, a.accent) >= 4.5, k + '：撞色上的字 ≥4.5:1（' + ratio(a.on, a.accent).toFixed(2) + '）');
  });
  assert(tok(base, 'ok-on-dark') === '#7EE2A8' && tok(base, 'caution-on-dark') === '#FFD9A0' && tok(base, 'danger-on-dark') === '#FFB4A8', '深底狀態色 token：ok／caution／danger-on-dark');
  const NAVY = '#1B2A4A';
  ['#7EE2A8', '#FFD9A0', '#FFB4A8', '#C9D2E3', '#FFFFFF'].forEach(c => assert(ratio(c, NAVY) >= 4.5, c + ' 在深藍板上 ≥4.5:1（' + ratio(c, NAVY).toFixed(2) + '）'));
  assert(ratio('#9A5A00', NAVY) < 4.5 && ratio('#1C7A43', NAVY) < 4.5, '（對照）白底版的 caution／ok 在深藍上不夠，所以才要深底版');

  // ---------- 2. F7 區塊 ----------
  const a = html.indexOf('/* F7 begin'), b = html.indexOf('/* F7 end */');
  assert(a > 0 && b > a, '有 F7 樣式區塊（/* F7 begin … /* F7 end */）');
  const f7 = squash(html.slice(a, b));
  assert(!/!important/.test(f7), 'F7 區塊沒有 !important');
  assert(!/exp_accent/.test(html), '沒有引用試做檔 exp_accent');

  // 判讀板
  assert(/> \.results-head\s*\{[^}]*background:\s*var\(--navy\)[^}]*box-shadow:\s*inset 0 3px 0 var\(--accent\)/.test(f7), '判讀標題列：深藍底、上緣 3 px 撞色線');
  assert(/> \.param-grid\s*\{[^}]*background:\s*var\(--navy\)[^}]*box-shadow:\s*inset 0 -3px 0 var\(--accent\)/.test(f7), '參數區：深藍底、下緣 3 px 撞色線');
  assert(/\.param-grid\.pg \.param-cell \.value\s*\{[^}]*color:\s*#fff/.test(f7), '板上數字白字');
  assert(/\.param-grid\.pg \.param-cell \.(lbl-main|lbl-note|sub|unit)[^{]*\{[^}]*color:\s*var\(--navy-soft\)/.test(f7), '板上標籤與說明用 navy-soft');
  ['ok', 'warn', 'danger'].forEach(k => {
    const tokName = { ok: 'ok-on-dark', warn: 'caution-on-dark', danger: 'danger-on-dark' }[k];
    assert(new RegExp('\\.param-grid\\.pg \\.param-cell\\.flag-' + k + ' \\.value\\s*\\{[^}]*color:\\s*var\\(--' + tokName + '\\)').test(f7), '板上 flag-' + k + ' 數字用 --' + tokName);
  });
  assert(/#paramGrid \.pc-auc\.flag-ok::after\s*\{[^}]*color:\s*var\(--ok-on-dark\)/.test(f7), '「目標 400–600 ■ 目標內」用深底版綠');
  assert(/#paramGrid \.pc-auc\.flag-warn::after\s*\{[^}]*color:\s*var\(--caution-on-dark\)/.test(f7) && /#paramGrid \.pc-auc\.flag-danger::after\s*\{[^}]*color:\s*var\(--danger-on-dark\)/.test(f7), '低於／超過目標的狀態字也用深底版');

  // 角色
  assert(/\.btn\.primary#expandDoses|#expandDoses[^{]*\{[^}]*background:\s*var\(--accent\)/.test(f7) && /#expandDoses[^{]*\{[^}]*color:\s*var\(--on-accent\)/.test(f7), '主要動作：展開給藥紀錄是實心撞色、字用 on-accent');
  assert(/#drugSwitch \.drug-switch-btn\.primary\s*\{[^}]*background:\s*var\(--accent\)[^}]*color:\s*var\(--on-accent\)/.test(f7), '目前所在：目前藥物分頁是實心撞色塊');
  assert(/\.mod-tab\.active\s*\{[^}]*border-bottom-color:\s*var\(--accent-ink\)/.test(f7), '目前所在：計算／病人資料分頁底線用 accent-ink');
  assert(/\.card:not\(\.collapsed\) > h2 \.idx\s*\{[^}]*background:\s*var\(--accent-ink\)/.test(f7), '目前所在：展開中段落的編號框');
  assert(/\.regimen-table tr\.picked\s*\{[^}]*background:\s*var\(--accent-tint\)/.test(f7), '你的選擇：勾選的候選方案列用 accent-tint');
  assert(/\.regimen-pick-bar\s*\{[^}]*background:\s*var\(--accent-tint\)/.test(f7), '你的選擇：提示列用 accent-tint');
  assert(/\.whatif-readout[^{]*\{[^}]*color:\s*var\(--accent-ink\)/.test(f7), '你的選擇：what-if 讀數用 accent-ink');
  assert(/::selection\s*\{[^}]*background:\s*var\(--accent-tint\)/.test(f7), '瀏覽器表面：選取底 accent-tint');
  assert(/input, textarea\s*\{[^}]*caret-color:\s*var\(--accent-ink\)/.test(f7), '瀏覽器表面：游標 accent-ink');
  assert(/:focus-visible\s*\{[^}]*outline-color:\s*var\(--accent-ink\)/.test(f7), '瀏覽器表面：焦點外框 accent-ink');
  assert(/header\.top :focus-visible\s*\{\s*outline-color:\s*#fff/.test(squash(html)), '瀏覽器表面：深藍底上的焦點外框用白色（撞色在深藍上只有 2.4:1，達不到 3:1）');
  assert(/input\[type="checkbox"\][^{]*\{[^}]*accent-color:\s*var\(--accent-ink\)/.test(f7), '瀏覽器表面：勾選框與單選鈕 accent-color');
  assert(/scrollbar-color:/.test(f7), '瀏覽器表面：捲軸顏色');

  // 寬彩色左邊框
  const wide = /(\.regimen-pick-bar|\.demo-banner|\.flag-item[^{,]*)\s*\{[^}]*border-left:\s*([2-9]|\d\d)px/g;
  const bad = []; let m; while ((m = wide.exec(html))) bad.push(m[1] + '…' + m[0].slice(-40));
  assert(bad.length === 0, '.regimen-pick-bar、.demo-banner、.flag-item 沒有 >1 px 的左邊框（' + bad.join(' ｜ ') + '）');
  assert(!/tr:has\([^)]*regimen-pick[^)]*\)[^{]*\{[^}]*inset 3px/.test(html), '勾選列沒有 3 px 左線');

  // ---------- 3. 曲線 SVG：what-if 用撞色 ----------
  $('loadDemoBtn').click(); await tick(250);
  const picks = doc.querySelectorAll('input.regimen-pick');
  assert(picks.length >= 2, '前提：有候選方案可勾');
  picks[1].checked = true; fire(picks[1]); await tick(250);
  const svg = $('curveSvg');
  const wi = Array.from(svg.querySelectorAll('path')).find(p => p.getAttribute('stroke-dasharray') === '7,4');
  assert(!!wi, '前提：勾選方案後曲線有 what-if 線');
  assert(wi && wi.getAttribute('stroke') === 'var(--accent-ink)', 'what-if 線用 var(--accent-ink)（實際 ' + (wi && wi.getAttribute('stroke')) + '）');
  const wiBars = Array.from(svg.querySelectorAll('rect')).filter(r => parseFloat(r.getAttribute('height')) === 5 && /accent/.test(r.getAttribute('fill') || ''));
  assert(wiBars.length >= 1 && wiBars.every(r => r.getAttribute('fill') === 'var(--accent)'), 'what-if 輸注條用 var(--accent)（' + wiBars.length + ' 條）');
  const legendLine = Array.from(svg.querySelectorAll('line')).find(l => l.getAttribute('stroke-dasharray') === '7,4');
  assert(!!legendLine && legendLine.getAttribute('stroke') === 'var(--accent-ink)', 'what-if 圖例線用 accent-ink');
  const whatIfElems = Array.from(svg.querySelectorAll('[fill="var(--amber)"],[stroke="var(--amber)"]')).filter(e => !e.classList.contains('curve-lbl'));
  assert(whatIfElems.length === 0, '曲線上除了目標帶標籤，沒有任何琥珀色元素（' + whatIfElems.map(e => e.tagName).join() + '）');
  assert(/ch-whatif-bg[^>]*fill="var\(--accent-ink\)"/.test(svg.innerHTML) && /ch-dot-whatif[^>]*fill="var\(--accent-ink\)"/.test(svg.innerHTML), '十字游標的 what-if 標籤與點用 accent-ink');
  const nowLbl = Array.from(svg.querySelectorAll('rect')).find(r => r.getAttribute('fill') === 'var(--accent)' && r.getAttribute('height') === '17');
  assert(!!nowLbl, '「現在」標籤用 var(--accent)');
  picks[1].checked = false; fire(picks[1]); await tick(100);

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
