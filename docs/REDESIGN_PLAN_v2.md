# TDM 工作台：邏輯修正＋介面改版 施工計畫書 v2（已核可，可施工）

- 建立：2026-10-19（v1 同日提案，Brandon 當日逐項核可後改寫成本版）
- 施工者：Claude Sonnet（新的 session）。本文件寫給施工者看，照做即可；每一包做完都要停下來回報。
- 分支：**`redesign`**。主檔 `master`（推到 GitHub 的 `main`，也就是 GitHub Pages 上線版）全程不動，全部完成並經 Brandon 驗收後才 merge。
- 取代：`docs/REDESIGN_PLAN_v1.md`（提案版，保留當紀錄）。`claude/UIUX_PROGRESS_v1.md` 是舊翻修（Phase 0 到 5）的紀錄，裡面寫的「下一步 Phase 6」**作廢**，Phase 6、7 已併入本計畫的 D4、D8。
- 本計畫的進度追蹤寫在 `claude/REDESIGN_PROGRESS_v1.md`（專案文件，每包完成後更新）。

---

## 0. 施工者先讀（每個新 session 都照做）

### 0.1 起手式

1. 讀本文件，再讀 `claude/REDESIGN_PROGRESS_v1.md` 看做到哪一包。
2. 用電腦連線工具（device bridge）進 repo：`C:\Users\Brandon Chen\OneDrive - 臺大醫院\AI測試區\TDM`（device_bash 裡是 `$HOME/mnt/TDM`）。
3. 確認分支與狀態：
   ```bash
   cd "$HOME/mnt/TDM"
   find .git -maxdepth 2 -name '*.lock' -delete; find .git/objects -name 'tmp_obj_*' -delete
   git checkout redesign && git status --short && git log --oneline -3
   ```
   刪 lock 檔需要刪除權限：失敗時呼叫 `device_request_delete_permission`（整個 TDM 資料夾），中途失效就再要一次，不算異常。
4. 本機裝 skill（第一次或 `.claude/skills/` 不見時）：`bash tools/setup_env.sh`。
5. 雲端跑完整檢查（本機 device_bash 每次只有 120 秒，跑不完全部測試）：
   ```bash
   # 本機：打包（排除 node_modules、截圖、PDF）
   cd "$HOME/mnt/TDM" && tar --exclude=tests/node_modules --exclude=tests/shots --exclude='references/*.pdf' --exclude='Claude outputs' -czf "Claude outputs/snap.tgz" .
   # 用 device_stage_files 把 Claude outputs/snap.tgz 拿到雲端，解開後：
   bash tools/setup_env.sh && bash tools/run_checks.sh
   # 用完回本機刪 Claude outputs/snap.tgz
   ```
   本機只跑單支測試：`cd tests && timeout 110 node test_xxx.js`。

### 0.2 每一包的固定流程

1. 先寫（或改）會抓到問題的測試，確認它**現在失敗**。
2. 改程式。改 `index.html` 用 `grep -n` 找位置、`sed -n` 讀局部，**不要整份讀**；修改用 python 精確字串替換並斷言出現次數。
3. 跑 `tools/run_checks.sh`：全部測試通過；`test_ui_golden.js` 只能出現本包「預期 golden 差異」欄列出的差異。
4. 有 golden 差異時：先用 `node tests/test_ui_golden.js` 的輸出列出每一個差異的欄位與前後文字，**停下來給 Brandon 看**，他核可後才跑 `--update`，基準更新單獨一個 commit。
5. commit（訊息格式 `REDESIGN <包號>: <一句話>`，結尾加 Co-Authored-By 與 Claude-Session 兩行），更新 `claude/REDESIGN_PROGRESS_v1.md`。
6. 回報 Brandon（用 plain-talk：結論、畫面上看得到的改變、他要做什麼、風險），**等他說「繼續」才做下一包**。

### 0.3 立刻停下來回報的情況

- golden 出現本包沒列出的差異。
- 規格字面做不到，或做了會碰到不在本包允許範圍的紅線。
- 任何臨床數值（閾值、族群參數、目標值）找不到本文件列出的出處。不准自己補數字。
- 測試要改斷言才能過，而本包沒說要改。

### 0.4 紅線 v2（Brandon 2026-10-19 核可）

