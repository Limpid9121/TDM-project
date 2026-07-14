# HANDOFF — 患者存檔與追蹤可視化（v1）

> 交班對象：下一個對話的你（Claude）。
> 交班人：BC（臨床藥師，母語繁體中文，全程以繁體中文溝通）。
> 本文件目的：讓新對話能在**乾淨的 context** 下直接進入「build → test → review → improve → 重新 test」的迴圈，把 TDM 工具的「病人存檔／載入」升級為**版本化追蹤 + 可選式趨勢可視化**。

---

## 0. 一句話目標

把目前「一位病人只存一份快照、再存就覆蓋」的存檔模式，改成「**每次收案 = 追加一筆有日期的版本（visit）**」，讓載入時不只還原欄位，更能把**同一位病人隨時間的變化畫成趨勢圖**；圖上要能**由使用者自選要顯示哪些序列**（版面不可凌亂）。三個模組（Vancomycin / Aminoglycoside / Azole）都要做。

---

## 1. 專案現況（新對話必讀）

- **單一檔案架構**：整個工具是一份自足的 `index.html`（vanilla JS/CSS，無後端、無 build system）。字型 IBM Plex Sans/Mono，臨床儀器風格。發佈於 GitHub Pages。
- **儲存機制**：`localStorage`，依病歷號存放；**目前尚未正式上線，沒有任何既有病人資料**（BC 已確認）→ 可以直接把版本化模型當作原生模型設計，**不需要處理舊資料遷移**。
- **已完成模組**：
  - **Vancomycin**：一室貝氏 MAP 擬合（Nelder-Mead）、AUC₂₄ 導向劑量建議、HD 特例、族群 PK 預測、分析錨點、剪枝、AI 諮詢 prompt 產生器。**有**存檔／載入／匯出／匯入。
  - **Aminoglycoside**：gentamicin/tobramycin/amikacin；conventional 與 ODD/HDEI；TIW；Hartford nomogram 間隔建議；Cmax/MIC≥8 檢查。**有**存檔／載入（獨立 namespace）。
  - **Azole（最新完成）**：規則引擎 + 情境 checklist（**不是** PK 擬合引擎）；voriconazole/posaconazole/isavuconazole；MSG/EORTC 感染控制趨勢；三級毒性分類；CYP 交互作用偵測。**⚠️ 目前完全沒有存檔／載入功能——這是三模組裡最先要補的洞。**
- **臨床鐵則**：
  - **絕不杜撰臨床數值**：所有 threshold 必須可追溯到文獻；未經查證的值要明確標記、不得憑記憶實作。
  - **「讀病人，不是讀數據」**：azole 的臨床軌跡（發燒趨勢、ANC、影像、黴菌標記）優先於單純濃度數字。這正是「追蹤可視化」的臨床動機。
- **BC 的工作原則（不可違反）**：
  - **先釐清、拿到明確指令才寫 code**。複雜模組先出多版 spec 再實作。
  - 偏好**最小資源修法**，低優先功能用針對性修補而非大重構。
  - 引擎要**共用／參數化**，方便未來模組以 config 物件掛入。
  - **jsdom 無法驗證視覺版面**——版面一定要瀏覽器確認（過去 CSS Grid 重構造成版面失敗被 revert）。**這點對本次「畫圖」任務特別關鍵。**

---

## 2. 現行存檔架構（要改的東西在哪）

### 2.1 資料模型（目前）
每位病人存成一筆物件，**再存同一病歷號就整筆覆蓋**（見 `savePatientFn`）：

```
{ id, label /* 病歷號 */, savedAt /* timestamp */, data /* collectState() 快照 */ }
```

- Vancomycin key：`vanco_tdm_patients_v1`（`PATIENTS_KEY`，index.html:964）
- Aminoglycoside key：`amino_tdm_patients_v1`（`AMINO_PATIENTS_KEY`，index.html:3094）
- Azole key：**尚不存在**。

### 2.2 關鍵函式位置（index.html，行號為現況參考，改動後會位移）
- Vancomycin：`collectState`(1568) / `applyState`(1602) / `loadPatientsList`(1651) / `savePatientsList`(1655) / `refreshPatientSelect`(1661) / `savePatientFn`(1675) / `loadPatientFn`(1694) / `deletePatientFn`(1708) / `exportPatientsFn`(1722) / `importPatientsFn`(1738)
- Aminoglycoside：`collectStateAmg`(3473) / `applyStateAmg`(3507) / `loadAmgPatientsList`(3557) / `saveAmgPatientsList`(3561) / `savePatientFnAmg`(3578) / `loadPatientFnAmg`(3596)
- 事件繫結：vanco 約 4393–4394、amg 約 4487–4488。
- UI 區塊：vanco「病人資料存檔」約 359–369，amg 約 654–664。

