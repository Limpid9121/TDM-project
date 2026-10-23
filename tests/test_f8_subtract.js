// test_f8_subtract.js — v3 F8 標籤減法（Brandon 2026-10-23 核可四組，見 docs/F8_LABEL_AUDIT.md）
//
//   第一組：長段說明收進「ⓘ 詳細說明」（內容還在，預設收起）
//   第二組：括號說明搬進滑過提示（標籤只留短名；單位、限制說明保留）。2026-10-23 起 title 換成 data-tip＋快速提示小卡（test_help_affordance.js）
//   第三組：刪除整句重複
//   第四組：縮短改寫（常駐一句短話，原文收進 ⓘ）
//   保留：單位、限制、必填、院內規則
//
// Run: node test_f8_subtract.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  await new Promise(r => setTimeout(r, 200));
  const norm = t => t.replace(/\s+/g, ' ').trim();
  // 看得到的文字：收合區（details）只算摘要
  const visText = root => { const c = root.cloneNode(true); c.querySelectorAll('script, style').forEach(x => x.remove()); c.querySelectorAll('details').forEach(d => { const s = d.querySelector('summary'); d.replaceWith(doc.createTextNode(s ? s.textContent : '')); }); return norm(c.textContent); };
  const allVis = visText(doc.body);
  const visTextAll = (() => { const c = doc.body.cloneNode(true); c.querySelectorAll('script, style').forEach(x => x.remove()); return norm(c.textContent); })();
  const holder = phrase => Array.from(doc.querySelectorAll('.hint, details, p, div, label')).filter(e => e.textContent.includes(phrase)).pop();

  // ---------- 第一組 ----------
  ['SCr 建議填最近數筆', '水腫／腹水／第三腔隙時', '不限同一給藥區間', '不限傳統時點慣例', '目標建議落在 400', '三維變動', '會自動勾選常見組合', 'PAE（給藥後即使濃度',
   '勾選最左欄可在上方曲線', '危險（紅）＝trough', '本工具只做得到族群', '本工具只做 trough 對目標值', '下方會整合目前已輸入的資料', '東亞族裔', '依 Pharmacology of azoles', '只有勾選「已確認達穩態」', 'MSG/EORTC']
    .forEach(p => {
      const inDoc = visTextAll.includes(p);
      assert(inDoc, '第一組內容還在：' + p);
      assert(!allVis.includes(p), '第一組預設收起（不在看得到的文字裡）：' + p);
    });
  assert(doc.getElementById('regimenSectionHint') && doc.getElementById('regimenSectionHint').closest('details.hint-more'), '#regimenSectionHint 收進 ⓘ（id 不變，HD 時改寫文字仍可用）');
  assert(!allVis.includes('先填目前處方 → 產生給藥紀錄'), '「先填目前處方 →」那句不再常駐（ⓘ 裡已有同樣的話）');
  assert(/臨床病程客觀回報（選填）/.test(allVis), 'Azole 04 留「臨床病程客觀回報（選填）」');

  // ---------- 第二組 ----------
  const lab = (sel) => doc.querySelector(sel);
  const labelOf = id => { const i = doc.getElementById(id); const f = i && i.closest('.field'); return f && f.querySelector(':scope > label'); };
  const checkLab = id => doc.querySelector('.checkline > label[for="' + id + '"]');
  [
    [labelOf('therapyStart'), '分析起點', '第一筆給藥時間'],
    [labelOf('expandTo'), '展開至', '最後一次抽血'],
    [labelOf('amgTherapyStart'), '分析起點', '第一筆給藥時間'],
    [labelOf('amgExpandTo'), '展開至', '最後一次抽血'],
    [checkLab('useLoading'), '首劑為獨立 loading 劑量', '劑量與維持劑量不同'],
    [checkLab('sourceControlDone'), '感染源已控制', '引流'],
    [checkLab('amgSourceControlDone'), '感染源已控制', '引流'],
    [checkLab('azlSourceControl'), '已控制', '引流'],
    [labelOf('amgIndication'), '適應症', '決定目標值'],
    [labelOf('azlIndication'), '適應症', '決定目標值'],
    [labelOf('azlTherapyStart'), '本療程起始日期時間', '判斷穩態用'],
    [labelOf('azlImaging'), '影像學', '若有追蹤'],
    [labelOf('azlMycology'), '黴菌學／生物標記', '若有送驗'],
    [checkLab('azlSxPhotopsia'), '畏光／閃光感', '19%'],
    [checkLab('azlSxSkinLesion'), '皮膚異常病灶', '皮膚癌風險'],
    [labelOf('aedLevelRoute'), '給藥途徑', '採樣窗判斷用'],
    [checkLab('aedImNg'), 'IM 給藥或 NG feeding', '吸收可能不穩定'],
  ].forEach(([el, short, tip], i) => {
    assert(el && norm(el.textContent) === short, '第二組 #' + i + ' 標籤只留短名：' + (el && norm(el.textContent)) + ' → ' + short);
    assert(el && ((el.title || el.dataset.tip) || '').includes(tip), '第二組 #' + i + ' 原文在滑過提示：' + tip);
  });
  const cand = Array.from(doc.querySelectorAll('.field > label')).filter(l => /^候選給藥間隔/.test(norm(l.textContent)));
  assert(cand.length === 2 && cand.every(l => norm(l.textContent) === '候選給藥間隔' && /劑量調整方案/.test(l.title || l.dataset.tip)), '候選給藥間隔（V／A）');
  const odd = Array.from(doc.querySelectorAll('label')).find(l => /^ODD／HDEI 適用性/.test(norm(l.textContent)));
  assert(odd && norm(odd.textContent) === 'ODD／HDEI 適用性——是否符合以下任一項' && /院內 protocol/.test(odd.title || odd.dataset.tip), 'ODD 標籤短、原文在提示');
  ['arcSuspect', 'amgArcSuspect'].forEach(id => {
    const l = checkLab(id);
    assert(l && /僅影響 CrCl 130–150 時是否多一則提示，不改變任何計算/.test(l.textContent) && !/年輕／創傷/.test(l.textContent) && /年輕／創傷/.test(l.title || l.dataset.tip), id + '：舉例搬進提示、限制說明保留');
  });
  assert(!allVis.includes('這次沒有的話請取消勾選'), 'loading 那句不再常駐');
  assert(/這次沒有的話請取消勾選/.test((checkLab('useLoading') || {}).title || (checkLab('useLoading') || {dataset:{}}).dataset.tip || ''), 'loading 那句在勾選框的滑過提示');

  // ---------- 第三組 ----------
  assert(!visTextAll.includes('三唑類以 trough（下一劑前）為主'), '刪除 Azole 06 重複句');
  assert(!visTextAll.includes('三唑類受肝功能與發炎狀態'), '刪除 Azole 03 重複句');
  assert(!visTextAll.includes('如需 free level 須外送'), '刪除 AED 06 重複的「本院無 free phenytoin 醫令」');
  assert(/HLA-B\*15:02 陽性且未曾使用者建議避免 phenytoin/.test(allVis), 'HLA 警示前半保留');

  // ---------- 第四組 ----------
  [['只判讀 trough 與情境，不做 PK 擬合。', '本模組不做 PK 擬合——'],
   ['濃度校正判讀＋情境檢查；不做時間-濃度曲線擬合。', '本模組為「濃度校正判讀＋情境檢查」工具'],
   ['本院採樣窗：給藥前一小時內。', '較院內指引通則的寬鬆 trough'],
   ['以關鍵字比對高風險類別，不換算劑量。', '特別標明 CYP'],
  ].forEach(([short, orig]) => {
    assert(allVis.includes(short), '第四組常駐短句：' + short);
    assert(visTextAll.includes(orig) && !allVis.includes(orig), '第四組原文收進 ⓘ：' + orig);
  });
  assert((allVis.match(/以關鍵字比對高風險類別，不換算劑量。/g) || []).length === 2, 'Azole 09 與 AED 09 都改短句');

  // ---------- 保留 ----------
  ['MIC 假設（µg/mL）', '有給藥紀錄時必選', 'CRP（mg/dL 或 mg/L，請標單位）', '乾／平常體重（kg，選填）', 'Trough 結果（µg/mL，即 mg/L）', '本院無 free phenytoin 醫令', '族群 Vd 先驗上修至 0.35 L/kg', '工具會往前補入虛擬劑次']
    .forEach(p => assert(allVis.includes(p), '保留：' + p));

  console.log(pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
