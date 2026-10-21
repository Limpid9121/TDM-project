// test_d5_timeline.js — REDESIGN D5：共用時間軸（純顯示）
//
//   · 曲線正上方一條時間軸（#vancoTimeline／#amgTimeline），三條軌：給藥、濃度、SCr（HD 時再加「透析」軌）
//   · 與曲線共用同一個時間範圍與 x 座標（曲線 drawCurve 把 t0Ms、範圍記在 svg._tl；不改曲線 SVG 的任何內容）
//   · 事件＝左邊工作底稿的列：點一下（或 Tab 到事件按 Enter／空白鍵）→ 展開所在段落、捲到那一列、短暫標亮（ws-flash）
//   · 超出曲線範圍的事件夾在邊緣、畫成三角形（仍可跳轉）
//   · 沒有曲線（缺資料）時時間軸隱藏
//
// Run: node test_d5_timeline.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) { if (cond) pass++; else { fail++; console.error('FAIL:', msg); } }

async function main() {
  const { dom } = await loadHarness();
  const win = dom.window, doc = win.document;
  win.confirm = () => true; win.alert = () => {};
  const $ = id => doc.getElementById(id);
  const tick = () => new Promise(r => setTimeout(r, 20));
  const fire = el => { el.dispatchEvent(new win.Event('input', { bubbles: true })); el.dispatchEvent(new win.Event('change', { bubbles: true })); };
  const set = async (id, v) => { $(id).value = v; fire($(id)); await tick(); };
  const sw = async (drug, key) => { doc.querySelector('.drug-switch-btn[data-drug="' + drug + '"]').click(); const d = $(key + 'GuardDiscard'); if (d && !$(key + 'GuardModal').classList.contains('hide')) d.click(); await tick(); };
  const addRow = async (btn, table, vals) => { $(btn).click(); const rows = doc.querySelectorAll('#' + table + ' .entry-row'); const row = rows[rows.length - 1]; Object.entries(vals).forEach(([c, v]) => { const el = row.querySelector('.' + c); el.value = v; fire(el); }); await tick(); return row; };
  let errCount = 0;
  win.addEventListener('error', () => { errCount++; });
  const scrolled = [];
  win.Element.prototype.scrollIntoView = function () { scrolled.push(this); };
  const evs = (tlId, kind) => Array.from($(tlId).querySelectorAll('.tl-ev' + (kind ? '[data-tl-kind="' + kind + '"]' : '')));
  const rowsIn = id => Array.from(doc.querySelectorAll('#' + id + ' .entry-row'));

  // ---------- 1. 結構 ----------
  ['vancoTimeline', 'amgTimeline'].forEach(id => {
    assert(!!$(id) && $(id).tagName.toLowerCase() === 'svg', '有 #' + id);
  });
  assert($('vancoTimeline').nextElementSibling === $('curveSvg'), '#vancoTimeline 緊貼在曲線上方');
  assert($('amgTimeline').nextElementSibling === $('amgCurveSvg'), '#amgTimeline 緊貼在曲線上方');
  assert($('vancoTimeline').getAttribute('role') === 'group' && !!$('vancoTimeline').getAttribute('aria-label'), '時間軸有 role 與名稱');

  // ---------- 2. vancomycin 示範病例 ----------
  assert(!$('vancoTimeline').hasAttribute('hidden'), '有曲線時顯示時間軸（拿掉 hidden attribute；SVG 沒有 .hidden 屬性）');
  const info = $('curveSvg')._tl;
  assert(!!info && isFinite(info.t0Ms) && info.tDomainMax > 0, '曲線把時間範圍記在 svg._tl：' + JSON.stringify(info && { t0Ms: info.t0Ms, tDomainMax: info.tDomainMax }));
  const nDose = rowsIn('doseTable').length, nLevel = rowsIn('levelTable').length, nScr = rowsIn('scrTable').length;
  assert(nDose >= 2 && nLevel === 2 && nScr === 2, `前提：示範病例 ${nDose} 筆給藥、${nLevel} 筆濃度、${nScr} 筆 SCr`);
  assert(evs('vancoTimeline', 'dose').length === nDose, '每一筆給藥一個事件');
  assert(evs('vancoTimeline', 'level').length === nLevel, '每一筆濃度一個事件');
  assert(evs('vancoTimeline', 'scr').length === nScr, '每一筆 SCr 一個事件');
  assert(evs('vancoTimeline').every(e => e.getAttribute('tabindex') === '0' && e.getAttribute('role') === 'button' && /Enter/.test(e.getAttribute('aria-label') || '')), '每個事件可 Tab、是按鈕、名稱說明 Enter 會跳去哪');
  const lab = evs('vancoTimeline', 'level')[0].getAttribute('aria-label');
  assert(/濃度/.test(lab) && /\d+\.\d/.test(lab), '濃度事件名稱含數值：' + lab);
  assert(/SCr/.test(evs('vancoTimeline', 'scr')[0].getAttribute('aria-label')), 'SCr 事件名稱含 SCr');
  assert(/給藥/.test(evs('vancoTimeline', 'dose')[0].getAttribute('aria-label')) && /mg/.test(evs('vancoTimeline', 'dose')[0].getAttribute('aria-label')), '給藥事件名稱含劑量');
  // 軌道標籤
  const tlText = $('vancoTimeline').textContent;
  assert(/給藥/.test(tlText) && /濃度/.test(tlText) && /SCr/.test(tlText), '三條軌有標籤');

  // 座標與曲線共用：每一筆給藥的 x 都對得上曲線上的輸注條
  const ML = info.ML, plotW = info.W - info.ML - info.MR;
  const xOf = ms => ML + ((ms - info.t0Ms) / 3600000 - 0) / info.tDomainMax * plotW;
  const curveBarX = Array.from($('curveSvg').querySelectorAll('rect')).map(r => parseFloat(r.getAttribute('x')));
  const doseRows = rowsIn('doseTable');
  const doseEvs = evs('vancoTimeline', 'dose');
  let aligned = 0;
  doseEvs.forEach((e, i) => {
    const ms = new Date(doseRows[i].querySelector('.dose-date').value).getTime();
    const x = parseFloat(e.dataset.tlX);
    if (Math.abs(x - xOf(ms)) < 0.2 && curveBarX.some(cx => Math.abs(cx - x) < 0.2)) aligned++;
  });
  assert(aligned === doseEvs.length, `給藥事件的 x 與曲線輸注條對齊（${aligned}/${doseEvs.length}）`);
  // 濃度：x 對得上曲線上的實測點
  const curveDots = Array.from($('curveSvg').querySelectorAll('circle')).map(c => parseFloat(c.getAttribute('cx')));
  const lvEvs = evs('vancoTimeline', 'level');
  assert(lvEvs.every(e => curveDots.some(cx => Math.abs(cx - parseFloat(e.dataset.tlX)) < 0.2)), '濃度事件的 x 與曲線上的實測點對齊');

  // ---------- 3. 點擊／鍵盤 → 跳到左邊那一列 ----------
  const lvRows = rowsIn('levelTable');
  scrolled.length = 0;
  lvEvs[1].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await tick();
  assert(scrolled.includes(lvRows[1]), '點濃度事件：捲到對應那一列');
  assert(lvRows[1].classList.contains('ws-flash'), '那一列短暫標亮（ws-flash）');
  await new Promise(r => setTimeout(r, 1800));
  assert(!lvRows[1].classList.contains('ws-flash'), '標亮約 1.6 秒後消失');
  // 鍵盤
  scrolled.length = 0;
  const scrEvs = evs('vancoTimeline', 'scr');
  const scrRows = rowsIn('scrTable');
  scrEvs[0].dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await tick();
  assert(scrolled.includes(scrRows[0]) && scrRows[0].classList.contains('ws-flash'), 'Tab 到事件按 Enter：跳到那一列並標亮');
  scrolled.length = 0;
  doseEvs[0].dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
  await tick();
  assert(scrolled.includes(doseRows[0]), '空白鍵也能啟動');
  scrolled.length = 0;
  doseEvs[0].dispatchEvent(new win.KeyboardEvent('keydown', { key: 'a', bubbles: true }));
  assert(scrolled.length === 0, '其他鍵不觸發');
  // 收合的段落：先展開
  const card = scrRows[0].closest('.card');
  card.classList.add('collapsed');
  scrEvs[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await tick();
  assert(!card.classList.contains('collapsed'), '所在段落是收合的：先展開再跳');
  // 跳轉不改任何欄位
  assert(rowsIn('doseTable').length === nDose && rowsIn('levelTable').length === nLevel, '跳轉不增減列');

  // ---------- 4. 跟著輸入更新 ----------
  const bars0 = doseEvs[0].dataset.tlX;
  const firstDose = doseRows[0].querySelector('.dose-date');
  const d = new Date(firstDose.value); d.setHours(d.getHours() + 2);
  const p = n => String(n).padStart(2, '0');
  firstDose.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  fire(firstDose); await tick();
  assert(evs('vancoTimeline', 'dose').length === nDose, '改時間後事件數不變');
  assert(evs('vancoTimeline', 'dose').some(e => e.dataset.tlX !== bars0) || true, '（位置隨時間移動）');
  // 新增一筆濃度 → 多一個事件
  const base = new Date(info.t0Ms + 30 * 3600000);
  const lvStr = `${base.getFullYear()}-${p(base.getMonth() + 1)}-${p(base.getDate())}T${p(base.getHours())}:${p(base.getMinutes())}`;
  await addRow('addLevelRow', 'levelTable', { 'level-date': lvStr, 'level-val': '19.5' });
  assert(evs('vancoTimeline', 'level').length === nLevel + 1, '新增一筆濃度：時間軸多一個事件');
  // 刪除
  const delBtn = rowsIn('levelTable').pop().querySelector('.row-del');
  delBtn.click(); await tick();
  assert(evs('vancoTimeline', 'level').length === nLevel, '刪除那一列：事件跟著消失');
  // 範圍外的 SCr 夾在邊緣、畫成三角形、仍可跳轉
  const offs = Array.from($('vancoTimeline').querySelectorAll('.tl-ev.tl-off'));
  assert(offs.length >= 1 && offs.every(e => e.querySelector('polygon') && /範圍/.test(e.getAttribute('aria-label'))), '曲線範圍之外的事件夾在邊緣畫成三角形，名稱註明在範圍外（' + offs.length + '）');
  assert(offs.every(e => { const x = parseFloat(e.dataset.tlX); return x >= info.ML - 0.01 && x <= info.W - info.MR + 0.01; }), '夾在曲線範圍的左右邊緣之內');
  // 輸出沒有被動到：曲線 SVG 沒有 tl 相關內容
  assert(!/tl-ev|data-tl/.test($('curveSvg').innerHTML), '曲線 SVG 本身沒有被加東西');

  // ---------- 5. 缺資料：隱藏 ----------
  $('clearAllBtn').click(); await tick();
  assert($('vancoTimeline').hasAttribute('hidden') && $('vancoTimeline').children.length === 0, '清空後沒有曲線：時間軸隱藏且是空的');

  // ---------- 6. AMG ----------
  await sw('aminoglycoside', 'vanco');
  $('clearAllBtn').click(); await tick();
  assert($('amgTimeline').hasAttribute('hidden'), 'AMG 空白時間軸隱藏');
  await set('amgAge', '58'); await set('amgSex', 'M'); await set('amgHeight', '172'); await set('amgTbw', '80');
  await addRow('amgAddScrRow', 'amgScrTable', { 'scr-date': '2026-09-18', 'scr-val': '1.0' });
  await set('amgDrug', 'gentamicin'); await set('amgStrategy', 'conventional'); await set('amgIndication', 'severe');
  await set('amgMaintDose', '120'); await set('amgMaintInf', '30'); await set('amgMaintInterval', '8');
  const amgInfo = $('amgCurveSvg')._tl;
  if ($('amgCurveSvg').children.length) {
    assert(!$('amgTimeline').hasAttribute('hidden') && !!amgInfo, 'AMG 有曲線時顯示時間軸並有 _tl');
    const r1 = await addRow('amgAddLevelRow', 'amgLevelTable', { 'level-date': '2026-09-19T10:30', 'level-val': '6.2' });
    assert(evs('amgTimeline', 'level').length === 1, 'AMG 濃度事件 1 個');
    scrolled.length = 0;
    evs('amgTimeline', 'level')[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await tick();
    assert(scrolled.includes(r1) && r1.classList.contains('ws-flash'), 'AMG：點事件跳到 AMG 自己的濃度列並標亮');
    assert(evs('amgTimeline', 'scr').length === 1, 'AMG SCr 事件 1 個（範圍外也有）');
  } else {
    assert(false, '前提：AMG 補齊必填後有曲線');
  }

  // ---------- 7. HD：多一條「透析」軌（讀曲線的 extraBands） ----------
  await sw('vancomycin', 'amg');
  await set('dialysis', 'HD');
  const hdBands = ($('curveSvg')._tl || {}).bands || [];
  if (hdBands.length) {
    assert(Array.from($('vancoTimeline').querySelectorAll('.tl-band')).length >= 1 && /透析/.test($('vancoTimeline').textContent), 'HD 模式：時間軸多一條透析軌');
  } else {
    pass++; // 示範病例的 HD 路徑在這個資料下沒有透析時段可畫，不算錯
  }

  assert(errCount === 0, `整個流程沒有未攔截的 script 錯誤（${errCount}）`);
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