| 編號 | 規則 |
|---|---|
| R1 | 計算函式與常數表不可改內部邏輯：`predictConc` `primePriorDoses` `nelderMead` `fitCLV` `checkFitPlausibility` `checkLevelSpacing` `integrateTrapz` `roundDoseTo250` `inferInfusionMinutes` `regimenTag*` `computeCandidateAmino` `roundDoseAmino*` `getAminoOddCrClSuggestion` `checkCmaxMicEfficacy` `ssConcAtT1` `odaVancoPopParams` `twoCompartmentSS` `findCurrentHDWindow` `buildHdSessionsFromPattern`、azole／AED 規則函式、`buildAiPrompt*`、`cockcroftGault` `ibwDevine` `weightForCG`、常數 `AMINO_*` `AZOLE_*` `AED_*` `GENT_*`。**例外：L 系列各包明列的修改已核可**，只能照本文件寫的改，不能順手改別的 |
| R2 | render 函式（`render` `renderVancoHD` `renderProspective` `renderAmino` `renderProspectiveAmg` `renderAzole` `renderAed`）只允許：開頭加 guard、開頭加純顯示 helper、輸出字串加 class。L 系列明列的文字修改例外 |
| R3 | 既有 element id 不可改名、刪除、改型別 |
| R4 | 表頭、說明列、新元素不可用 `entry-row` class，也不可放進 entry-list 容器 |
| R5 | `#indication` `#severity` `#amgSeverity` `#azlSeverity` 無 value 的 option 文字就是儲存值，不可改 |
| R6（改） | 段落編號 01 到 06 與段落順序不變；卡片外框可以拿掉 |
| R7（改） | 收合功能改成「段落收合」時，`initCollapsibleCards()` 一起改寫，該包單獨驗收；改寫前維持「段落第一個子元素是 h2」 |
| R8 | `load_harness.js` 的 ANCHOR 必須與 `index.html` 逐字吻合；新 wiring 插在 `// ---------------- drug switcher wiring ----------------` 之前 |
| R9 | 單一 `index.html`、無外部函式庫、無 build、離線可用。D2 起連 Google Fonts 也拿掉 |
| R10 | 不可新增 `tdm_ui_` 以外前綴的 localStorage key；4 個病人紀錄 key 與資料結構不可動 |

新 class 命名：沿用舊的 Appendix B 詞彙；D 系列新增的 class 一律用前綴 `ws-`（左區工作底稿）、`rp-`（右區判讀報告）、`tl-`（時間軸）、`ui-`（共用元件），並記進 `DESIGN.md`。新 id 用模組前綴 `vanco` `amg` `azl` `aed`；跨模組的全域元件用 `tdm` 前綴。

---

## 1. Brandon 的決定（2026-10-19）

| # | 問題 | 決定 |
|---|---|---|
| 1 | 先修邏輯再改介面 | 是 |
| 2 | Azole 目標來源 | **院內 protocol 為準，UpToDate 為輔**（UpToDate 數值留在畫面上當參考） |
| 3 | Vd 體重基準 | 照建議：AMG 用體重選擇後的體重（IBW／AdjBW）；vancomycin 維持 TBW，極度肥胖改 0.52 L/kg（見 L-E2） |
| 4 | Vancomycin 輸注規則 | **每 500 mg 至少輸注 1 小時** |
| 5 | ODD peak 定義 | 查權威資料，查不到定論就用「輸注結束後 30 分鐘」。查證結果見 L-E3：權威資料不一致，採 30 分鐘 |
| 6 | 紅線 v2 | 同意 |
| 7 | 字體改系統字 | 同意 |
| 8 | 共用電腦提醒與一鍵清除 | 同意 |
| 9 | 分支 | 這版在 `redesign` 分支做，不影響主檔，之後再 merge |
| 10 | 施工 | 由 Sonnet 依本計畫書施工 |

---

## 2. 現況基準（施工前量到的數字，驗收時對照）

- commit：`master` = `e2712d6`；`redesign` 從這裡分出。
- 測試：15 支既有測試＋`test_pk_reference.js`（16 項）全過；golden 124/124 0 差異；版面檢查 4 模組 × 3 寬度全過。
- 設計偵測（`npx impeccable detect --json index.html`）：69 項（對比不足 60、字級過小 7、其他 2）。載入示範病例後掃描：134 項。
- 示範病例（`index.html?demo=1`）整頁高度：桌機 1440 寬 3253 px；手機 390 寬 6644 px。手機第一屏沒有任何計算結果。

