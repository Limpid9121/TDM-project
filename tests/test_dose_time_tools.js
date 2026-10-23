// test_dose_time_tools.js — 給藥時間輸入（Brandon 2026-10-23）
//
//   · 時間下拉選單：點時間格打開「時｜分」兩欄（24 小時制，分每 5 分），點時只換小時、點分換分並收起
//   · 第一劑維持劑量時間一直顯示（不再藏在 loading 欄位裡）；有填就從那裡開始展開，之後每 τ 小時
//   · Loading 給藥時間在 loading 那一列填，與分析起點同步；勾 loading 自動帶第一劑維持＝起點＋τ，取消勾選清掉自動值
//   · 產生範圍自動帶：展開至＝最後一次抽血後的下一劑；沒有濃度＝約 5 個半衰期後的那一劑；使用者改過就不再動
//   · 給藥紀錄：抽血前最後一劑／抽血後下一劑標色、不被收起，中間有分隔線；每列 −／+ 5 分
//   · 右邊「尚未更新」：處方改了但給藥紀錄沒重新展開 → 標示、變淡、按鈕可直接展開
//
// Run: node test_dose_time_tools.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const doseTimes = () => Array.from(doc.querySelectorAll('#doseTable .entry-row .dose-date')).map(i => i.value);
  await tick(200);

  // ---------- 1. 時間下拉選單 ----------
  const pick = doc.querySelector('.dt-pick');
  assert(pick && pick.hidden, '有時間下拉選單，平常收起');
  assert(pick.querySelectorAll('.dt-pick-col')[0].querySelectorAll('button').length === 24 && pick.querySelectorAll('.dt-pick-col')[1].querySelectorAll('button').length === 12, '時 24 格、分 12 格（每 5 分）');
  const tsT = $('therapyStart').parentElement.querySelector('.dt24-t');
  tsT.click(); await tick();
  assert(!pick.hidden, '點時間格打開選單');
  const before = $('therapyStart').value;
  pick.querySelector('.dt-pick-col button[data-v="09"]').click(); await tick();
  assert($('therapyStart').value.slice(11, 13) === '09' && $('therapyStart').value.slice(14) === before.slice(14), '點「時」只換小時、分不變：' + $('therapyStart').value);
  assert(!pick.hidden, '點「時」選單不收起');
  pick.querySelectorAll('.dt-pick-col')[1].querySelector('button[data-v="35"]').click(); await tick();
  assert($('therapyStart').value.slice(11) === '09:35', '點「分」換分：' + $('therapyStart').value);
  assert(pick.hidden, '點「分」後收起');
  tsT.click(); await tick();
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await tick();
  assert(pick.hidden, 'Esc 收起');

  // ---------- 2. 第一劑維持劑量時間一直顯示 ----------
  $('clearAllBtn').click(); await tick(200);
  assert(!$('loadingFields').contains($('firstMaintDoseTime')), '第一劑維持劑量時間不在 loading 欄位裡');
  assert($('fixedRegimenFields').contains($('firstMaintDoseTime')), '第一劑維持劑量時間在維持處方區');
  assert($('loadingFields').contains($('loadingTime')), 'Loading 給藥時間在 loading 欄位裡');

  // 沒有 loading：有填第一劑維持劑量時間就從那裡開始
  await set('maintDose', '1000'); await set('maintInterval', '12'); await set('maintInf', '60');
  await set('therapyStart', '2026-10-20T08:00'); await set('expandTo', '2026-10-21T22:00');
  await set('firstMaintDoseTime', '2026-10-20T09:00');
  $('expandDoses').click(); await tick(200);
  assert(doseTimes()[0] === '2026-10-20T09:00' && doseTimes()[1] === '2026-10-20T21:00', '沒有 loading：從第一劑維持劑量時間開始，每 τ 展開：' + doseTimes().slice(0, 2).join(','));

  // ---------- 3. Loading 給藥時間 ⇄ 分析起點；自動帶第一劑維持 ----------
  $('clearAllBtn').click(); await tick(200);
  await set('maintDose', '1000'); await set('maintInterval', '12'); await set('maintInf', '60');
  $('useLoading').checked = true; fire($('useLoading')); await tick();
  await set('loadingTime', '2026-10-20T08:00');
  assert($('therapyStart').value === '2026-10-20T08:00', 'Loading 給藥時間同步到分析起點：' + $('therapyStart').value);
  assert($('therapyStart').dataset.auto === '1', '分析起點標成自動');
  $('useLoading').checked = false; fire($('useLoading')); await tick();
  $('useLoading').checked = true; fire($('useLoading')); await tick();
  assert($('firstMaintDoseTime').value === '2026-10-20T20:00' && $('firstMaintDoseTime').dataset.auto === '1', '勾 loading：第一劑維持自動帶起點＋τ：' + $('firstMaintDoseTime').value);
  $('useLoading').checked = false; fire($('useLoading')); await tick();
  assert($('firstMaintDoseTime').value === '', '取消勾選：自動帶的第一劑維持劑量時間清掉');
  $('useLoading').checked = true; fire($('useLoading')); await tick();
  await set('firstMaintDoseTime', '2026-10-20T21:00');
  assert(!$('firstMaintDoseTime').dataset.auto, '使用者改過就不是自動值');
  $('useLoading').checked = false; fire($('useLoading')); await tick();
  assert($('firstMaintDoseTime').value === '2026-10-20T21:00', '使用者填的值取消勾選也不清');
  $('useLoading').checked = true; fire($('useLoading')); await tick();

  // ---------- 4. 展開至自動帶 ----------
  // 有濃度：最後一次抽血後的下一劑
  $('addLevelRow').click(); await tick();
  const lv = doc.querySelector('#levelTable .entry-row:last-child');
  lv.querySelector('.level-date').value = '2026-10-22T08:30'; lv.querySelector('.level-val').value = '12'; lv.querySelectorAll('input').forEach(fire); await tick(200);
  assert($('expandTo').value === '2026-10-22T09:00' && $('expandTo').dataset.auto === '1', '展開至＝抽血後的下一劑（21:00 起每 12h → 10/22 09:00）：' + $('expandTo').value);
  await set('expandTo', '2026-10-23T09:00');
  lv.querySelector('.level-date').value = '2026-10-22T20:30'; fire(lv.querySelector('.level-date')); await tick(200);
  assert($('expandTo').value === '2026-10-23T09:00', '使用者改過展開至，就不再自動改');

  // ---------- 5. 抽血點前後的劑次 ----------
  $('expandDoses').click(); await tick(300);
  const rows = Array.from(doc.querySelectorAll('#doseTable .entry-row'));
  const nb = rows.filter(r => r.classList.contains('near-before')), na = rows.filter(r => r.classList.contains('near-after'));
  assert(nb.length === 1 && nb[0].querySelector('.dose-date').value === '2026-10-22T09:00', '抽血前最後一劑標色（10/22 09:00）');
  assert(na.length === 1 && na[0].querySelector('.dose-date').value === '2026-10-22T21:00', '抽血後下一劑標色（10/22 21:00）');
  const sep = doc.querySelector('#doseTable > .draw-sep');
  assert(sep && sep.previousElementSibling === nb[0] && /抽血 .*20:30.*12 µg\/mL.*11 小時 30 分/.test(sep.textContent), '分隔線在兩劑中間，寫抽血時間、濃度、離上一劑多久：' + (sep && sep.textContent));
  assert(!nb[0].classList.contains('row-older') && !na[0].classList.contains('row-older'), '抽血前後的劑次不被收起');
  assert(doc.querySelectorAll('#doseTable .entry-row').length === doc.querySelectorAll('#doseTable .dose-date').length, '分隔線不是給藥列');

  // −／+ 5 分
  const plus = nb[0].querySelector('.dose-nudge[data-dir="1"]'), minus = nb[0].querySelector('.dose-nudge[data-dir="-1"]');
  assert(plus && minus, '每列有 −／+ 鈕');
  plus.click(); await tick(150);
  assert(nb[0].querySelector('.dose-date').value === '2026-10-22T09:05', '+ 延後 5 分：' + nb[0].querySelector('.dose-date').value);
  assert(/11 小時 25 分/.test(doc.querySelector('#doseTable > .draw-sep').textContent), '分隔線的間隔跟著更新');
  minus.click(); minus.click(); await tick(150);
  assert(nb[0].querySelector('.dose-date').value === '2026-10-22T08:55', '− 提早 5 分（兩次）：' + nb[0].querySelector('.dose-date').value);

  // ---------- 6. 右邊「尚未更新」 ----------
  const stale = doc.querySelector('#drug-vancomycin .rp-stale'), live = doc.querySelector('#drug-vancomycin .rp-live');
  assert(stale && stale.hidden && !live.hidden, '剛展開完：顯示即時更新，不顯示尚未更新');
  await set('maintDose', '1250');
  assert(!stale.hidden && live.hidden && $('drug-vancomycin').classList.contains('is-stale'), '改了維持劑量但沒重新展開：右邊標尚未更新、變淡');
  assert($('expandDoses').classList.contains('needs-run'), '左邊展開鈕加框提醒');
  plus.click(); await tick(150);
  assert(!stale.hidden, '微調給藥紀錄不會讓尚未更新消失（處方仍跟紀錄不一致）');
  stale.querySelector('button').click(); await tick(300);
  assert(stale.hidden && !$('drug-vancomycin').classList.contains('is-stale') && !$('expandDoses').classList.contains('needs-run'), '按「展開給藥紀錄並更新」後恢復');
  assert(doc.querySelector('#doseTable .entry-row:last-of-type .dose-mg').value === '1250', '重新展開用新劑量');

  // 切換透析（HD）只是換模式，給藥紀錄沒變：不該標尚未更新
  $('dialysis').value = 'HD'; fire($('dialysis')); await tick(300);
  assert(stale.hidden && !$('drug-vancomycin').classList.contains('is-stale'), '切到 HD：不標尚未更新');
  $('dialysis').value = 'none'; fire($('dialysis')); await tick(300);
  assert(stale.hidden, '切回非透析：不標尚未更新');

  // ---------- 7. 還沒有濃度（第一次評估）：展開至＝約 5 個半衰期後的那一劑 ----------
  $('clearAllBtn').click(); await tick(200);
  await set('expandTo', '');
  assert($('expandTo').value === '', '清空後沒有病人資料：展開至不自動帶（不沿用上一位病人的半衰期）');
  $('loadDemoBtn').click(); await tick(300);
  doc.querySelectorAll('#levelTable .row-del').forEach(b => b.click()); await tick(300);
  await set('expandTo', '');
  await set('firstMaintDoseTime', '2026-10-20T09:00');
  const end = Date.parse($('expandTo').value), fst = Date.parse($('firstMaintDoseTime').value), st = Date.parse($('therapyStart').value);
  const m = /t½（半衰期）\s*([\d.]+)/.exec($('paramGrid').textContent.replace(/\s+/g, ' '));
  const tHalf = m ? parseFloat(m[1]) : NaN;
  assert(isFinite(tHalf), '前提：參數格有 t½（' + tHalf + '）');
  assert(isFinite(end) && $('expandTo').dataset.auto === '1', '沒有濃度：展開至自動帶：' + $('expandTo').value);
  const tau = parseFloat($('maintInterval').value);
  assert(((end - fst) / 3600000) % tau === 0, '展開至對齊給藥時刻（第一劑維持＋整數個 τ）');
  const h = (end - fst) / 3600000;   // 沒有 loading：起點＝第一劑維持劑量時間
  assert(h >= 5 * tHalf - 0.2 && h < 5 * tHalf + tau + 0.2, '展開至落在第一劑後 5 個半衰期之後的那一劑（t½ ' + tHalf + '，相距 ' + h.toFixed(1) + ' h）');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
