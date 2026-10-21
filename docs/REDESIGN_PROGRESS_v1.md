# 改版施工進度（REDESIGN）

> 施工規格：`docs/REDESIGN_PLAN_v2.md`（專案文件 `claude/REDESIGN_PLAN_v2.md`）。每包完成後更新本檔。
> 舊翻修（Phase 0 到 5）的紀錄在 `claude/UIUX_PROGRESS_v1.md`；那份寫的「下一步 Phase 6」已作廢，Phase 6、7 併入本計畫 D4、D8。

最後更新：2026-10-21（Brandon 核可 C3 版面與改寫後的 DESIGN.md；L-G 候選間隔程式完成，等 golden 核可，之後做 D2）

## 現況

- 分支：`redesign`（從 `master` 的 `e2712d6` 分出）。`master` 不動。
- 下一包：**D2**（換外觀，照 C3 與改寫後的 DESIGN.md）。要先等 Brandon 核可改寫後的 DESIGN.md。L 系列全部完成；D0 原版 DESIGN.md 已被 C3 取代。
- 測試基準：15 支既有測試＋`test_pk_reference.js` 全過；golden 124/124 0 差異；設計偵測 69 項。

## 工作包狀態

| 包 | 狀態 | commit | golden 基準更新與核可 | 備註 |
|---|---|---|---|---|
| L-A | 完成（待 Brandon 看過） | 見 git log | 無需更新（golden 124/124 0 差異，情境本來就有選性別與 SCr） | 見下方備註 |
| L-B | 完成（待 Brandon 看過） | 見 git log | 無需更新基準（golden 124/124 0 差異；只改了情境設定，補點 radio） | 見下方備註 |
| L-C | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 5 項：V1／V2／V3 候選方案表評語欄、A1 旗標文字與 AI prompt；基準已更新，124/124 | 見下方備註 |
| L-D | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 11 項：V1／V2／V3／V4 的候選方案、loading 建議、旗標區、AI prompt；基準已更新，124/124 | 見下方備註 |
| L-E | 完成 | 見 git log（程式、azole 測試、基準各一個 commit） | 2026-10-20 Brandon 核可：9 條 azole 斷言改法、golden 24 項差異（A1／A2／A3、Z1／Z2；31 個欄位）；基準已更新，124/124 | 見下方備註 |
| L-F | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 5 項：V1／V2／A1／A2／A3 的監測建議 SCr 頻率文字；基準已更新，124/124 | 見下方備註 |
| D0 | 文件完成，等 Brandon 核可 PRODUCT.md、DESIGN.md | 見 git log | 不適用（沒改 index.html） | 停：核可後才做 D1；重點看 DESIGN.md 頂端說明的三處「我提出的」 |
| D1 | 第三輪 C3 完成；DESIGN.md 已依 C3 改寫，等 Brandon 核可 | 見 git log | 不適用（沒改 index.html） | 方向：C3（洋紅預設、可自選強調色、參數兩列）。核可 DESIGN.md 後做 D2 |
| D2 | 未開始 | | | |
| D3 | 未開始 | | | |
| D4 | 未開始 | | | |
| D5 | 未開始 | | | |
| D6 | 未開始 | | | golden 曲線比對改法單獨核可 |
| D7 | 未開始 | | | |
| D8 | 未開始 | | | |

## L 系列驗收（Opus 5.5，2026-10-20）

**通過**
- 測試：21 支全過；golden 124/124；每次基準更新都有 Brandon 核可紀錄（見上表）。
- 紅線（用程式比對 `e903dcd` 與目前版本）：R1 只有計畫核可的函式與常數被改（`checkAzoleTrough` `inferInfusionMinutes` `regimenTag` `regimenTagAmino` `roundDoseTo250` `roundDoseAmino`、`AZOLE_TARGETS`、`AZOLE_HEADER` 的說明文字），`buildAiPrompt*` 沒動；R3 沒有刪除或改型別的 id；R4 新元素沒用 `entry-row`；R10 沒有新增 localStorage key。
- 版面（本機沒有 playwright，改在內建瀏覽器照 `ui_layout_check.py` 的 L1–L4 手動跑）：4 模組 × 1440／1024／390 寬，示範病例與空白頁、所有摺疊區展開，都沒有水平捲軸、左右欄對齊、控制項不超出卡片、沒有 console 錯誤。
- 設計偵測：驗收當下 70 項（施工前 69）。