---

## 3. L 系列：邏輯修正（先做，在現有介面上做）

### L-A　必填欄位：SCr、性別、成人年齡（P0）

**問題**
1. 沒填 SCr 時，vancomycin 與 AMG 用 1.0 mg/dL 照算並給完整劑量建議（`render()` 內「暫以 1.0 mg/dL 估算」那段，`renderAmino()` 同）。
2. 四個模組的性別下拉預設「男」且非必填，忘了切換的女性 CrCl 高估約 18%。
3. 沒有年齡下限，CG 與所有目標值都是成人用。

**改法**
1. `REQUIRED_INPUTS`：
   - `vanco`（非 HD 路徑）與 `amg` 加入性別（`kind:'select'`，空字串算缺）。
   - 兩者加入 SCr：新增一種 `kind:'rows'`，以 `readScrRows()`／`readScrRowsAmg()` 有至少一筆有效列為「已填」；缺的時候清單顯示「SCr（至少一筆）」，點下去捲到 SCr 表。`vancoHD` 不加 SCr（HD 路徑不用 CG）。
   - 年齡：`requiredFieldFilled` 對 `age`、`amgAge` 另判斷 `<18` 算缺，清單文字「年齡（本工具適用 18 歲以上）」。
2. 四個性別下拉第一個選項改成 `<option value="">請選擇</option>` 並預設選它。grep 所有把性別設回 `'M'` 的地方（例如 azole 與 AED 的 reset、`applyState` 的 `s.sex||'M'`），reset 改設 `''`；`applyState` 改成 `s.sex||''`（舊存檔都有存性別，讀回不受影響）。
3. Azole、AED 沒有必填清單：grep `azlSex`、`aedSex` 所有讀取點，凡是代入 `cockcroftGault` 的路徑，性別空白時視為「CrCl 無法計算」，不得當成男性；年齡 <18 時在旗標區加一則警示「本工具的目標值與公式以成人為準」。
4. 示範病例（`loadDemo`）要明確設定性別（維持原本的男），示範結果不變。
5. 刪掉兩處「暫以 1.0 mg/dL 估算」的旗標分支（已不可能走到），`let scr = …` 的預設值保留以免其他路徑出錯，但加註解說明已由守門擋下。

**測試**：新增 `tests/test_required_inputs_v2.js`：不填 SCr／性別空白／年齡 17 時，右側顯示「還需要以下資料」且候選方案表為空；補齊後恢復計算；舊格式存檔（sex:'F'）讀回後性別為女。

**預期 golden 差異**：golden 情境若沒明確選性別，會被守門擋下。處理方式是修改 `test_ui_golden.js` 的情境設定，明確選 `M`（與舊預設相同），計算輸出 0 差異。這是測試資料更新，要列給 Brandon 看。

### L-B　「第一筆給藥是不是療程第一劑」改成必答（P0）

**問題**：`assumeSteadyState`（vancomycin）與 `amgAssumeSteadyState` 是預設不勾的 checkbox。穩態病人只登錄最後幾劑又漏勾時，擬合 CL 低估約 24%，AUC 高估約 32%（`tests/test_pk_reference.js` 情境 D 實測）。

**改法**
1. 在原 checkbox 那一列改放二選一 radio（新 id：`vancoFirstDoseKind`、`amgFirstDoseKind` 為 name；兩個選項 value `first`／`steady`）：
   - 「第一筆紀錄就是本療程第一劑」
   - 「之前已規則給藥（已達穩態），第一筆只是我登錄的起點」
2. 原 checkbox 保留（R3），改為隱藏，仍是引擎讀取的唯一來源：radio 改變時設定 `checkbox.checked = (value==='steady')` 並觸發 `change`。
3. 守門：給藥表至少一筆有效列、且 radio 沒選時，算缺資料，清單文字「第一筆給藥是不是本療程第一劑」。沒有給藥紀錄（計畫處方預測模式）不要求。AMG 的這一列在 TIW 模式會被隱藏（`amgSteadyStateRow`），隱藏時不要求。
4. 讀舊存檔（`applyState`／`applyStateAmg`）後依 checkbox 帶出 radio：勾＝`steady`，沒勾＝`first`（等於維持舊行為）。清空、開新病人時 radio 回到未選。
5. 不新增存檔欄位（R10）；`collectState` 不改。

