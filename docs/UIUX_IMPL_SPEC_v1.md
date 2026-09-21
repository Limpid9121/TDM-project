# TDM 工作台 UI/UX 翻修施工指示書 v1（給實作模型）

> 撰寫：Claude Opus（審查與規格）｜實作：Claude Sonnet（或其他較便宜模型）｜核可：Brandon
> 前置文件：`docs/UIUX_AUDIT_v1.md`（問題清單與證據，編號 S/B/W/F 在本文件沿用）
> 對象檔案：`index.html`（單檔、無 build、vanilla JS）。行號以 git `f6cca5a` 為準，**每次動手前用 grep 重新定位，不要相信行號**。

---

## 0. 你（實作模型）開工前必讀

### 0.1 這次的任務性質
- 只做 **UI／UX 與輸入流暢度**：版面、CSS、互動、文案、輸入輔助、空狀態、提示。
- **任何計算結果都不可以改變。** 判斷標準不是「我覺得沒動到」，而是 `node tests/test_ui_golden.js` 必須 0 差異（例外只有第 4 節明列、且 Brandon 已核可的文字修正）。
- Brandon 的工作規範：規格先核可才寫碼；偏離規格要明講理由；每個里程碑要能被他用截圖目視確認。遇到規格沒寫到、或會碰到計算的情況 → **停下來回報，不要自己決定**。

### 0.2 省 token 的讀檔方式（重要）
`index.html` 約 48 萬字元，**不要整份讀進來**。每個工作包只用 `grep -n` 找錨點，再用 `sed -n 'A,Bp'` 讀該段前後 40–80 行。本文件每個工作包都給了可 grep 的錨點字串。

### 0.3 開工確認清單（Brandon 已於 2026-09-20 逐項口頭確認，全部 Go）
```
D0  F-1 修正 AMG 預測模式 drug 未定義 ................ [ Go ]
D1  示範資料改為手動載入＋橫幅 ........................ [ Go ]
D2  缺必要欄位時改列清單、不出數字 .................... [ Go ]
D3  結果面板 sticky＋左欄加寬＋修正欄位對齊 ........... [ Go ]（擴充，見下）
D4  頁首病人/紀錄系統（參照 TPN 調配試算工具架構） .... [ Go ]（範圍擴大，見下，取代原「病人存檔卡壓成病人列」）
D5  跨模組帶入基本資料按鈕 ............................ [ Go ]（只搬數值，不建立病歷號跨模組連結）
D6  長說明收進「詳細說明」 ............................ [ Go ]（採原提案：逐欄折疊，不採 TPN 三段式全域模式切換）
D7  「目標 AUC₂₄/MIC」改名以符合程式行為 .............. [ Go ]
D8  頁首固定標題＋分頁式切換 .......................... [ Go ]（實質併入 D4，見下）
D9  非破壞性 alert 改行內提示 ......................... [ Go ]
D10 新增一劑預帶上一劑＋τ ............................. [ Go ]
D11 劇量→劑量等文案替換（附錄 C） .................... [ Go ]
```

**D3 擴充範圍**（Brandon 追加）：桌機 sticky 結果面板之外，左欄要再加寬（原提案 `minmax(360px,440px)` 太窄，資料仍堆很長），並修正欄位對齊問題（同一張卡內多個 `.field` 因 label 換行長度不一而沒有對齊）。見 WP3.1。

**D4／D8 合併與範圍擴大**：Brandon 提供了他另一個專案「TPN 調配試算」工具（`TPN調配試算.html`）作為範本，裡面已有一套成熟的「頁首病人＋紀錄下拉、Word 式未存變更警告、獨立病人資料頁籤＋批次刪除」架構。決議：**先在 TDM 的 4 個模組內各自導入這套 UI 模式**（沿用各模組現有的 4 組獨立 `localStorage` key 與 schemaVersion 2 資料結構，完全不變），病人身份**不**跨模組共用（那是 D5 的範圍，且 D5 已決議只搬欄位數值、不建立病歷號連結）。這比原規格書寫的 WP3.2/WP3.3/WP3.4 範圍大很多，已於 §4 Phase 3 重寫為 WP3.1–WP3.6（見下）。

標示 No-Go 的決策所對應的工作包直接跳過——目前沒有 No-Go 項目。

---

## 1. 紅線（違反任一條即視為失敗，必須回滾）

| # | 紅線 | 原因 |
|---|---|---|
| R1 | **不得修改以下函式的內部邏輯**：`predictConc` `primePriorDoses` `nelderMead` `fitCLV` `checkFitPlausibility` `checkLevelSpacing` `integrateTrapz` `roundDoseTo250` `inferInfusionMinutes` `regimenTag*` `computeCandidateAmino` `roundDoseAmino*` `getAminoOddCrClSuggestion` `checkCmaxMicEfficacy` `ssConcAtT1` `odaVancoPopParams` `twoCompartmentSS` `findCurrentHDWindow` `buildHdSessionsFromPattern` 所有 azole／AED 規則函式（`checkAzoleTrough` 至 `vpaProportionalDose`）、所有 `buildAiPrompt*`、`cockcroftGault` `ibwDevine` `weightForCG`，以及常數表 `AMINO_*` `AZOLE_*` `AED_*` `GENT_*`。 | 計算核心。 |
| R2 | `render` `renderVancoHD` `renderProspective` `renderAmino` `renderProspectiveAmg` `renderAzole` `renderAed` 等渲染函式：**只允許**（a）在函式開頭加一行 guard 呼叫（WP1.2）、（b）在函式開頭 `renumberDoseRows()` 旁加一行純顯示輔助呼叫、（c）替其輸出的 HTML 字串加 class 屬性。不得改任何文字與數值運算。 | golden 以 textContent 比對，加 class 不影響、改字會被抓到。 |
| R3 | **既有元素 id 一律不改名、不刪除、不改型別**（input→select 之類）。可以搬移位置、外包容器。 | `collectState*`／`applyState*` 以 id 存讀，改名＝舊存檔讀不回來；測試也以 id 操作。 |
| R4 | 讀列的選擇器是 `#doseTable .entry-row` 這種形式。**表頭列、說明列、任何新增元素都不可使用 `entry-row` class，也不可放進 `#doseTable` `#levelTable` `#scrTable` `#hdSessionTable` 及其 `amg*` 對應容器內**（`clearTbody` 會清空容器、`collectState` 會把它當成資料列而 crash）。表頭放在容器「之前」當兄弟元素。 | 資料完整性。 |
| R5 | **沒有 value 屬性的 `<option>`，其文字就是存檔值，文字不得修改**：`#indication` `#severity` `#amgSeverity` `#azlSeverity`。 | 舊存檔相容。 |
| R6 | **卡片編號（h2 裡的 `.idx` 01、02…）與卡片順序不得變更。** 計算輸出文字引用了「左側區塊 02」「卡片 03」「卡片 05」「卡片07」；卡片順序也對應四份收案表 A→J 段。可以在卡片「內部」重排欄位。 | 引用一致性、輸入流暢度。 |
| R7 | 每張輸入卡片的**第一個子元素必須是 `<h2>`**。`initCollapsibleCards()` 會把 h2 之後所有節點搬進 `.card-body-inner`。 | 收合機制。 |
| R8 | `load_harness.js` 的 `ANCHOR` 是 DOMContentLoaded 尾端逐字比對字串（`document.querySelectorAll('.drug-switch-btn[data-drug]').forEach(...)` 到 `})();`）。**新的 wiring 一律插在 `// ---------------- drug switcher wiring ----------------` 這行「之前」**；若不得不改這段尾巴，必須同步更新 `tests/load_harness.js` 的 `ANCHOR`。 | 既有測試載入機制。 |
| R9 | 不引入任何外部函式庫或 build 步驟；維持單一 `index.html`。 | 部署於 GitHub Pages、離線可用。 |
| R10 | 不新增任何 localStorage key 之外的持久化；新增的 UI 偏好 key 一律以 `tdm_ui_` 開頭並包 try/catch。**不得改動四個病人存檔 key 與其資料結構。** | 存檔相容。 |

---

## 2. 測試與驗證協定

### 2.1 工具（Opus 已建好、已驗證，直接用）
| 檔案 | 用途 | 現況 |
|---|---|---|
| `tests/test_ui_golden.js` | 固定時鐘＋11 情境的計算輸出快照比對 | 對 `f6cca5a` 124／124 通過 |
| `tests/golden/ui_golden_baseline.json` | 上述基準 | **禁止**自行 `--update`；只有 Brandon 核可某項文字變更後才可重建，且重建前要把 diff 貼給他看 |
| `tests/ui_layout_check.py` | 真實 Chromium 三種寬度的版面斷言＋截圖 | 現況 14 項失敗（見審查報告 §2），翻修後目標 0 |
| `docs/uiux_prototype.css` | 已通過全部版面斷言的 CSS 原型（桌機 sticky、單行列、手機不溢出） | 參考用，不要原樣整段貼上（它對 `.entry-row` 下全域規則，會波及 HD 列與 AED 配對表；正式做法見 WP2.5） |
| `tests/test_patient_manager_flow.js`（Phase 3 新增，見 WP3.6） | 存檔／dirty／guardUnsaved／病人資料分頁批次刪除的流程測試 | 尚未建立，WP3.6 建立後與其餘測試一起跑 |
| Brandon 提供的 `TPN調配試算.html`（另一專案，非本 repo） | D4/D8 頁首病人/紀錄系統的設計參照範本 | 只借用其 UI 模式（頁首病人+紀錄下拉、Word 式未存提示、病人資料頁籤+批次刪除），**不共用程式碼、不引入為外部檔案**（R9）；其 `currentRecordKey`／覆寫式存檔模型比 TDM 更複雜，TDM 維持自己「存為新收案＝append 一筆版本」的既有語意，只借用 UI 骨架 |

