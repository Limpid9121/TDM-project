# 換劑量後的追蹤：施工計畫 v1

日期：2026-10-23　作者：Claude（與 Brandon 腦力激盪後整理）　施工：新對話的 Sonnet
分支：從 `main`（= `33580cd`，redesign 已併入）開新分支 `followup`，`main` 不動，做完、驗收、Brandon 說可以才 merge。

---

## 0. 要解決的問題

**情境**：今天抽血，判讀後發現原劑量不適合，建議新劑量，預定三天後再抽血。

**現在的痛點**
1. 決定新劑量後，給藥紀錄要手動重新拉（改維持處方、重新展開，還可能蓋掉手動微調過的時間）。
2. 三天後回來，新劑量這三天的給藥要自己補，新抽的血也不知道要接在哪裡。
3. 前一次抽血擬合出的 PK 參數，不知道怎麼跟新一輪的劑量、抽血、預測接起來。
4. 新舊資料混在一起，版面會亂。

**先講清楚的事實（施工前要理解）**
- Vancomycin 是線性藥動：新劑量 ≈ 舊劑量 × 目標 AUC ÷ 目前 AUC。工具的「劑量調整建議」表本來就用擬合出的 CL 算這件事，**數學不用改**。要做的是「記帳」：把決策、給藥、預定抽血串起來。
- 擬合用的是給藥紀錄表與濃度表裡**所有**有效的列（`readDoseRows()`、`readLevelRows()`），「分析起點」只影響自動展開與「未達穩態」提醒，**不會排除舊濃度**。新舊兩次濃度一起擬合，資料越多 CL 越準；這已經是「整併參數」的正確做法，不需要另外做序貫貝氏。
- 濃度表裡**值是空的列**會被 `readLevelRows()` 過濾掉（`isFinite(conc) && conc>0`），所以「只有時間、還沒有值」的預定抽血列不會影響計算。

**範圍**：先做 Vancomycin 非透析（一般間隔給藥）。AMG 放在最後一包（G7）；HD（依透析排程給藥）這一版不做。

---

## 1. 規則（照舊，另加幾條）

1. **一次做一包**，做完用白話回報（做了什麼、怎麼驗證、沒驗證到什麼），**停下來等 Brandon 說「繼續」**。
2. **先寫測試**（jsdom，`tests/test_*.js`，照現有測試的寫法），看到它失敗，再施工，再看它通過。
3. **紅線 R1–R10**（`docs/REDESIGN_PLAN_v2.md` 第 0.4 節）全部適用。重點：
   - R1：計算函式與常數不可改內部邏輯（`predictConc` `fitCLV` `regimenTag*` … 只能「呼叫」，不能改）。
   - R2：render 函式只允許開頭加 guard／純顯示 helper、輸出字串加 class。**本計畫的功能一律做在 render 外面**（DOMContentLoaded 區的 helper、MutationObserver、事件委派），照 v3 F 系列的做法。
   - R3：既有 element id 不改名、不刪。
   - R10：病人紀錄的 localStorage key 與資料結構不可動。**本計畫原則上不新增存檔欄位**；唯一例外見決策 D1，要 Brandon 先核可。
4. **golden 有任何差異就停下來**，列出差異給 Brandon 核可，核可才 `node tests/test_ui_golden.js --update`，並把核可紀錄寫進 `docs/REDESIGN_PROGRESS_v1.md`。
5. 只做電腦版，**目標螢幕 1920×1080**（Brandon 只用這個）；1440 看一眼不破版即可；手機不做。
6. 版面驗證要截圖看：`tools/shoot_review.py` ＋ `tools/review_frame.html`（參數見該檔開頭註解：`mod`、`collapse`、`setv=id:值`、`clicks=選擇器~~選擇器`、`clicksel`、`rsnap=curve`、`nodoses`、`measure=params|rowalign|contrast|cand|chars` 等）。靜態伺服器：`python -m http.server 8765 --bind 127.0.0.1`。內建瀏覽器連不到 localhost，用 headless Edge 截圖。
7. 每包結束跑 `bash tools/run_checks.sh --quick`（這台電腦很慢，整套約 30 分鐘，用背景執行）。
8. 設計規則：`DESIGN.md`（含「減法規則」：避免不必要的副標與說明，讓版面來解釋）、`PRODUCT.md`。UI 施工前讀 `.claude/skills/impeccable/reference/craft-floor.md`，用到 `impeccable`（layout、clarify、onboard）、`emil-design-eng`（互動、提示）、`break-ui`（最糟資料）。
9. 回報用白話（Brandon 是臨床藥師，懂基本電腦術語，不讀程式細節）；提 commit 時訊息用中文。

