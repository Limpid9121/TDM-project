// test_f6_polish.js — v3 F6：最糟資料複驗後的修正（純顯示）
//
//   · 時間軸日期標籤：每個標籤至少留 46 px，範圍很長時隔幾天標一個（格線仍每天一條）
//   · 濃度軸單位字（µg/mL）不再壓在最上面那條刻度數字上
//   · 左欄同一列的欄位，標籤與輸入框上緣對齊：三行都進 subgrid（含日期時間欄、帶提示的欄）
//   · 勾選群組、說明段落後面接輸入列時留一個欄位組的間距
//   · 長文字輸入框結尾顯示「…」
//   · 病歷號長度與另存視窗一致（20 字）
//
// Run: node test_f6_polish.js

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
  const tick = (ms = 60) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.slice(html.indexOf('<style'), html.indexOf('</style>'));

  // --- 軸標籤 ---
  const axisTexts = () => Array.from($('curveSvg').querySelectorAll('text')).filter(t => /^\d{2}\/\d{2}$/.test(t.textContent.trim()));
  const xs = () => axisTexts().map(t => +t.getAttribute('x')).sort((a, b) => a - b);
  await tick(200);
  const base = xs();
  assert(base.length >= 3, '前提：示範病例的時間軸有日期標籤（' + base.length + '）');
  const minGap = a => a.reduce((m, x, i) => i ? Math.min(m, x - a[i - 1]) : m, 1e9);
  assert(minGap(base) >= 46, '示範病例：相鄰日期標籤至少 46 px（' + minGap(base).toFixed(0) + '）');

  // 把給藥紀錄拉成約 34 天（每天一劑）
  const pad = n => String(n).padStart(2, '0');
  for (let i = 0; i < 30; i++) {
    $('addDoseRow').click();
    const rows = doc.querySelectorAll('#doseTable .entry-row'); const r = rows[rows.length - 1];
    r.querySelector('.dose-date').value = '2026-09-' + pad(1 + (i % 28)) + 'T08:00';
    r.querySelector('.dose-mg').value = 1000; r.querySelector('.dose-inf').value = 60;
    r.querySelectorAll('input').forEach(fire);
  }
  await tick(300);
  const longX = xs();
  assert(longX.length >= 2, '長範圍：仍有日期標籤（' + longX.length + '）');
  assert(minGap(longX) >= 46, '長範圍：相鄰日期標籤至少 46 px（' + minGap(longX).toFixed(0) + '）');
  const gridDays = $('curveSvg').querySelectorAll('line[stroke="var(--line)"]').length;
  assert(gridDays > longX.length, '格線仍比標籤多（每天一條；格線 ' + gridDays + ' 條／標籤 ' + longX.length + ' 個）');

  // 單位字
  const unit = Array.from($('curveSvg').querySelectorAll('text')).find(t => /µg\/mL/.test(t.textContent));
  const ticks = Array.from($('curveSvg').querySelectorAll('text')).filter(t => /^\d+$/.test(t.textContent.trim()) && t.getAttribute('text-anchor') === 'end');
  const topTick = ticks.reduce((a, t) => (!a || +t.getAttribute('y') < +a.getAttribute('y')) ? t : a, null);
  assert(unit && topTick && (+topTick.getAttribute('y') - +unit.getAttribute('y')) >= 12, '單位字在最上面刻度數字上方至少 12 px（單位 y=' + (unit && unit.getAttribute('y')) + '、刻度 y=' + (topTick && topTick.getAttribute('y')) + '）');

  // --- CSS ---
  assert(/\.field-row > \.field\{display:grid;grid-row:1 \/ span 3;grid-template-rows:subgrid/.test(css), '欄位三行都進 subgrid');
  assert(/\.field-row\{grid-template-rows:auto auto auto/.test(css), '欄位列有三條列軌道');
  assert(/\.field:has\(> \.checkline\) \+ \.field-row[^{]*\{margin-top:12px/.test(css), '勾選群組後接輸入列留 12 px');
  assert(/p\.hint \+ \.field-row/.test(css), '說明段落後接輸入列留 12 px');
  assert(/input\[type="text"\]\{text-overflow:ellipsis/.test(css), '長文字輸入框結尾顯示「…」');

  assert(/\.btn:active:not\(:disabled\)\{transform:scale\(\.97\)/.test(css), '按鈕按下去有縮放回饋');
  assert(/\.card-body\{[^}]*grid-template-rows 200ms cubic-bezier\(\.23,1,\.32,1\)/.test(css), '收合動畫用強 ease-out、200 ms');

  // --- 病歷號長度 ---
  ['patientLabel', 'amgPatientLabel', 'azlPatientLabel', 'aedPatientLabel'].forEach(id => assert($(id).maxLength === 20, id + ' maxlength=20'));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
