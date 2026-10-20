# 改版施工進度（REDESIGN）

> 施工規格：`docs/REDESIGN_PLAN_v2.md`（專案文件 `claude/REDESIGN_PLAN_v2.md`）。每包完成後更新本檔。
> 舊翻修（Phase 0 到 5）的紀錄在 `claude/UIUX_PROGRESS_v1.md`；那份寫的「下一步 Phase 6」已作廢，Phase 6、7 併入本計畫 D4、D8。

最後更新：2026-10-20（L-E 完成，等 Brandon 說「繼續」做 L-F）

## 現況

- 分支：`redesign`（從 `master` 的 `e2712d6` 分出）。`master` 不動。
- 下一包：**L-F**（小修：SCr 頻率判斷、四捨五入浮點、共用電腦提醒與清除鈕、SCr 日期說明）。
- 測試基準：15 支既有測試＋`test_pk_reference.js` 全過；golden 124/124 0 差異；設計偵測 69 項。

## 工作包狀態

| 包 | 狀態 | commit | golden 基準更新與核可 | 備註 |
|---|---|---|---|---|
| L-A | 完成（待 Brandon 看過） | 見 git log | 無需更新（golden 124/124 0 差異，情境本來就有選性別與 SCr） | 見下方備註 |
| L-B | 完成（待 Brandon 看過） | 見 git log | 無需更新基準（golden 124/124 0 差異；只改了情境設定，補點 radio） | 見下方備註 |
| L-C | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 5 項：V1／V2／V3 候選方案表評語欄、A1 旗標文字與 AI prompt；基準已更新，124/124 | 見下方備註 |
| L-D | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 11 項：V1／V2／V3／V4 的候選方案、loading 建議、旗標區、AI prompt；基準已更新，124/124 | 見下方備註 |
| L-E | 完成 | 見 git log（程式、azole 測試、基準各一個 commit） | 2026-10-20 Brandon 核可：9 條 azole 斷言改法、golden 24 項差異（A1／A2／A3、Z1／Z2；31 個欄位）；基準已更新，124/124 | 見下方備註 |
| L-F | 未開始 | | | |
| D0 | 未開始 | | | 停：Brandon 核可 PRODUCT.md、DESIGN.md |
| D1 | 未開始 | | | 停：Brandon 選方向 |
| D2 | 未開始 | | | |
| D3 | 未開始 | | | |
| D4 | 未開始 | | | |
| D5 | 未開始 | | | |
| D6 | 未開始 | | | golden 曲線比對改法單獨核可 |
| D7 | 未開始 | | | |
| D8 | 未開始 | | | |

## 施工中發現、新 session 要知道的事

（每包完成後在這裡補：跟規格不同的地方、Brandon 當場的決定、踩到的坑）

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