執行（在含 jsdom 的環境；Cowork 雲端可 `cd tests && npm i jsdom`）：
```bash
cd tests
for f in test_*.js; do node "$f" 2>&1 | grep -E "passed|FAIL|CRASH" ; done
python3 ui_layout_check.py --out shots/<工作包編號>
```

### 2.2 每個工作包的完成定義（DoD）
1. 所有 `tests/test_*.js` 通過（`test_azole_integration.js` 在 WP0.1 修好之後也要通過）。
2. `test_ui_golden.js` **0 差異**（除非該工作包明列允許的差異）。
3. `ui_layout_check.py` 失敗數**不增加**（Phase 2 之後必須為 0）。
4. `git commit`，訊息格式：`UIUX WP<編號>: <一句話>`，每個工作包一個 commit，方便 Brandon 逐包回滾。
5. 在回報中附上 `shots/<工作包>/desk_<module>_fold.png` 等相關截圖路徑，並用一兩句話描述「使用者看到的變化」。

### 2.3 停止條件（遇到就停、回報、等指示）
- golden 出現非預期差異，而你無法在不碰 R1/R2 範圍的情況下消除。
- 需要改動任何 R1 清單內函式。
- 某個工作包的做法與本文件寫的不同（例如你認為有更好的做法）——先寫出差異與理由，等 Brandon 同意。

---

## 3. 階段總覽與順序

| 階段 | 內容 | 風險 | 依賴決策 |
|---|---|---|---|
| Phase 0 | 安全網：測試盤點、修過期測試、F-1 | 極低 | D0 |
| Phase 2 | 純 CSS／小型 JS 視覺錯誤修正（B1–B10） | 低 | 無 |
| Phase 1 | 臨床安全相關 UX（S1–S8） | 中 | D1 D2 D7 |
| Phase 3 | 版面骨架：sticky 結果＋左欄加寬對齊、頁首病人/紀錄系統（TPN 式）、Word 式未儲存警告、病人資料頁籤＋批次刪除 | 中—高（WP3.2 起牽涉 DOM 結構搬移與新互動狀態，範圍已擴大，逐包驗證） | D3 D4 D8 |
| Phase 4 | 卡片 03 重整、資料列單行化、濃度相對時間、快速輸入 | 中 | D10 |
| Phase 5 | 文案、說明收合、一致性 | 低 | D6 D11 |
| Phase 6 | 跨模組帶入基本資料 | 低 | D5 |
| Phase 7 | 行內提示取代 alert | 低 | D9 |

**建議施工順序：0 → 2 → 1 → 3 → 4 → 5 → 6 → 7**（先做純 CSS 讓版面斷言歸零，後續每一步的截圖才有意義）。每完成一個 Phase，停下來讓 Brandon 看截圖再繼續。

---

## 4. 工作包

### Phase 0 — 安全網

**WP0.1 過期測試 `tests/test_azole_integration.js`（Opus 已修好，你只需確認）**
- 原因有二：(1) 存檔已升為 v2（key `azole_tdm_patients_v2`、訊息「已存為新收案」、資料在 `visits[i].data`），測試仍讀 v1；(2) azole B 區在 isavuconazole 時改為「永遠顯示、但說明為何不給劑量幅度」（見 `renderAzole` 內 `Section B is always rendered` 註解），測試仍斷言區塊被隱藏。
- Opus 已改寫這三個斷言（不動 `index.html`），改後 34／34 通過。你只需跑一次確認。
- 另外：`tests/load_harness.js` 原本寫死讀 `tests/index.html`，在 2026-09-18 整理成 git repo（`index.html` 在根目錄）之後，**所有既有測試直接執行都會因找不到檔案而失敗**。Opus 已改成「tests/ 內有就用、否則用上一層」。修正後 9 支測試（含 golden）共 407 項全過。
- DoD：8 支既有測試全過。

**WP0.2 確認測試盤點**
- 在回報中列出 `tests/` 內檔案與各自通過數。提醒 Brandon：HANDOFF_v3 §0 的 `test_hd_schedule.js`、`test_regression_smoke.js`、`test_hd_window_fix.js`、`test_amino_interval_vial.js` 不在資料夾內；若他找得到，放回 `tests/` 後重跑。

**WP0.3（D0）修正 F-1：`renderProspectiveAmg` 的 `drug` 未定義**
- 錨點：`grep -n "computeCandidateAmino(ct, CLpop, ke, maintInfHr, target, dailyDoseNow, mic, drug)"`（約 5289 行）與 `grep -n "renderProspectiveAmg({crcl"`（約 5434 行）。
- 做法（兩處、各加一個識別字，不改其他）：
  1. 呼叫端物件字面值 `{crcl, cgMethod, ..., drugLabel, ...}` 加入 `drug`（`renderAmino` 內 5344 行已有 `const drug`）。
  2. `function renderProspectiveAmg(ctx){` 下一行解構 `const {crcl, ..., tiwDays} = ctx;` 加入 `drug`。
- 驗證：在 jsdom 重現步驟——切 AMG、清空、填年齡 60／身高 170／體重 70／一筆 SCr 1.0、維持劑量 400／輸注 30／間隔 24，不展開給藥 → 不應再有 `ReferenceError`，`#amgRegimenTable tbody tr` 數量 > 0。為此新增 `tests/test_amg_prospective_fix.js`（仿 `test_amg_mic_integration.js` 結構，監聽 `window.onerror` 計數）。golden 應 0 差異（golden 情境皆在展開後快照）。

---

### Phase 2 — 視覺錯誤修正（先做）

**WP2.1 修 CSS 層疊順序（B1、B6）**
- 錨點：`<style>` 內 `@media (max-width:980px){` 與 `@media (max-width:640px){`（約 76–105 行）、`.monitor-grid` 的 640 media（約 358）、`.drug-switch` 的 640 media（約 388）。
- 做法：把這幾個 media 區塊**原封不動搬到 `</style>` 前（樣式表最末）**，順序 980 → 640。然後在 980 區塊補：
  ```css
  main.grid{grid-template-columns:minmax(0,1fr);}
  .field input[type="datetime-local"]{min-width:0;}
  ```
  並把基本規則 `.field input[type="datetime-local"]{min-width:210px;}` 改為 `min-width:0;`（日期欄寬度改由 grid 決定）。
- DoD：`ui_layout_check.py` 的 L1 全部消失；L3 中的 `*AsOf`／`*DrawAt` 類溢出消失。

**WP2.2 `.hint` 全域化（B2）**
- 錨點：`.card .hint{font-size:12px;...}`（約 157 行）。
- 做法：選擇器改為 `.hint`（全域）。檢查結果面板內 `p.hint` 的 inline `style="margin-top:-4px"` 等維持不動。另加 `#aedPkContent > p, #aedVpaDoseContent > p{font-size:12.5px;}`（AED B 區空狀態文字目前是 16 px）。
- DoD：截圖中「劑量調整建議」下方說明、AI Prompt 說明、AMG 顏色圖例都變成 12 px 灰字；golden 0 差異。

**WP2.3 AI Prompt 文字框統一（B3）**
- 錨點：`textarea#aiPromptOut, textarea#amgAiPromptOut, textarea#azlAiPromptOut{`（約 363 行）。
- 做法：選擇器加 `textarea#aedAiPromptOut`。
- DoD：AED 文字框高度 ≥ 220 px。

**WP2.4 AED 卡片可收合（B4）**
- 錨點：`function initCollapsibleCards(){` 內 `const panels = [`。
- 做法：陣列加 `{id:'aedInputPanel', mod:'aed'}`。
- DoD：AED 左欄出現「全部收起」，每張卡可收合；AED 相關測試全過。

