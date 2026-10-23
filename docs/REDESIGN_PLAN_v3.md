# TDM 工作台：改版修正施工計畫 v3

日期：2026-10-22　分支：`redesign`（施工從 `ef149a2` 之後開始；`master` 不動）

前一份計畫是 `docs/REDESIGN_PLAN_v2.md`（L-A…L-G、D0–D8、R7 都已完成）。這份 v3 只處理第 1 輪自驗收（`docs/REDESIGN_ACCEPTANCE_v1.md`）找出的問題，以及 Brandon 在 2026-10-22 的決議。進度記在 `docs/REDESIGN_PROGRESS_v1.md`，新的一節叫「v3 修正」。

> **2026-10-23 決議：手機版開發與設計全面暫緩，專注電腦版。** F3 的手機卡片、F5 的手機頂列、F6 的 390 寬複驗、各包 390 截圖都先不做（既有手機程式碼保留不動，也不主動改）。驗收寬度改為 1920、1440、1024。恢復手機要等 Brandon 明說。下文提到手機的條目都視為暫緩。
> 同日核可：刪除右區舊 loading 提示（E1，golden 2 筆 V1、V3 `loadingSuggestion` 更新為空字串）。

---

## 0. Brandon 的決議（2026-10-22）

| # | 問題 | 決議 |
|---|---|---|
| 1 | 「存為新收案」要不要拉回頂列 | **照 TPN 調配試算的模式**（附檔 `../TPN calculator/TPN調配試算.html`，見下方 0.1 節）：存檔按鈕拉回頂列，而且是頂列唯一的實心按鈕 |
| 2 | 「計算／病人資料」分頁列要保留或移走 | **照 TPN 的模式保留**：分頁列放在頂列正下方，身分條移到分頁列的右側（見 0.1 節） |
| 3 | 左欄的示範病例大橫幅 | 改成**頂列小標**（例如頂列出現一個「示範病例」字樣的小標，點了可清空），左欄的大橫幅拿掉 |
| 4 | 全部收合／全部展開 | **一顆切換鈕**（維持現狀） |
| 5 | 候選方案的評語 | **只顯示狀態字**（目標內／留意／超標），滑過（`title`／tooltip）看完整說明；照 C3 |
| — | 01–06 段落按鈕 | **拿掉**（只留那一顆收合切換鈕） |
| 6 | 撞色太少、整體不夠大膽 | 照**撞色方向 B**：撞色有固定角色（主要動作、目前所在、你的選擇、現在、判讀板的邊、瀏覽器表面），右上判讀區做成深藍板。方向板截圖：`tests/shots/review/acc_now_magenta.png`（現況）、`acc_a_magenta.png`（方向 A）、`acc_b_magenta.png`、`acc_b_mustard.png`、`acc_b_amg.png`（方向 B）。試做樣式在 `tools/exp_accent_a.css`、`tools/exp_accent_b.css`，截圖時加參數 `exp=accent_b&accent=mustard`。規則寫進 `DESIGN.md`「撞色角色規則」 |
| — | 曲線下時間軸的「濃度」軌 | **拿掉**（曲線上已經有抽血點）；圖例的「● 抽血」一起拿掉 |

### 0.1 附檔（TPN 調配試算）的模式

2026-10-22 截圖存在 `tests/shots/review/tpn_1920.png`、`tpn_1440.png`。

**頂列一行，由左到右：**
1. 品名
2. 病人下拉「— 選擇病人 —」
3. 「選擇紀錄 ▾」：這位病人所有存檔，依日期排序
4. **主按鈕**：頂列唯一的實心填色按鈕，文案依狀態切換。還沒載入紀錄時寫「儲存為新紀錄…」，已載入時寫「儲存更新」。有未儲存的變更時，按鈕上多一個小圓點
5. 「處方 ▾」選單：開新、沿用上次、另存為新紀錄、只清空劑量
6. 「列印 ▾」
7. 「傳送與備份 ▾」：單張匯出入、整機備份
8. 模式切換