**測試**：新增 `tests/test_first_dose_kind.js`：未選時擋下；選 steady 時 checkbox 為勾且擬合結果與直接勾 checkbox 相同；舊存檔讀回時 radio 正確。

**預期 golden 差異**：同 L-A，情境要補選 radio（依該情境原本 checkbox 狀態），計算輸出 0 差異。

### L-C　達標標籤照實分類（P1，R1 例外已核可）

**問題**
- `regimenTag()`：AUC <420 與 >580 都標「略接近邊界」，AUC 334 也一樣；420、580 沒有出處。
- 參數格著色（`render()` 與 `renderProspective()` 內兩處 `flagClassFor`）用 350／400／580／600，與上面又不一致。
- `regimenTagAmino()`：peak 只要 ≥ 下限×0.85 就標「符合目標範圍」（例：gentamicin 嚴重感染目標 8 到 10，peak 7.0 顯示符合）；上限要超過 1.25 倍才警示。

**改法**
1. `regimenTag(cminC, auc24C)` 改成依序判斷：
   - `auc24C>600 || cminC>20` → danger「腎毒性疑慮升高」
   - `auc24C<400` → warn「低於目標 AUC 400」
   - `cminC>15` → warn「Cmin 15–20，腎毒性風險略升」
   - 其餘 → ok「符合目標（AUC 400–600）」
   依據：tdm-calculator vancomycin reference（AUC 400–600；Cmin >15 至 20 的關切沿用工具既有規則）。
2. 兩處 `flagClassFor` 的 AUC 規則改成：>600 danger、<400 warn、其餘 ok。Cmin 規則不變。
3. `regimenTagAmino()`：
   - trough > troughHi → warn「Trough X 超過目標上限 Y」；trough > troughHi×1.5 → danger，文字結尾加「（超過上限 50% 為本工具自訂的危險分級）」
   - peak < 下限 → warn「Peak X 低於目標下限 Y」；peak > 上限 → warn「Peak X 高於目標上限 Y」
   - 拿掉 0.85 與 1.25 的容許帶。Cmax/MIC 檢查不變。

**測試**：補斷言：AUC 334 → warn「低於目標」；gentamicin 嚴重感染 peak 7.0 → warn。既有測試裡斷言舊文字的地方，列出後經核可再改。

**預期 golden 差異**：vanco 與 AMG 候選方案表的「理由」欄、AI prompt 裡的候選方案文字。

### L-D　Vancomycin 輸注時間：每 500 mg 至少 1 小時（P1，R1 例外已核可）

**依據**：院內規則（Brandon 2026-10-19）。參考：仿單寫「不超過 10 mg/min 或至少 60 分鐘，取較長者」（Pfizer 處方資訊）；院內規則每 500 mg 1 小時約 8.3 mg/min，比仿單更保守。

**改法**
1. `inferInfusionMinutes(mg)` 改為 `Math.max(60, Math.ceil(mg/250 - 1e-9)*30)`（每 250 mg 30 分鐘，向上取整；用整數除法避免 0.12 這類小數的浮點誤差把 1250 mg 算成 180 分）。對照：250→60、500→60、750→90、1000→120、1250→150、1500→180、2000→240、2500→300、3000→360。
2. 呼叫點只有 4 個（`renderProspective` 與 `render` 的候選方案、loading 建議），不必改呼叫端。
3. 新增純顯示檢查：實際給藥紀錄裡若有一劑的輸注分鐘數 < `inferInfusionMinutes(該劑量)`，旗標區加一則 warn「第 N 劑 X mg 輸注 Y 分鐘，快於院內規則（每 500 mg 至少 1 小時）」。計算照輸入的實際輸注時間，不改。HD 路徑同樣檢查。
4. 示範病例的給藥紀錄若是 1000 mg／60 分，會跳這則提示；把示範資料改成 120 分，避免示範本身違規（示範數字會因此改變，列入差異）。

**測試**：`inferInfusionMinutes` 對照表逐點斷言；60 分鐘輸注 1000 mg 會出現提示。

**預期 golden 差異**：vanco 候選方案的輸注分鐘、Cmax、Cmin；loading 建議文字；AI prompt。若 golden 情境的給藥紀錄用 60 分鐘輸注 1000 mg，旗標區會多一則提示。

