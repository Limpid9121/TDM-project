// test_dt24.js — 日期時間改成「日期（原生日期選擇器）＋時間（24 小時制 HH:mm 直接鍵入）」
//
//   背景：原生 datetime-local 的上午／下午順序由瀏覽器決定、網頁改不了。Brandon 2026-10-23 選 24 小時制：沒有上午／下午就沒有順序問題。
//   做法：每個 input[type=datetime-local]（含動態新增的列）保留原元素（id、class、.value 的 "YYYY-MM-DDTHH:mm" 格式、事件都不變，
//   只是隱藏），旁邊多一組日期＋時間輸入；兩邊雙向同步。計算與存檔格式完全不變。
//
// Run: node test_dt24.js

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
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.replace(/\s+/g, ' ');
  const typeIn = (el, v) => { el.value = v; el.dispatchEvent(new win.Event('input', { bubbles: true })); };
  const wrapOf = src => src.nextElementSibling;

  $('loadDemoBtn').click(); await tick(300);

  // ---------- 1. 結構 ----------
  const all = Array.from(doc.querySelectorAll('input[type="datetime-local"]'));
  assert(all.length >= 25, '前提：頁面上有 25 個以上日期時間欄位（' + all.length + '）');
  assert(all.every(s => s.classList.contains('dt24-src') && wrapOf(s) && wrapOf(s).classList.contains('dt24')), '每個日期時間欄位後面都有 .dt24 輸入組（含動態列）');
  const ex = $('expandTo'), w = wrapOf(ex), d = w.querySelector('.dt24-d'), t = w.querySelector('.dt24-t');
  assert(d.type === 'date' && t.type === 'text' && t.getAttribute('inputmode') === 'numeric' && t.maxLength === 5 && /HH:mm/.test(t.placeholder), '日期＝原生日期欄、時間＝可直接鍵入的 HH:mm 文字欄');
  assert(/日期/.test(d.getAttribute('aria-label')) && /24 小時/.test(t.getAttribute('aria-label')), '兩個輸入都有可存取名稱：' + d.getAttribute('aria-label') + '／' + t.getAttribute('aria-label'));
  assert(/\.dt24-src\s*\{[^}]*display:\s*none/.test(css), '原本的 datetime-local 隱藏（.dt24-src）');
  assert(/\.dt24 \.dt24-d\.dt24-d\s*\{/.test(css), '日期欄的尺寸不被 .entry-row input[type=date] 蓋掉');

  // ---------- 2. 原元素 → 輸入組（程式設值） ----------
  ex.value = '2026-10-23T14:07';
  assert(d.value === '2026-10-23' && t.value === '14:07', '程式設 2026-10-23T14:07：顯示 14:07（24 小時，不是 02:07）');
  ex.value = '2026-10-24T09:05';
  assert(d.value === '2026-10-24' && t.value === '09:05', '再設一次：跟著變（補零 09:05）');
  ex.value = '';
  assert(d.value === '' && t.value === '', '設成空白：兩格都清空');

  // ---------- 3. 輸入組 → 原元素 ----------
  const seen = []; ex.addEventListener('input', () => seen.push('input')); ex.addEventListener('change', () => seen.push('change'));
  let leaked = 0; const spy = e => { if (e.target === d || e.target === t) leaked++; };
  doc.addEventListener('input', spy); doc.addEventListener('change', spy);
  d.value = '2026-10-23'; d.dispatchEvent(new win.Event('input', { bubbles: true })); d.dispatchEvent(new win.Event('change', { bubbles: true }));
  assert(ex.value === '', '只有日期、時間還空白：值還是空白（不替使用者猜時間）');
  typeIn(t, '2');
  assert(ex.value === '', '時間打到一半（2）：不提交');
  typeIn(t, '21');
  typeIn(t, '210');
  assert(t.value === '21:0' && ex.value === '', '打 3 碼自動補冒號（21:0），還不完整就不提交');
  typeIn(t, '21:07');
  assert(t.value === '21:07' && ex.value === '2026-10-23T21:07', '打滿 4 碼：提交 2026-10-23T21:07（' + ex.value + '）');
  assert(seen.includes('input') && seen.includes('change'), '提交時原元素發出 input、change（既有的重算邏輯照常運作）');
  typeIn(t, '2130');
  assert(t.value === '21:30' && ex.value === '2026-10-23T21:30', '直接打 2130 → 21:30');
  assert(leaked === 0, '輸入組自己的 input／change 不外洩到 document（只由原元素發出，不重複觸發）（' + leaked + '）');
  doc.removeEventListener('input', spy); doc.removeEventListener('change', spy);

  // 不合法
  typeIn(t, '2599');
  assert(ex.value === '2026-10-23T21:30' && t.classList.contains('dt24-bad'), '25:99 不合法：原元素不變、標紅');
  t.dispatchEvent(new win.Event('blur'));
  assert(t.value === '21:30' && !t.classList.contains('dt24-bad'), '離開欄位後還原成原本的 21:30');
  typeIn(t, '9:05');
  t.dispatchEvent(new win.Event('blur'));
  assert(t.value === '09:05' && ex.value === '2026-10-23T09:05', '9:05 離開欄位補成 09:05 並提交');
  // 清空
  typeIn(t, '');
  assert(ex.value === '', '時間清空：原元素變空白');
  typeIn(t, '0905'); d.value = ''; d.dispatchEvent(new win.Event('input', { bubbles: true }));
  assert(ex.value === '', '日期清掉：原元素空白');
  d.value = '2026-10-25'; d.dispatchEvent(new win.Event('input', { bubbles: true }));
  assert(ex.value === '2026-10-25T09:05', '再選日期：沿用輸入組裡的時間 09:05（' + ex.value + '）');

  // ---------- 4. ↑↓ 調整、跨日 ----------
  ex.value = '2026-10-23T23:59';
  t.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
  assert(ex.value === '2026-10-24T00:00' && d.value === '2026-10-24' && t.value === '00:00', '23:59 按 ↑：跨到隔天 00:00');
  t.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', shiftKey: true, bubbles: true }));
  assert(ex.value === '2026-10-23T23:50', 'Shift＋↓：往前 10 分鐘，回到前一天 23:50（' + ex.value + '）');

  // ---------- 5. 焦點、必填標示 ----------
  ex.focus();
  assert(doc.activeElement === d, '程式呼叫原元素 .focus()：焦點落在日期欄（缺資料清單點下去會用到）');
  ex.classList.add('is-missing');
  await tick(20);
  assert(w.classList.contains('is-missing'), '原元素加 is-missing：輸入組跟著標紅');
  ex.classList.remove('is-missing');
  await tick(20);
  assert(!w.classList.contains('is-missing'), '拿掉後跟著拿掉');

  // ---------- 6. 動態新增的列 ----------
  const nBefore = doc.querySelectorAll('#levelTable .entry-row').length;
  $('addLevelRow').click(); await tick(60);
  const rows = doc.querySelectorAll('#levelTable .entry-row');
  const row = rows[rows.length - 1];
  assert(rows.length === nBefore + 1 && !!row.querySelector('.level-date.dt24-src') && !!row.querySelector('.dt24 .dt24-t'), '新增濃度列：日期時間也是 24 小時輸入組');
  const lsrc = row.querySelector('.level-date');
  lsrc.value = '2026-10-22T13:30';
  assert(wrapOf(lsrc).querySelector('.dt24-t').value === '13:30', '新列程式設值 13:30 → 顯示 13:30');
  typeIn(wrapOf(lsrc).querySelector('.dt24-t'), '1445');
  assert(lsrc.value === '2026-10-22T14:45', '新列鍵入 1445 → 2026-10-22T14:45');
  // readDoseRows 之類用的 .dose-date 查詢仍只會找到原元素（輸入組不帶這些 class）
  assert(doc.querySelectorAll('#doseTable .dose-date').length === doc.querySelectorAll('#doseTable .entry-row').length, '.dose-date 一列一個（輸入組不帶原 class，既有查詢不會重複）');
  // 讀回存檔：套用狀態會設 .value → 輸入組跟著
  const dr = doc.querySelector('#doseTable .dose-date');
  dr.value = '2026-10-20T05:00';
  assert(wrapOf(dr).querySelector('.dt24-t').value === '05:00', '套用存檔（設 .value）後輸入組同步');

  // ---------- 6b. type=time 的欄位（透析開始時刻等）：只有時間一格，24 小時制 ----------
  const times = Array.from(doc.querySelectorAll('input[type="time"]'));
  assert(times.length >= 4, '前提：有 4 個以上 type=time 欄位（' + times.length + '）');
  assert(times.every(s => s.classList.contains('dt24-src') && wrapOf(s) && wrapOf(s).classList.contains('dt24-time') && !!wrapOf(s).querySelector('.dt24-t') && !wrapOf(s).querySelector('.dt24-d')), 'type=time 欄位：隱藏原元素、旁邊只有一格 24 小時時間輸入');
  const hs = $('hdSlotStart'), ht = wrapOf(hs).querySelector('.dt24-t');
  assert(hs.value === '08:00' && ht.value === '08:00', '初始值 08:00 顯示 08:00（不是「上午 08:00」）');
  hs.value = '21:15';
  assert(ht.value === '21:15', '程式設 21:15：顯示 21:15');
  const tseen = []; hs.addEventListener('input', () => tseen.push(1));
  typeIn(ht, '0630');
  assert(ht.value === '06:30' && hs.value === '06:30' && tseen.length >= 1, '鍵入 0630 → 原元素 06:30，並發出 input');
  typeIn(ht, '2460');
  assert(hs.value === '06:30' && ht.classList.contains('dt24-bad'), '24:60 不合法：原元素不變、標紅');
  ht.dispatchEvent(new win.Event('blur'));
  assert(ht.value === '06:30', '離開欄位還原');
  ht.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert(hs.value === '06:29', '↓ 減 1 分鐘');
  hs.value = '00:00';
  ht.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  assert(hs.value === '23:59', '00:00 按 ↓ → 23:59（一天內循環）');
  hs.value = '08:00';

  // ---------- 7. 全選（點一下欄位就全選，直接取代） ----------
  let sel = 0; const orig = win.HTMLInputElement.prototype.select; win.HTMLInputElement.prototype.select = function () { if (this === t) sel++; return orig.call(this); };
  t.dispatchEvent(new win.FocusEvent('focusin', { bubbles: true }));
  assert(sel === 1, '時間欄聚焦就全選');
  win.HTMLInputElement.prototype.select = orig;

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