### 2.3 `collectState()` 快照裡已有「內建時間序列」（重要洞見）
Vancomycin 的 `data` 已經含有**帶日期的多筆列**：
- `scrRows`: `[{date, val}]` — 血清肌酸酐 → **腎功能趨勢**
- `doseRows`: `[{date, doseMg, infMin}]` — **給藥歷程**
- `levelRows`: `[{date, conc}]` — **血中濃度**
- `hdSessionRows`: `[{start, end}]` — 透析場次

→ 意思是：**「濃度、腎功能、劑量隨時間」的原始資料，其實在單一快照內就已經按日期累積了。**
→ 但 **PK 參數（ke/Vd/CL/AUC₂₄）與劑量建議是 `render()` 當下算出來的，沒有被存下來**。要趨勢化這些，必須在存檔當下把「算出來的輸出」一起 snapshot 起來。

**這是本次設計的核心分界：**

| 資料類型 | 來源 | 是否已有時間戳 |
|---|---|---|
| 血中濃度、腎功能(SCr)、劑量歷程 | 快照內既有的 `levelRows/scrRows/doseRows` | ✅ 已按日期 |
| 擬合 PK 參數 ke/Vd/CL/AUC₂₄、劑量建議 | `render()` 即時計算，未儲存 | ❌ 需在每次 visit 存檔時擷取 |
| Azole 的臨床脈絡（發燒、ANC、影像、黴菌標記）、azole trough | azole 模組欄位 | 需先補 azole 存檔才有 |

---

## 3. 目標設計（本次要蓋的）

### 3.1 版本化資料模型（建議 schema）
把「一病人一快照」升級為「一病人一時間軸、多筆 visit」。**向後相容不需要（無舊資料）**，但仍建議留 `schemaVersion` 便於未來演進。

```jsonc
{
  "id": "p_...",
  "label": "病歷號",
  "schemaVersion": 2,
  "createdAt": 0,
  "updatedAt": 0,
  "visits": [
    {
      "visitId": "v_...",
      "savedAt": 0,               // 這次收案/評估的存檔時間
      "asOf": "YYYY-MM-DDTHH:mm", // 臨床「評估時點」(可與 savedAt 不同，預設同 savedAt)
      "data": { /* 現行 collectState() 完整快照 */ },
      "derived": {                // ★ 新增：把 render() 當下算出的輸出擷取存檔
        "ke": null, "vd": null, "cl": null, "auc24": null,
        "recDose": null, "recInterval": null,
        "crcl": null,             // 該時點腎功能(供趨勢)
        "notes": null
      }
    }
  ]
}
```
- **savePatientFn 改為「追加一筆 visit」**，而不是覆蓋。同一天/誤觸可提供「更新最後一筆 visit」選項（避免灌爆）。
- **loadPatientFn** 預設載入**最新 visit** 的 `data`，並顯示 visit 選擇器可回看任一版本。
- `derived` 由存檔當下呼叫既有計算路徑取得（找到 `render()` 內計算 ke/Vd/CL/AUC 的地方，抽出一個可回傳數值的 helper，不要重算一套邏輯——**共用/參數化原則**）。
- 三模組各自的 key 升級：`vanco_tdm_patients_v2` / `amino_tdm_patients_v2`，azole 新增 `azole_tdm_patients_v2`（命名與既有一致）。

### 3.2 Azole 先補存檔（前置）
Azole 目前無 `collectStateAzole/applyStateAzole/savePatientFnAzole/...`。**第一個迴圈就先把 azole 的存檔／載入補齊**（照 amg 的獨立 namespace 模式抄），再讓三者一起進版本化。azole 沒有 PK 擬合，`derived` 改存規則引擎輸出（感染控制趨勢分級、毒性分級、azole trough、對應臨床脈絡欄位）。

### 3.3 趨勢可視化（本次重點，且要克制版面）
- **可選式序列**：圖上提供 checkbox / 下拉，讓 BC **自選目前要顯示哪些序列**。這是 BC 明確要求（「版面不可凌亂，可以我自己選目前可視化的資料」）。預設只開 1–2 條最關鍵序列（如濃度 + 目標帶），其餘預設關閉。
- **建議可選序列**（依模組）：
  - 血中濃度趨勢（含目標治療帶/毒性上限做背景色帶）
  - 劑量歷程（階梯圖，疊在濃度時間軸上看劑量-反應）
  - PK 參數 ke / Vd / CL / AUC₂₄（跨 visit）
  - 關乎劑量決策的 lab：**腎功能（SCr/CrCl）**為首要，其餘依模組
  - Azole：發燒趨勢、ANC、影像/黴菌標記等「讀病人」脈絡