**驗收後修正（Brandon 2026-10-20 核可：第 1–5 點照建議修，第 6 點留到之後；另加對齊與首劑 loading）**
- 第 1 點：`buildAiPrompt*` 五處性別改成「男／女／未填」（R1 例外，Brandon 核可）。
- 第 2 點：AMG 的 Vd 說明合成一則；有乾體重時寫「以乾體重 X 為起點，再依規則採 Y」，乾體重低於 IBW 時不再把它叫做 TBW。
- 第 3、5 點：必答題移出進階區，改用 `ui-radio-group`／`ui-radio` 樣式（不再吃 `.field label`），放在「產生範圍」下面、永遠看得到。
- 第 4 點：`steadyStateHint` 改成「請選『第一筆紀錄就是本療程第一劑』」。
- Brandon 追加：「首劑 loading」也移出進階區變成直接的勾選項。`vancoAdv`、`amgAdv` 因此沒有內容，保留元素與 id（R3）但加 `hidden`；`ADV_SUMMARY_CFG` 兩個模組都不再同步摘要。
- Brandon 追加（截圖 05 區塊沒對齊）：
  - `.field-row` 改成靠上對齊（`align-items:start`）。用瀏覽器量過四個模組在 1440／1024／390 寬，每一列輸入框上緣差都是 0；原本靠下對齊在「下方多一行說明」的列差 36–37 px，其他列也有 1–4 px 的小錯位。
  - 勾選框拿掉瀏覽器預設外距、對齊第一行文字中線；放在 `.field` 裡的勾選文字（q8h 等）不再吃欄位標題樣式。四個模組所有勾選框與 radio 量過都和文字差 ≤1.5 px。
  - 整列只有一個欄位時，標題不預留兩行高度；勾選列後面接欄位列時多 12 px 間距（「候選給藥間隔」才會貼近自己的勾選框）。
- 新測試：`tests/test_l_followup.js`（23 項）。全部測試過、golden 124/124 0 差異（沒有計算輸出改變）、三種寬度版面檢查過。
- 設計偵測：72 項。和施工前 69 相比多 3 項，都是既有樣式被「看見」，不是新的樣式：
  - 2 項灰色說明字對比不足：兩個穩態說明行原本在收合區（偵測器略過），移出來後被算進去；與其他 60 項是同一個 `.hint` 顏色問題。
  - 1 項 11 px 小字：L-E3 把 AMG 表頭加長成「Cmax(peak，輸注結束後 30 分)」，表頭本來就是 11 px。
  - 三項都留給 D2 統一換色、換字級（D2 驗收要求這兩類歸零）。

**驗收當下發現的問題（第 1–5 點已在上面修正）**
1. 性別空白時 AI prompt 寫成「女」：vancomycin HD、azole、AED 三處性別不是必填，`buildAiPrompt*` 用 `sex==='M'?'男':'女'`，空白就變成女。L-A 之前預設是男所以沒發生。要修得動 `buildAiPrompt*`（R1），需 Brandon 決定。
2. AMG 填了乾體重時，Vd 說明前後矛盾：舊旗標說「改用乾／平常體重 72 kg」，新旗標說「IBW 67.7 kg」，實際用的是 67.7。L-E2 規格是「改寫」說明旗標，我是另外新增一則、沒改舊的。
3. 新的二選一 radio 包在 `.field` 裡，吃到 `.field label` 樣式（11.5 px、block、min-height），字偏小、圓點與文字略錯位；設計偵測因此 +1。
4. vancomycin 的穩態說明（`steadyStateHint`）結尾還寫「請勿勾選」，現在是選項不是勾選。
5. 使用性：必答 radio 放在預設收合的「進階」區；缺資料清單點下去會展開，但平常看不到。建議 D 系列移出進階區。
6. 範圍外：HD 路徑的「建議下次透析後劑量」沒有附輸注時間。

## 施工中發現、新 session 要知道的事

（每包完成後在這裡補：跟規格不同的地方、Brandon 當場的決定、踩到的坑）