**WP2.5 資料列單行化（B5；Phase 4 的前置）**
- 做法：
  1. 在下列 `add*Row` 函式把 `row.className = 'entry-row';` 改成帶修飾 class（**保留** `entry-row`）：
     | 函式 | 新 className |
     |---|---|
     | `addScrRow` `addScrRowAmg` | `entry-row entry-row--scr` |
     | `addDoseRow` `addDoseRowAmg` | `entry-row entry-row--dose` |
     | `addLevelRow` `addLevelRowAmg` | `entry-row entry-row--level` |
     | `addHdSessionRowGeneric` | `entry-row entry-row--hd` |
     | `addAedSsPairRow` | `entry-row entry-row--sspair` |
  2. CSS（加在 `.entry-row` 基本規則之後）：
     ```css
     .entry-row--scr,.entry-row--dose,.entry-row--level,.entry-row--hd{display:grid;gap:6px;padding:5px 8px;align-items:center;}
     .entry-row--scr  {grid-template-columns:minmax(0,1fr) 84px 28px;}
     .entry-row--dose {grid-template-columns:20px minmax(0,1fr) 72px 60px 28px;}
     .entry-row--level{grid-template-columns:minmax(0,1fr) 80px 28px;}
     .entry-row--hd   {grid-template-columns:minmax(0,1fr) minmax(0,1fr) 28px;}
     .entry-row--scr input[type="date"],.entry-row--dose input[type="datetime-local"],
     .entry-row--level input[type="datetime-local"],.entry-row--hd input[type="datetime-local"]{min-width:0;max-width:none;width:100%;font-size:12.5px;padding:5px 6px;}
     .entry-row--scr .num-field,.entry-row--dose .num-field,.entry-row--level .num-field{min-width:0;}
     .entry-row--scr .num-field input,.entry-row--dose .num-field input,.entry-row--level .num-field input{width:100%;min-width:0;padding:5px 6px;}
     .entry-row--scr .unit,.entry-row--dose .unit,.entry-row--level .unit{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);} /* 單位改由表頭顯示，保留給螢幕閱讀器 */
     .entry-row--hd .num-field{min-width:0;} .entry-row--hd .num-field input{min-width:0;width:100%;}
     .entry-row .row-del{margin-left:0;}
     .entry-rows{gap:4px;}
     ```
  3. 表頭（**R4**：放在容器之前、不可用 `entry-row` class）。在 HTML 靜態加入，例如 `#doseTable` 之前：
     ```html
     <div class="entry-head entry-head--dose" aria-hidden="true"><span>#</span><span>給藥開始時間</span><span>劑量 mg</span><span>輸注 分</span><span></span></div>
     ```
     `.entry-head` 用與對應列相同的 `grid-template-columns`，字 11px 灰色、padding 與列對齊。需加表頭的容器：`scrTable`（日期｜SCr mg/dL）、`doseTable`、`levelTable`（抽血時間｜濃度 µg/mL）、`hdSessionTable`（開始｜結束）及四個 `amg*` 對應。表頭在容器內沒有任何列時以 CSS 隱藏：`.entry-head:has(+ .entry-rows:empty){display:none;}`。
  4. AED 配對表：`.entry-row--sspair` 維持原本 flex-wrap 版面；`#aedSsPairsTable` 補 `display:flex;flex-direction:column;gap:6px;margin-top:8px;`（它的 class 是 `entry-list`，目前沒有任何樣式）；「已達穩態」label 改為把 checkbox 包在 `<label>` 裡（`<label class="checkline" style="margin:0;"><input type="checkbox" class="ssp-confirmed"> 已達穩態</label>`），不要用 `for`（同頁多列會重複 id）。**注意 `.ssp-confirmed` 的 class 不能改**（`collectAedSsPairs` 用它）。
- DoD：1440 寬時每一劑列高度 ≤ 42 px、刪除鈕與其他欄同一行；golden 0 差異；AED 配對表測試（`test_aed_integration_p2.js`）通過。

**WP2.6 其他小修（B7、B9、B10）**
- B7：AMG 卡 03 的「維持劑量／輸注時間／給藥排程型態」`field-row three` 改成兩列：第一列維持劑量＋輸注時間（`field-row`），第二列排程型態（`field-row stacked`）。卡 02「目標藥物／給藥策略」改為 `field-row stacked`。只搬 DOM、不改 id。
- B10：`renderAzole`／`renderAed` 中「是否達穩態」那格的 `.value` 加 class `value text`，CSS `.param-cell .value.text{font-family:var(--sans);font-size:15px;line-height:1.35;}`（R2(c) 允許）。
- DoD：截圖目視無截斷；golden 0 差異。

---

### Phase 1 — 臨床安全相關 UX

**WP1.1（D1）示範資料改為手動載入**
設計原則：**示範模式必須和現在開頁的狀態逐位元相同**（既有測試依賴它），空白模式等同「按過清空」的狀態。
1. 把四個清空函式拆成「確認」與「動作」兩層，動作層不含 `confirm`：
   - `clearAllFn` → 新增 `resetModuleVanco()`（原函式 `confirm` 之後的全部內容搬進去），`clearAllFn(){ if(!confirm(...)) return; resetModuleVanco(); }`。
   - 同法：`clearAllFnAmg`→`resetModuleAmg`、`clearAllFnAzl`→`resetModuleAzole`、`clearAllFnAed`→`resetModuleAed`。
2. 在 DOMContentLoaded 一開始（任何 init 之前）擷取每個輸入面板的 HTML 初始值：
   ```js
   const INITIAL_VALUES = {};
   function captureInitialValues(panelId){
     const snap = {};
     document.querySelectorAll('#'+panelId+' input, #'+panelId+' select, #'+panelId+' textarea').forEach(el=>{
       if(!el.id) return;
       snap[el.id] = (el.type==='checkbox'||el.type==='radio') ? {c:el.checked} : {v:el.value};
     });
     INITIAL_VALUES[panelId] = snap;
   }
   function restoreInitialValues(panelId){
     const snap = INITIAL_VALUES[panelId] || {};
     Object.entries(snap).forEach(([id,s])=>{ const el=document.getElementById(id); if(!el) return; if('c' in s) el.checked=s.c; else el.value=s.v; });
   }
   ```
   對 `inputPanel` `amgInputPanel` `azlInputPanel` `aedInputPanel` 各呼叫一次。
3. 啟動分流：
   ```js
   function shouldAutoloadDemo(){ try{ return window.__TDM_AUTOLOAD_DEMO__===true || /[?&]demo=1\b/.test(location.search); }catch(e){ return false; } }
   ```
   把 wiring 中的 `initDefaults();` 改為 `if(shouldAutoloadDemo()) loadDemo('vancomycin', true); else resetModuleVanco();`，其餘三模組同理（`initDefaultsAmg` 等）。
4. `loadDemo(module, isStartup)`：`isStartup` 為 true 時直接呼叫原 `initDefaultsX()`（完全等同現況）；使用者按鈕觸發時為 `resetModuleX(); restoreInitialValues(panelId); initDefaultsX(); setDemoFlag(module,true);`。`initDefaultsX` 本身**一行都不要改**。
5. 示範橫幅：每模組在輸入欄頂端與結果面板 `.results-head` 之後各放一個 `<div class="demo-banner" hidden>⚠ 示範病例（虛構數值，僅供熟悉操作，請勿用於臨床判讀）<button class="btn small" type="button">清空，開始新病人</button></div>`；`setDemoFlag(module, on)` 控制 `hidden`。以下時機關閉旗標：該模組 reset、載入任何病人存檔（Phase 3 WP3.3 的 `onPersisted('load')`；若 Phase 1 早於 Phase 3 施工，這個 callback 還不存在，先用既有 `loadPatientBtn` 的 click 監聽器補這一行，等 WP3.3 做完再改用 `onPersisted`）。
6. 空狀態加入口：WP1.2 的空狀態區塊中放「載入示範病例」按鈕（呼叫 `loadDemo(module,false)`）。
7. 測試相容：`tests/load_harness.js` 的 `hookStub` 字串前加 `<script>window.__TDM_AUTOLOAD_DEMO__=true;</script>`，讓既有依賴開頁示範狀態的測試（如 `test_amg_mic_integration.js`）維持原行為。`test_ui_golden.js` 不依賴示範資料，不需改。
- DoD：直接開 `index.html` → 四模組皆空白、結果區為空狀態；開 `index.html?demo=1` → 與現況相同且有橫幅；按「載入示範病例」→ 結果與 `?demo=1` 相同（時間戳記除外）；所有測試通過、golden 0 差異。

**WP1.2（D2）缺必要欄位清單**
1. 必要欄位定義（寫成常數，放在 render 函式之前）：
   ```js
   const REQUIRED_INPUTS = {
     vanco:    [{id:'age',label:'年齡'},{id:'height',label:'身高'},{id:'tbw',label:'實際體重 TBW'}],
     vancoHD:  [{id:'tbw',label:'實際體重 TBW（或填乾體重）', altId:'dryWeight'}],
     amg:      [{id:'amgAge',label:'年齡'},{id:'amgHeight',label:'身高'},{id:'amgTbw',label:'實際體重 TBW'}]
   };
   ```
   （Azole／AED 的渲染在缺值時已經以「—」與文字說明處理得當，不加 guard，只做第 3 點的欄位標記。）
2. guard 函式：數值 `parseFloat>0` 視為已填（`altId` 任一有值即可）。缺值時：替缺漏 input 加 `.is-missing`（紅框：`outline:2px solid var(--crimson-soft);border-color:var(--crimson);`），並把模組結果區設成空狀態：重用 `render()` 裡現有「`doseRowsMs.length===0` 且無計畫處方」那段清空邏輯的同一組操作（清曲線、旗標、劑量表 tbody、loadingSuggestion、monitor、prompt、自訂列三格），差別只在 `paramGrid` 內容與 badge：
   - `fitModeBadge` → `尚缺必要資料`；`setHeaderMeta(..., '尚缺必要資料')`
   - `paramGrid.innerHTML` → `.empty-state` 區塊：標題「還需要以下資料才能計算」＋可點擊清單（點擊 → `el.scrollIntoView({block:'center'}); el.focus();`，若所屬卡片為 `.collapsed` 先展開）。
   - 同時清掉 `lastVancoDerived`（原本就在函式開頭設 null）。
   欄位補齊後自動移除 `.is-missing`（guard 每次 render 都會重算）。