### L-E　依院內 protocol 校正目標與族群參數（P1，R1 例外已核可）

#### L-E1　Azole 目標：院內為準，UpToDate 為輔

`AZOLE_TARGETS` 改成下表；每個適應症加一個 `ref` 欄位存 UpToDate 數值，只用來顯示。

| 藥物／適應症 | 院內（判定用） | UpToDate（`ref`，只顯示） |
|---|---|---|
| Voriconazole 預防 | lo 1.0、hi 6.0 | 0.5 到 5.5 |
| Voriconazole 治療、CNS | lo 1.0、hi 6.0、preferLo 2 | 1.0 到 5.5，偏好 ≥2 |
| Voriconazole 共通 | `toxicityLine: 6`；新增 `cautionLine: 5` | 5.5 |
| Posaconazole 預防 | lo 0.7 | ≥0.7 |
| Posaconazole 治療 | lo 1.25（拿掉 preferLo／preferHi） | ≥1.0，最適 2 到 3 |
| Posaconazole 共通 | `hepatoWatchLine: 1.83` 升為院內警戒；`toxicityLine: 4` 保留（UpToDate） | 1.83 為證據不一的早期警示；4 為假性醛固酮增多症風險 |
| Isavuconazole | lo 2、hi 5 | 不依濃度滴定；4.6 到 5.1 為毒性關切 |

`checkAzoleTrough()` 對應改法：
- Voriconazole：<lo → warn；>6 → warn「超過院內上限 6，神經／肝毒性風險升高，應主動評估」；5 到 6 → note「接近上限（5 以上毒性風險開始升高），主動評估」；介於院內上限內但超過 UpToDate 5.5 時，note 加註「UpToDate 上限為 5.5」。
- Posaconazole：<lo → warn；>4 → warn（原文字不變）；>1.83 → **warn**（原本只是 note）「超過院內肝毒性警戒值 1.83，須評估 LFT」。
- Isavuconazole：<2 → warn「低於院內目標 2；isavuconazole 一般不以濃度滴定，調整前請與感染科討論」；>5 → warn「超過院內上限 5，評估肝毒性」；4.6 到 5.1 的 UpToDate 區間改成 note。拿掉 `typicalFloor` 的 note。
- `updateAzoleTargetDisplay()` 顯示「目前目標（院內）：… ｜UpToDate 參考：…」。
- 模組頁首／頁尾說明裡「Thresholds sourced from UpToDate」的使用者可見文字改成「院內 TDM protocol 為主、UpToDate 為輔」。

**測試**：`test_azole_core_logic.js`、`test_azole_integration.js` 會有斷言要改；先列出清單給 Brandon 核可。新增邊界斷言：vori 5.8（note，不 warn）、6.2（warn）；posa 治療 1.1（warn）、1.9（warn）；isavu 1.8（warn）、5.2（warn）。

#### L-E2　分布體積的體重

- **AMG**：`renderAmino()` 與 `renderProspectiveAmg()` 用到的 `weightForVd` 改成 `weightForCG(useDryWeight ? dryWeight : tbw, ibw).weight`，`Vpop = vdCoef × 該體重`。依據：tdm-calculator aminoglycoside reference「Vd ≈ 0.25–0.30 L/kg（用體重選擇後的體重）」。說明旗標改寫成標出用的是 TBW／IBW／AdjBW 哪一個。`checkFitPlausibility` 收到的 `weightKg` 跟著用同一個體重。
- **Vancomycin**：維持 TBW（或乾體重）；新增極度肥胖分支：BMI ≥40 kg/m² 且體重 ≥120 kg 時，`Vpop = 0.52 × 體重`，否則維持 0.7。旗標說明「極度肥胖，族群 Vd 採 0.52 L/kg TBW（Adane 2015）」。依據：Adane ED et al., Pharmacotherapy 2015；ClinCalc 的極度肥胖預設值同為 0.51 到 0.52 L/kg TBW。只影響族群預測與單點擬合；HD 路徑（0.85 L/kg）不改。
- tdm-calculator skill 的 vancomycin reference 自己前後不一（公式段寫 TBW，don't-miss 寫 AdjBW），不在本次施工範圍，另案修 skill。

**測試**：AMG 肥胖病人（TBW 120、身高 165、男）族群 Vd 斷言 = 0.26 × AdjBW；vanco BMI 45、TBW 130 斷言 Vpop = 0.52 × 130。