---

## 2. 現有零件（施工會用到的地方，行號是 2026-10-23 的參考，會位移）

| 零件 | 位置 | 說明 |
|---|---|---|
| 劑量調整建議的勾選 | `vancoPickedKey`（全域）、`getPickedRegimen(prefix, regimenRows, customResult)`、`resolveWhatIf(prefix, …)` | 勾一列＝在曲線疊畫新處方；`#vancoPickBar`（勾選後出現的那一條）、`#vancoPickStart`（新處方起始時間）、`#vancoPickSummary`、`#vancoPickClear` |
| 維持處方欄位 | `#maintDose` `#maintInterval` `#maintInf` `#firstMaintDoseTime` | `firstMaintDoseTime` 有填時，自動展開從這個時間開始每 τ 一劑 |
| 自動展開 | `expandDosesFn()`（`#expandDoses`） | **會清空並重建**整張給藥表（`clearTbody('#doseTable')`）；本計畫的「補上」要做**附加版**，不能清空 |
| 給藥／濃度列 | `addDoseRow(date, mg, inf)`、`addLevelRow(date, conc)`、`readDoseRows()`、`readLevelRows()` | 列的 class：`.dose-date` `.dose-mg` `.dose-inf`、`.level-date` `.level-val`、`.level-timing` |
| 較早給藥收起 | `DOSE_FOLDS`、`refreshDoseFold(f)`、`nearDrawRows()` | 只顯示最近 3 筆＋抽血前後的劑次 |
| 抽血點標示 | `DRAW_SETS`、`nearDrawInfo(f)`、`refreshDrawMarks(f)`（分隔線 `.draw-sep`，不是 `.entry-row`） | D 包的「處方期分隔線」照這個模式做 |
| 產生範圍自動帶 | `autoRange()`（`window.vancoAutoRange`）、`vancoTHalfHint` | 展開至＝最後一次抽血後的下一劑；沒有濃度＝起點後約 5 個半衰期 |
| 右邊「尚未更新」 | `STALE_SETS`（每組有 `reset()`） | 處方欄位與上次展開時不同就標「尚未更新」；**A 包改維持處方後要呼叫 `reset()`**，不然會誤報 |
| 需要時才出現的小卡 | `.carry-card`（帶入基本資料）、`.first-tip`（第一次使用提示） | B 包的「補上給藥」小卡照這個樣式與行為做 |
| 存檔 | store：`saveAsNewVisit()`、`updateCurrentVisit()`、`collectState()`、`applyState(s)`；`visit = {visitId, savedAt, asOf, data, derived}` | `derived` 是當次判讀的結果（`lastVancoDerived`：`cl` `vd` `ke` `tHalf` `auc24ss` `cminSs` `recDose` `recInterval` …）。病人下拉、選擇紀錄 ▾、主按鈕在頂列（F5） |
| 跨次評估趨勢 | `#vancoTrendBlock`、`drawTrendChart(cfg)` | 已經能畫每次收案的參數變化 |
| 監測建議 | render 內的 `nextTdmText`（`#monitorGrid`） | 只有文字，沒有具體時間；**不能改 render**，預定抽血時間要在外面另算 |
| 曲線 | `#curveSvg`（render 畫）、`#vancoTimeline`（D5 時間軸，外面畫） | 曲線是受保護輸出（golden 比對 path）；**新標記一律畫在時間軸或另一層**，不改曲線本身 |
| 判讀板 | `#paramGrid`（golden 比對 textContent） | 新增的「與上次比較」放在判讀板**外面**，不能塞進 `#paramGrid` |

---

## 3. 需要 Brandon 先決定的事（開工前問）