3. 插入點（R2(a)）：`render()` 在 `lastVancoDerived = null;` 之後、`const dialysis0 = ...` 之前加 `if(guardRequired('vanco')) return;`（guard 內部自行判斷 HD 用哪一組）；`renderAmino()` 在 `lastAmgDerived = null;` 之後加 `if(guardRequired('amg')) return;`。
4. 空狀態整體改版（B8）：`.empty-state{padding:20px;border-bottom:1px solid var(--line);grid-column:1/-1;}`；曲線 SVG 空白時 `#curveSvg:empty{display:none}`（`#amgCurveSvg` 同）。首次使用（`localStorage` 的 `tdm_ui_onboarded` 不存在）時，空狀態額外顯示三步驟：「① 左欄 01 填病人與 SCr → ② 03 填處方並產生給藥紀錄 → ③ 04 填濃度；右側即時更新」＋「載入示範病例」＋「知道了」（寫入 `tdm_ui_onboarded=1`）。
- DoD：清空後只填體重 → 右側列出「年齡、身高」，無任何 NaN；頁首不再出現「CrCl NaN」；golden 0 差異（所有情境都有完整人口學）。

**WP1.3 覆蓋前確認（S3）**
- 做法：新增 `function confirmOverwrite(containerId, what){ const n=document.querySelectorAll('#'+containerId+' .entry-row').length; return n===0 || confirm(`這會清空並重建目前 ${n} 筆${what}（包含你手動修改過的內容），確定嗎？`); }`。只改 wiring（不改被呼叫的函式本身）：
  | 按鈕 id | 容器 | what |
  |---|---|---|
  | `expandDoses` `expandDosesHD` | `doseTable` | 給藥紀錄 |
  | `amgExpandDoses` | `amgDoseTable` | 給藥紀錄 |
  | `hdGenerateSessionsBtn` | `hdSessionTable` | 透析時程 |
  | `amgHdGenerateSessionsBtn` | `amgHdSessionTable` | 透析時程 |
  例：`document.getElementById('expandDoses').addEventListener('click', ()=>{ if(confirmOverwrite('doseTable','給藥紀錄')) expandDosesFn(); });`
- DoD：表內有列時按展開會先問；`initDefaults` 直接呼叫 `expandDosesFn()` 不受影響；golden 0 差異。

**WP1.4 未納入計算的列標示（S8）**
- 新增純顯示函式 `markRowValidity(containerId, kind)`，逐列檢查與 `readDoseRows`／`readLevelRows`／`readScrRows` **完全相同**的條件（dose：時間有效＋劑量有限＋輸注 >0；level：時間有效＋濃度 >0；scr：日期有效＋數值有限），無效且「至少填了一格」的列加 `.row-invalid` 與列尾小標 `<span class="row-note">未納入計算：缺輸注時間</span>`（說明缺哪一格）。全空的列不標（剛按新增時不要立刻變紅）。`.row-note` 以 `grid-column:1/-1` 顯示在列下方。
- 呼叫點：`render()`／`renderAmino()` 開頭 `renumberDoseRows*()` 旁（R2(b)），對三種表各呼叫一次。
- DoD：刪掉某劑輸注時間 → 該列變紅並寫明原因；golden 0 差異。

**WP1.5 穩態假設的依據顯示（S5）**
- `#steadyStateHint`／`#amgSteadyStateHint` 之後各加 `<div class="hint" id="vancoSsBasis"></div>`／`amgSsBasis`。純顯示函式在勾選時寫入：「將以 {maintDose} mg q{τ}h（輸注 {inf} 分）往前補入虛擬劑次（取自上方處方欄位）」；若給藥表時間最早的一列劑量或輸注時間與處方欄位不同，改用 `.flag-item.warn` 樣式寫明「給藥表第一劑為 X mg／Y 分，與處方欄位不同；虛擬劑次依處方欄位」。未勾選時清空。呼叫點同 WP1.4。
- DoD：純顯示，golden 0 差異。

**WP1.6 標籤誠實化（S6、S7／D7）**
- `arcSuspect`、`amgArcSuspect` 的 label 後加 `<span class="hint-inline">（僅影響 CrCl 130–150 時是否多一則提示，不改變任何計算）</span>`。
- （D7）`#targetAuc` 的 label「目標 AUC₂₄/MIC」→「目標 AUC₂₄（mg·h/L）」；其下加 `<div class="hint" id="targetAucReadout"></div>`，input 事件即時寫「對應 AUC/MIC ≈ {targetAuc/mic 取整}（MIC 假設 {mic}）」。**不改 id、不改計算。**
- DoD：golden 0 差異。

---

### Phase 3 — 版面骨架＋頁首病人/紀錄系統（TPN 式，D4/D8 已擴大範圍）

> 本階段參照 Brandon 另一專案「TPN 調配試算」（`TPN調配試算.html`）的頁首病人/紀錄架構。已用 `grep`／`sed` 核對 TDM 目前 `index.html`（git `f6cca5a`）的實際 id，下列錨點與 id 均為**已驗證存在**的原文，不是示意。
>
> **關鍵既有事實（實作前務必確認未變）**：
> - 四個模組的病人存檔卡 id：`patientManagerCard`（vanco，欄位**不帶前綴**：`patientLabel` `patientAsOf` `patientSelect` `patientVisitSelect` `savePatientBtn` `updateVisitBtn` `loadPatientBtn` `deletePatientBtn` `exportPatientsBtn` `importPatientsBtn` `importFileInput` `patientMeta`）／`amgPatientManagerCard`／`azlPatientManagerCard`／`aedPatientManagerCard`（AMG/Azole/AED 三者欄位**皆帶前綴**，例如 `amgPatientLabel`、`azlSavePatientBtn`，命名規則一致，逐一 grep 確認即可）。**vanco 沒有前綴是既有事實，不要「順手」幫它補前綴**（R3：不改 id）。
> - 存檔邏輯全部集中在共用工廠 `function makeVersionedPatientStore(cfg){...}`（約 2528 行起），每模組各呼叫一次（例：`const vancoStore = makeVersionedPatientStore({key:'vanco_tdm_patients_v2', ..., labelId:'patientLabel', patientSelectId:'patientSelect', ...})`，約 2733 行）。回傳物件含 `refreshPatientSelect` `refreshVisitSelect` `saveAsNewVisit` `updateCurrentVisit` `loadSelected` `deleteSelectedPatient` `exportAll` `importMerge` `clearCurrent` `getSelectedPatient` `getList`。**這個工廠函式不在 R1 清單內**（它是存檔 UI 基礎設施，不是計算函式），可以擴充新方法，但既有方法的既有行為與回傳值不可變。
> - vanco 模組已經有一個「歷程趨勢（跨收案）」圖表（`vancoTrendPicker` / `vancoTrendSvg`，函式 `renderVancoTrend` / `buildVancoTrendSeries` / `drawTrendChart`），透過 `cfg.onChanged` 掛在 `refreshVisitSelect` 之後觸發。**這個功能本次不動**，只是提醒：WP3.2 搬動 `patientSelect`／`patientVisitSelect` 的 DOM 位置時，`onChanged` 的觸發時機與 `getSelectedPatient()`（讀 `patientSelectId` 的值）完全不受影響，因為兩者都只認 id，不認 DOM 位置。
> - 頁首 `<header class="top">` 目前在所有 4 個模組**共用**（不在 `.drug-module` 內），內含 `#appTitle` `#appEyebrow` `#appSubtitle` `#drugSwitch`（4 顆 `.drug-switch-btn`）`#headerMeta` `#clearAllBtn`，由 `showDrugModule(name)`（約 7187 行）換字。header 目前**不是** sticky（一般文件流）。
> - `initCollapsibleCards()`（約 2434 行）的 `panels` 陣列只掃 `#inputPanel` `#amgInputPanel` `#azlInputPanel` 三者的直接 `.card` 子元素（`#aedInputPanel` 遺漏是既有 bug B4，WP2.4 已處理）。WP3.2 把 `patientManagerCard` 系列搬出 `.stack` 之後，它自然不再被這段收合邏輯處理，不需要額外排除。

**WP3.1（D3）結果面板 sticky＋左欄加寬＋欄位對齊（W1，範圍已擴大）**
```css
main.grid{grid-template-columns:minmax(400px,480px) minmax(0,1fr);}
@media (min-width:981px){
  .drug-module.active > main.grid > .panel{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow-y:auto;overscroll-behavior:contain;}
}
@media print{ .panel{position:static !important;max-height:none !important;overflow:visible !important;} }
/* 欄位對齊（Brandon 追加）：同一張卡內多個 .field 常因 label 長度不同、有無換行而底部輸入框沒對齊。
   統一給 label 一個最小高度（約可容納兩行 12px 字），讓同一 field-row 內的 input 起始位置一致。 */
.field label{display:block;min-height:2.6em;line-height:1.3;}
.field-row{align-items:end;}
```
- 左欄寬度由 `minmax(360px,440px)` 加寬為 `minmax(400px,480px)`（Brandon 反映原提案太窄、資料仍堆很長）。
- 這段必須放在 WP2.1 搬過去的 980 media **之前**（手機維持單欄、不 sticky）。
- **不要改動 grid 的欄數或 DOM 結構**（避免重演結果面板被擠到頁尾的事故）。
- 對齊修正只加 CSS（`min-height`／`align-items`），不改任何 HTML 結構或 id。如果加寬到 480px 後仍有特定卡片（例如卡 03 三欄式 `field-row three`）欄位互相打架，個別卡片可以在該卡的 CSS 選擇器內覆寫欄寬比例，但**不可**把 `field-row three` 整體改成非三欄（R6 之外的既有排版慣例，改了要在回報中特別標出讓 Brandon 看截圖確認）。
- 驗證：`ui_layout_check.py` 的 L2 必須通過；另在 Playwright 內 `hover` 曲線 SVG 中央，確認十字準線數值標籤仍出現（`wireCrosshair` 在捲動容器內的座標換算）；在結果面板內捲到 D 區，按「複製 Prompt」仍可用。
- DoD：捲到左欄 04 濃度卡時，右側曲線仍在視窗內（截圖 `desk_vancomycin` 捲動 1500 px 後）；同一張卡內三個以上 `.field` 並排時，其 input 上緣目視對齊（截圖對比修正前後）。