**存檔方式比照 Word：**
- 儲存＝存回目前這筆；沒有目前這筆時，自動變成「另存新紀錄」。
- 另存視窗有三條路：新病人（填病歷號、姓名）／既有病人・開新紀錄／覆蓋既有紀錄。另外填日期與狀況簡述。
- 換病人或載入別筆紀錄前，如果有未儲存的變更，先問「儲存／不儲存／取消」。

**分頁列保留**：頂列下方是「計算／病人資料／參照資料」。

**套到 TDM 工作台：**

| TPN 的元件 | TDM 對應（id 一律保留，只換位置與外觀） |
|---|---|
| 病人下拉 | `patientSelect`（四個模組各一個，只顯示目前模組那個） |
| 選擇紀錄 ▾ | `patientVisitSelect`＋「載入」：選了就載入，載入前先經過既有的 `guardUnsaved` |
| 主按鈕「儲存為新紀錄…／儲存更新」 | 把 `savePatientBtn` 與 `updateVisitBtn` 合成一顆，依「是否已載入收案」切換文案；未存小圓點沿用 `*DirtyDot` |
| 另存視窗 | 新增 modal：新病人（病歷號 `patientLabel`）／既有病人・開新收案／覆蓋既有收案，加評估時點 `patientAsOf` |
| 處方 ▾ | 放「示範病例」「清空此頁（開始新病人）」「從其他模組帶入基本資料」 |
| 傳送與備份 ▾ | 匯出全部、匯入、清除本機所有病人資料（現在放在「病人 ▾ › 更多」） |
| 模式切換 | TDM 沒有，不做；撞色挑選放在這個位置 |
| 分頁列 | 保留「計算／病人資料」，放在頂列正下方 |

C3 的身分條（病歷號、年齡／性別／體重、CrCl、透析）放在**分頁列右側**。這樣頂列不會擠，1440 寬也能維持一行。

示範病例（決議 3）在頂列品名旁邊放一個小標「示範病例」，點了會詢問要不要清空。

設計依據仍然是 C3 設計稿：`docs/direction/shots/C3_24in_allcollapsed.png`、`C3_24in_fold.png`、`C3_mobile_*.png`，以及 `DESIGN.md`（C3 版）。

---

## 1. 規則（沿用 v2，另加三條）

- 紅線 R1–R10 照 v2 第 1 節。任何計算輸出都不能變；golden 有差異時先停下來回報，等 Brandon 核可才更新基準。
- 每一包的順序：先寫會失敗的測試 → 施工 → `bash tools/run_checks.sh --quick` → **截圖逐張目視** → 更新進度檔 → commit → 用白話回報。
- **新規則 1：驗收一定要看畫面。** 用 `python tools/shoot_review.py` 在 1920×940、1440×900、1024×800、390×844 四個寬度拍下列情境，然後逐張用眼睛看：四個模組各「全收合」與「全展開」、Vancomycin 的 HD、Vancomycin 空白頁、手機的輸入與結果。程式掃描（例如找出超出視窗的元素）只能當輔助。重點看兩件事：**對不對齊、字有沒有被切掉或重疊**。
- **新規則 2：設計 skill 要真的用。** 見第 3 節。每包開工前讀該包列出的 skill 與 reference 檔；動任何 UI 前讀 `impeccable/reference/craft-floor.md`。回報時寫出這包用了哪些 skill、各帶來什麼修正。
- **新規則 3：跟 C3 設計稿逐項比。** 每包完成後，拿同一寬度的 C3 截圖並排比對，把差異列在回報裡。不打算照做的差異要寫明原因。

截圖工具：
- 先開靜態伺服器：`python -m http.server 8765`，或用 `.claude/launch.json` 裡的 `tdm-static`。
- 然後執行，例如：`python tools/shoot_review.py "v_1920_all|1920|940|mod=vancomycin&collapse=all"`。
- 可用參數寫在 `tools/review_frame.html` 開頭註解：`mod`、`collapse=all|none|only:N`、`hd=1`、`blank=1`、`pm=1`、`view=input|result`、`scroll`、`rscroll`。
- 輸出到 `tests/shots/review/`（不進版控）。

---

## 2. 工作包