### D1 第三輪（2026-10-21）
- Brandon 選洋紅（C2c）為預設，但要讓使用者自己換 → 頂列四色塊（洋紅、朱紅、芥末黃、不用撞色），存 `tdm_ui_accent`（符合 R10 的 `tdm_ui_` 前綴）。洋紅在深藍頂列上只有 2.4:1，所以洋紅與「不用撞色」時分頁底線改白色。
- 「完整參數一行一個太浪費」→ 10 個參數併進上方兩列（AUC₂₄ 大字跨兩列），拿掉重複整段。這剛好對應工具既有 `paramGrid` 的 10 格，D2 只要用 CSS 排版，不用改 render。
- DESIGN.md 全面改寫成 C3 的系統（取代 D0 版本），待核可；impeccable context 讀得到、沒有格式警告。
- Brandon 問左邊能不能收合 → C3 加上：段落收合＋收起時顯示摘要、左欄頂端段落列（01–06 跳轉、全部收合／展開）、給藥紀錄只顯示最近 3 筆。在一般瀏覽器測過點擊行為（跳轉、全部收合／展開、單段切換與 aria-expanded、展開較早劑次、強調色存檔）。實作時屬 R7（改寫 `initCollapsibleCards`），要單獨一包驗收。

### D1 第二輪（2026-10-21）
- Brandon 回饋：(1) 目標帶尺等「重講數字的圖」沒用，藥師看數字就知道（已存成記憶 no-redundant-visual-aids）；(2) 綠色配色 AI 味重，要黑白灰＋深藍＋大膽撞色、優雅有質感；(3) 右邊要固定在畫面上，不捲動就看到最重要的資訊、左邊輸入時即時看到變化，細節往下捲。
- 做了 C2 三種撞色（芥末黃／朱紅／洋紅）。**這會推翻 D0 已核可的 DESIGN.md 配色**（藍綠主色、綠色 OK 底色），選定撞色後要先改 DESIGN.md 再做 D2。
- 固定面板踩到的坑：`position:sticky` 要放在右欄外層 `.right`（它的父層 `.app` 跟左欄一樣高），放在 `.rp` 上不會黏，因為 `.rp` 的父層跟它一樣高。已在一般瀏覽器 1440×900 驗證：左邊捲到底時，右邊判讀數字、曲線、候選方案表都還在畫面內。
- Brandon 追加（2026-10-21）：**以 24 吋螢幕（1920×1080）為最主要優化目標，手機其次**。C2 在 ≥1600 寬改成曲線與候選方案並排，首屏多了監測與下次抽血；並排時曲線另用 656 寬的畫布，文字才維持 ≥12 px。PRODUCT.md 的「桌機寬度通常 1440」已改正。之後各包的驗收截圖都以 1920×940 為主。
- 芥末黃在白底只有 1.8:1，所以撞色一律當填色（配深色字）或放在深藍頂列上，不當白底上的細線。

### D1
- Brandon 2026-10-20 核可 D0，並加了一條限制：**不動基礎版面架構（左資料輸入、右看結果／儀表板），在這個前提下盡量發揮創意**。所以計畫原本的 C 案（三欄、多一條左側段落目錄）改成別的方向；三張板都守住左填右看，差別在右區怎麼組織與一個招牌想法（A 目標帶尺、B 全寬時間軸、C 同一把尺的儀表板）。
- 數字全部來自示範病例；曲線用工具讀出的 CL 4.38、Vd 49.8 與 7 劑紀錄算出，對得上工具輸出（預測 24.7 vs 實測 24.6；trough 11.8；Cmax 28.2、Cmin 11.7）。
- 截圖用本機 Edge 無頭模式（桌機 1440×900、手機 390×844，各有首屏與整頁）。手機要用 390 寬的 iframe 包起來截，因為無頭 Edge 視窗最窄約 500 px，直接截會把版面撐寬、右邊被切掉（這個坑我踩過）。
- 自我檢查抓到並修掉的問題：目標帶尺標籤互相重疊、曲線左側三分之一空白、圖上文字壓到虛線、表頭與數字沒對齊、C 案「現行」標記的 CSS 選擇器寫錯、手機版右欄被表格撐寬到 438 px、手機尺的刻度擠在一起。三個檔案在 390 寬都沒有水平捲軸。
- 這幾張只是方向板：沒有計算、沒連 `index.html`；產生器放在 `docs/direction/src/`。

