// test_loading_first.js — vancomycin 給藥處方：先 loading、再維持（Brandon 2026-10-22）
//   · 版面順序：「第一筆給藥是不是療程第一劑」→ Loading（獨立首劑）→ 維持處方 → 產生範圍
//   · 選「第一筆紀錄就是療程第一劑」：預設勾「首劑為獨立 loading」（大部分情況都會 loading），並幫忙帶好第一劑維持劑量時間
//   · 已經有給藥紀錄時不自動勾（loading 只影響「自動展開」，勾了會跟紀錄對不上）
//   · 使用者自己取消勾選後，再切換選項不再替他勾回去
//   · 選「之前已規則給藥（穩態）」：loading 取消勾選、整個 loading 區塊收起
//   · 只有使用者操作（change 事件）才會自動勾；程式載入示範病例、讀回存檔不動 loading
//
// Run: node test_loading_first.js

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
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const pick = async id => { $(id).checked = true; fire($(id)); await tick(); };
  const chk = async (id, v) => { $(id).checked = v; fire($(id)); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const before = (a, b) => !!(a.compareDocumentPosition(b) & win.Node.DOCUMENT_POSITION_FOLLOWING);

  // ---------- 1. 版面順序 ----------
  assert(before($('vancoFirstDoseKindGroup'), $('useLoading')), '第一筆給藥的選項在 loading 之前');
  assert(before($('useLoading'), $('loadingDose')) && before($('loadingDose'), $('maintDose')), 'loading 劑量在維持劑量之前（先 loading，再維持）');
  assert(before($('loadingInf'), $('maintDose')) && before($('maintDose'), $('firstMaintDoseTime')) && before($('firstMaintDoseTime'), $('therapyStart')), 'loading 輸注時間在維持劑量之前；第一劑維持劑量時間在維持處方區（2026-10-23 改成一直顯示）');
  assert(before($('maintDose'), $('therapyStart')) && before($('therapyStart'), $('expandDoses')), '維持處方之後才是產生範圍與展開按鈕');
  assert(!!$('vancoLoadingBlock') && $('vancoLoadingBlock').contains($('useLoading')) && $('vancoLoadingBlock').contains($('loadingFields')), 'loading 區塊 #vancoLoadingBlock 包住勾選框與欄位');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert(/#vancoFirstDoseSteady:checked[^{]*~\s*#vancoLoadingBlock\s*\{[^}]*display:\s*none/.test(html), '選「已規則給藥（穩態）」時 loading 區塊以 CSS 收起');

  // ---------- 2. 示範病例（程式載入）不被動 ----------
  assert($('useLoading').checked === false, '示範病例載入後 loading 維持未勾（程式設定不觸發自動勾選）');

  // ---------- 3. 使用者選「第一筆就是第一劑」→ 預設勾 loading ----------
  $('clearAllBtn').click(); await tick();
  await set('therapyStart', '2026-10-20T09:00'); await set('maintInterval', '12');
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === true, '選「第一筆紀錄就是療程第一劑」：預設勾「首劑為獨立 loading」');
  assert($('loadingFields').style.display === 'grid', 'loading 欄位展開');
  assert($('firstMaintDoseTime').value === '2026-10-20T21:00', '第一劑維持劑量時間自動帶「分析起點＋間隔」：' + $('firstMaintDoseTime').value);
  // 展開：第一列是 loading 劑量，之後是維持劑量
  await set('loadingDose', '2000'); await set('loadingInf', '120'); await set('maintDose', '1000'); await set('maintInf', '120');
  await set('expandTo', '2026-10-21T21:00');
  $('expandDoses').click(); await tick();
  const rows = Array.from(doc.querySelectorAll('#doseTable .entry-row')).map(r => [r.querySelector('.dose-date').value, r.querySelector('.dose-mg').value]);
  assert(rows.length >= 3 && rows[0][1] === '2000' && rows[1][1] === '1000' && rows[1][0] === '2026-10-20T21:00', '展開：第一列 loading 2000 mg，接著 21:00 起維持 1000 mg：' + JSON.stringify(rows.slice(0, 3)));

  // ---------- 4. 選「穩態」→ 取消勾選 ----------
  await pick('vancoFirstDoseSteady');
  assert($('useLoading').checked === false && $('loadingFields').style.display === 'none', '選「之前已規則給藥」：loading 取消勾選、欄位收起');
  assert($('assumeSteadyState').checked === true, '穩態假設照舊（既有行為）');
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === false, '已經有給藥紀錄時，選「第一劑」不替他勾 loading（loading 只影響自動展開，勾了會跟紀錄對不上）');
  $('clearAllBtn').click(); await tick();
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === true, '沒有給藥紀錄時（清空後）選「第一劑」：預設勾');

  // ---------- 5. 使用者自己取消 → 不再替他勾 ----------
  await chk('useLoading', false);
  await pick('vancoFirstDoseSteady');
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === false, '使用者自己取消勾選後，再切換選項不替他勾回去');
  // 清空後重置「使用者動過」
  $('clearAllBtn').click(); await tick();
  await pick('vancoFirstDoseFirst');
  assert($('useLoading').checked === true, '清空此頁後重新來：又是預設勾');

  // ---------- 6. 已有 firstMaintDoseTime 時不覆蓋 ----------
  await chk('useLoading', false); await pick('vancoFirstDoseSteady');
  $('clearAllBtn').click(); await tick();
  await set('therapyStart', '2026-10-20T09:00'); await set('maintInterval', '8');
  await set('firstMaintDoseTime', '2026-10-20T15:30');
  await pick('vancoFirstDoseFirst');
  assert($('firstMaintDoseTime').value === '2026-10-20T15:30', '使用者已填的第一劑維持劑量時間不被覆蓋');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