#### L-E3　ODD peak 的定義：採「輸注結束後 30 分鐘」，計算不改

**查證結果**：權威資料沒有一致定義。
- UNMC 囊性纖維化延長間隔 protocol：把 Cmax 定在「輸注結束後 30 分鐘」（由兩點回推）。
- Stanford Health Care 成人指引：時間不對時校正到「輸注開始後 1 小時或輸注結束後 30 分鐘」；Hartford 隨機點從輸注開始計時。
- Stanford Children's：分開「實測 peak（輸注結束後 1 小時）」與「外推 Cmax」，延長間隔用外推 Cmax 比目標。
- Stony Brook：只列常見 peak 範圍，沒有定義時間點。

依 Brandon 決定採 30 分鐘，**與現行程式一致，計算不改**。只做顯示：
- AMG 候選方案表與自訂列的 Cmax 欄位標題後加「（輸注結束後 30 分）」（HTML 靜態表頭）。
- `updateAminoTargetDisplay()` 在 ODD 策略時加一行說明：「ODD 目標 peak 以輸注結束後 30 分鐘比較；文獻定義不一，院內指引未明定（2026-10-19 查證）」。

**預期 golden 差異**：L-E1 的 azole 輸出；L-E2 的 AMG 族群預測與單點擬合輸出；若有極度肥胖情境，vanco 也會變。

### L-F　小修（P2，R1 例外已核可）

| 編號 | 改法 | 預期 golden |
|---|---|---|
| L-10 | 監測建議的 SCr 頻率不再用「SCr <1.2」判斷：SCr ≥2 筆且最後／最早 >1.3 或 <0.7 → 「每 1–2 天（腎功能變動中）」；否則「每 2–3 天至每週」；只有 1 筆時加「（僅一筆 SCr，無法判斷趨勢）」。vanco 在 `render()` 內，AMG 是 `aminoMonitorHtml()` 改傳一個 `renalUnstable` 布林值 | 監測文字可能變 |
| L-11 | `roundDoseTo250`：`Math.round(mg/250 + 1e-9)*250`；`roundDoseAmino` 同樣加 `1e-9` | 邊界情境才會變 |
| L-13 | 病人管理「更多」區塊加一段提醒「病人資料以病歷號存在這台電腦的瀏覽器裡。共用電腦請用完清除」，加按鈕 `tdmClearAllLocal`「清除本機所有病人資料」：按下先 `confirm`，列出四個模組各有幾位病人，確認後清掉 4 個病人紀錄 key（只清這 4 個，`tdm_ui_` 設定不動）。匯出按鈕加 `title`「匯出檔含病歷號」 | 0 |
| L-14 | 有濃度資料、而最新一筆 SCr 的日期比最早一筆濃度晚超過 48 小時時，旗標區加一則 ok 等級說明：「族群先驗用的是最新 SCr（日期）；較早的濃度抽血時腎功能可能不同」 | 旗標區可能多一則 |

---

## 4. D 系列：介面改版（L 系列全部完成後才開始）

### 4.1 目標與原則

- 樣子：從「左欄 6 張卡片＋右欄 10 格數字磚」改成「左區工作底稿＋右區判讀報告」，結論先講。
- 依 impeccable 的 Operate 模式：這是要完成任務的工具，按鈕、輸入框、表格、分頁都用大家熟悉的標準元件；風格只提供字體、配色、密度和一個招牌設計（共用時間軸）。
- 只動外觀與容器位置：render 寫進去的 id 不變，參數磚用 CSS 改成表格樣子，不改 render 的輸出字串。golden 比的是文字，搬位置與換樣式應該 0 差異。
- 每包用 impeccable、emil-design-eng、mobile-native、break-ui（repo 的 `.claude/skills/`）輔助；改程式時遵守 ponytail「最小改動」。

### 4.2 工作包