### F1　小修（字被切、重疊、Brandon 指定的移除）
- 拿掉 01–06 段落按鈕：`.sec-bar` 只留收合切換鈕，鈕靠右放在左欄頂端。`#vancoSecBar` 等 id 可以保留給切換鈕的容器。
- 拿掉時間軸的「濃度」軌與圖例的「抽血」。`tests/test_d5_timeline.js` 跟著改（level 事件改成「不存在」）。
- 收合段落的標題不准斷行：標題 `white-space:nowrap; flex-shrink:0`，摘要 `min-width:0` 加省略號。1440 寬「血中濃度量測（自由時點）」這類長標題也要一行。（驗收 C1）
- HD 曲線的「Pre-HD 目標 15–20」被輸注淡底蓋掉：輸注淡底改成在所有帶狀標籤之前畫（或把標籤移到最上層、加白描邊）。（C2）
- 參考線標籤壓到曲線（「腎毒性關切 20」、AMG 的「Peak 目標」「Trough 目標上限」）：照 C3 把標籤移到左側繪圖區內、線的上方，加白色描邊；或放在 y 軸外側。三個模組、四種寬度都要拍圖確認。（C3）
- 手機時間軸的圖例被切：圖例依寬度換行，或改成 HTML 圖例。（C4）
- 時間軸「SCr」標籤和範圍外三角形黏在一起：標籤與繪圖區之間留 8 px 以上，三角形往內縮。（C6）
- 右區舊提示「未勾選『深部／難清除感染』…於左側區塊 02 勾選後將顯示建議」：改成指向左邊 03 的 loading 建議，或直接拿掉。（E1；會動到 golden 的 `loadingSuggestion`，要 Brandon 核可）
- Azole 06 摘要日期改成「10/22 22:24」。（E2）
- 要用的 skill：`impeccable` 的 craft-floor 與 typeset、`dataviz`（圖上標籤）、`break-ui`（長標題、窄寬度）。

### F2　參數區照 C3 重排
- 照 C3 排成 AUC 大字（AMG 是 Cmax）跨兩列，旁邊兩列：
  - 第一列：Cmin、Cmax、AUC/MIC、近 24h AUC。
  - 第二列：t½（下附 ke）、CL、Vd（下附 L/kg）、CrCl（下附體重法）。
- 標籤用短名，括號裡的說明移到數字下面、用小字。純顯示：用 CSS 加 helper 改擺放與標籤顯示，不改 render 的 textContent。如果非改不可，會動到 golden，要先回報。
- AMG（含「參考：Cmax(T1…)」）、HD（6 格）、Azole／AED（2 格）各自要有對齊的格線版本，不能出現空格或孤兒格。
- 1024 寬的格線不能斷開，數字一律不換行。
- 驗收：同一列的數字底線要對齊（看截圖），四種寬度都沒有溢出。
- 要用的 skill：`impeccable` 的 layout、typeset 與 craft-floor，`emil-design-eng`（數字對齊、tabular-nums、細節），`dataviz`（stat tile 的規則）。

### F7　撞色角色＋深藍判讀板（決議 6，接在 F2 後面做）
- 依 `DESIGN.md` 的「撞色角色規則」，以及 `tools/exp_accent_a.css`、`exp_accent_b.css` 的試做，正式寫進 `index.html`。不要直接引用 exp 檔，把規則併進樣式表，並清掉試做時用的 `!important`。
- token：加 `--accent-ink`、`--accent-tint`（四個撞色各一組），加 `--ok-on-dark`、`--caution-on-dark`、`--danger-on-dark`。
- 判讀板：判讀標題列＋參數區變成深藍板，上下緣各一條撞色線。板上：
  - 數字用白字，標籤與說明用 `navy-soft`。
  - 狀態色一律用深底版（試做時 AUC 457、Cmin 11.7 的綠，以及 AMG Cmax 的琥珀在深藍上只有 2.6:1，正式版必須換掉）。
  - 「目標 400–600 ■ 目標內」用深底版綠。
