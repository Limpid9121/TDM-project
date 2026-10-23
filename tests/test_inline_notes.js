// test_inline_notes.js — REDESIGN D8：驗證型 alert() 改成行內提示（UIUX_IMPL_SPEC Phase 7）
//   · 不再彈 alert；提示出現在按鈕所在那一列（.btn-row）之後，或病人面板內（病人管理列）
//   · 同一位置再次操作：換掉舊提示，不堆疊；8 秒後自動消失；再次點同一個按鈕先移除舊提示
//   · role="alert"（讀屏會唸）；保留 confirm 與「存檔失敗」的 alert（必須打斷）
//
// Run: node test_inline_notes.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  const alerts = [];
  win.alert = m => alerts.push(String(m));
  win.confirm = () => true;
  const $ = id => doc.getElementById(id);
  const tick = (ms = 30) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const notesIn = el => Array.from(el.querySelectorAll('.inline-note'));
  const timers = [];
  const realSetTimeout = win.setTimeout;
  win.setTimeout = (fn, ms, ...a) => { if (ms === 8000) { timers.push(fn); return timers.length; } return realSetTimeout.call(win, fn, ms, ...a); };

  // ---------- vancomycin：展開給藥紀錄缺資料 ----------
  $('clearAllBtn').click(); await tick();
  $('expandDoses').click(); await tick();
  const row = $('expandDoses').closest('.btn-row');
  let n = row.nextElementSibling;
  assert(n && n.classList.contains('inline-note') && /請先完整填寫/.test(n.textContent), '展開缺資料：提示出現在按鈕那一列之後：' + (n && n.textContent));
  assert(n && n.getAttribute('role') === 'alert', '提示有 role="alert"');
  assert(alerts.length === 0, '沒有彈 alert（' + alerts.length + '）');
  $('expandDoses').click(); await tick();
  assert(doc.querySelectorAll('#drug-vancomycin .inline-note').length === 1, '再按一次：換掉舊提示，不堆疊');
  assert(timers.length >= 1, '設了 8 秒計時');
  timers.forEach(f => f()); timers.length = 0;
  assert(doc.querySelectorAll('#drug-vancomycin .inline-note').length === 0, '8 秒後提示消失');

  // loading 缺第一劑維持劑量時間
  await set('therapyStart', '2026-10-20T09:00'); await set('expandTo', '2026-10-21T09:00'); await set('maintDose', '1000'); await set('maintInterval', '12'); await set('maintInf', '120');
  $('useLoading').checked = true; fire($('useLoading')); await tick();
  $('firstMaintDoseTime').value = ''; fire($('firstMaintDoseTime'));
  $('expandDoses').click(); await tick();
  assert(/第一劑維持劑量時間/.test(notesIn($('drug-vancomycin')).map(x => x.textContent).join()), 'loading 缺維持時間：行內提示');
  // 補好後再按：舊提示被移除
  await set('firstMaintDoseTime', '2026-10-20T21:00');
  $('expandDoses').click(); await tick();
  assert(notesIn($('drug-vancomycin')).length === 0, '資料補齊再按：沒有提示，且有展開（' + doc.querySelectorAll('#doseTable .entry-row').length + ' 列）');

  // prune
  $('pruneBeforeInput').value = ''; $('pruneBeforeBtn').click(); await tick();
  assert(/選一個時間點/.test(notesIn($('drug-vancomycin')).map(x => x.textContent).join()), '清除較早紀錄沒選時間：行內提示');

  // ---------- 病人面板 ----------
  $('patientLabel').value = ''; $('savePatientBtn').click(); await tick();
  const bar = $('drug-vancomycin').querySelector('.mod-tabs');   // F5：病人管理的提示顯示在分頁列的訊息位置
  assert(/請先輸入病歷號/.test(notesIn(bar).map(x => x.textContent).join()), '存檔沒填病歷號：提示在病人面板內：' + notesIn(bar).map(x => x.textContent).join());
  $('patientSelect').value = ''; $('loadPatientBtn').click(); await tick();
  if (!$('vancoGuardModal').classList.contains('hide')) { $('vancoGuardDiscard').click(); await tick(); }   // 有未儲存變更時載入會先問，選「不儲存，繼續」
  assert(notesIn(bar).length === 1 && /請先在/.test(notesIn(bar)[0].textContent), '載入沒選病人：換成新提示（仍只有 1 則）：' + notesIn(bar).map(x => x.textContent).join());
  $('exportPatientsBtn').click(); await tick();
  assert(/沒有已儲存的病人資料/.test(notesIn($('drug-vancomycin')).concat(notesIn(doc.querySelector('header.top'))).map(x => x.textContent).join()), '沒有存檔可匯出：行內提示');
  $('updateVisitBtn').disabled = false; $('updateVisitBtn').click(); await tick();
  assert(/沒有載入中的收案版本/.test(notesIn(bar).map(x => x.textContent).join()), '更新 visit 但沒載入：行內提示');
  $('tdmClearAllLocal').click(); await tick();
  assert(/沒有任何已儲存的病人資料/.test(notesIn($('drug-vancomycin')).map(x => x.textContent).join()), '清除全部本機資料但沒有資料：行內提示');

  // ---------- AMG ----------
  await sw('aminoglycoside', 'vanco');
  $('clearAllBtn').click(); await tick();
  $('amgExpandDoses').click(); await tick();
  assert($('amgExpandDoses').closest('.btn-row').nextElementSibling.classList.contains('inline-note'), 'AMG 展開缺資料：行內提示');
  $('amgPruneBeforeBtn').click(); await tick();
  assert(/選一個時間點/.test(notesIn($('drug-aminoglycoside')).map(x => x.textContent).join()), 'AMG 清除較早紀錄沒選時間：行內提示');
  $('amgPatientLabel').value = ''; $('amgSavePatientBtn').click(); await tick();
  assert(/請先輸入病歷號/.test(notesIn($('drug-aminoglycoside').querySelector('.mod-tabs')).map(x => x.textContent).join()), 'AMG 存檔沒填病歷號：行內提示');

  // ---------- 程式裡只剩必須打斷的 alert ----------
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const calls = html.split('\n').filter(l => /\balert\(/.test(l) && !/^\s*\/\//.test(l) && !/function notify|notify\(.*alert\(|fallback/.test(l));
  assert(calls.length <= 2, '程式裡剩下的 alert( 只有「存檔失敗」與 notify 的備援：' + calls.map(l => l.trim().slice(0, 60)).join(' | '));
  assert(alerts.length === 0, '整個流程沒有彈任何 alert（' + alerts.join(' | ') + '）');
  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