**WP3.2（D4）頁首病人/紀錄列（參照 TPN 架構，只搬位置＋外觀，不改行為）**
目的：把四個 `#*PatientManagerCard` 從輸入欄最上方搬到「藥物切換列」正下方的一條常駐窄列，讓病人存檔／載入不必捲到最上面。**這一包只做搬家與重新排版，所有既有 id、函式呼叫、`confirm()` 文案都原封不動**——行為變化留到 WP3.3。
1. 在每個 `<div id="drug-{module}" class="drug-module">` 開頭、`<main class="grid">` **之前**，新增一個容器（例如 vanco：`<div class="pm-bar" id="pmBarVanco">…</div>`，其餘模組同法 `pmBarAmg` `pmBarAzole` `pmBarAed`）。把該模組 `#*PatientManagerCard` 內的既有節點**原樣搬入**（不新建 input/button/select，只搬 DOM 節點），排成一列：
   ```html
   <div class="pm-bar" id="pmBarVanco">
     <div class="pm-field"><label for="patientLabel">病歷號</label><input type="text" id="patientLabel" placeholder=""></div>
     <div class="pm-field"><label for="patientSelect">已存病人</label><select id="patientSelect">…原 option 原樣搬入…</select></div>
     <div class="pm-field"><label for="patientVisitSelect">收案版本</label><select id="patientVisitSelect">…原樣搬入…</select></div>
     <button class="btn small" id="loadPatientBtn" type="button">載入</button>
     <button class="btn primary small" id="savePatientBtn" type="button">存為新收案</button>
     <button class="btn small" id="updateVisitBtn" type="button" disabled>覆寫目前這筆收案</button>
     <details class="pm-more">
       <summary title="評估時點、備份、刪除">更多</summary>
       <div class="pm-more-body">
         <div class="pm-field"><label for="patientAsOf">評估時點（留空自動帶最相關日期）</label><input type="datetime-local" id="patientAsOf"></div>
         <div class="btn-row">
           <button class="btn small" id="exportPatientsBtn" type="button">匯出全部（JSON 備份）</button>
           <button class="btn small" id="importPatientsBtn" type="button">匯入 JSON</button>
           <button class="btn small" id="deletePatientBtn" type="button">刪除所選病人</button>
         </div>
         <div class="hint">（原卡片開頭那段說明文字，逐字原樣搬入，只套用附錄 C 的既定替換：刪掉「未來將用於趨勢圖」等已過時措辭）</div>
       </div>
     </details>
     <div class="hint" id="patientMeta"></div>
   </div>
   ```
   `importFileInput` 一併搬入（保持 `display:none`，位置不影響功能）。
2. CSS：
   ```css
   .pm-bar{display:flex;flex-wrap:wrap;align-items:end;gap:8px 10px;padding:10px 14px;margin:0 0 16px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);}
   .pm-bar .pm-field{display:flex;flex-direction:column;gap:2px;font-size:12px;color:var(--ink-soft);min-width:0;}
   .pm-bar .pm-field select, .pm-bar .pm-field input{font-size:13px;padding:6px 8px;min-width:0;}
   .pm-bar #patientLabel{width:120px;}
   .pm-bar #patientSelect, .pm-bar #patientVisitSelect{max-width:220px;}
   .pm-bar .pm-more{margin-left:auto;position:relative;}
   .pm-bar .pm-more-body{position:absolute;right:0;top:100%;z-index:15;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:12px;min-width:280px;box-shadow:0 4px 14px rgba(0,0,0,.08);}
   .pm-bar #patientMeta{flex-basis:100%;order:99;margin:2px 0 0;min-height:14px;}
   @media (max-width:640px){ .pm-bar{gap:6px;} .pm-bar .pm-field{flex:1 1 100%;} }
   ```
3. `patientManagerCard`（及其餘三者）這個外層 `<div class="card" id="...">` 容器本身**留空殼即可刪除**——但因為 R3 只保護「元素」不被改名/改型別，一個**已經沒有子元素、也沒有 JS 用其 id 讀值**的空 `<div>` 若直接整段刪除，不算違反 R3（R3 保護的是「輸入/顯示用途」的元素，這個卡片容器本身沒有任何 `getElementById('patientManagerCard')` 呼叫——先 `grep -n "getElementById('patientManagerCard')"` 之類確認四個都是 0 命中，確認後才可以刪除這個空殼 `<div class="card">`）。
4. 版面：`.pm-bar` 放在 `main.grid` 之前，屬於 `.drug-module` 內、`header.top` 之外，尚未做 sticky（sticky 留給 WP3.4 跟 `header.top` 一起做，避免這一包同時處理「搬家」和「固定定位」兩件事，出問題時不好回滾）。
- DoD：四個模組的病人存檔功能（存/讀/刪/匯出/匯入）手動各走一次，行為與搬家前完全一致；vanco 的歷程趨勢圖仍正常繪出；所有既有測試通過；`test_ui_golden.js` 0 差異；`grep -n "PatientManagerCard" index.html` 只在（若保留殼）自我一致的位置出現，不再有任何 JS 讀取殘留殼的 id。

**WP3.3（D4）Word 式未儲存狀態＋離開前確認（取代原 WP3.4，改用三選一 modal 而非單純瀏覽器 `confirm`）**
參照 TPN 的 `isDirty`／`lastSavedSnapshot`／`guardUnsaved` 模式，但簡化成不需要「目前開著哪個檔案」的完整 Word 模型（TDM 的既有存檔模型已經是「存為新版本」而非覆寫，語意比 TPN 單純），只做「有沒有還沒存的變更」與「切走前先問」兩件事：
1. `makeVersionedPatientStore(cfg)` 新增選用 callback：`cfg.onPersisted(kind)`——在 `saveAsNewVisit`（`if(!saveList(list)) return;` 之後）、`updateCurrentVisit`（成功寫入之後）、`loadSelected`（`applyState` 完成之後）三處呼叫 `if(cfg.onPersisted) cfg.onPersisted('save'|'update'|'load')`。**這是新增的可選 callback，不改動任何既有呼叫者的行為**（四個 `makeVersionedPatientStore({...})` 呼叫點不加 `onPersisted` 也完全照舊運作）。
2. 每模組維護 `uiDirty[module]`（模組層級旗標，不是逐欄位）：對輸入面板（`inputPanel`／`amgInputPanel`／`azlInputPanel`／`aedInputPanel`，**不含**新的 `pm-bar`，因為病人選單本身的操作不該把自己標成「未存」）掛**委派**監聽 `panel.addEventListener('input', markDirty)`、`panel.addEventListener('change', markDirty)`（涵蓋新增/刪除列按鈕與核取方塊）。`onPersisted` 觸發與模組 reset 時清除該模組旗標。
3. 顯示：`savePatientBtn` 等旁加 `<span class="pm-dirty-dot" id="vancoDirtyDot" hidden>●</span>`（四模組同法命名 `amgDirtyDot`／`azlDirtyDot`／`aedDirtyDot`，新 id，不與既有衝突），`markDirty`／`onPersisted` 切換其 `hidden`；`title` 同步「有尚未儲存的變更」／「目前內容與已存檔一致」。
4. **guardUnsaved 三選一小視窗**（取代單純 `window.confirm`，因為需要「存檔後繼續／不存直接繼續／取消」三個結果，`confirm()` 只有兩個）：
   ```html
   <!-- 每模組各一個，放在該模組 .pm-bar 內或緊接其後 -->
   <div class="guard-modal hide" id="vancoGuardModal" role="alertdialog" aria-modal="true">
     <div class="guard-modal-box">
       <p id="vancoGuardMsg"></p>
       <div class="btn-row">
         <button class="btn small" id="vancoGuardCancel" type="button">取消</button>
         <button class="btn small" id="vancoGuardDiscard" type="button">不儲存，繼續</button>
         <button class="btn primary small" id="vancoGuardSave" type="button">先儲存再繼續</button>
       </div>
     </div>
   </div>
   ```
   `.guard-modal{position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:50;} .guard-modal.hide{display:none;} .guard-modal-box{background:var(--card);border-radius:var(--radius);padding:18px 20px;max-width:360px;}`
   通用函式 `guardUnsaved(module, actionLabel, proceed)`：`uiDirty[module]` 為 false 時直接 `proceed()`；為 true 時開對應模組的 modal，訊息「有尚未儲存的變更，要在『${actionLabel}』前先儲存嗎？」——「先儲存再繼續」呼叫該模組 store 的 `saveAsNewVisit()`（若病歷號欄位為空，沿用其既有 `alert('請先輸入病歷號再儲存。')` 擋下，不關閉 modal）再 `proceed()`；「不儲存，繼續」直接 `proceed()`；「取消」什麼都不做並關閉。