| # | 問題 | 建議 |
|---|---|---|
| D1 | 預定抽血填值後要顯示「預測 15.2 → 實測 13.8（−9%）」，**預測值要在填值前記住**（填了新濃度之後擬合會變，預測就不是原本的了）。要記就得在濃度列多存一個欄位（例如 `pred`），屬於存檔結構的**新增**（舊紀錄照常讀得到）。可以嗎？ | 可以（只新增、不改舊欄位）。不行的話，「預測 vs 實測」只在當次未關頁前看得到 |
| D2 | 按「採用為新處方」時，要自動存成新收案，還是只改畫面、讓你自己按主按鈕存？ | 自動存成新收案（評估時點＝現在），並顯示「已存為第 N 次評估」；沒有病歷號時改開另存視窗 |
| D3 | 腎功能改變時，要不要提供「只用改劑量之後的濃度擬合」？（要在濃度列加「不納入擬合」，會改變計算輸入，預設不勾時 golden 不變） | 先做「提醒＋說明」（G4），排除功能放到 G6，等你看過 G4 再決定 |
| D4 | 預定抽血的預設時間：新處方開始後第幾劑前（trough）？ | 新處方開始後「至少 4 個半衰期之後的第一個給藥前 30 分」，取整到 15 分；可改 |

---

## 4. 工作包（照順序做，一包一停）

### G1　採用為新處方（A）

**目的**：在劑量建議表勾好方案、設好開始時間後，一鍵把決定寫進紀錄，不用手動重拉。

**介面**
- `#vancoPickBar`（勾選後出現的那一條）右邊加一顆主要按鈕「採用為新處方…」。
- 按下去開一個小視窗（樣式照 F5 的另存視窗 `.sr-box`），列出：
  - 新處方：1250 mg／輸注 150 分／q12h（來自勾選的方案；自訂列也可以）
  - 從：10/23 21:00（`#vancoPickStart`，可改）
  - 預定抽血：10/26 08:30 trough（依 D4 計算，可改；可取消勾選「不排預定抽血」）
  - 存檔：存成新收案（依 D2）
  - 【採用】【取消】

**按「採用」後依序做**
1. `#maintDose` `#maintInterval` `#maintInf` 改成新處方；`#firstMaintDoseTime` 設成新處方開始時間（之後 G2 補給藥會用到）。
2. 給藥紀錄**不新增未來的劑次**（給藥表只放實際已給的；未來的劑次在 G2 回來時才補）。
3. 若勾了預定抽血：`addLevelRow(預定時間, '')`，該列加 class `level-planned`（G3 處理外觀）。
4. 取消勾選（等同按 `#vancoPickClear`），讓曲線回到「現行處方」；此時現行處方已經是新處方，曲線的虛線就是新處方的預測。
5. 呼叫 `STALE_SETS` 的 `reset()`（Vancomycin 那組），避免右邊誤標「尚未更新」。
6. 依 D2 存檔（`saveAsNewVisit()`；沒有病歷號就開另存視窗 `openSaveModalFn`）。
7. 畫面上方（`.pm-meta` 那個訊息位置，F5 的 `notify` 會導到這裡）顯示：「已採用 1250 mg q12h（10/23 21:00 起），預定 10/26 08:30 抽血，已存為第 2 次評估」。

**測試** `tests/test_regimen_adopt.js`：勾一個方案→按採用→維持處方欄位、`firstMaintDoseTime`、預定抽血列（值空、有 `level-planned`）、勾選已清除、沒有「尚未更新」、有存成新收案（`vanco_tdm_patients_v2` 的 visits 多一筆）；取消不改任何東西；自訂列也能採用；HD 模式不顯示按鈕。golden 必須 0 差異。

### G2　回來時補上給藥（B 前半）

**目的**：三天後打開這位病人，不用重拉，一鍵把新處方這幾天的給藥補進來。

**出現條件**（照 `.carry-card` 的「需要時才出現」做法；放在 03 卡片「實際給藥紀錄」上方）：
- 非 HD；`#firstMaintDoseTime`、`#maintDose`、`#maintInterval`、`#maintInf` 都有值；
- 從 `firstMaintDoseTime` 起、每 τ 一劑、到現在為止「應該有」的劑次中，給藥表裡**還沒有**的（時間差在 ±τ/4 內就算已有）至少 1 劑。

**小卡**：「新處方 1250 mg q12h 從 10/23 21:00 起，到現在還有 6 劑沒記錄。【補上 6 劑】【不用】」
- 補上＝**附加**（不清空舊列）：`addDoseRow()` 逐劑加入，列加 class `dose-auto`（剛補上的，淡色標示 3 秒）；補完捲到最新那幾列，提醒可以用 −／+ 微調實際時間。
- 補上之後，右邊「尚未更新」不應出現（給藥表整批變動會自動重設比對基準，確認一下）。
- 「不用」收起，直到下次載入。

