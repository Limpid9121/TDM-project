# 改版施工進度（REDESIGN）

> 施工規格：`docs/REDESIGN_PLAN_v2.md`（專案文件 `claude/REDESIGN_PLAN_v2.md`）。每包完成後更新本檔。
> 舊翻修（Phase 0 到 5）的紀錄在 `claude/UIUX_PROGRESS_v1.md`；那份寫的「下一步 Phase 6」已作廢，Phase 6、7 併入本計畫 D4、D8。

最後更新：2026-10-20（L-C 完成，等 Brandon 說「繼續」做 L-D）

## 現況

- 分支：`redesign`（從 `master` 的 `e2712d6` 分出）。`master` 不動。
- 下一包：**L-D**（Vancomycin 輸注時間：每 500 mg 至少 1 小時）。
- 測試基準：15 支既有測試＋`test_pk_reference.js` 全過；golden 124/124 0 差異；設計偵測 69 項。

## 工作包狀態

| 包 | 狀態 | commit | golden 基準更新與核可 | 備註 |
|---|---|---|---|---|
| L-A | 完成（待 Brandon 看過） | 見 git log | 無需更新（golden 124/124 0 差異，情境本來就有選性別與 SCr） | 見下方備註 |
| L-B | 完成（待 Brandon 看過） | 見 git log | 無需更新基準（golden 124/124 0 差異；只改了情境設定，補點 radio） | 見下方備註 |
| L-C | 完成 | 見 git log（程式與基準各一個 commit） | 2026-10-20 Brandon 核可 5 項：V1／V2／V3 候選方案表評語欄、A1 旗標文字與 AI prompt；基準已更新，124/124 | 見下方備註 |
| L-D | 未開始 | | | |
| L-E | 未開始 | | | |
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
