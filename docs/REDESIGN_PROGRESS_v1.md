# 改版施工進度（REDESIGN）

> 施工規格：`docs/REDESIGN_PLAN_v2.md`（專案文件 `claude/REDESIGN_PLAN_v2.md`）。每包完成後更新本檔。
> 舊翻修（Phase 0 到 5）的紀錄在 `claude/UIUX_PROGRESS_v1.md`；那份寫的「下一步 Phase 6」已作廢，Phase 6、7 併入本計畫 D4、D8。

最後更新：2026-10-19（L-B 完成，等 Brandon 說「繼續」做 L-C）

## 現況

- 分支：`redesign`（從 `master` 的 `e2712d6` 分出）。`master` 不動。
- 下一包：**L-C**（達標標籤照實分類）。
- 測試基準：15 支既有測試＋`test_pk_reference.js` 全過；golden 124/124 0 差異；設計偵測 69 項。

## 工作包狀態

| 包 | 狀態 | commit | golden 基準更新與核可 | 備註 |
|---|---|---|---|---|
| L-A | 完成（待 Brandon 看過） | 見 git log | 無需更新（golden 124/124 0 差異，情境本來就有選性別與 SCr） | 見下方備註 |
| L-B | 完成（待 Brandon 看過） | 見 git log | 無需更新基準（golden 124/124 0 差異；只改了情境設定，補點 radio） | 見下方備註 |
| L-C | 未開始 | | | |
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
- AMG 的  改成包住整組 radio 的容器，TIW 顯示切換從  改 （只是版面）。
- 守門條件：vanco 非 HD、且給藥表至少一筆有效列；AMG 另加「該列沒被 TIW 隱藏」。HD 與計畫處方預測模式不要求。
- 示範病例：／ 開頭明確選「第一筆是第一劑」（等於原本 checkbox 未勾）。
- 讀存檔： 依 checkbox 帶出 radio；清空時 。存檔結構沒動。
- 測試設定更新（斷言沒動）： 加  並在 V1／A1／A2 展開給藥後選第一劑、V2 改點「已達穩態」radio（效果等同原本勾 checkbox）。
- 新測試：（30 項）。
- 沒做：版面目視（內建瀏覽器打不開本機檔案）、雲端版面檢查與設計偵測。