**測試** `tests/test_regimen_backfill.js`：造一個採用過的紀錄（`firstMaintDoseTime` 在 3 天前）→小卡出現、劑數正確→補上後給藥表多 N 列、舊列不變、計算結果與「手動加同樣的列」相同；已有部分劑次時只補缺的；`firstMaintDoseTime` 是未來時不出現。

### G3　預定抽血（B 後半）

**目的**：預定抽血那一列早就在，回來只要填濃度；填之前看得到預測值，填之後自動比較。

**外觀**（`.level-planned`，濃度欄是空的時）
- 列前面一個小標「預定」；濃度欄 placeholder「填入實測值」。
- 列下方（現有 `.level-timing` 的位置）顯示「預測 15.2 µg/mL（依 10/23 擬合）」。
- 時間軸（`#vancoTimeline`）的濃度軌畫**空心點**；曲線本身不改。

**預測值怎麼算**（display helper，在 render 外面）
- 用最近一次判讀的 `lastVancoDerived.cl`、`.vd`（擬合結果），加上「給藥表的實際劑次＋從最後一劑起照維持處方往後投影到預定時間的劑次」，呼叫 `predictConc(tRel, doses, CL, V)`（只呼叫，不改；時間單位與 render 一致，注意 `primeDoses` 的處理要跟 render 相同）。
- 依 D1：預測值存在濃度列（例如 `data-pred`，collectState／applyState 各加一個可選欄位 `pred`；舊紀錄沒有就不顯示比較）。**這一步動到存檔結構，D1 核可才做**。

**填值後**：列下方改成「預測 15.2 → 實測 13.8（−9%）」；差超過 ±20% 用琥珀色。之後正常參與擬合（`readLevelRows()` 本來就會讀）。

**測試** `tests/test_planned_level.js`：預定列不影響計算（golden 0 差異；有預定列與沒有時判讀板文字相同）；預測值與直接呼叫 `predictConc` 相同；填值後顯示比較；存檔後讀回預測值還在（D1 核可時）。

### G4　與上次評估比較＋腎功能提醒（C）

**目的**：新舊 PK 參數不用整併（一起擬合就是整併），但要讓你一眼看到「這次跟上次差多少」，以及「舊濃度還能不能用」。

**與上次比較**（判讀板**下方**、注意事項上方，一行；不放進 `#paramGrid`）
- 從這位病人的收案版本中，找評估時點早於目前、最近的一筆，讀它的 `derived`。
- 顯示：「與上次評估（10/23）比較：CL 4.38 → 3.90（−11%）・Vd 49.8 → 47.2・AUC₂₄ 455 → 512」。只顯示兩邊都有的數字。
- CL 變化超過 ±20%：這一行用琥珀色，後面加「腎功能可能改變，看一下 SCr」。

**腎功能提醒**（同一行或下一行）
- 比較目前 SCr（最新一筆）與上次評估當時的 SCr：上升 ≥0.3 mg/dL 或 ≥50%（或下降同幅度）→ 顯示「SCr 0.9 → 1.4（10/23 → 10/26）：舊濃度反映的是舊的腎功能，這次一起擬合可能不準」。
- G4 只提醒，不改計算（D3）。

**測試** `tests/test_followup_compare.js`：沒有上一次收案時不顯示；有時數字與百分比正確；CL 變化 25% 時琥珀色；SCr 上升 0.5 時出現提醒；golden 0 差異。

### G5　處方期分段（D）

**目的**：療程長了、換過幾次劑量，給藥表與時間軸還是清楚。

- **處方期**：從給藥表自動分段：相鄰劑次的劑量相同、間隔與前一段相同（±τ/4）就算同一期。不存任何新資料。
- **給藥表**：每一期之間插一條分隔線（照 `.draw-sep` 的做法，class `regimen-sep`，不是 `.entry-row`）：「▼ 10/23 21:00 改為 1250 mg q12h」。較早的「處方期」整期收成一行：「1000 mg q12h × 7 劑（10/20–10/23）已收起，點這裡展開」；目前這一期照現在的「只顯示最近 3 筆＋抽血前後」。**與現有 `refreshDoseFold` 合併**，不要兩套收合打架。
- **時間軸**：在改劑量的時間點畫一條短直線＋小標「1250 q12h」。曲線本身不改。
- **測試** `tests/test_regimen_epochs.js`：分段正確（含最後一期只有 1 劑、間隔不規則、loading 劑另算一期）；分隔線不影響 `readDoseRows()`；收合／展開；golden 0 差異。