**D0　產品與設計文件**
- 寫 repo 根目錄的 `PRODUCT.md`：使用者（醫院臨床藥師）、場景（院內電腦、桌機為主、手機查看）、任務（輸入給藥與濃度 → 判讀 → 選方案 → 決定下次抽血）、限制（單檔、離線、繁體中文、資料只存本機）。
- 寫 `DESIGN.md`：色彩 token、字級、間距、元件狀態、class 前綴規則（0.4 節）。
  - 字體：`font-family: "Microsoft JhengHei", "PingFang TC", "Noto Sans TC", system-ui, sans-serif;` 數字一律 `font-variant-numeric: tabular-nums`。不載入任何網路字體。
  - 字級：基準 14 px（手機輸入框 16 px，避免 iOS 自動放大），比例 1.125；全站最小 12 px。
  - 色彩：深藍綠頂列、接近白的工作區；文字對比至少 4.5:1（說明文字的灰色要重新選）；紅＝超標或危險、琥珀＝留意、綠＝目標內，只在有意義的地方出現。
- 驗收：Brandon 核可兩份文件。**停**。

**D1　方向板（給 Brandon 挑）**
- 用示範病例的真實數字，做 2 到 3 張靜態畫面（單獨的 HTML 檔，放 `docs/direction/`，不改 `index.html`），每張都有桌機 1440 與手機 390 兩種寬度的截圖。
- 三張的差別在版面組織，不在配色：
  - A：雙欄。左工作底稿、右判讀報告，時間軸放在報告的曲線上方。
  - B：時間軸置頂。時間軸橫跨全寬，下面左右兩欄。
  - C：三欄。左段落目錄、中工作底稿、右判讀報告。
- 右區順序一律：結論列 → 候選方案表 → 曲線 → 參數表 → 注意事項 → 監測 → AI Prompt（收合）。
- 驗收：Brandon 選一張。**停**。之後各包照選定方向做。

**D2　換外觀（只改 CSS 與少量容器 class）**
- 套用 D0 的 token、系統字體，拿掉 Google Fonts 的 `<link>`。
- 卡片外框改成段落（細線＋小標題），段落編號 01 到 06 保留（R6）。
- 示範病例橫幅只留一條（頂端細條）；頁首的功能說明行與「FREE-SAMPLING PK」徽章拿掉或縮成一行。
- 參數磚用 CSS 改成兩欄定義表（標籤左、數字右對齊、單位另一欄）。
- 驗收：設計偵測的 `low-contrast`、`tiny-text`、`undersized-ui-text` 為 0；golden 0 差異；版面檢查全過；截圖給 Brandon。

**D3　右區重排**
- 新增結論列（純顯示 helper，讀 render 已算好的值，例如 `lastVancoDerived`，不重算）：現行處方、預測 AUC₂₄ 與目標、Cmin、擬合方式與兩點間隔。
- 候選方案表移到曲線之前。容器搬位置，id 不變。
- 驗收：1440×900 第一屏看得到結論列與候選方案表；golden 0 差異。

**D4　頂列與共用病人身分條（吸收原 Phase 6）**
- 病人管理橫條收進頂列；頂列顯示病歷號、年齡／性別／體重、CrCl、透析狀態。
- 「從其他模組帶入基本資料」：照 `docs/UIUX_IMPL_SPEC_v1.md` 的 Phase 6 規格做（年齡、性別、身高、體重、乾體重、懷孕、SCr、透析；只複製來源有值的欄位；目標欄位有不同值時先確認；SCr 用目標模組自己的 `add*ScrRow`；透析改變後呼叫該模組既有的 `toggle*DialysisUI`；最後觸發目標模組 render）。不做持續同步，不改存檔結構。
- 驗收：原 Phase 6 的 DoD（Vanco 示範病例帶入 AMG 後年齡、性別、身高、體重、SCr 表相同）；golden 0 差異。

**D5　共用時間軸（招牌設計）**
- 純顯示元件：讀既有的 `readDoseRows` `readLevelRows` `readScrRows` 與 HD 時程，畫在曲線正上方、共用同一個時間範圍。
- 點時間軸上的事件，捲到工作底稿對應那一列並短暫標亮。
- 驗收：任何計算輸出不變（golden 0 差異）；鍵盤可以操作（Tab 到事件、Enter 跳轉）。

**D6　曲線換樣式**
- 先改 golden：曲線 SVG 從「整段 HTML 的 hash」改成「每條 path 的座標字串＋點的座標」比對。這一步單獨 commit，單獨給 Brandon 核可。
- 再改曲線樣式：vanco 維持現有的 20 µg/mL 參考線；AMG 加畫目前適應症的 peak 目標帶；軸線與字級照 DESIGN.md。不改任何計算。
- 驗收：座標 0 差異。