### D0
- 寫了 repo 根目錄的 `PRODUCT.md`（impeccable 的產品模板；內容取自計畫 D0 與 Brandon 的核可決定，沒有另外訪談，推論處標「（推論）」）與 `DESIGN.md`（YAML token＋八個標準段落＋最後一節「從現況到目標」對照表）。`impeccable context` 讀得到兩份、平台判為 web、沒有過期或格式警告。
- DESIGN.md 的色彩對比都用程式算過：`ink-soft` 在紙／白／欄位／所有狀態底色上最低 4.88:1；白字在主色 5.92:1、在頂列 11.19:1；輸入框邊界對白 3.54:1、對紙 3.23:1；各狀態文字色在自己的底色上 ≥6.3:1。
- 三處是我提出、計畫沒明說的，請 Brandon 核可時看：
  1. 數字另用 `Segoe UI, system-ui, Microsoft JhengHei…` 堆疊（`tabular-nums`），因為我無法確認微軟正黑體的拉丁數字等寬；D2 要在 Windows 實機確認，不行就退回計畫的單一堆疊。
  2. 字重只用 400 與 700（微軟正黑體只有兩檔，500／600 在 Windows 與 Mac 長得不同）。
  3. 輸入框邊界改成 `#7F8B84`（符合介面元件 3:1），是肉眼看得到的變化：輸入框邊界會比現在深。
- 時間軸圖例：給藥＝短直條、抽血＝實心圓、SCr＝菱形（不靠顏色）。創意主軸取名「會診工作底稿」，也是我提的。

### L-A
- 規格寫的路徑 `claude/REDESIGN_*.md` 實際在 `docs/`；本機是 Claude Code 直接在 repo 內施工，沒有用 device bridge。
- 演示病例的性別：HTML 預設值現在是空白，所以四個 `initDefaults*` 開頭各加一行明確設為 `M`（開頁 `?demo=1` 與按鈕載入兩條路徑都走這裡）。
- 規格沒寫、但必須動的測試：`tests/test_amg_prospective_fix.js` 清空後只填年齡、身高、體重就期待有候選方案；現在要選性別才會算，所以在填體重後加一行 `amgSex='M'`。只加設定，斷言沒動。
- 年齡檢查寫在 `requiredFieldFilled` 的 `adult` 旗標；缺資料清單的年齡文字一律顯示「年齡（本工具適用 18 歲以上）」（連空白時也是）。
- SCr 缺項用新的 `kind:'rows'`；點清單會捲到 SCr 表。
- Azole／AED 的 <18 歲警示放在旗標區最後一則；AED 性別空白時不算 CrCl。Azole 本來就沒有 CG 計算，只有警示。
- 新測試：`tests/test_required_inputs_v2.js`（32 項）。

### L-B
- radio 與隱藏 checkbox 放在原本進階區（vancoAdv／amgAdv）的同一位置。必答題藏在摺疊的「進階」裡不太好找：缺資料清單點下去會自動展開進階區並聚焦 radio；D 系列重排時建議把這題移出進階區。
- AMG 的 `amgSteadyStateRow` 改成包住整組 radio 的容器，TIW 顯示切換從 `flex` 改 `block`（只是版面）。
- 守門條件：vanco 非 HD、且給藥表至少一筆有效列；AMG 另加「該列沒被 TIW 隱藏」。HD 與計畫處方預測模式不要求。
- 示範病例：`initDefaults`／`initDefaultsAmg` 開頭明確選「第一筆是第一劑」（等於原本 checkbox 未勾）。
- 讀存檔：`syncFirstDoseRadio` 依 checkbox 帶出 radio；清空時 `clearFirstDoseRadio`。存檔結構沒動。
- 測試設定更新（斷言沒動）：`test_ui_golden.js` 加 `h.radio`，並在 V1／A1／A2 展開給藥後選第一劑、V2 改點「已達穩態」radio（效果等同原本勾 checkbox）。
- 新測試：`tests/test_first_dose_kind.js`（30 項）。
- 沒做：雲端版面檢查與設計偵測；畫面目視由 Brandon 看（見下）。