5. 套用 `guardUnsaved` 的動作：`loadPatientBtn` 點擊（`actionLabel`＝「載入其他病人」，`proceed`＝目前 `loadSelected()` 內部原本就有的 `confirm('載入將覆蓋…')`——**兩者擇一即可，不要疊兩層確認**：guardUnsaved 沒有未存變更時才會直接呼叫 `proceed`，此時 `loadSelected()` 內的舊 `confirm` 可以保留當作雙重保險，或在 WP 完成後由 Brandon 決定拿掉哪一層，本包先兩層並存、下個 Phase 視回饋精簡）；四個 `.drug-switch-btn` 的 `click`（`actionLabel`＝「切換到 ${目標模組名}」，`proceed`＝原本 `showDrugModule(name)` 的呼叫——只在**目前模組**的 `uiDirty` 為 true 時攔截，不影響目標模組）。**R8 提醒**：`.drug-switch-btn` 目前的 click wiring 就在 `load_harness.js` 的 `ANCHOR` 字串範圍內（`document.querySelectorAll('.drug-switch-btn[data-drug]').forEach(...)`）；改成先呼叫 `guardUnsaved` 再呼叫 `showDrugModule` 時，**這段 forEach 本身的結構與其後的 `})();` 收尾逐字不動**，只改 forEach 內部 callback 的內容，並在動手前後都跑一次 `tests/test_*.js` 確認 `load_harness.js` 仍抓得到 anchor（不會出現「找不到 ANCHOR」的載入錯誤）。
6. `window.addEventListener('beforeunload', e=>{ if(Object.values(uiDirty).some(Boolean)){ e.preventDefault(); e.returnValue=''; } });`
- DoD：改任一欄 → 該模組 dirty dot 出現；存檔後消失；有未存資料時按「載入」或切換藥物模組 → 跳三選一視窗，三個按鈕行為分別驗證一次；重新整理分頁時瀏覽器原生提示出現；所有測試通過、golden 0 差異（`__alerts`／新 modal 不影響 golden 的既有斷言範圍，因為 11 個 golden 情境不觸發 dirty 狀態下的切換動作）。

**WP3.4（D8）頁首＋藥物切換 sticky 化、模組內「計算／病人資料」子分頁殼**
1. `header.top` 改 `position:sticky;top:0;z-index:30;background:var(--paper);`（與 `body` 同底色，捲動時遮住其下內容）；`.pm-bar` 跟著改 `position:sticky;top:<header.top 實際高度，實作時用瀏覽器量測，抓最接近的整數 px>;z-index:25;`（兩者一起釘在頂端，`.pm-bar` 貼在 `header.top` 正下方）。手機（`max-width:640px`）維持非 sticky（沿用 WP2.1 已搬到最後的 640 media，加入取消 sticky 的覆寫，避免手機小螢幕被頭尾吃掉太多可視高度）。
2. `#drugSwitch` 加 `role="tablist"`，每顆 `.drug-switch-btn` 加 `role="tab"` 與 `aria-selected`（在 `showDrugModule` 內同步——這是 UI 函式，允許修改）。樣式改成分頁觀感：高度 34 px、字 13 px、選中者底線 3 px `var(--trace)`，而不是實心按鈕。
3. `#appTitle` 固定為「TDM 工作台」，模組名稱改由 `#appSubtitle` 前綴呈現（修改 `*_HEADER` 物件的 `title`、`docTitle` 字串：`docTitle` 維持模組名以利瀏覽器分頁辨識）。**`footer` 字串不動。**
4. `#clearAllBtn` 文字改「清空此頁（開始新病人）」，`title` 補「已儲存的病人存檔不受影響」。（vanco／AMG 的 `confirm` 文字寫「清除所有已輸入的病人…資料…無法復原」容易被誤解為會刪存檔，改為「確定要清空目前畫面上的輸入嗎？已儲存的病人存檔不會受影響。」——與 azole／AED 用語一致。）
5. 在每個 `.drug-module` 內、`.pm-bar` 之後、`main.grid` 之前，新增一組模組內子分頁殼（先只做切換骨架，內容留給 WP3.5）：
   ```html
   <div class="mod-tabs" role="tablist" aria-label="模組內分頁">
     <button class="mod-tab active" role="tab" aria-selected="true" data-modtab="calc" type="button">計算</button>
     <button class="mod-tab" role="tab" aria-selected="false" data-modtab="explorer" type="button">病人資料</button>
   </div>
   ```
   `main.grid` 加 `data-modtab-panel="calc"`；WP3.5 建立的 explorer 區塊加 `data-modtab-panel="explorer"` 且預設 `hidden`。通用函式 `switchModTab(moduleRoot, name)`：切換 `.mod-tab` 的 `active`/`aria-selected`，並用 `hidden` 屬性切換兩個 `[data-modtab-panel]`。**只做顯示切換，不觸發任何計算重跑**（切回「計算」分頁時畫面應與離開時完全一樣，不 reset）。
- DoD：捲動任一模組時，頁首＋病人列固定在頂端、內容從其下方捲過；四個模組切換分頁按鈕的 `aria-selected` 正確；`test_aed_integration*.js` 仍能以 `#clearAllBtn` 觸發清空；截圖目視（含捲動後的 sticky 效果）。

**WP3.5（D4）「病人資料」子分頁內容：病人總管＋批次刪除**
參照 TPN 的「病人資料」頁籤，但**唯讀彙整＋批次刪除**，不做批次匯出/合併等更複雜操作（那些既有的「匯出全部」「匯入 JSON」已經在 WP3.2 的 `.pm-more` 裡）。
1. `makeVersionedPatientStore` 新增方法 `deletePatients(ids)`（陣列版的 `deleteSelectedPatient`，共用同一個 `loadList`／`saveList`；若刪到目前 `currentPatientId` 則同步清空，行為比照既有 `deleteSelectedPatient`）。**新增方法，不改既有方法。**
2. 每模組的 explorer 區塊（`data-modtab-panel="explorer"`，例如 `<section class="explorer" id="vancoExplorer" hidden>`）：
   ```html
   <div class="explorer-toolbar">
     <label><input type="checkbox" id="vancoExplorerSelectAll"> 全選</label>
     <span id="vancoExplorerCount">0 位病人</span>
     <button class="btn small ghost-danger" id="vancoExplorerDeleteBtn" disabled type="button">刪除選取的病人</button>
   </div>
   <div class="explorer-list" id="vancoExplorerList"></div>
   ```
   純顯示函式 `renderExplorer(store, listElId)`：讀 `store.getList()`（唯讀，不動任何存檔），每位病人一列：病歷號、收案筆數、最新一筆評估時點、checkbox；點列（非 checkbox）＝在 `.pm-bar` 的 `patientSelect`／`patientVisitSelect` 選中該病人最新一筆並呼叫 `switchModTab(moduleRoot,'calc')` 但**不自動載入**（避免蓋掉使用者正在編輯、未存的畫面——載入仍需使用者按「載入」，會走 WP3.3 的 `guardUnsaved`）。
3. 批次刪除：勾選變動時更新 `#*ExplorerDeleteBtn` 的 `disabled` 與 `#*ExplorerCount`；按下後彈一個確認 modal（沿用 WP3.3 `.guard-modal` 的樣式類別、內容改為「確定刪除以下 N 位病人的全部收案紀錄嗎？此動作無法復原：<ul>病歷號清單</ul>」，兩個按鈕「取消」／「確定刪除」），確認後呼叫 `store.deletePatients(勾選的 ids)`，重新 `renderExplorer` 與 `store.refreshPatientSelect()`。
4. 呼叫時機：`switchModTab` 切到 `explorer` 時呼叫一次 `renderExplorer`（不需要即時監聽存檔事件，因為使用者只有在這個分頁操作時才需要最新列表；若嫌不夠即時，也可以在 WP3.3 的 `onPersisted` 內附帶呼叫，屬於錦上添花，非必須）。
- DoD：病人資料分頁列出目前所有已存病人與筆數；勾 2 位、按刪除、確認 → 兩位皆消失且 `patientSelect` 下拉同步更新；未勾任何人時刪除鈕為 disabled；所有測試通過、golden 0 差異（explorer 是唯讀彙整＋新增刪除路徑，不影響任何 golden 情境使用的 11 個 render 快照）。

**WP3.6 新增：擴充自動化測試覆蓋存檔/切換/未存警告流程**
- 原因：`test_ui_golden.js` 的 11 個情境都在「填完資料、展開劑量」後才快照，不會走到 WP3.2–3.5 新增的 pm-bar／guardUnsaved／explorer 路徑；純 CSS 的 `ui_layout_check.py` 也不驗證互動邏輯。這包不是可選項，是 Phase 3 的 DoD 之一。
- 新增 `tests/test_patient_manager_flow.js`（仿現有測試風格，用 `load_harness.js` 載入 DOM）：對 vanco 模組跑一次完整流程並斷言——(1) 空白時 `savePatientBtn` 存檔後 `patientSelect` 出現一筆、dirty dot 消失；(2) 改一欄輸入 → dirty dot 出現；(3) 這時點「載入」→ 跳出 `vancoGuardModal`（非 hidden）；點「不儲存，繼續」→ modal 關閉且原本的 `loadSelected` 邏輯照跑；(4) 병人資料分頁勾選剛存的病人、按刪除、確認 → `patientSelect` 選單回到只有「（新病人／未選擇）」。其餘三模組至少各跑一次「存檔→出現在 explorer 列表→刪除」的簡化版（不必重複三選一 modal 的三種分支）。
- DoD：新測試全部通過，且與既有 8＋1（golden）支測試一起跑仍全數通過；在回報中列出這支新測試涵蓋到哪些 DoD 項目，哪些仍需 Brandon 手動點過一次確認（例如捲動 sticky 的視覺效果、explorer 版面截圖）。