### G6　（依 D3）只用改劑量之後的濃度擬合

**只有 Brandon 看過 G4 後說要做才做。**
- 濃度列加一個小勾選「不納入擬合」（預設不勾）；G4 的腎功能提醒旁加一顆「只用 10/23 之後的濃度」＝一次勾掉更早的濃度列。
- `readLevelRows()` 過濾掉勾選的列（這是**計算輸入的改變**：預設不勾時 golden 必須 0 差異；勾選的情境要 Brandon 核可行為）。
- 勾掉的列淡色顯示、時間軸上畫成灰點；存檔要記住勾選（存檔結構新增欄位，同 D1 要核可）。

### G7　Aminoglycoside 照做

G1–G5（與 G6，若有做）照 Vancomycin 的做法搬到 AMG：`#amgPickBar` `#amgPickStart` `amgPickedKey` `#amgMaintDose` `#amgMaintInterval` `#amgMaintInf` `#amgDoseTable` `#amgLevelTable` `amgStore` `lastAmgDerived` `#amgTimeline`。注意 AMG 有「排程型態」（固定間隔／每週固定幾天）：TIW 型態的補給藥要照星期與時刻算；ODD 預定抽血改成「下一劑前（trough）或輸注後 6–14 h 一點」依目前策略決定，跟 Brandon 確認後再做。

### G8　驗收

- **端到端情境**（寫成測試 `tests/test_followup_e2e.js`，日期固定）：
  1. Day 0：示範病例（兩點濃度）→判讀→勾選 1250 mg q12h、從今晚 21:00→採用（存成第 2 次評估、預定 Day 3 08:30）。
  2. Day 3（把「現在」設成 3 天後；用 jsdom 的 fake timers 或注入 `Date.now`）：載入病人→補上給藥小卡→補上→預定列顯示預測→填實測值→比較→判讀板下方顯示與上次比較。
  3. 給藥表分段、時間軸標記正確；存檔讀回一致。
- **截圖**（1920×1080）：Day 0 採用視窗、Day 3 補上小卡、預定列、與上次比較、分段後的給藥表；`measure=rowalign|params|contrast` 0 問題。
- **golden 124/124**（D1／D6 若有核可的差異，要有核可紀錄）。
- **用 Brandon 的真實案例試一次**（去識別化）：一個換過劑量的 Vancomycin 病人，從第一次評估走到第二次評估。

---

## 5. 給新對話的啟動 prompt（Brandon 直接貼）

```
請讀 docs/REGIMEN_CHANGE_PLAN_v1.md（本次施工計畫）、docs/REDESIGN_PLAN_v2.md 第 0.4 節的紅線 R1–R10、
DESIGN.md、PRODUCT.md、docs/REDESIGN_PROGRESS_v1.md 最後幾節（了解目前狀態）。
從 main 開新分支 followup，main 不要動。
先問我第 3 節的四個決策（D1–D4），我回答後照第 4 節的順序 G1 → G2 → G3 → G4 → G5 施工，
G6、G7 等我說要做才做，最後做 G8 驗收。
每一包：先寫會失敗的測試、再施工、跑 tools/run_checks.sh --quick（背景執行，很慢）、
用 tools/shoot_review.py 截圖看版面（1920×1080 為主）；golden 有差異就停下來列給我核可。
做完一包用白話回報，停下來等我說「繼續」。
```

---

## 6. 不做的事（這一版）

- 序貫貝氏（拿上一次的擬合結果當這一次的先驗）：新舊濃度一起擬合已經涵蓋大部分情況，而且要改 `fitCLV`（R1）。
- HD 病人的換劑量追蹤（給藥跟著透析排程走，另案）。
- Azole、AED（不做曲線擬合，換劑量後的追蹤需求不同）。
- 自動決定劑量（工具只列方案，決定仍由藥師做）。