### L-C
- 改了：`regimenTag`（依序判斷 AUC>600 或 Cmin>20 → 風險；AUC<400 → 低於目標；Cmin>15 → 留意；其餘符合）、兩處 `flagClassFor` 的 AUC 規則（>600 紅、<400 黃）、`regimenTagAmino`（拿掉 0.85／1.25 容許帶；trough 超過上限 1.5 倍才 danger，文字註明這是工具自訂分級）。
- 規格沒寫但順手動了字面：AMG trough danger 文字拿掉「明顯」，保留「腎／耳毒性風險高」再加規格要求的自訂分級註記；peak 低於下限的文字拿掉「，可能療效不足」（照規格寫法）。
- `tests/load_harness.js` 的匯出清單加 `regimenTag`（ANCHOR 沒動）。
- 新測試：`tests/test_regimen_tags.js`（24 項）。既有測試沒有斷言舊文字，沒改。
- golden 5 項差異（都在計畫預期內）：V1 候選方案表 q8h「略接近邊界」→「符合目標（AUC 400–600）」（AUC 408 現在算達標）；V2 q8h「略接近邊界」→「Cmin 15–20，腎毒性風險略升」、q12h／q24h「符合目標」→「符合目標（AUC 400–600）」；V3 q8h 同 V2 的 Cmin 文字；A1 旗標「Peak 6.8 低於目標下限 8，可能療效不足」→「…低於目標下限 8」，AI prompt 同一句。2026-10-20 Brandon 核可，基準已更新。

### L-F
- L-10：新 `scrTrendUnstable`／`scrFreqText`（放在 `roundDoseTo250` 旁）。vanco 與 AMG 的監測文字改看趨勢（≥2 筆且最後／最早 >1.3 或 <0.7 → 每 1–2 天（腎功能變動中）；否則每 2–3 天至每週，只有一筆時加註）。`aminoMonitorHtml` 的 `scr` 參數換成 `renalUnstable` 加 `scrCount`（規格只說傳布林值，多傳筆數是為了「僅一筆 SCr」的加註）。
- L-11：`roundDoseTo250`、`roundDoseAmino` 加 `+1e-9`。
- L-13：提醒文字與按鈕加在四個模組的「更多」區塊（病人管理在每個模組各一份）。第一個按鈕 id 是規格的 `tdmClearAllLocal`，其餘三個是 `tdmClearAllLocalAmg`／`Azl`／`Aed`，四個都清同一批資料（四個病人 key；`tdm_ui_` 不動）。按下先 `confirm` 列出各模組幾位；全部都沒資料時改跳 `alert` 說沒有。清除後刷新四個模組的病人下拉。四個匯出按鈕加 `title`「匯出檔含病歷號」。
- L-14：新 `scrDateNoteFlags`，vanco 與 AMG 擬合路徑各呼叫一次，ok 等級。golden 情境的 SCr 日期離濃度不到 48 小時，所以 golden 沒有這則。
- 新測試：`tests/test_l_f_minor.js`（37 項）；`load_harness.js` 匯出加 `roundDoseTo250`、`roundDoseAmino`。
- golden 5 項差異：V1、V2（SCr 1.2→1.4，只上升 1.17 倍，未達 1.3 倍；舊規則因最新值 ≥1.2 就判不穩定）監測文字「每 1–2 天（腎功能不穩定）」→「每 2–3 天至每週」；A1、A2（單筆 SCr 1.0）加註「（僅一筆 SCr，無法判斷趨勢）」；A3（HD、單筆 SCr）「每 1–2 天（腎功能不穩定）」→「每 2–3 天至每週（僅一筆 SCr，無法判斷趨勢）」。2026-10-20 Brandon 核可，基準已更新。
- 提醒：A3 是透析病人，SCr 趨勢本來就不適用，現在不再因為 SCr ≥1.2 被一律說「不穩定」；透析病人的監測頻率文字另有「依透析排程調整抽血時機」一行。