- 撞色角色：
  - 主要動作：頂列主按鈕（F5）、展開給藥紀錄。
  - 目前所在：藥物分頁、計算／病人資料分頁、展開中段落的編號、手機切換。
  - 你的選擇：勾選的候選方案列、what-if 曲線／輸注條／起始線、提示列。
  - 現在：曲線上的「現在」標籤。
  - 瀏覽器表面：選取、游標、焦點、勾選框。
- 拿掉與 craft-floor 衝突的寬彩色左邊框：`.regimen-pick-bar`、`.demo-banner`、`.flag-item` 的 3 px 左線。試做檔裡勾選列的 3 px 左線也不要做。
- 四個撞色（洋紅、朱紅、芥末黃、不用撞色）× 四個模組 × 四種寬度都要拍圖看。重點看芥末黃在白底上沒有被當字或線用，以及深藍板上所有字的對比。
- 會改到曲線 SVG 裡的顏色屬性（what-if 從 `var(--amber)` 改成 `var(--accent-ink)`）。golden 只比座標，應該 0 差異；如果有差異，先停下來回報。
- 要用的 skill：`impeccable` 的 colorize、bolder、craft-floor 與 audit（對比），`emil-design-eng`，`dataviz`（what-if 線與圖例）。

### F3　候選方案表照 C3 改，跟曲線並排
- 欄位改成：方案（q12h 加「現行」標籤）、劑量／輸注、AUC₂₄、Cmin、Cmax、判讀。
  - 「間隔」欄併進方案欄。
  - 判讀只放狀態字加 8 px 小方塊，完整說明放 `title`（決議 5）。
  - 單選鈕保留（勾選後疊畫在曲線上）。
- 自訂列：mg、min、q…h 都放進同一條格線，單位放在輸入框裡面或緊貼在框右側，三個框對齊上面各列。
- ≥1600 px 時曲線與候選方案並排（約 1.15 : 1），「監測與下次抽血」接在候選方案下面。目標：24 吋第一屏同時看得到判讀、參數、注意事項、曲線、候選方案。
- 手機：候選方案改成每個方案一張小卡（方案＋劑量一行、AUC／Cmin／Cmax 一行、狀態字），不用橫向捲。
- AMG、AED 的候選表也要跟著改。這會動到 golden 的 `regimenTable` 文字，**要先回報差異、等 Brandon 核可**。也可以只用 CSS 隱藏欄位、把評語收進 `title`，讓 textContent 不變。哪一種可行要先評估，再回報。
- 要用的 skill：`impeccable` 的 layout、adapt 與 craft-floor，`emil-design-eng`，`break-ui`（極端劑量、長評語）。

### F4　注意事項一行化、AI Prompt 收合
- 「A 健全性檢查與假設」照 C3 縮成一行：「注意事項　無明顯健全性疑慮……」。有警示時逐條列出，但不帶大標題與編號。
- AI Prompt 收合成一行（「AI 諮詢 Prompt　整合 lab 趨勢與病程後的第二意見　展開」），點了才展開，複製鈕在收合列上也能用。
- 空白頁的「A 健全性檢查與假設」空區塊不要顯示。（E3）
- 要用的 skill：`impeccable` 的 distill 與 clarify。

### F5　頂列與左欄
- 示範病例：左欄大橫幅拿掉，改成頂列小標（決議 3）；右區那條原本就隱藏，不用動。
- 頂列照 0.1 節的 TPN 模式重做：病人下拉、選擇紀錄、主按鈕（儲存為新紀錄…／儲存更新）、處方 ▾、傳送與備份 ▾、撞色。另存視窗有三條路。「病人 ▾」面板拿掉，內容拆進上述元件。所有既有 id 保留；`tests/test_patient_manager_flow.js` 與 `test_d4_header.js` 跟著改。
- 分頁列「計算／病人資料」保留在頂列正下方，身分條移到分頁列右側。
- 1920 與 1440 寬的頂列都要是一行，不能掉到左下角；1024 寬以下才允許換行，換行時靠右對齊。
- 左欄欄位的標籤要貼近自己的輸入框：標籤下方 4 px、欄位組之間 12–14 px。（D1）
- 卡片 03 的小標（第一筆給藥、維持處方、產生範圍）改成清楚的次標題；「第一筆給藥」下面重複的問句拿掉一個。（D5）
- AED 沒有濃度時，大數字位置不顯示「—」，改成「尚無濃度」小字。（E4）
- 要用的 skill：`impeccable` 的 layout 與 craft-floor，`emil-design-eng`，`mobile-native`（手機頂列）。