**D7　手機**
- 頂端「輸入／結果」切換；底部固定一條結論摘要（AUC 與是否達標），點了跳到結果。藥物分頁一行排完（可橫向捲動）。照 mobile-native skill 處理輸入框放大、100vh、點擊延遲。
- 驗收：390×844 載入示範病例後，第一屏看得到 AUC 與是否達標；沒有水平捲軸。

**D8　收尾（吸收原 Phase 7）**
- 所有 `alert()` 改成行內提示（照 `docs/UIUX_IMPL_SPEC_v1.md` Phase 7 規格）。
- break-ui：超長藥名、0 筆紀錄、極端濃度（0.01 與 999）、30 筆給藥紀錄，四模組都不破版。
- 無障礙：鍵盤可以從空白頁走完整個流程；焦點看得到。
- impeccable polish 一輪。
- 驗收：見第 5 節全部。

---

## 5. 整體驗收（全部做到才 merge）

1. **算得對**：`tools/run_checks.sh` 全過；`test_pk_reference.js` 全過；每一次 golden 基準更新都有 Brandon 核可紀錄（寫在 progress 文件）。
2. **看得清楚**：設計偵測的對比與字級類 0 項；三種寬度版面檢查全過。
3. **用得更快**：Brandon 挑 3 個去識別化真實案例（vanco 一般、vanco HD、AMG ODD），改版前（`master`）與改版後（`redesign`）各自從空白頁計時到選定方案，記錄時間與輸入錯誤數。目標：時間少三成，錯誤 0。
4. Brandon 目視核可截圖。
5. merge：Brandon 說可以才把 `redesign` merge 回 `master`，再推上 GitHub。

---

## 6. 之後可以做（不在本次範圍）

- **會診紀錄輸出**：把處方、濃度、擬合結果、建議方案、下次抽血時間整理成純文字，貼進 HIS。需要 Brandon 提供 3 到 5 份去識別化的平常寫法當格式依據。
- **修 tdm-calculator skill**：vancomycin 肥胖 Vd 的寫法前後不一；free VPA 參考範圍 skill 寫約 7 到 23，工具用本院檢驗科的 5 到 15，skill 應改成跟院內一致；azole 目標加註 UpToDate 參考值。

---

## 附錄 A：來源

- Vancomycin 仿單輸注速率：Pfizer Vancomycin Injection Prescribing Information, Dosage and Administration（https://www.pfizermedical.com/vancomycin-inj-0/dosage-admin）
- 極度肥胖 vancomycin Vd：Adane ED et al. Pharmacokinetics of Vancomycin in Extremely Obese Patients with Suspected or Confirmed Staphylococcus aureus Infections. Pharmacotherapy 2015（https://accpjournals.onlinelibrary.wiley.com/doi/full/10.1002/phar.1531）；ClinCalc Vancomycin Calculator 的 Vd 方法說明（https://clincalc.com/vancomycin/）
- ODD peak 定義查證：
  - UNMC Extended-interval Aminoglycoside Dosing in Cystic Fibrosis（https://www.unmc.edu/intmed/_documents/id/asp/pharm-tnmc-cf-eiad.pdf）
  - Stanford Health Care Aminoglycoside Dosing Guideline 2017（https://www.proa.hc.edu.uy/images/Aminoglycoside_Dosing_Guide.pdf）
  - Stanford Children's Aminoglycoside Guideline（https://www.stanfordchildrens.org/content-public/pdf/antimicrobial-stewardship-program/aminoglycoside-guideline.pdf）
  - Stony Brook Aminoglycoside Dosing and Monitoring 2018（https://renaissance.stonybrookmedicine.edu/sites/default/files/05.21.2018.%20Aminoglycoside%20Dosing%20and%20Monitoring.ASP%20Posting.pdf）
- 院內規則（Brandon 2026-10-19 提供）：vancomycin 每 500 mg 至少輸注 1 小時；azole 院內 protocol 目標見 tdm-calculator skill 的 azole reference。

## 附錄 B：稽核證據

- 邏輯稽核細節、程式位置與實測數字：`docs/REDESIGN_PLAN_v1.md` 第 2 節。
- 獨立驗算：`tests/test_pk_reference.js`。
- 截圖：`tests/shots/baseline/`（空白頁，4 模組 × 3 寬度）。