### L-E
- E1：`AZOLE_TARGETS` 改院內值，UpToDate 存 `ref` 欄位只顯示；vori 新增 `cautionLine:5`、`refToxicityLine:5.5`；posa 治療下限 1.25、拿掉 preferLo／preferHi、>1.83 升為 warn；isavu 院內 2–5，4.6–5.1 改 note，拿掉 `typicalFloor`。`checkAzoleTrough` 與 `updateAzoleTargetDisplay` 對應修改，頁首與頁尾說明文字改「院內 TDM protocol 為主、UpToDate 為輔」。
- E2：AMG 的 Vd 先驗改用 `weightForCG(...)` 選出的體重（IBW／AdjBW／TBW），並加一則 ok 旗標寫明用哪一個（規格只說「說明旗標改寫」，這則是新增，每個 AMG 結果都會出現）。Vanco 極度肥胖（BMI ≥40 且體重 ≥120 kg）改 0.52 L/kg。只影響非 HD 路徑。
- E3：AMG 表頭改「Cmax(peak，輸注結束後 30 分)」；ODD 策略時目標顯示加一行 30 分鐘說明；計算沒動。
- 新測試：`tests/test_l_e_targets.js`（49 項，全過）。
- 既有 azole 斷言改了 9 條（`test_azole_core_logic.js` 8 條、`test_azole_integration.js` 1 條）並在 core 新增 isavu 5.2 一條（62→63 項）：vori 預防 0.6 改 warn；vori 5.6 改 note（加註 UpToDate 上限 5.5）；vori 6.0 那條改成 6.2 warn 且文字寫院內上限 6；posa 2.0 與 2.5 改 warn（>1.83 院內肝毒性警戒）；isavu 0.5 改 warn（院內下限 2）、原「低值只有 note」那條改成 warn 文字提到感染科；isavu 5.0 改 note；integration isavu 6.0 改檢查「超過院內上限 5」。注意：這 9 條的逐條清單是核可之後才在回報裡列出，核可當下 Brandon 看到的只有條數。
- golden 差異（已核可、基準已更新）：A1／A2／A3 AMG（Vd 換成體重選擇後的體重、多一則 Vd 體重旗標、表頭、A2 目標顯示多一行）；Z1 vori（預防 trough 0.7 低於院內下限 1 → warn，劑量建議出現增量 25–50%）、Z2 posa（trough 3.9 > 1.83 → warn）；V1–V4、E1／E2 沒有差異。

### L-D
- `inferInfusionMinutes` 改為 `Math.max(60, Math.ceil(mg/250 - 1e-9)*30)`，對照表逐點測過（250→60 … 3000→360），浮點邊界也測過。4 個呼叫點不用改。
- 新純顯示 `infusionRuleFlags()`，在 `render()`（擬合檢查之後）與 `renderVancoHD()`（透析時程旗標之後）各呼叫一次。**和規格不同的一點**：規格寫「第 N 劑 X mg 輸注 Y 分鐘」，我把劑量與輸注分鐘相同的多劑合併成一則（例如「第 1–7 劑 1000 mg 輸注 60 分鐘…」），不然 30 筆紀錄會跳 30 則警示。文字其餘照規格。
- 示範病例：HTML 的 `maintInf` 預設值 60 → 120（只有示範用；空白頁被清成空值）。HD 的 `hdMaintInf` 預設 60 沒動：使用者自己填劑量，劑量超過 500 mg 時會被提示。
- 副作用（正常）：V2 的旗標區原本在有其他警示時還會先顯示一句「未偵測到明顯的健全性疑慮」（既有行為：這句是在後面的旗標加進來之前判斷的）；新旗標加在判斷之前，所以有輸注提示時這句不再出現。
- 另外：`test_amg_mic_efficacy.js` 在整批跑時失敗過一次（單獨跑 46/46 全過），疑似整批同時載入 jsdom 的偶發逾時，不是這包造成的；下次整批再觀察。
- 新測試：`tests/test_infusion_rule.js`（33 項）；`load_harness.js` 匯出清單加 `inferInfusionMinutes`。
- golden 11 項差異：V1 旗標區多「第 1–7 劑 1000 mg 輸注 60 分鐘…」，候選方案 q12h 1000 mg 60→120 分（Cmax 33.8→32.5、Cmin 14.1→14.7）、q24h 1750 mg 120→210 分（Cmax 41.0→38.7、Cmin 7.2→7.6），AI prompt 同步；V2 旗標區多 2 則（第 1 劑 2000 mg／120 分、第 2–5 劑 1250 mg／90 分），loading 建議 1750 mg 輸注「120 分鐘以上」→「210 分鐘以上」，候選方案 q8h 750 mg 60→90 分、q12h 1000 mg 60→120 分，AI prompt 同步；V3 候選方案 q24h 750 mg 60→90 分，AI prompt 同步；V4 旗標區多「第 1–3 劑 750 mg 輸注 60 分鐘…」，AI prompt 同步。2026-10-20 Brandon 核可，基準已更新。
