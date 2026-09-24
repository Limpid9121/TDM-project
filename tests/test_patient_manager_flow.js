// test_patient_manager_flow.js
// WP3.6 (Phase 3 DoD)：test_ui_golden.js 的 11 個情境都在「填完資料、展開劑量」後才
// 快照，不會走到 WP3.2–3.5 新增的 pm-bar／guardUnsaved／explorer 互動路徑；純 CSS 的
// ui_layout_check.py 也不驗證互動邏輯。這支測試補上這段：對 vanco 模組跑一次完整流程
// （存檔→dirty dot→guardUnsaved 三選一→病人資料分頁批次刪除），其餘三模組各跑一次
// 「存檔→出現在 explorer 列表→刪除」的簡化版。
//
// Run: node test_patient_manager_flow.js

const { loadHarness } = require('./load_harness.js');

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

function setAndFire(win, doc, id, value) {
  const el = doc.getElementById(id);
  if (el.type === 'checkbox') el.checked = value; else el.value = value;
  el.dispatchEvent(new win.Event('input', { bubbles: true }));
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}
function fireClick(win, el) { el.dispatchEvent(new win.Event('click', { bubbles: true })); }
function fireChange(win, el) { el.dispatchEvent(new win.Event('change', { bubbles: true })); }

async function main() {
  const { dom } = await loadHarness();
  const { window: win } = dom;
  const doc = win.document;
  win.alert = () => {};    // jsdom has no native alert(); stub so no unhandled-implementation noise
  win.confirm = () => true; // loadSelected()'s own internal confirm() — always "OK" for this flow

  // ================= vanco：完整流程 =================
  // ---- (1) 空白時 savePatientBtn 存檔後 patientSelect 出現一筆、dirty dot 消失 ----
  assert(doc.querySelectorAll('#patientSelect option').length === 1, 'vanco: before saving, patientSelect has only the placeholder option (no saved patients yet)');

  setAndFire(win, doc, 'patientLabel', 'WP36-VANCO-001');
  fireClick(win, doc.getElementById('savePatientBtn'));

  assert(doc.querySelectorAll('#patientSelect option').length === 2, 'vanco: after saving, patientSelect gains one option for the new patient');
  assert(doc.getElementById('vancoDirtyDot').hidden === true, 'vanco: dirty dot is hidden right after a successful save (onPersisted clears it)');

  // ---- (2) 改一欄輸入 → dirty dot 出現 ----
  setAndFire(win, doc, 'age', '61');
  assert(doc.getElementById('vancoDirtyDot').hidden === false, 'vanco: editing an input-panel field sets the dirty dot visible again');

  // ---- (3) 這時點「載入」→ 跳出 vancoGuardModal（非 hidden）；點「不儲存，繼續」→ modal 關閉且原本的 loadSelected 邏輯照跑 ----
  assert(doc.getElementById('patientSelect').value !== '', 'vanco: patientSelect already points at the just-saved patient (refreshPatientSelect selected it)');
  fireClick(win, doc.getElementById('loadPatientBtn'));
  assert(!doc.getElementById('vancoGuardModal').classList.contains('hide'), 'vanco: clicking "載入" while dirty opens the three-way guard modal instead of loading immediately');

  fireClick(win, doc.getElementById('vancoGuardDiscard'));
  assert(doc.getElementById('vancoGuardModal').classList.contains('hide'), 'vanco: "不儲存，繼續" closes the guard modal');
  assert(doc.getElementById('patientLabel').value === 'WP36-VANCO-001', 'vanco: the original loadSelected() logic actually ran and restored the saved patient\'s label');
  assert(doc.getElementById('vancoDirtyDot').hidden === true, 'vanco: dirty dot clears again after loadSelected()\'s onPersisted(\'load\') fires');

  // ---- (4) 病人資料分頁勾選剛存的病人、按刪除、確認 → patientSelect 選單回到只有「（新病人／未選擇）」----
  const vancoModuleRoot = doc.getElementById('drug-vancomycin');
  fireClick(win, vancoModuleRoot.querySelector('.mod-tab[data-modtab="explorer"]'));
  assert(doc.getElementById('vancoExplorerList').children.length === 1, 'vanco: explorer list shows exactly the one saved patient after switching to 病人資料 tab');
  assert(doc.getElementById('vancoExplorerDeleteBtn').disabled === true, 'vanco: explorer delete button starts disabled (nothing checked yet)');

  const vancoRowCheckbox = doc.querySelector('#vancoExplorerList input[type="checkbox"]');
  vancoRowCheckbox.checked = true;
  fireChange(win, vancoRowCheckbox);
  assert(doc.getElementById('vancoExplorerDeleteBtn').disabled === false, 'vanco: explorer delete button enables once a row is checked');

  fireClick(win, doc.getElementById('vancoExplorerDeleteBtn'));
  assert(!doc.getElementById('vancoExplorerDeleteModal').classList.contains('hide'), 'vanco: delete button opens the batch-delete confirm modal');
  assert(/WP36-VANCO-001/.test(doc.getElementById('vancoExplorerDeleteMsg').innerHTML), 'vanco: confirm modal lists the patient label about to be deleted');

  fireClick(win, doc.getElementById('vancoExplorerDeleteConfirm'));
  assert(doc.querySelectorAll('#patientSelect option').length === 1, 'vanco: after confirming batch delete, patientSelect is back to only "（新病人／未選擇）"');
  assert(doc.querySelector('#patientSelect option').textContent === '（新病人／未選擇）', 'vanco: the remaining single option is the placeholder');

  // ================= amg／azole／aed：簡化版「存檔→出現在 explorer 列表→刪除」 =================
  const simpleModules = [
    { key: 'amg', moduleId: 'drug-aminoglycoside', labelId: 'amgPatientLabel', saveBtnId: 'amgSavePatientBtn', selectId: 'amgPatientSelect' },
    { key: 'azl', moduleId: 'drug-azole', labelId: 'azlPatientLabel', saveBtnId: 'azlSavePatientBtn', selectId: 'azlPatientSelect' },
    { key: 'aed', moduleId: 'drug-aed', labelId: 'aedPatientLabel', saveBtnId: 'aedSavePatientBtn', selectId: 'aedPatientSelect' }
  ];

  for (const m of simpleModules) {
    const label = `WP36-${m.key.toUpperCase()}-001`;
    setAndFire(win, doc, m.labelId, label);
    fireClick(win, doc.getElementById(m.saveBtnId));
    assert(doc.querySelectorAll(`#${m.selectId} option`).length === 2, `${m.key}: after saving, ${m.selectId} gains one option`);

    const moduleRoot = doc.getElementById(m.moduleId);
    fireClick(win, moduleRoot.querySelector('.mod-tab[data-modtab="explorer"]'));
    const listEl = doc.getElementById(`${m.key}ExplorerList`);
    assert(listEl.children.length === 1, `${m.key}: explorer list shows the one saved patient`);
    assert(listEl.textContent.includes(label), `${m.key}: explorer row shows the saved patient's label ("${label}")`);

    const rowCheckbox = listEl.querySelector('input[type="checkbox"]');
    rowCheckbox.checked = true;
    fireChange(win, rowCheckbox);
    fireClick(win, doc.getElementById(`${m.key}ExplorerDeleteBtn`));
    fireClick(win, doc.getElementById(`${m.key}ExplorerDeleteConfirm`));

    assert(doc.querySelectorAll(`#${m.selectId} option`).length === 1, `${m.key}: after confirming delete, ${m.selectId} is back to only the placeholder`);
    assert(listEl.textContent.includes('尚無已儲存的病人'), `${m.key}: explorer list shows the empty state after the only patient is deleted`);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

main().catch(e => { console.error('TEST SUITE CRASHED:', e); process.exit(1); });
