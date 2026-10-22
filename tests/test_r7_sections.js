// test_r7_sections.js — R7：左欄段落收合摘要、段落跳轉列、給藥紀錄只顯示最近 3 筆（純顯示）
//
//   1. 收合的段落標題列顯示摘要（.card-sum）：讀欄位現值，隨輸入更新；展開時不顯示（CSS）
//   2. 段落跳轉列（#vancoSecBar／#amgSecBar／#azlSecBar／#aedSecBar）：每個可見段落一顆按鈕（01、02…），
//      點了只展開那一段、其餘收合、捲過去並短暫標亮；展開中的是實心（aria-pressed）；「全部收合／全部展開」
//   3. 給藥紀錄只顯示最近 3 筆：較早的收成一行「較早 N 筆（起訖）已收起，點這裡展開」；列仍在 DOM 裡
//      （readDoseRows 不受影響）；新增的列、時間軸點到的較早劑次會自動顯示
//
// Run: node test_r7_sections.js

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
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const scrolled = [];
  win.Element.prototype.scrollIntoView = function () { scrolled.push(this); };
  const cardsOf = panelId => Array.from($(panelId).children).filter(e => e.classList.contains('card'));
  const sumOf = card => (card.querySelector('h2 .card-sum') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim();
  const collapse = (card, v) => { const h = card.querySelector('h2.card-head'); if (card.classList.contains('collapsed') !== v) h.click(); };
  const css = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // ---------- 1. 摘要 ----------
  let cards = cardsOf('inputPanel');
  assert(cards.length === 6 && cards.every(c => !!c.querySelector('h2 .card-sum')), 'vancomycin 六個段落標題列都有摘要容器');
  assert(/\.card:not\(\.collapsed\)\s+\.card-sum\s*\{\s*display:\s*none/.test(css) || /\.card-sum\s*\{[^}]*display:\s*none/.test(css), '展開時摘要不顯示（CSS）');
  $('loadDemoBtn').click(); await tick(200);
  cards.forEach(c => collapse(c, true));
  assert(/55 歲/.test(sumOf(cards[0])) && /男/.test(sumOf(cards[0])) && /65 kg/.test(sumOf(cards[0])), '01 摘要有年齡／性別／體重：' + sumOf(cards[0]));
  assert(/SCr 0\.95/.test(sumOf(cards[0])), '01 摘要有最近一筆 SCr：' + sumOf(cards[0]));
  assert(/1000 mg/.test(sumOf(cards[2])) && /q12h/.test(sumOf(cards[2])) && /\d+ 筆/.test(sumOf(cards[2])), '03 摘要有處方與紀錄筆數：' + sumOf(cards[2]));
  assert(/2 筆/.test(sumOf(cards[3])), '04 摘要有濃度筆數：' + sumOf(cards[3]));
  assert(/AUC/.test(sumOf(cards[4])) && /MIC/.test(sumOf(cards[4])), '05 摘要有 MIC 與 AUC 目標：' + sumOf(cards[4]));
  await set('maintDose', '1250');
  assert(/1250 mg/.test(sumOf(cards[2])), '改處方劑量後 03 摘要即時更新：' + sumOf(cards[2]));
  await set('age', '71');
  assert(/71 歲/.test(sumOf(cards[0])), '改年齡後 01 摘要即時更新');
  $('clearAllBtn').click(); await tick();
  assert(sumOf(cards[0]) !== '' && /尚未|未填/.test(sumOf(cards[0])), '清空後摘要寫「尚未填寫」：' + sumOf(cards[0]));
  cards.forEach(c => collapse(c, false));

  // ---------- 2. 跳轉列 ----------
  const bar = $('vancoSecBar');
  assert(!!bar && $('inputPanel').contains(bar), '有 #vancoSecBar，在左欄裡');
  let btns = Array.from(bar.querySelectorAll('button[data-sec]'));
  assert(btns.map(b => b.textContent.trim()).join() === '01,02,03,04,05,06', '六顆段落按鈕 01–06：' + btns.map(b => b.textContent.trim()).join());
  assert(btns.every(b => b.getAttribute('aria-pressed') === 'true'), '全部展開時六顆都是實心（aria-pressed）');
  const bulk = bar.querySelector('button[data-sec-bulk]');
  assert(!!bulk && /全部收合/.test(bulk.textContent), '有「全部收合」');
  bulk.click(); await tick();
  assert(cards.every(c => c.classList.contains('collapsed')) && btns.every(b => b.getAttribute('aria-pressed') === 'false') && /全部展開/.test(bulk.textContent), '全部收合：六段都收、按鈕變空心、文字變「全部展開」');
  scrolled.length = 0;
  btns[3].click(); await tick();
  assert(!cards[3].classList.contains('collapsed') && cards.filter((c, i) => i !== 3).every(c => c.classList.contains('collapsed')), '點 04：只展開 04，其餘收合');
  assert(btns[3].getAttribute('aria-pressed') === 'true' && btns.filter((b, i) => i !== 3).every(b => b.getAttribute('aria-pressed') === 'false'), '04 按鈕實心、其餘空心');
  assert(scrolled.includes(cards[3]), '捲到 04');
  assert(cards[3].classList.contains('sec-flash'), '04 短暫標亮（sec-flash）');
  await new Promise(r => setTimeout(r, 1800));
  assert(!cards[3].classList.contains('sec-flash'), '標亮約 1.6 秒後消失');
  // 手動展開另一段：按鈕跟著
  collapse(cards[0], false);
  assert(btns[0].getAttribute('aria-pressed') === 'true', '直接點標題展開 01：按鈕跟著變實心');
  bulk.click(); await tick();   // 有展開的 → 全部收合
  bulk.click(); await tick();   // 全收 → 全部展開
  assert(cards.every(c => !c.classList.contains('collapsed')), '再按一次：全部展開');
  assert(!$('inputPanel').querySelector('.panel-tools'), '舊的「全部收起」小按鈕併進跳轉列（沒有兩份）');
  // 狀態有記住（沿用既有的 tdm_card_collapse_v1）
  btns[2].click(); await tick();
  assert(JSON.parse(win.localStorage.getItem('tdm_card_collapse_v1') || '{}')['vanco:i0'] === true, '收合狀態沿用既有的 tdm_card_collapse_v1 記住');
  bulk.click(); await tick(); if (bulk.textContent.includes('全部展開')) bulk.click(); await tick();

  // AMG / Azole / AED 也有
  for (const [drug, key, panel, bar2] of [['aminoglycoside', 'vanco', 'amgInputPanel', 'amgSecBar'], ['azole', 'amg', 'azlInputPanel', 'azlSecBar'], ['aed', 'azl', 'aedInputPanel', 'aedSecBar']]) {
    await sw(drug, key);
    const b = $(bar2);
    assert(!!b && $(panel).contains(b), drug + '：有 #' + bar2);
    const n = b ? Array.from(b.querySelectorAll('button[data-sec]')).filter(x => !x.hidden).length : 0;
    const visible = cardsOf(panel).filter(c => c.style.display !== 'none' && !c.hidden).length;
    assert(n === visible && n >= 5, drug + '：按鈕數＝可見段落數（' + n + '／' + visible + '）');
  }
  // Azole 換藥物後 Voriconazole／Isavuconazole 專屬段落切換 → 按鈕跟著增減
  await sw('azole', 'aed');
  await set('azlDrug', 'voriconazole');
  const shown = () => Array.from($('azlSecBar').querySelectorAll('button[data-sec]')).filter(x => !x.hidden).length;
  const nVori = shown();
  await set('azlDrug', 'posaconazole');
  const nPosa = shown();
  assert(nVori !== nPosa, 'Azole 換藥物：專屬段落的按鈕跟著出現或消失（' + nVori + '→' + nPosa + '）');
  const azlCards = cardsOf('azlInputPanel');
  assert(azlCards.some(c => !!c.querySelector('h2 .card-sum')), 'Azole 有摘要容器');

  // ---------- 3. 給藥紀錄只顯示最近 3 筆 ----------
  await sw('vancomycin', 'azl');
  $('loadDemoBtn').click(); await tick(200);
  const rows = () => Array.from(doc.querySelectorAll('#doseTable .entry-row'));
  const hidden = () => rows().filter(r => r.classList.contains('row-older'));
  const fold = $('vancoDoseFold');
  const N = rows().length, OLD = N - 3;
  assert(N >= 6, '前提：示範病例有 6 筆以上給藥紀錄（' + N + '）');
  assert(hidden().length === OLD && rows().slice(OLD).every(r => !r.classList.contains('row-older')), '只顯示最近 3 筆，較早 ' + OLD + ' 筆收起');
  assert(!!fold && !fold.hidden && new RegExp('較早 ' + OLD + ' 筆').test(fold.textContent) && /已收起/.test(fold.textContent), '一行提示「較早 2 筆…已收起」：' + (fold && fold.textContent));
  assert(/\d\d\/\d\d \d\d:\d\d – \d\d\/\d\d \d\d:\d\d/.test(fold.textContent), '提示含較早紀錄的起訖時間：' + fold.textContent);
  assert(rows().length === N && doc.querySelectorAll('#doseTable .entry-row .dose-mg').length === N, '列仍在 DOM（計算不受影響）');
  assert(fold.getAttribute('aria-expanded') === 'false', 'aria-expanded=false');
  fold.click(); await tick();
  assert(hidden().length === 0 && fold.getAttribute('aria-expanded') === 'true' && new RegExp('收起較早 ' + OLD + ' 筆').test(fold.textContent), '點開：全部顯示，提示變「收起較早 2 筆」：' + fold.textContent);
  fold.click(); await tick();
  assert(hidden().length === OLD, '再點一次：又收起');
  // 新增一列 → 新列看得到
  $('addDoseRow') && $('addDoseRow').click(); await tick();
  const nowRows = rows();
  assert(nowRows[nowRows.length - 1] && !nowRows[nowRows.length - 1].classList.contains('row-older'), '新增一列：新列顯示');
  // 時間軸點到較早的劑次 → 自動展開
  const older = hidden()[0];
  if (older) {
    const idx = rows().indexOf(older);
    const evs = Array.from($('vancoTimeline').querySelectorAll('.tl-ev[data-tl-kind="dose"]'));
    assert(evs.length > idx, '時間軸有對應的給藥事件');
    evs[idx].dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await tick();
    assert(!older.classList.contains('row-older') && hidden().length === 0, '時間軸點到較早的劑次：自動展開並顯示那一列');
  }
  // 3 筆以內不顯示提示
  $('clearAllBtn').click(); await tick();
  await set('therapyStart', '2026-10-20T09:00'); await set('expandTo', '2026-10-21T09:00'); await set('maintInterval', '12'); await set('maintDose', '1000'); await set('maintInf', '120');
  $('expandDoses').click(); await tick(100);
  assert(rows().length === 3 && fold.hidden === true && hidden().length === 0, '3 筆以內：不收合、不顯示提示');

  // AMG
  await sw('aminoglycoside', 'vanco');
  $('clearAllBtn').click(); await tick();
  assert(!!$('amgDoseFold'), 'AMG 也有 #amgDoseFold');

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
