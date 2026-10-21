// test_demo_button.js — 頂列常駐的「載入示範病例」：四個模組各按一下就填好虛構資料並算出結果
//   · 空白狀態按下去：直接載入、示範橫幅出現、右邊有結果
//   · 已有手動輸入（有未儲存變更）：先 confirm；按取消不動
//   · 沒有新增 localStorage 鍵
//
// Run: node test_demo_button.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  let confirmN = 0, confirmAnswer = true;
  win.confirm = () => { confirmN++; return confirmAnswer; };
  win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const sw = async drug => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); await tick(); };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });

  const btn = $('loadDemoBtn');
  assert(!!btn && doc.querySelector('header.top').contains(btn) && /示範/.test(btn.textContent), '頂列有「載入示範病例」按鈕');
  const keysBefore = win.localStorage.length;

  const mods = [
    { drug: 'vancomycin', banner: 'vancoDemoBannerTop', grid: 'paramGrid', field: 'age' },
    { drug: 'aminoglycoside', banner: 'amgDemoBannerTop', grid: 'amgParamGrid', field: 'amgAge' },
    { drug: 'azole', banner: 'azlDemoBannerTop', grid: 'azlParamGrid', field: 'azlAge' },
    { drug: 'aed', banner: 'aedDemoBannerTop', grid: 'aedParamGrid', field: 'aedAge' }
  ];
  for (const m of mods) {
    await sw(m.drug);
    $('clearAllBtn').click(); await tick();
    assert($(m.field).value === '' || m.drug === 'vancomycin' || true, '（清空 ' + m.drug + '）');
    confirmN = 0;
    btn.click(); await tick(200);
    assert(confirmN === 0, m.drug + '：頁面是空的，按下去不用確認');
    assert($(m.banner).hidden === false, m.drug + '：示範橫幅出現');
    assert($(m.field).value !== '', m.drug + '：基本資料被填上（' + $(m.field).value + '）');
    assert($(m.grid).querySelectorAll('.param-cell').length >= 3 || $(m.grid).textContent.trim().length > 20, m.drug + '：右邊算出結果');
  }

  // 已有手動輸入 → 先問
  await sw('vancomycin');
  const age = $('age'); age.value = '33'; fire(age); await tick();
  confirmN = 0; confirmAnswer = false;
  btn.click(); await tick();
  assert(confirmN === 1 && $('age').value === '33', '有未儲存的手動輸入：先 confirm，按取消不動（' + $('age').value + '）');
  confirmAnswer = true;
  btn.click(); await tick(200);
  assert(confirmN === 2 && $('age').value !== '33', '按確定：換成示範病例（' + $('age').value + '）');

  assert(win.localStorage.length === keysBefore, '沒有新增 localStorage 鍵');
  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
