// test_first_use_fixes.js — 第一次使用的問題（docs/REDESIGN_FIRST_USE_ISSUES.md）優先修 2、3、7、9（Brandon 2026-10-23）
//
//   2：「處方 ▾」→「病人 ▾」（第一項是開始新病人；含刪除所選病人）；「傳送與備份 ▾」→「備份 ▾」（匯出、匯入、清除本機）
//   3：強調色選擇移出頂列，放在頁面最下方一行「介面強調色」
//   7：「尚未更新」是判讀標題下方整列的橫幅；判讀板不變灰（不用 grayscale），只是變淡
//   9：模型 A／B 那列寫清楚：用途、來源（A 國際通用、B 東亞族群 Oda 2024，Brandon 2026-10-23 補充）、哪個是預設、切換會改什麼
//
// Run: node test_first_use_fixes.js

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
  const tick = (ms = 150) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const norm = t => t.replace(/\s+/g, ' ').trim();
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.slice(html.indexOf('<style'), html.indexOf('</style>'));
  await tick(200);

  // ---------- 2. 選單 ----------
  ['pmBarVanco', 'pmBarAmg', 'pmBarAzole', 'pmBarAed'].forEach(bar => {
    const b = $(bar); if (!b) { assert(false, bar + ' 存在'); return; }
    const rx = b.querySelector('.hdr-menu[data-menu="rx"]'), bk = b.querySelector('.hdr-menu[data-menu="backup"]');
    const acts = m => Array.from(m.querySelectorAll('[role="menuitem"]')).map(i => i.dataset.act);
    assert(norm(rx.querySelector('.hdr-menu-btn').textContent) === '病人 ▾', bar + '：「處方 ▾」改名「病人 ▾」');
    assert(acts(rx)[0] === 'clear' && /開始新病人/.test(rx.querySelector('[data-act="clear"]').textContent), bar + '：第一項是開始新病人');
    assert(['clear', 'saveas', 'carry', 'demo', 'delete'].every(a => acts(rx).includes(a)), bar + '：病人 ▾ 有新病人、另存、帶入、示範、刪除（' + acts(rx).join() + '）');
    assert(norm(bk.querySelector('.hdr-menu-btn').textContent) === '備份 ▾', bar + '：「傳送與備份 ▾」改名「備份 ▾」');
    assert(acts(bk).join() === 'export,import,clearlocal', bar + '：備份 ▾ 只有匯出、匯入、清除本機（' + acts(bk).join() + '）');
    assert(!!bk.querySelector('.hdr-menu-note'), bar + '：共用電腦提醒還在');
  });
  // 刪除所選病人：從病人 ▾ 點也會動
  let deleted = 0; $('deletePatientBtn') && $('deletePatientBtn').addEventListener('click', () => deleted++);
  const rxV = $('pmBarVanco').querySelector('.hdr-menu[data-menu="rx"]');
  rxV.querySelector('.hdr-menu-btn').click(); await tick();
  rxV.querySelector('[data-act="delete"]').click(); await tick();
  assert(deleted === 1, '病人 ▾ 的刪除所選病人有作用');

  // ---------- 3. 強調色 ----------
  const picker = $('accentPicker'), hdr = doc.querySelector('header.top');
  assert(picker && !hdr.contains(picker), '強調色選擇不在頂列');
  const prefs = picker && picker.closest('.page-prefs');
  assert(prefs && /介面強調色/.test(prefs.textContent), '放在頁面最下方「介面強調色」那一行');
  assert(prefs && $('footerDisclaimer') && ($('footerDisclaimer').compareDocumentPosition(prefs) & win.Node.DOCUMENT_POSITION_FOLLOWING), '在定位聲明下面');
  picker.querySelector('[data-accent-pick="mustard"]').click(); await tick();
  assert(doc.documentElement.getAttribute('data-accent') === 'mustard', '點了仍能換色');
  picker.querySelector('[data-accent-pick="magenta"]').click(); await tick();

  // ---------- 7. 尚未更新 ----------
  const head = doc.querySelector('#resultsPanel > .results-head');
  const bar = doc.querySelector('#resultsPanel > .rp-stale');
  assert(bar && !head.contains(bar), '「尚未更新」是判讀標題外、整列的橫幅');
  assert(bar && bar.hidden, '平常不顯示');
  $('maintDose').value = '1250'; fire($('maintDose')); await tick(300);
  assert(bar && !bar.hidden && /處方已改，下面的數字還是舊的/.test(bar.textContent) && /展開給藥紀錄並更新/.test(bar.textContent), '改處方後顯示橫幅與按鈕：' + (bar && norm(bar.textContent)));
  assert(!/is-stale[^{]*\{[^}]*grayscale/.test(css), '判讀板不變灰（不用 grayscale）');
  assert(/\.drug-module\.is-stale[^{]*param-grid[^{]*\{[^}]*opacity:\s*\.5/.test(css), '只是變淡');
  bar.querySelector('button').click(); await tick(300);
  assert(bar.hidden, '按「展開給藥紀錄並更新」後橫幅消失');
  const amgBar = doc.querySelector('#amgResultsPanel > .rp-stale');
  assert(!!amgBar, 'AMG 也一樣');

  // ---------- 9. 模型 A／B ----------
  const tg = $('vancoPopModelToggle');
  assert(/還沒有濃度時，用哪個族群模型估算/.test(tg.textContent), '標籤寫用途');
  assert(norm($('vancoPopModelBtnA').textContent) === '模型 A（國際通用・預設）' && norm($('vancoPopModelBtnB').textContent) === '模型 B（東亞族群・Oda 2024）', '按鈕寫明來源（國際通用／東亞族群）與哪個是預設');
  const note = tg.querySelector('.pop-model-note');
  assert(note && /判讀板、劑量調整建議與 AI Prompt/.test(note.textContent) && /曲線仍是模型 A/.test(note.textContent) && /有濃度後/.test(note.textContent), '寫清楚切換會改什麼：' + (note && norm(note.textContent)));
  assert(/Matzke/.test(tg.textContent) && /Oda K/.test(tg.textContent), '文獻還在（ⓘ 文獻）');

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
