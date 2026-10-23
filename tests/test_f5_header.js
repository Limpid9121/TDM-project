// test_f5_header.js — v3 F5：頂列照 TPN 調配試算的模式重做（純顯示＋既有 id 保留）
//
//   頂列一行：品名＋藥物分頁＋（示範病例小標）｜病人下拉｜選擇紀錄 ▾｜主按鈕（儲存為新紀錄…／儲存更新，有未存變更多一個小圓點）｜處方 ▾｜傳送與備份 ▾｜撞色
//   · 主按鈕：還沒載入收案＝開「另存新紀錄」視窗；已載入＝存回目前這筆
//   · 另存視窗三條路：新病人（填病歷號）／既有病人・開新收案／覆蓋既有收案；加評估時點
//   · 選擇紀錄：列出這位病人的收案，點一筆就載入（載入前仍經過 guardUnsaved）
//   · 處方 ▾：另存為新紀錄、示範病例、清空此頁、從其他模組帶入基本資料；傳送與備份 ▾：匯出、匯入、刪除所選病人、清除本機所有資料
//   · 身分條在「計算／病人資料」分頁列右側；病人訊息（已載入…）也在分頁列；左欄大橫幅拿掉，頂列多一個「示範病例」小標
//   · 原本病人管理列裡所有 id 都還在（藏在 .pm-engine 裡，行為不變）
//
// Run: node test_f5_header.js