### F6　全面複驗
- 用 `break-ui` 的完整流程：把每個欄位的最糟值列成表 → 做一組最糟資料 → 在開發用頁面放「示範／最糟」切換 → 四種寬度看畫面 → 照它的格式出報告（壞掉的、要決定的、沒壞的）。
- 用 `review-animations` 審曲線動畫、收合動畫、時間軸跳轉標亮。
- 用 `impeccable` 的 audit（無障礙、效能、響應式）與 critique（啟發式評分）各跑一次，再用 polish 收尾。
- 截圖：照第 1 節列的情境重拍，跟 C3 並排，寫第 2 輪驗收報告（`docs/REDESIGN_ACCEPTANCE_v2.md`）。
- 通過後才進行 v2 計畫第 5 節的整體驗收（計時、Brandon 目視核可、merge）。

### F8　標籤減法審計（2026-10-23 加入，**還沒核可，F6 之後再做**）
依據：`DESIGN.md`「減法規則」、`PRODUCT.md` 原則 6。不是「把字刪光」，而是逐項審計副標與說明，能用版面解決的就不寫字。
- **做法**：① 把每個畫面的副標、括號說明、灰色說明句列成表（位置、字數、重講的是什麼、屬於「不可刪」還是「可減」）；② 每項照三題判斷測試與四級手段（版面→title→收合→刪除）決定；③ 逐項給 Brandon 看「前／後」，核可後才改；④ 動到 render 輸出（golden）的一律先停下來回報，優先用 CSS／title／收合達成（textContent 不變）。
- **範圍（初步清單）**：卡片與區塊標題下的灰色說明句（例如「勾選最左欄可在上方曲線疊加…」「危險（紅）＝…」）、左欄欄位標籤的括號說明、判讀板裡重複的「現行處方推算」小字、各區塊副標、空白頁的引導文字。
- **不碰**：單位、估計與實測的區別、院內與參考來源、缺資料原因、警示與限制、狀態字。
- **驗證（要量，不是只靠感覺）**：前後比較每屏文字數（1920×940 首屏）；5 秒測試（藥師 5 秒內講出判讀與下一步，各 3 位以上）；有條件的話，與 v2 第 5 節的整體驗收計時一起做；另用 `break-ui` 檢查拿掉說明後最糟資料下還讀得懂。
- **要用的 skill**：`impeccable` 的 distill、clarify、critique。

建議順序：F1 → F2 → F7 → F3 → F4 → F5 → F6。

---

## 3. 設計相關 skill 盤點與使用情形（2026-10-22 查證）

查證方法：讀了 `.claude/skills/SOURCES.txt`、各 skill 的 SKILL.md，並搜尋上一個對話的完整紀錄，看實際讀過哪些檔、呼叫過哪些 skill。