---

### Phase 4 — 卡片 03 與資料輸入流暢度

**WP4.1 卡片 03 內部重排（W3）——Vanco 與 AMG**
不改卡片、不改 id，只在卡內分段：
```
03 給藥處方與紀錄
 ├ [一句話說明] 先填目前處方 → 產生給藥紀錄 → 再手動修正實際延遲／漏給。 ⓘ詳細說明（原長說明，逐字）
 ├ 小標「處方」        maintDose｜maintInterval｜maintInf（AMG：maintDose｜maintInf，下一列 scheduleType，再下 interval 或 TIW 區塊）
 ├ 小標「產生範圍」    therapyStart｜expandTo（兩欄同列，expandTo 旁有「現在」鈕，見 WP4.4）
 ├ <details class="adv" id="vancoAdv"> summary：「進階：首劑 loading／已達穩態假設」＋動態摘要
 │     useLoading＋loadingFields、assumeSteadyState＋steadyStateHint＋vancoSsBasis
 ├ [依上述處方自動展開給藥紀錄]（主按鈕）＋其下原說明（收進 ⓘ）
 ├ 小標「實際給藥紀錄（計算只採用這張表）」 表頭＋doseTable＋[+ 新增一劑]
 └ <details class="batch-ops"> summary「批次操作」：移除此時間之前的紀錄（pruneBeforeInput＋pruneBeforeBtn）
```
- **進階摘要（安全要求）**：`details` 收起時，summary 必須顯示目前啟用的進階選項，例如「進階：✓ loading 2000 mg／120 分　✓ 已達穩態假設」。任一核取方塊為勾選狀態時，`details` 自動 `open=true`（但使用者手動打開時不要自動關）。以純顯示函式 `syncAdvSummary(prefix)` 實作，呼叫點：這兩個核取方塊的 change、以及 `render()` 開頭（R2(b)，因為 `applyState` 載入存檔時也需同步）。
- HD 區塊（`#hdDoseFields`）：三個小標依序「① 透析排程（星期／時段／時長）→ 產生透析時程」「② 透析時程（可逐筆修改或刪除）」「③ 透析後劑量 → 依透析時程展開給藥紀錄」。星期勾選改為一排 7 個等寬的切換鈕樣式（仍是原 checkbox，外觀用 CSS：`.weekday-group{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}`，label 做成方塊，checked 時底色 `var(--trace-soft)`）。
- AMG TIW／HD 區塊同理（沿用 `amgTiwDay*`）。
- DoD：Vanco 非 HD 卡 03（7 劑示範）高度 ≤ 800 px；HD 卡 03 ≤ 950 px；golden 0 差異。

**WP4.2 濃度列相對時間（W11）**
- 純顯示函式 `annotateLevelRows(levelContainerId, doseContainerId)`：
  - 劑次基準**必須與 `renumberDoseRows` 相同**：取 dose 容器內所有「時間有效」的列、依時間排序、1 起編號（這樣畫面上的「第 N 劑」徽章和說明對得上）。
  - 對每筆濃度列（時間有效者），找最後一個開始時間 ≤ 抽血時間的劑 i：
    - 顯示「第 i 劑開始後 +X.X h」；若該劑輸注時間有效，再加「（輸注結束後 +Y.Y h）」或「（輸注中）」。
    - 若下一劑存在且距抽血 ≤ 2 h，前置「第 i+1 劑前 Z 分｜」。
    - 若抽血早於第 1 劑：「第 1 劑前 X.X h」。
  - 寫入每列的 `<span class="level-timing">`（放在列內、`grid-column:1/-1`、11px、`var(--ink-soft)`）。**這個 span 在 `add*LevelRow` 模板中新增**，class 不可叫 `level-date`／`level-val`。
- 呼叫點：`render()`／`renderAmino()` 開頭（R2(b)）。
- DoD：以 `?demo=1` 開 vanco 示範病例（7 劑、q12h、輸注 60 分），兩筆濃度應分別顯示「第 7 劑前 5 分｜第 6 劑開始後 +11.9 h（輸注結束後 +10.9 h）」與「第 6 劑開始後 +3.5 h（輸注結束後 +2.5 h）」；golden 0 差異。

**WP4.3（D10）新增列預帶值與鍵盤連續輸入（W12）**
- 「+ 新增一劑」（`addDoseRow` 與 `addDoseRowAmg` 的**按鈕 wiring**，不改兩個函式簽名）：
  - 取 dose 容器內時間最晚的有效列 L。τ 來源：固定間隔模式用 `maintInterval`／`amgMaintInterval`（>0）；否則（HD、TIW、或欄位空白）用最晚兩列的時間差；都沒有 → 不預帶。
  - 預帶：時間＝L＋τ、劑量與輸注＝L 的值。新列加 class `row-autofill`（淡琥珀底 `#FBF3E4`＋列尾 `.row-note`「自動帶入，請確認」）；該列任一 input 觸發 `input` 事件即移除 class 與 note。
  - 濃度列、SCr 列**不預帶數值**。SCr 新列日期可預帶今天並同樣標 `row-autofill`。
- 鍵盤：在 dose／level／scr 容器掛委派 `keydown`，當焦點在「最後一列的最後一個 input」且按 Enter → 觸發對應新增按鈕 `.click()`，並把焦點移到新列第一個 input。
- DoD：連續按「+ 新增一劑」三次產生等間隔三劑；golden 0 差異（golden 以程式填值，會先 `input` 事件覆蓋預帶值——若 golden 因預帶出現差異，代表預帶值沒被正確覆蓋，須修正而非更新基準）。

**WP4.4「現在」快捷鈕（W14）**
- 通用函式 `attachNowButton(inputId)`：在 input 後插入 `<button class="btn small now-btn" type="button">現在</button>`，點擊寫入目前時間（分鐘取整到 5 的倍數；`datetime-local` 用 `toLocalInputValue`，`date` 用 `toLocalDateValue`），並 dispatch `input`＋`change`。
- 套用：`expandTo` `amgExpandTo` `azlTroughDate` `aedLevelDrawAt` `aedLevelLastDoseAt` `azlLabDate` `aedLabDate`。
- 版面：input 與按鈕包成 `.with-now{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px}`——由 JS 建立包裝元素時注意 R7（不要把 h2 包進去）。

**WP4.5 label 關聯（W15 後半）**
- 初始化時（放在 `initCollapsibleCards()` 呼叫之前）：對所有 `.field > label` 沒有 `for` 者，若同一 `.field` 內第一個 `input/select/textarea` 有 id，設 `label.htmlFor = 該 id`。

---

### Phase 5 — 文案、說明收合、一致性

**WP5.1（D6）長說明收合（W4）**
- 範圍：**沒有 id** 且純文字長度 > 120 字的靜態 `<p class="hint">`（約 15 段；用下方腳本列出）。**有 id 的 hint 不動**（JS 會改它的 display 或內容）。
  ```bash
  python3 - <<'EOF'
  import re; h=open('index.html',encoding='utf-8').read()
  body=h[h.index('<body>'):h.index('<script>\n// ====')]
  for m in re.finditer(r'<p class="hint"(?![^>]*\bid=)[^>]*>(.*?)</p>', body, re.S):
      t=re.sub('<[^>]+>','',m.group(1))
      if len(t)>120: print(len(t), t[:40])
  EOF
  ```
- 轉換：`<p class="hint">A。B。C。</p>` → `<div class="hint">A。<details class="hint-more"><summary>詳細說明</summary>B。C。</details></div>`（A＝原文第一個句號為止；原文**一字不刪**，只是切開）。`p` 內不能放 `details`，所以要改成 `div`。
- CSS：`.hint-more{display:inline}` `.hint-more summary{display:inline;cursor:pointer;color:var(--trace);font-size:11.5px}` `.hint-more[open]{display:block;margin-top:4px}`。
- DoD：Vanco 左欄預設可見說明字數 < 600 字；golden 0 差異。

**WP5.2 過時與內部用語（W10）**——替換表見**附錄 C**（僅限靜態 HTML 字串，golden 0 差異）。

**WP5.3（D11）錯字與會改變輸出的文案**
- `劇量`→`劑量`（44 處）、`劇型`→`劑型`（2 處）。**`劇烈` 不可改。** 用 python 精確替換這兩個詞，不要用單字替換。
- F-2（AED 頁尾 VPA 措辭）依 Brandon 提供的文字改 `AED_HEADER.footer`。
- 這一包**預期** golden 在 AED 與 azole 監測文字出現差異。流程：跑 golden → 把 diff 全文貼給 Brandon → 確認差異只有上述字元／句子 → Brandon 核可 → `node test_ui_golden.js --update` → 另一個 commit。

**WP5.4 一致性（W5、W15 前半）**
- 結果面板標題統一為「結果」，模式差異由右側 badge 呈現（只改 `.results-head` 內 4 個 `<h2>` 的靜態文字）。**AI prompt 模板內的「本工具擬合結果（可稽核）」等字串不可改**（R1：`buildAiPrompt*`）。
- `#azlTargetDisplay` 比照 `updateAminoTargetDisplay` 顯示目前目標區間：以 `azoleIndicationList(drug)` 找出目前適應症物件，組字串「目前目標：Voriconazole 預防 → trough 0.5–5.5 µg/mL」（`hi` 為 null 時寫「≥ lo」；isavuconazole 寫「不依適應症分層，見右側說明」）。在 `azlDrug`／`azlIndication` change 與 `toggleAzoleDrugUI` 後呼叫。純顯示。
- AI Prompt 區：把「複製 Prompt」按鈕同時放一顆在該 `section-block` 的 `h3` 右側（呼叫同一個 click handler：`document.getElementById('copyPromptBtn').click()`），長 prompt 不必捲到底才能複製。