- **時間軸統一**：X 軸用真實臨床時間（`asOf` / rows 的 date），不要用 visit 序號，這樣濃度點、劑量階梯、lab 才對得齊。
- **實作限制**：artifacts/GitHub Pages 單檔環境。畫圖可用**純 SVG/Canvas 自繪**（與現有 vanco 濃度曲線一致的作法，見 render 內 gridlines/curve 區塊 ~1896–2066），或引入單一輕量 lib。**優先沿用專案既有的自繪風格**以維持視覺一致與零相依。**不得使用 localStorage 以外的瀏覽器儲存；圖表狀態（哪些序列開著）可存 localStorage 記住偏好。**
- **版面驗證**：jsdom 驗不了圖。**每個可視化迭代都要在真實瀏覽器截圖確認**（見 §5 review 步驟）。

### 3.4 匯出／匯入
- 沿用現有 export/import，但格式改為含 `visits` 的新 schema；import 要能合併（依 `id` 去重、visits 依 `savedAt` 合併去重）。

---

## 4. 建議施作順序（切成小迴圈，符合 BC 最小資源、可迭代原則）

> 每一步都是一個完整的 build→test→review→improve 迴圈。**先釐清該步 spec、拿到 BC 明確 go 才寫 code。**

1. **迴圈 A — Azole 補存檔**：抄 amg 模式，做 `collectStateAzole/applyStateAzole/save/load/export/import` + UI 區塊 + 事件繫結。（純快照即可，先不版本化）
2. **迴圈 B — 版本化資料層**：三模組的儲存層改成 `visits[]` 追加模型；load 預設載入最新 visit + visit 選擇器；save 追加/更新最後一筆；export/import 更新為新 schema。抽出 `deriveOutputs()` helper 在存檔時擷取 `derived`。
3. **迴圈 C — 趨勢圖 MVP**：先做 **Vancomycin** 一張可視化（濃度 + 目標帶 + 可選劑量階梯），驗證自繪/版面/序列切換 UX。
4. **迴圈 D — 序列擴充 + 可選面板**：加入 PK 參數、腎功能 lab、checkbox 可選面板、偏好記憶。
5. **迴圈 E — 套用到 Aminoglycoside 與 Azole**：以 config 物件參數化圖表元件，把 C/D 成果掛到另兩個模組（azole 走「讀病人」脈絡序列）。
6. **迴圈 F — 匯出/匯入/邊界**：大量 visit 的效能、localStorage 容量、壞資料容錯、跨瀏覽器。

> 可先只做 1–3 讓 BC 看到骨架，再決定 4–6 的細節。**不要一次全做完才給看。**

---

## 5. build → test → review → improve 迴圈（每個功能都跑一遍）

1. **build**：實作最小可用版本（改 `index.html`）。
2. **test（自動）**：用 jsdom harness 測 closured 內部函式與 DOM 整合。
   - ⚠️ **memory 提到的 `load_harness.js` 測試 harness 並不在同步進來的知識庫裡**（只有 `docs/` 的 index.html 與幾份 md）。新對話若要自動測試，**需先向 BC 索取 harness，或依既有模式重建一個**：在記憶體中載入 `index.html`、不改動原始檔、可直接呼叫閉包內函式。測項聚焦：存檔追加而非覆蓋、load 還原、derived 擷取正確、export/import round-trip、壞資料不 crash。
3. **review（人工/視覺）**：
   - 邏輯 review：對照臨床鐵則（不杜撰數值、threshold 可追溯）。
   - **視覺 review：一定要在真實瀏覽器開檔截圖**（jsdom 驗不了版面/圖表）。確認版面不凌亂、序列切換正常、圖與數字一致。
   - 對外部 AI audit 報告**保持批判**：逐條對照真實 code，過去 audit 同時出現真 bug 與假/過時發現。
4. **improve**：依 review 修正。
5. **重新 test**：回到步驟 2，直到通過再進下一功能。

---

## 6. 給新對話的第一則訊息（BC 可直接貼）

> 「延續 TDM 專案。請讀這份 HANDOFF 與知識庫的 `index.html`。我們要做**患者存檔版本化 + 可選式趨勢可視化**（三模組）。**先不要寫 code**——先跟我確認迴圈 A（azole 補存檔）的 spec，我 OK 才動手。之後每個功能都跑 build→test→review→improve→重新 test。」

## 7. 開新對話前的檢查清單
- [ ] 把最新的 `index.html` 帶進新對話（知識庫同步版，或 BC 手上更新版——**以 BC 手上的為準**）。
- [ ] 若要自動測試：提供 `load_harness.js`（或同意重建）。
- [ ] 確認發佈流程沒變（GitHub Pages 單檔覆蓋）。
- [ ] 確認本次先做到哪個迴圈（建議先 A–C）。

---

*備註：本檔由前一對話整理。行號、key 名稱以 `index.html` 現況為準，實作後會位移，請以函式名搜尋定位。*
