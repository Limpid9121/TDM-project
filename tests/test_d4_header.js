// test_d4_header.js — REDESIGN D4：頂列整併、身分條、撞色挑選、從其他模組帶入基本資料
//
//   1. 病人管理列（四個 pm-bar）搬進頂列；只顯示目前模組那一個；所有 id 還在；「病人 ▾」開關
//   2. 身分條 #hdrIdentity：病歷號、年齡／性別／體重、CrCl、透析狀態，跟著欄位即時更新、跟著模組切換
//   3. 撞色挑選：4 個色票，寫 <html data-accent> 與 localStorage tdm_ui_accent，預設洋紅（不寫屬性）
//   4. 從其他模組帶入（UIUX_IMPL_SPEC Phase 6）：只帶來源有值的欄位、與目標不同時先 confirm、SCr 表用目標自己的 add*ScrRow、
//      不連動、不新增 localStorage 鍵（tdm_ui_accent 除外）
//
// Run: node test_d4_header.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  let confirmMsgs = [], confirmAnswer = true;
  win.confirm = m => { confirmMsgs.push(String(m)); return confirmAnswer; };
  win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = () => new Promise(r => setTimeout(r, 20));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const setChk = async (id, v) => { $(id).checked = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const hdr = doc.querySelector('header.top');
  const idText = () => $('hdrIdentity').textContent.replace(/\s+/g, ' ').trim();
  const scrRows = table => Array.from(doc.querySelectorAll('#' + table + ' .entry-row')).map(r => [r.querySelector('.scr-date').value, r.querySelector('.scr-val').value]);
  const storeKeys = () => { const k = []; for (let i = 0; i < win.localStorage.length; i++) k.push(win.localStorage.key(i)); return k.sort(); };

  // ---------- 1. 病人管理列搬進頂列 ----------
  const pmIds = { vancomycin: 'pmBarVanco', aminoglycoside: 'pmBarAmg', azole: 'pmBarAzole', aed: 'pmBarAed' };
  Object.values(pmIds).forEach(id => assert(!!$(id) && hdr.contains($(id)), '#' + id + ' 在頂列裡'));
  ['patientLabel', 'patientSelect', 'patientVisitSelect', 'loadPatientBtn', 'savePatientBtn', 'updateVisitBtn', 'patientMeta', 'vancoDirtyDot',
   'amgPatientLabel', 'amgPatientSelect', 'amgLoadPatientBtn', 'amgSavePatientBtn', 'amgUpdateVisitBtn',
   'azlPatientLabel', 'azlPatientSelect', 'aedPatientLabel', 'aedPatientSelect', 'tdmClearAllLocal'].forEach(id => assert(!!$(id), '既有 id 還在：#' + id));
  assert(!$('pmBarVanco').hidden && $('pmBarAmg').hidden && $('pmBarAzole').hidden && $('pmBarAed').hidden, '開頁只顯示 vancomycin 的病人列');
  await sw('aminoglycoside', 'vanco');
  assert($('pmBarVanco').hidden && !$('pmBarAmg').hidden, '切到 AMG：顯示 AMG 的病人列');
  await sw('aed', 'amg');
  assert(!$('pmBarAed').hidden && $('pmBarAmg').hidden, '切到 AED：顯示 AED 的病人列');
  await sw('vancomycin', 'aed');
  // F5：舊的「病人 ▾」面板開關拿掉，改成頂列上的病人下拉、選單與主按鈕（細節見 test_f5_header.js）
  assert(!$('hdrPmToggle') && !hdr.classList.contains('pm-open'), '「病人 ▾」面板開關已拿掉');
  assert(!!$('pmBarVanco').querySelector('button.hdr-main') && !!$('pmBarVanco').querySelector('.hdr-menu'), '頂列有主按鈕與選單');

  // ---------- 2. 身分條 ----------
  assert(!!$('hdrIdentity') && !hdr.contains($('hdrIdentity')) && $('drug-vancomycin').querySelector('.mod-tabs').contains($('hdrIdentity')), '身分條 #hdrIdentity 在分頁列右側（F5：不在頂列）');
  assert(hdr.contains($('patientLabel')) === true, '病歷號欄位在頂列');
  await set('patientLabel', '1234567');
  await set('age', '55'); await set('sex', 'M'); await set('height', '168'); await set('tbw', '65'); await set('dialysis', 'none');
  let t = idText();
  assert(/1234567/.test(t), '身分條有病歷號：' + t);
  assert(/55\s*歲/.test(t) && /男/.test(t) && /65\s*kg/.test(t), '身分條有 年齡／性別／體重：' + t);
  assert(/CrCl\s*\d+/.test(t), '身分條有 CrCl（讀參數格）：' + t);
  assert(/透析[：:]\s*否/.test(t), '身分條有透析狀態「否」：' + t);
  await set('age', '71'); await set('sex', 'F'); await set('tbw', '48.5');
  t = idText();
  assert(/71\s*歲/.test(t) && /女/.test(t) && /48\.5\s*kg/.test(t), '改欄位後身分條即時更新：' + t);
  await set('dialysis', 'HD');
  assert(/透析[：:]\s*HD/.test(idText()), '選 HD 後身分條寫 HD：' + idText());
  await set('dialysis', 'none');
  await set('sex', '');
  assert(/性別未填/.test(idText()), '性別空白時寫「性別未填」，不假裝有值：' + idText());
  await set('sex', 'M'); await set('age', '');
  assert(/年齡未填/.test(idText()), '年齡空白時寫「年齡未填」：' + idText());
  await set('age', '55');

  // 切到 AMG：身分條跟著 AMG 的欄位
  await sw('aminoglycoside', 'vanco');
  await set('amgPatientLabel', 'A-998'); await set('amgAge', '62'); await set('amgSex', 'F'); await set('amgTbw', '70'); await set('amgDialysis', 'none');
  t = idText();
  assert(/A-998/.test(t) && /62\s*歲/.test(t) && /女/.test(t) && /70\s*kg/.test(t), 'AMG 身分條讀 AMG 欄位：' + t);
  assert(!/1234567/.test(t), 'AMG 身分條不帶 vancomycin 的病歷號');
  // 切到 azole：沒有 CrCl、沒有透析
  await sw('azole', 'amg');
  await set('azlPatientLabel', 'Z-1'); await set('azlAge', '48'); await set('azlSex', 'M'); await set('azlTbw', '72');
  t = idText();
  assert(/Z-1/.test(t) && /48\s*歲/.test(t) && /72\s*kg/.test(t), 'Azole 身分條：' + t);
  assert(!/透析/.test(t), 'Azole 沒有透析欄位，身分條不寫透析：' + t);
  // 切到 AED：透析是勾選框
  await sw('aed', 'azl');
  await set('aedAge', '39'); await set('aedSex', 'F'); await set('aedTbw', '58');
  await setChk('aedDialysis', false);
  assert(/透析[：:]\s*否/.test(idText()), 'AED 未勾透析寫「否」：' + idText());
  await setChk('aedDialysis', true);
  assert(/透析[：:]\s*是/.test(idText()), 'AED 勾透析寫「是」：' + idText());
  await setChk('aedDialysis', false);
  await sw('vancomycin', 'aed');
  assert(/1234567/.test(idText()), '切回 vancomycin 又是 vancomycin 的病歷號：' + idText());

  // ---------- 3. 撞色挑選 ----------
  const picker = $('accentPicker');
  assert(!!picker && hdr.contains(picker), '頂列有撞色挑選 #accentPicker');
  const swatches = picker ? Array.from(picker.querySelectorAll('[data-accent-pick]')) : [];
  assert(swatches.map(b => b.dataset.accentPick).join() === 'magenta,vermilion,mustard,none', '4 個色票：洋紅、朱紅、芥末黃、不用撞色');
  assert(swatches.every(b => b.tagName === 'BUTTON' && !!b.getAttribute('aria-label')), '色票是按鈕且有名稱（鍵盤、讀屏可用）');
  const sel = () => swatches.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.accentPick);
  assert(sel().join() === 'magenta' && !doc.documentElement.hasAttribute('data-accent'), '預設洋紅：不寫 data-accent、洋紅色票按下');
  swatches[1].click(); await tick();
  assert(doc.documentElement.getAttribute('data-accent') === 'vermilion' && win.localStorage.getItem('tdm_ui_accent') === 'vermilion', '選朱紅：寫 data-accent 與 tdm_ui_accent');
  assert(sel().join() === 'vermilion', '朱紅色票成為按下狀態');
  swatches[2].click(); await tick();
  assert(doc.documentElement.getAttribute('data-accent') === 'mustard' && win.localStorage.getItem('tdm_ui_accent') === 'mustard', '選芥末黃');
  swatches[3].click(); await tick();
  assert(doc.documentElement.getAttribute('data-accent') === 'none' && win.localStorage.getItem('tdm_ui_accent') === 'none', '選不用撞色');
  swatches[0].click(); await tick();
  assert(!doc.documentElement.hasAttribute('data-accent') && win.localStorage.getItem('tdm_ui_accent') === 'magenta', '選回洋紅：移除 data-accent、記 magenta');
  // 重新載入：讀得回去
  win.localStorage.setItem('tdm_ui_accent', 'mustard');
  const h2 = await loadHarness(undefined, { localStorage: { tdm_ui_accent: 'mustard' } }).catch(() => null);
  if (h2) {
    assert(h2.dom.window.document.documentElement.getAttribute('data-accent') === 'mustard', '重新載入讀回上次的撞色（mustard）');
    assert(Array.from(h2.dom.window.document.querySelectorAll('[data-accent-pick][aria-pressed="true"]')).map(b => b.dataset.accentPick).join() === 'mustard', '重新載入後色票狀態一致');
  } else {
    assert(false, 'loadHarness 支援預先放入 localStorage（需要時擴充 harness）');
  }
  win.localStorage.setItem('tdm_ui_accent', 'magenta');

  // ---------- 4. 從其他模組帶入 ----------
  ['vanco', 'amg', 'azl', 'aed'].forEach(p => {
    assert(!!$(p + 'CarrySrc') && !!$(p + 'CarryBtn') && !!$(p + 'CarryMsg'), p + ' 有帶入列（來源下拉、按鈕、訊息）');
  });
  const srcOpts = id => Array.from($(id).options).map(o => o.value).join();
  assert(srcOpts('vancoCarrySrc') === 'aminoglycoside,azole,aed', 'vancomycin 的來源只列其他三個模組：' + srcOpts('vancoCarrySrc'));
  assert(srcOpts('amgCarrySrc') === 'vancomycin,azole,aed', 'AMG 的來源：' + srcOpts('amgCarrySrc'));
  assert(srcOpts('azlCarrySrc') === 'vancomycin,aminoglycoside,aed', 'Azole 的來源：' + srcOpts('azlCarrySrc'));
  assert(srcOpts('aedCarrySrc') === 'vancomycin,aminoglycoside,azole', 'AED 的來源：' + srcOpts('aedCarrySrc'));

  const keysBefore = storeKeys();

  // 4a. Vanco（示範病例）→ AMG：基本資料與 SCr 表一致
  await sw('vancomycin', 'aed');
  await set('age', '55'); await set('sex', 'M'); await set('height', '168'); await set('tbw', '65'); await set('dryWeight', '62'); await set('dialysis', 'none');
  const vScr = scrRows('scrTable');
  assert(vScr.length >= 1, '前提：vancomycin 有 SCr 紀錄');
  await sw('aminoglycoside', 'vanco');
  // 目標先放不同值，才會問
  await set('amgAge', '60'); await set('amgSex', 'F'); await set('amgHeight', '150'); await set('amgTbw', '50'); await set('amgDryWeight', '');
  confirmMsgs = []; confirmAnswer = false;
  $('amgCarrySrc').value = 'vancomycin';
  $('amgCarryBtn').click(); await tick();
  assert(confirmMsgs.length === 1, '目標已有不同值：先 confirm 一次（' + confirmMsgs.length + '）');
  assert(/年齡/.test(confirmMsgs[0]) && /性別/.test(confirmMsgs[0]) && /身高/.test(confirmMsgs[0]) && /體重/.test(confirmMsgs[0]), 'confirm 列出會被蓋掉的欄位名稱：' + confirmMsgs[0]);
  assert($('amgAge').value === '60' && $('amgSex').value === 'F' && $('amgHeight').value === '150', '按「取消」：一個欄位都沒動');
  confirmMsgs = []; confirmAnswer = true;
  $('amgCarryBtn').click(); await tick();
  assert($('amgAge').value === '55' && $('amgSex').value === 'M' && $('amgHeight').value === '168' && $('amgTbw').value === '65', '按「確定」：年齡、性別、身高、體重都帶入');
  assert($('amgDryWeight').value === '62', '乾體重（來源有值、目標空白）帶入');
  assert(JSON.stringify(scrRows('amgScrTable')) === JSON.stringify(vScr), 'SCr 表整張一致：' + JSON.stringify(scrRows('amgScrTable')));
  assert(/已帶入/.test($('amgCarryMsg').textContent), '訊息顯示已帶入：' + $('amgCarryMsg').textContent);
  assert(!$('amgAddScrRow').disabled && doc.querySelectorAll('#amgScrTable .entry-row .scr-val').length === vScr.length, 'AMG SCr 列是 AMG 自己的列（可編輯）');
  // 帶入後 AMG 即時重算：身分條跟著
  assert(/55\s*歲/.test(idText()) && /男/.test(idText()), '帶入後身分條更新：' + idText());
  // 不連動：改 AMG 不影響 vanco
  await set('amgAge', '80');
  await sw('vancomycin', 'amg');
  assert($('age').value === '55', '帶入後不連動：改 AMG 年齡，vancomycin 不變');

  // 4b. 再按一次：值一樣就不問
  await sw('aminoglycoside', 'vanco');
  await set('amgAge', '55');
  confirmMsgs = [];
  $('amgCarryBtn').click(); await tick();
  assert(confirmMsgs.length === 0, '目標與來源一樣時不 confirm');
  assert(JSON.stringify(scrRows('amgScrTable')) === JSON.stringify(vScr), '重複帶入 SCr 表不會變成兩份');

  // 4c. 來源空白欄位不蓋目標
  await sw('vancomycin', 'amg');
  await set('dryWeight', '');
  await sw('aminoglycoside', 'vanco');
  await set('amgDryWeight', '58');
  confirmMsgs = [];
  $('amgCarryBtn').click(); await tick();
  assert($('amgDryWeight').value === '58', '來源乾體重空白：不蓋掉目標已有的值');
  assert(!/乾/.test(confirmMsgs.join('')), '來源空白的欄位不出現在 confirm 的覆寫清單');

  // 4d. AMG → vanco：SCr 目標有不同資料 → 取代前要問；透析（select）一併帶
  await set('amgDialysis', 'CRRT');
  await sw('vancomycin', 'amg');
  await set('dialysis', 'none');
  confirmMsgs = []; confirmAnswer = true;
  $('vancoCarrySrc').value = 'aminoglycoside';
  $('vancoCarryBtn').click(); await tick();
  assert($('dialysis').value === 'CRRT', '透析狀態（select → select）帶入');
  assert(/透析/.test(confirmMsgs.join('')), '透析與目標不同：列入覆寫清單');
  assert(JSON.stringify(scrRows('scrTable')) === JSON.stringify(scrRows('amgScrTable')), 'AMG → vancomycin 的 SCr 表一致');
  await set('dialysis', 'none');

  // 4e. 單點 SCr（azole）：azole → vanco 加一筆列；vanco → azole 取最新一筆
  await sw('azole', 'vanco');
  await set('azlScr', '2.40'); await set('azlLabDate', '2026-09-20'); await set('azlAge', '66');
  await sw('vancomycin', 'azl');
  confirmMsgs = []; confirmAnswer = true;
  $('vancoCarrySrc').value = 'azole';
  $('vancoCarryBtn').click(); await tick();
  assert(scrRows('scrTable').some(r => r[0] === '2026-09-20' && parseFloat(r[1]) === 2.4), '單點 SCr 在 vancomycin 表加一列 {lab 日期, SCr}：' + JSON.stringify(scrRows('scrTable')));
  assert($('age').value === '66', 'azole 年齡帶入 vancomycin');
  // 沒有 lab 日期：不帶（不能憑空編日期）
  await sw('azole', 'vanco');
  await set('azlScr', '3.10'); await set('azlLabDate', '');
  await sw('vancomycin', 'azl');
  const nBefore = scrRows('scrTable').length;
  $('vancoCarryBtn').click(); await tick();
  assert(scrRows('scrTable').length === nBefore, '單點 SCr 沒有 lab 日期時不加列（不編日期）');
  assert(/SCr/.test($('vancoCarryMsg').textContent) && /日期/.test($('vancoCarryMsg').textContent), '訊息說明 SCr 因缺 lab 日期沒帶：' + $('vancoCarryMsg').textContent);
  // vanco → azole：取最新一筆
  await sw('azole', 'vanco');
  await set('azlScr', ''); await set('azlLabDate', '');
  $('azlCarrySrc').value = 'vancomycin';
  confirmMsgs = []; confirmAnswer = true;
  $('azlCarryBtn').click(); await tick();
  const vLatest = scrRows('scrTable').filter(r => r[0] && r[1]).sort((a, b) => a[0] < b[0] ? -1 : 1).pop();
  assert($('azlScr').value !== '' && parseFloat($('azlScr').value) === parseFloat(vLatest[1]) && $('azlLabDate').value === vLatest[0], 'vanco → azole：最新一筆 SCr 與日期：' + $('azlScr').value + '／' + $('azlLabDate').value);
  assert($('azlPregnancy').value === 'no', '懷孕欄位（來源沒有）不被動');

  // 4f. 懷孕只在 azole ↔ aed
  await set('azlPregnancy', 'pregnant');
  await sw('aed', 'azl');
  await set('aedPregnancy', 'no');
  confirmMsgs = []; confirmAnswer = true;
  $('aedCarrySrc').value = 'azole';
  $('aedCarryBtn').click(); await tick();
  assert($('aedPregnancy').value === 'pregnant', 'azole → aed：懷孕／哺乳帶入');

  // 4g. AED 透析勾選框
  await setChk('aedDialysis', false);
  await sw('vancomycin', 'aed');
  await set('dialysis', 'HD');
  await sw('aed', 'vanco');
  confirmMsgs = []; confirmAnswer = true;
  $('aedCarrySrc').value = 'vancomycin';
  $('aedCarryBtn').click(); await tick();
  assert($('aedDialysis').checked === true, 'vancomycin 透析 HD → AED 勾選「正在透析」');
  await sw('vancomycin', 'aed'); await set('dialysis', 'none');
  await sw('aed', 'vanco');
  $('aedCarryBtn').click(); await tick();
  assert($('aedDialysis').checked === false, 'vancomycin 沒透析 → AED 取消勾選（兩邊的狀態是明確的「否」）');
  // AED（勾選）→ 其他：只有「有透析」這件事，不知道是哪種，不帶
  await setChk('aedDialysis', true);
  await sw('vancomycin', 'aed'); await set('dialysis', 'none');
  confirmMsgs = []; confirmAnswer = true;
  $('vancoCarrySrc').value = 'aed';
  $('vancoCarryBtn').click(); await tick();
  assert($('dialysis').value === 'none', 'AED 只知道「有透析」不知道哪種：不帶入 vancomycin 的透析 select');
  await setChk('aedDialysis', false);

  // 4h. 來源完全沒資料
  await sw('azole', 'vanco');
  $('azlCarrySrc').value = 'aed';
  await sw('aed', 'azl');
  ['aedAge', 'aedSex', 'aedHeight', 'aedTbw', 'aedScr', 'aedLabDate'].forEach(id => { $(id).value = ''; });
  await sw('azole', 'aed');
  $('azlCarrySrc').value = 'aed';
  const keep = $('azlAge').value;
  $('azlCarryBtn').click(); await tick();
  assert($('azlAge').value === keep, '來源沒有值：目標不動');
  assert(/沒有|無/.test($('azlCarryMsg').textContent), '訊息說來源沒有可帶入的資料：' + $('azlCarryMsg').textContent);

  // ---------- 不新增 localStorage 鍵 ----------
  const added = storeKeys().filter(k => !keysBefore.includes(k));
  assert(added.length === 0, '帶入功能沒有新增 localStorage 鍵：' + added.join());

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