---

### Phase 6 —（D5）跨模組帶入基本資料（W7）

- 每模組人口學卡片（Vanco／AMG 卡 01、Azole／AED 卡 02）h2 之後加一列：`<div class="carry-row">從 <select class="carry-src">…其他三個模組…</select> <button class="btn small">帶入基本資料</button></div>`。
- 對照表：
  | 欄位 | Vanco | AMG | Azole | AED |
  |---|---|---|---|---|
  | 年齡 | age | amgAge | azlAge | aedAge |
  | 性別 | sex | amgSex | azlSex | aedSex |
  | 身高 | height | amgHeight | azlHeight | aedHeight |
  | 體重 | tbw | amgTbw | azlTbw | aedTbw |
  | 乾體重 | dryWeight | amgDryWeight | — | — |
  | 懷孕 | — | — | azlPregnancy | aedPregnancy |
  | SCr | scrTable 全部列 | amgScrTable 全部列 | azlScr＋azlLabDate（取最新一筆） | aedScr＋aedLabDate（取最新一筆） |
  | 透析 | dialysis | amgDialysis | — | aedDialysis（checkbox：來源為 HD/CRRT/SLED/PD 時勾） |
- 規則：只複製來源「有值」的欄位；目標欄位已有不同值時，先 `confirm` 列出將被覆蓋的欄位名稱；SCr 表複製用目標模組自己的 `add*ScrRow`；透析欄位改變後呼叫該模組既有的 `toggle*DialysisUI`（若有）；最後觸發目標模組 render。**不做持續同步、不改存檔結構。**
- 單向 SCr 轉換（Azole／AED 單值 → Vanco／AMG 表）時新增一列 `{date: labDate, val: scr}`。
- DoD：Vanco 示範病例 → AMG 帶入 → AMG 的年齡／性別／身高／體重／SCr 表與 Vanco 相同；golden 0 差異。

---

### Phase 7 —（D9）行內提示取代非破壞性 alert（W8）

- 新增 `notify(anchorEl, msg, level='warn')`：在 `anchorEl` 所在 `.btn-row`（或其父元素）之後插入／更新一個 `.inline-note` 區塊（樣式沿用 `.flag-item.warn`），8 秒後或下一次同位置操作時移除；同時 `anchorEl.focus()` 不要被搶走。
- 替換範圍：`expandDosesFn` `expandDosesFnHD` `pruneDosesBeforeFn` `generateHdSessionsFn` `expandDosesFnAmg` `pruneDosesBeforeFnAmg` 內的 `alert(...)`，以及 `makeVersionedPatientStore` 內的驗證型 `alert`（例：「請先輸入病歷號再儲存」）。這些函式是 UI 流程函式（不在 R1），可改 `alert(msg)` 為 `notify(對應按鈕, msg)`。`makeVersionedPatientStore` 以 `cfg.notify` 注入。
- **保留** 所有 `confirm(...)`（刪除、清空、載入覆蓋、展開覆蓋）與 `saveList` 失敗時的 `alert`（存檔失敗必須打斷）。
- `test_ui_golden.js` 會記錄 `__alerts`；目前所有情境皆為空陣列，替換後仍應為空。

---

## 5. 給實作模型的啟動 prompt（Brandon 直接貼）

```
你要依照 docs/UIUX_IMPL_SPEC_v1.md 翻修 index.html 的 UI/UX。先完整讀完該文件第 0–2 節與附錄，
再讀 docs/UIUX_AUDIT_v1.md 第 3 節了解每個編號的問題。開工確認清單（§0.3）D0–D11 全部 Go，
其中 D4／D8 已合併並擴大範圍為「頁首病人/紀錄系統」，Phase 3 的工作包已重寫為 WP3.1–WP3.6，
請以 §0.3 與 §4 Phase 3 開頭的「關鍵既有事實」區塊為準，不要沿用你自己對 D4/D8 的舊印象。

規則：
1. 一次只做一個工作包（WP），順序依 §3 建議；每包完成後跑 §2.2 的 DoD，全部通過才 git commit。
2. 不要整份讀 index.html；用 grep 錨點＋sed 局部讀取。
3. 任何會碰到 §1 紅線的情況、golden 出現非預期差異、或你想偏離規格時，立刻停下並回報，不要自行決定。
4. 每完成一個 Phase，停下來給我：commit 清單、測試結果摘要、ui_layout_check 截圖路徑、以及一段「使用者看到的變化」描述，等我說繼續。
從 Phase 0 開始。
```

---

## 附錄 A：已知錨點速查

| 用途 | grep 字串 |
|---|---|
| 樣式表 | `<style>`、`</style>` |
| 手機 media（要搬） | `@media (max-width:640px){` |
| hint 樣式 | `.card .hint{` |
| prompt 文字框樣式 | `textarea#aiPromptOut, textarea#amgAiPromptOut` |
| 收合初始化 | `function initCollapsibleCards(){` |
| 存檔工廠 | `function makeVersionedPatientStore(cfg){` |
| 頁首（共用，不在 `.drug-module` 內） | `<header class="top">` |
| 藥物切換列樣式 | `.drug-switch{display:flex` |
| 四個病人存檔卡（搬家前） | `id="patientManagerCard"` `id="amgPatientManagerCard"` `id="azlPatientManagerCard"` `id="aedPatientManagerCard"` |
| vanco 歷程趨勢圖（Phase 3 不動，只留意別搬壞） | `id="vancoTrendSvg"` `function renderVancoTrend(){` |
| 各模組 render | `function render(){` `function renderAmino(){` `function renderAzole(){` `function renderAed(){` |
| 空狀態（vanco） | `請先在下方「給藥處方與紀錄」填妥計畫處方` |
| 清空函式 | `function clearAllFn(){` `function clearAllFnAmg(){` `function clearAllFnAzl(){` `function clearAllFnAed(){` |
| 示範資料 | `function initDefaults(){` `function initDefaultsAmg(){` `function initDefaultsAzole(){` `function initDefaultsAed(){` |
| 模組切換 | `const DRUG_MODULE_REGISTRY` `function showDrugModule(name){` |
| wiring 插入點（R8） | `// ---------------- drug switcher wiring ----------------` |

## 附錄 B：新增 class 命名規範
新 class 一律以語意命名、不與既有 class 重名：`entry-row--*` `entry-head--*` `row-invalid` `row-autofill` `row-note` `level-timing` `empty-state` `demo-banner` `pm-bar` `pm-field` `pm-more` `pm-more-body` `pm-dirty-dot` `guard-modal` `guard-modal-box` `mod-tabs` `mod-tab` `explorer` `explorer-toolbar` `explorer-list` `ghost-danger` `adv` `batch-ops` `hint-more` `hint-inline` `weekday-group` `now-btn` `with-now` `carry-row` `carry-src` `inline-note` `is-missing`。
（`pm-card`／`pm-row`／`pm-dirty` 是舊版規格草稿用過的名稱，Phase 3 重寫後已改用 `pm-bar`／`pm-field`／`pm-dirty-dot`，若之前有筆記留著舊名請以本文件為準。）
新 id 一律加模組前綴（`vanco*` `amg*` `azl*` `aed*`）。

## 附錄 C：過時／內部用語替換表（靜態 HTML，golden 0 差異）

| 位置（grep） | 原文 | 改為 |
|---|---|---|
| vanco 病人卡說明 | `載入時可回看任一版本（未來將用於趨勢圖）。` | `載入時可回看任一版本，右側會顯示跨收案趨勢圖。` |
| azole 卡 03 說明 | `趨勢圖（多筆日期疊圖）排在核心邏輯之後實作，這裡先收最新一筆數值。` | `此處填最新一筆數值。` |
| azole 卡 04 說明 | `填得越完整，5.0 的交叉核對越準` | `填得越完整，右側「健全性檢查」的交叉核對越準` |
| AED 卡 01 說明 | `不做時間-濃度曲線擬合（phenytoin 的 MM 劑量推估與趨勢圖為後續分期，本版尚未提供）` | `不做時間-濃度曲線擬合（phenytoin 另提供 Michaelis-Menten 劑量推估、VPA 提供比例劑量估算，見右側 B 區；趨勢圖尚未提供）` ——**措辭須 Brandon 確認** |
| AED 卡 E 說明 | `趨勢圖與劇量-濃度曲線尚未提供（P3）。` | `趨勢圖與劑量-濃度曲線尚未提供。` |
| HTML 註解 | `（5.0.1）` `（5.0.2）` | 可保留（註解不顯示） |

（`劇量`／`劇型` 錯字與 AED 頁尾屬 WP5.3，會改變 golden 輸出，另行處理。）

## 附錄 D：驗收截圖清單（每個 Phase 結束時給 Brandon）
- `desk_vancomycin_fold.png`（空白開頁）＋ `?demo=1` 版本
- 桌機捲動到 04 濃度卡時的整窗截圖（證明 sticky）
- `desk_vancomycin_full.png`（HD 模式另一張）
- `phone_vancomycin_full.png`、`phone_aed_full.png`
- 缺身高時的結果區截圖
- 卡 03 進階選項收起／展開各一張