| Skill | 位置／來源 | 用途 | 上一輪實際使用 | 判定 |
|---|---|---|---|---|
| `impeccable` v4.6.0 | 專案 `.claude/skills/impeccable`（pbakaus/impeccable） | 設計全流程：shape、critique、audit、layout、typeset、adapt、polish、harden……，加上偵測器 | 有跑 `impeccable context` 與偵測器（`npx impeccable detect`，約 45 次）；讀過 SKILL.md、init.md、operate.md、document.md，D0／D1 用它寫了 PRODUCT.md 與 DESIGN.md | **不足**。規定「動任何 UI 前要讀」的 `craft-floor.md` 從沒讀過；layout、typeset、adapt、critique、audit、polish 的 reference 都沒讀。偵測器只抓得到色碼與字級，抓不到對齊和字被切，所以那些問題漏了 |
| `emil-design-eng` | 專案 `.claude/skills`（emilkowalski/skills） | UI 細節、元件打磨、動畫判斷 | **沒用** | 漏用。參數區對齊、標籤層級、單位擺放正是它的範圍 |
| `review-animations` | 同上 | 審查動畫品質 | **沒用** | 漏用。D3 曲線動畫、收合動畫、標亮都沒審 |
| `break-ui` | 同上 | 用最糟資料試破版，出固定格式報告 | 呼叫過一次（D8），但**沒照流程**：沒列欄位表、沒做切換鈕、沒用它的報告格式；只用程式掃描超出視窗的元素 | 用了但不完整。這是窄寬度標題斷行、手機候選表被漏掉的原因之一 |
| `mobile-native` | 專案 `.claude/skills` | 手機原生感：100vh、輸入放大、點擊延遲、安全區 | D7 套用了它的幾條規則（16 px、touch-action、dvh、safe-area），但**沒讀 SKILL.md** | 部分使用 |
| `ponytail` | 專案 `.claude/skills` | 最小改動、少寫程式 | 沒用 | 不是設計 skill，可選用 |
| `dataviz`（全域） | Claude 內建 | 圖表、stat tile、圖例、軸、標籤的規則 | **沒用** | 漏用。曲線標籤壓線、圖例被切、參數格（stat tile）都在它的範圍 |
| `artifact-design`、`artifact-diagramming` | Claude 內建 | 發布用的網頁成品 | 不適用（主檔不是 artifact） | — |

結論：上一輪偏重「計算不變」的測試，以及偵測器能抓的色碼與字級；**以眼睛看畫面為主的設計審查，與這些 skill 的流程都沒有充分用上**。第 1 輪驗收的問題大多落在這個缺口：對齊、標題斷行、標籤壓線、手機表格。v3 用第 1 節的新規則 2 補上。

每包要讀的檔（`<skill 目錄>` 指 `.claude/skills`）：

| 包 | 必讀 |
|---|---|
| 所有包 | `impeccable/SKILL.md`、`impeccable/reference/craft-floor.md`（動 UI 前） |
| F1 | `impeccable/reference/typeset.md`、全域 `dataviz` skill、`break-ui/SKILL.md`、`break-ui/CATALOG.md` |
| F2 | `impeccable/reference/layout.md`、`typeset.md`；`emil-design-eng/SKILL.md`；`dataviz`（stat tile） |
| F3 | `impeccable/reference/layout.md`、`adapt.md`；`emil-design-eng/SKILL.md`；`break-ui` |
| F4 | `impeccable/reference/distill.md`、`clarify.md` |
| F5 | `impeccable/reference/layout.md`；`emil-design-eng/SKILL.md`；`mobile-native/SKILL.md`；對照 `../TPN calculator/TPN調配試算.html` 的頂列與另存視窗（`header.top`、`#addRecordOverlay`、`guardUnsaved`） |
| F7 | `impeccable/reference/colorize.md`、`bolder.md`、`audit.md`（對比）；`emil-design-eng/SKILL.md`；全域 `dataviz` |
| F6 | `break-ui`（完整流程）、`review-animations/SKILL.md` 與 `STANDARDS.md`、`impeccable/reference/audit.md`、`critique.md`、`polish.md` |

---

## 4. 給新對話的啟動 prompt（Brandon 直接貼）

```
先讀 docs/REDESIGN_PLAN_v3.md、docs/REDESIGN_ACCEPTANCE_v1.md、docs/REDESIGN_PROGRESS_v1.md，
再看 docs/direction/shots/C3_24in_allcollapsed.png 與 C3_24in_fold.png（設計目標）。
分支 redesign，master 不動。照 v3 第 1 節的規則：每包先寫失敗測試、動 UI 前讀 craft-floor 與該包列的 skill、
用 tools/shoot_review.py 在 1920／1440／1024／390 拍圖逐張目視（重點：對齊、字被切）、跟 C3 並排比對。
golden 有差異先停下來回報。從 F1 開始（順序 F1 → F2 → F7 → F3 → F4 → F5 → F6），每包完成用白話回報並停下來等我說「繼續」。
頂列與存檔照 v3 第 0.1 節（TPN 調配試算的模式，附檔路徑 ../TPN calculator/TPN調配試算.html）。
```