const fs = require('fs');
const path = require('path');
const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  win.URL.createObjectURL = () => 'blob:test'; win.URL.revokeObjectURL = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const css = html.replace(/\s+/g, ' ');
  const hdr = doc.querySelector('header.top');
  const vlist = () => JSON.parse(win.localStorage.getItem('vanco_tdm_patients_v2') || '[]');

  // ---------- 1. 結構 ----------
  assert(!$('hdrPmToggle') && !hdr.classList.contains('pm-open'), '舊的「病人 ▾」面板開關拿掉了');
  assert(!!hdr.querySelector('.hdr-left .brand-mark') && !!hdr.querySelector('.hdr-left #drugSwitch') && !!hdr.querySelector('.hdr-left #hdrDemoTag'), '左邊：品名、藥物分頁、示範病例小標');
  assert(!hdr.querySelector('#accentPicker') && !!doc.querySelector('.page-prefs #accentPicker'), '撞色挑選移到頁面最下方（2026-10-23）');
  const MODS = [['vancomycin', 'azl', 'vanco', 'pmBarVanco', 'patient', ''], ['aminoglycoside', 'vanco', 'amg', 'pmBarAmg', 'amgPatient', 'amg'], ['azole', 'amg', 'azl', 'pmBarAzole', 'azlPatient', 'azl'], ['aed', 'azl', 'aed', 'pmBarAed', 'aedPatient', 'aed']];
  const ENGINE = p => p === '' ? ['patientLabel', 'patientSelect', 'patientVisitSelect', 'loadPatientBtn', 'savePatientBtn', 'updateVisitBtn', 'patientAsOf', 'exportPatientsBtn', 'importPatientsBtn', 'deletePatientBtn', 'importFileInput', 'tdmClearAllLocal', 'patientMeta', 'vancoDirtyDot']
    : [p + 'PatientLabel', p + 'PatientSelect', p + 'PatientVisitSelect', p + 'LoadPatientBtn', p + 'SavePatientBtn', p + 'UpdateVisitBtn', p + 'PatientAsOf', p + 'ExportPatientsBtn', p + 'ImportPatientsBtn', p + 'DeletePatientBtn', p + 'ImportFileInput', 'tdmClearAllLocal' + { amg: 'Amg', azl: 'Azl', aed: 'Aed' }[p], p + 'PatientMeta', p + 'DirtyDot'];
  for (const [drug, key, k2, barId, , p] of MODS) {
    if (drug !== 'vancomycin') await sw(drug, key);
    const bar = $(barId);
    assert(ENGINE(p).every(id => !!$(id)), drug + '：病人管理的 id 全部還在（' + ENGINE(p).filter(id => !$(id)).join() + '）');
    const sel = bar.querySelector('select.hdr-select');
    assert(!!sel && !sel.closest('.pm-engine') && /已存病人|選擇病人/.test(sel.getAttribute('aria-label') || '') && sel.id === (p === '' ? 'patientSelect' : p + 'PatientSelect'), drug + '：病人下拉在頂列（就是原本的 select）');
    ['rec', 'rx', 'backup'].forEach(m => assert(!!bar.querySelector('.hdr-menu[data-menu="' + m + '"] > button.hdr-menu-btn') && !!bar.querySelector('.hdr-menu[data-menu="' + m + '"] > .hdr-menu-pop[hidden]'), drug + '：選單 ' + m + ' 有按鈕與（預設收起的）彈出層'));
    const main = bar.querySelector('button.hdr-main');
    assert(!!main && /儲存為新紀錄/.test(main.textContent) && !!main.querySelector('.pm-dirty-dot'), drug + '：主按鈕「儲存為新紀錄…」，小圓點（原 DirtyDot）在按鈕裡');
    assert(bar.querySelector('.pm-engine').hidden, drug + '：原本的控制項藏在 .pm-engine 裡');
    assert(!hdr.querySelector('.hdr-pm-slot .pm-more'), drug + '：沒有「更多」展開區');
  }
  await sw('vancomycin', 'azl');

  // ---------- 2. 身分條與病人訊息在分頁列 ----------
  const tabs = n => $('drug-' + n).querySelector('.mod-tabs');
  assert(tabs('vancomycin').contains($('hdrIdentity')) && !hdr.contains($('hdrIdentity')), '身分條在目前模組的分頁列（右側），不在頂列');
  await sw('aminoglycoside', 'vanco');
  assert(tabs('aminoglycoside').contains($('hdrIdentity')), '切到 AMG：身分條跟過去');
  assert(tabs('aminoglycoside').contains($('amgPatientMeta')) && tabs('vancomycin').contains($('patientMeta')), '病人訊息（已載入…）在各自模組的分頁列');
  await sw('vancomycin', 'amg');

  // ---------- 3. 示範病例小標 ----------
  const chip = $('hdrDemoTag');
  $('clearAllBtn').click(); await tick(150);
  assert(chip.hidden, '清空之後（沒有示範病例）小標隱藏');
  $('loadDemoBtn').click(); await tick(250);
  assert(!chip.hidden && /示範病例/.test(chip.textContent), '載入示範病例後頂列出現「示範病例」小標');
  assert(/\.demo-banner\s*\{[^}]*display:\s*none/.test(css), '左欄的大橫幅拿掉（CSS 隱藏，hidden 旗標邏輯照舊）');
  chip.click(); await tick(200);
  assert(chip.hidden && $('age').value === '', '點小標：清空、開始新病人，小標消失');

  // ---------- 4. 主按鈕＋另存視窗 ----------
  const main = $('pmBarVanco').querySelector('button.hdr-main');
  const modal = $('saveRecordModal');
  assert(!!modal && modal.classList.contains('hide'), '有另存視窗，預設關閉');
  $('loadDemoBtn').click(); await tick(250);
  main.click(); await tick();
  assert(!modal.classList.contains('hide'), '還沒載入收案：主按鈕開另存視窗');
  assert(['srModeNew', 'srModeExisting', 'srModeOverwrite'].every(id => !!$(id)) && $('srModeNew').getAttribute('aria-pressed') === 'true', '三條路：新病人／既有病人・開新收案／覆蓋既有收案（預設新病人）');
  assert(!!$('srAsOf') && !!$('srLabel') && !!$('srPatient') && !!$('srVisit'), '有病歷號、選病人、選收案、評估時點欄位');
  $('srConfirm').click(); await tick();
  assert(!modal.classList.contains('hide') && /病歷號/.test($('srError').textContent), '新病人沒填病歷號：視窗不關、顯示錯誤（' + $('srError').textContent + '）');
  $('srLabel').value = 'A123456'; fire($('srLabel'));
  $('srConfirm').click(); await tick(100);
  assert(modal.classList.contains('hide'), '填了病歷號、儲存：視窗關閉');
  let list = vlist();
  assert(Array.isArray(list) && list.length === 1 && list[0].label === 'A123456' && list[0].visits.length === 1, '存成一位新病人、一筆收案');
  assert(/已存為新收案/.test($('patientMeta').textContent) && tabs('vancomycin').contains($('patientMeta')), '分頁列顯示「已存為新收案…」');
  assert(/儲存更新/.test(main.textContent), '存完之後主按鈕變「儲存更新」（已載入目前這筆）');
  const dot = $('vancoDirtyDot');
  assert(dot.hidden, '剛存完沒有未存變更：小圓點隱藏');
  await set('age', '61');
  assert(!dot.hidden && main.contains(dot), '改了欄位：主按鈕上出現未存小圓點');
  main.click(); await tick(100);
  assert(modal.classList.contains('hide') && /已更新目前收案版本/.test($('patientMeta').textContent) && dot.hidden, '已載入時按主按鈕＝存回目前這筆（不開視窗），小圓點消失');
  list = vlist();
  assert(list[0].visits.length === 1 && list[0].visits[0].data.age === '61' || String(list[0].visits[0].data.age) === '61', '還是一筆收案，年齡已更新成 61');

  // 既有病人・開新收案
  await set('age', '62');
  const rx = $('pmBarVanco').querySelector('.hdr-menu[data-menu="rx"]');
  rx.querySelector('.hdr-menu-btn').click();
  assert(!rx.querySelector('.hdr-menu-pop').hidden && rx.querySelector('.hdr-menu-btn').getAttribute('aria-expanded') === 'true', '處方 ▾ 展開');
  const rxItems = Array.from(rx.querySelectorAll('[role="menuitem"]')).map(b => b.dataset.act);
  assert(['saveas', 'demo', 'clear', 'carry'].every(a => rxItems.includes(a)), '處方 ▾ 有：另存為新紀錄、示範病例、清空此頁、從其他模組帶入（' + rxItems.join() + '）');
  rx.querySelector('[data-act="saveas"]').click(); await tick();
  assert(!modal.classList.contains('hide') && $('srModeExisting').getAttribute('aria-pressed') === 'true', '從處方 ▾ 另存：已載入病人時預設「既有病人・開新收案」');
  assert(rx.querySelector('.hdr-menu-pop').hidden, '點選項後選單收起');
  assert($('srPatient').value && $('srPatient').selectedOptions[0].textContent.includes('A123456'), '預選目前這位病人');
  $('srConfirm').click(); await tick(100);
  list = vlist();
  assert(list.length === 1 && list[0].visits.length === 2, '同一位病人多一筆收案（共 2 筆）');

  // 覆蓋既有收案
  await set('age', '70');
  rx.querySelector('.hdr-menu-btn').click(); rx.querySelector('[data-act="saveas"]').click(); await tick();
  $('srModeOverwrite').click(); await tick();
  assert($('srModeOverwrite').getAttribute('aria-pressed') === 'true' && $('srVisit').options.length >= 2, '覆蓋：選收案有 2 個以上選項（' + $('srVisit').options.length + '）');
  const targetVisitId = $('srVisit').options[$('srVisit').options.length - 1].value;
  $('srVisit').value = targetVisitId; fire($('srVisit'));
  $('srConfirm').click(); await tick(100);
  list = vlist();
  const tv = list[0].visits.find(v => v.visitId === targetVisitId);
  assert(list[0].visits.length === 2 && String(tv.data.age) === '70', '覆蓋：還是 2 筆，被選的那筆資料更新成年齡 70');
  assert(modal.classList.contains('hide'), '覆蓋後視窗關閉');

  // ---------- 5. 選擇紀錄 ----------
  const recWrap = $('pmBarVanco').querySelector('.hdr-menu[data-menu="rec"]');
  recWrap.querySelector('.hdr-menu-btn').click();
  const items = Array.from(recWrap.querySelectorAll('[data-visit]'));
  assert(items.length === 2, '選擇紀錄：列出這位病人的 2 筆收案（' + items.length + '）');
  assert(items.some(b => b.getAttribute('aria-current') === 'true'), '標出目前載入的那一筆');
  await set('age', '33');
  const other = items.find(b => b.getAttribute('aria-current') !== 'true');
  other.click(); await tick(100);
  assert(!$('vancoGuardModal').classList.contains('hide'), '有未存變更時點一筆紀錄：先出現「儲存／不儲存／取消」視窗（guardUnsaved）');
  $('vancoGuardDiscard').click(); await tick(150);
  assert($('vancoGuardModal').classList.contains('hide') && /已載入/.test($('patientMeta').textContent), '選「不儲存，繼續」：載入那一筆');
  assert(recWrap.querySelector('.hdr-menu-pop').hidden, '載入後選單收起');

  // ---------- 6. 選單行為 ----------
  const back = $('pmBarVanco').querySelector('.hdr-menu[data-menu="backup"]');
  back.querySelector('.hdr-menu-btn').click();
  assert(!back.querySelector('.hdr-menu-pop').hidden && rx.querySelector('.hdr-menu-pop').hidden, '同時只開一個選單');
  const bItems = Array.from(back.querySelectorAll('[role="menuitem"]')).map(b => b.dataset.act);
  assert(['export', 'import', 'clearlocal'].every(a => bItems.includes(a)) && !bItems.includes('delete'), '備份 ▾ 有：匯出、匯入、清除本機所有資料；刪除所選病人移到病人 ▾（' + bItems.join() + '）');
  let exported = 0, imported = 0;
  $('exportPatientsBtn').addEventListener('click', () => exported++);
  $('importFileInput').addEventListener('click', () => imported++);
  back.querySelector('[data-act="export"]').click(); assert(exported === 1, '匯出：觸發原本的匯出按鈕');
  back.querySelector('.hdr-menu-btn').click();
  back.querySelector('[data-act="import"]').click(); assert(imported === 1, '匯入：開啟檔案選擇');
  back.querySelector('.hdr-menu-btn').click();
  doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(back.querySelector('.hdr-menu-pop').hidden, 'Esc 收起選單');
  back.querySelector('.hdr-menu-btn').click();
  doc.body.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  assert(back.querySelector('.hdr-menu-pop').hidden, '點選單外面收起');
  assert(!!back.querySelector('.hdr-menu-note') && /共用電腦/.test(back.querySelector('.hdr-menu-note').textContent), '備份選單底下保留「共用電腦請用完清除」的提醒（安全提醒不刪）');

  // 處方 ▾ → 示範病例／清空
  rx.querySelector('.hdr-menu-btn').click(); rx.querySelector('[data-act="clear"]').click(); await tick(200);
  assert($('age').value === '', '處方 ▾ 清空此頁：欄位清空');
  rx.querySelector('.hdr-menu-btn').click(); rx.querySelector('[data-act="demo"]').click(); await tick(250);
  assert($('age').value === '55' && !chip.hidden, '處方 ▾ 示範病例：填入示範資料、出現小標');

  // ---------- 7. 其他模組的主按鈕與選單也各自運作 ----------
  await sw('aminoglycoside', 'vanco');
  const amgMain = $('pmBarAmg').querySelector('button.hdr-main');
  assert(/儲存為新紀錄/.test(amgMain.textContent), 'AMG：主按鈕「儲存為新紀錄…」');
  $('loadDemoBtn').click(); await tick(250);
  amgMain.click(); await tick();
  assert(!modal.classList.contains('hide'), 'AMG：主按鈕開同一個另存視窗');
  $('srLabel').value = 'B7654321'; fire($('srLabel'));
  $('srConfirm').click(); await tick(100);
  assert(/已存為新收案：B7654321/.test($('amgPatientMeta').textContent) && /儲存更新/.test(amgMain.textContent), 'AMG：存進 AMG 自己的存檔，主按鈕變「儲存更新」');
  await sw('vancomycin', 'amg');
  assert(!/B7654321/.test($('patientMeta').textContent), 'Vanco 的訊息不受 AMG 影響');

  // ---------- 8. 沒填病歷號時的行內提示出現在分頁列 ----------
  $('patientLabel').value = '';
  $('savePatientBtn').click(); await tick();
  assert(!!tabs('vancomycin').querySelector('.inline-note') && /請先輸入病歷號/.test(tabs('vancomycin').querySelector('.inline-note').textContent), '直接觸發儲存但沒有病歷號：行內提示顯示在分頁列（不在看不到的地方）');

  // ---------- 9. CSS ----------
  assert(/header\.top \.hdr-main\s*\{[^}]*background:\s*var\(--accent\)[^}]*color:\s*var\(--on-accent\)/.test(css), '主按鈕是頂列唯一的實心撞色按鈕');
  assert(/\.hdr-menu-pop\s*\{[^}]*position:\s*absolute/.test(css), '選單彈出層絕對定位（不推擠頂列）');
  assert(/header\.top\s*\{[^}]*flex-wrap:\s*nowrap/.test(css) || /@media \(min-width:\s*1280px\)[^{]*\{[^}]*header\.top\s*\{[^}]*flex-wrap:\s*nowrap/.test(css), '頂列在桌機寬度不換行');
  assert(/\.mod-tabs \.hdr-identity\s*\{[^}]*color:\s*var\(--ink\)/.test(css), '分頁列上的身分條改用深色字（在淺底上）');

  // ---------- 10. 左欄：標籤貼近輸入框、次標題、AED 尚無濃度 ----------
  assert(/\.field-row > \.field > label\s*\{[^}]*align-self:\s*end[^}]*margin-bottom:\s*4px/.test(css), '標籤貼在自己輸入框的正上方（下方 4 px），同一列的輸入框仍對齊（subgrid）');
  assert(/\.field-row\s*\{[^}]*margin-bottom:\s*14px/.test(css), '欄位組之間 14 px');
  assert(/\.card h3\s*\{[^}]*font-weight:\s*700/.test(css) && /\.card h3:not\(:first-of-type\)\s*\{[^}]*border-top:\s*1px solid var\(--line\)/.test(css), '卡片裡的次標題（第一筆給藥、維持處方、產生範圍）有粗體與上分隔線');
  const h3 = Array.from($('inputPanel').querySelectorAll('h3')).find(h => /^第一筆給藥/.test(h.textContent));
  assert(!!h3 && !!h3.querySelector('.h3-note') && /必選/.test(h3.querySelector('.h3-note').textContent), '「第一筆給藥」小標旁註明「有給藥紀錄時必選」');
  assert(/#vancoFirstDoseKindGroup \.ui-radio-title\s*\{[^}]*clip:/.test(css) && !!$('vancoFirstDoseKindGroup').querySelector('.ui-radio-title'), '重複的問句只留給螢幕閱讀器（DOM 還在）');
  await sw('aed', 'azl');
  $('clearAllBtn').click(); await tick(200);
  const emptyCell = Array.from($('aedParamGrid').children).find(c => /濃度結果/.test(c.textContent));
  assert(!!emptyCell && emptyCell.classList.contains('pc-empty') && emptyCell.querySelector('.value').dataset.empty === '尚無濃度', 'AED 沒有濃度：濃度結果格標 pc-empty、顯示「尚無濃度」（文字仍是原本的）');
  assert(/\.param-cell\.pc-empty \.value::before\s*\{[^}]*content:\s*attr\(data-empty\)/.test(css), '大字位置改顯示小字，不顯示「—」');
  await sw('vancomycin', 'aed');

  assert(errCount === 0, '沒有 JS 錯誤（' + errCount + '）');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
