// test_carry_card.js — 「從其他模組帶入基本資料」改成需要時才出現（Brandon 2026-10-23）
//
//   · 01 卡片裡常駐的「從 [模組] [帶入基本資料]」那一列不再顯示（元素與 id 保留，邏輯沿用）
//   · 切到某個藥物時：這裡的基本資料是空的（年齡、身高、體重、SCr 都沒填），而另一個藥物已經填了（不算示範病例）
//     → 01 卡片上方出現一張小卡：「Vancomycin 已有基本資料：55 歲・男・168 cm・65 kg・SCr 0.95（10/23）[帶入] [不用]」
//   · 小卡在卡片外面（不會被收合區裁掉上框）；帶入後顯示結果，按「不用」收起（清空此頁後才會再出現）
//   · 「病人 ▾ → 從其他模組帶入基本資料…」：就算這裡已有資料也叫出小卡（可選來源）
//
// Run: node test_carry_card.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = (ms = 120) => new Promise(r => setTimeout(r, ms));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const norm = t => t.replace(/\s+/g, ' ').trim();
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); await tick(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(200); };
  const vis = el => !!el && !el.hidden;
  await tick(200);

  // 常駐的帶入列不顯示（元素、id 還在）
  ['vanco', 'amg', 'azl', 'aed'].forEach(p => {
    assert(!!$(p + 'CarrySrc') && !!$(p + 'CarryBtn') && !!$(p + 'CarryMsg'), p + '：原本的帶入元素保留');
    assert($(p + 'CarrySrc').closest('.carry-row').classList.contains('carry-legacy'), p + '：常駐的帶入列收起來');
  });
  const card = id => $(id).querySelector(':scope > .carry-card');
  ['inputPanel', 'amgInputPanel', 'azlInputPanel', 'aedInputPanel'].forEach(id => {
    const c = card(id);
    assert(c && !c.closest('.card'), id + '：小卡在卡片外面（不會被裁掉）');
    const first = $(id).querySelector(':scope > .card');
    assert(c && first && (c.compareDocumentPosition(first) & win.Node.DOCUMENT_POSITION_FOLLOWING), id + '：在 01 卡片上方');
  });

  // 起點：全部清空
  for (const [drug, key] of [['vancomycin', 'vanco'], ['aminoglycoside', 'amg'], ['azole', 'azl'], ['aed', 'aed']]) {
    await sw(drug, key); $('clearAllBtn').click(); await tick(200);
  }
  await sw('vancomycin', 'vanco');
  assert(!vis(card('inputPanel')), '大家都空的：不出現');

  // 在 Vancomycin 填基本資料
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(40); };
  await set('age', '71'); await set('sex', 'F'); await set('height', '158'); await set('tbw', '52');
  $('addScrRow').click(); await tick();
  const r = doc.querySelector('#scrTable .entry-row:last-child'); r.querySelector('.scr-date').value = '2026-10-22'; r.querySelector('.scr-val').value = '1.3'; r.querySelectorAll('input').forEach(fire); await tick();
  assert(!vis(card('inputPanel')), '自己有資料：自己這邊不出現');

  // 切到 AMG（空的）→ 出現
  await sw('aminoglycoside', 'amg');
  const ac = card('amgInputPanel');
  assert(vis(ac), 'AMG 空的、Vancomycin 有資料：出現');
  assert(ac && /Vancomycin/.test(ac.textContent) && /71 歲・女・158 cm・52 kg・SCr 1\.3（10\/22）/.test(norm(ac.textContent)), '寫來源與摘要：' + (ac && norm(ac.textContent)));
  ac.querySelector('.cc-go').click(); await tick(200);
  assert($('amgAge').value === '71' && $('amgTbw').value === '52' && doc.querySelectorAll('#amgScrTable .entry-row').length === 1, '按「帶入」：年齡、體重、SCr 都帶進來');
  assert(/已帶入/.test(ac.textContent) && /年齡/.test(ac.textContent), '帶入後顯示結果：' + norm(ac.textContent));
  await tick(4200);
  assert(!vis(ac), '幾秒後收起（這裡已有資料）');

  // Azole 空的 → 出現 → 按「不用」收起；有輸入動作也不再出現
  await sw('azole', 'azl');
  const zc = card('azlInputPanel');
  assert(vis(zc), 'Azole 空的：出現');
  const opts = zc.querySelector('select');
  assert(opts && opts.options.length === 2, '兩個藥物有資料：可選來源（' + (opts && opts.options.length) + '）');
  zc.querySelector('.cc-no').click(); await tick();
  assert(!vis(zc), '按「不用」收起');
  await set('azlAstAlt', '30/40');
  assert(!vis(zc), '收起後不再自己跳出來');

  // 示範病例的資料不算
  await sw('aed', 'aed'); $('clearAllBtn').click(); await tick(200);
  await sw('vancomycin', 'vanco'); $('clearAllBtn').click(); await tick(200); $('loadDemoBtn').click(); await tick(300);
  await sw('aminoglycoside', 'amg'); $('clearAllBtn').click(); await tick(200);
  await sw('aed', 'aed');
  assert(!vis(card('aedInputPanel')), '只有示範病例有資料：不出現');

  // 病人 ▾ → 從其他模組帶入：已有資料也叫得出來
  await sw('vancomycin', 'vanco');
  const rx = $('pmBarVanco').querySelector('.hdr-menu[data-menu="rx"]');
  rx.querySelector('.hdr-menu-btn').click(); await tick();
  rx.querySelector('[data-act="carry"]').click(); await tick();
  const vc = card('inputPanel');
  assert(vis(vc), '從選單叫出小卡');
  assert(/沒有可帶入|已有基本資料/.test(vc.textContent), '沒有其他來源時說明沒有可帶入：' + norm(vc.textContent));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
