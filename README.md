# TDM-project：整合各類藥物 TDM 並實現存檔追蹤

純前端的治療藥物監測（TDM）計算工具。單一 `index.html`，無後端、無需安裝，所有計算都在瀏覽器本機完成。核心是**自由抽血時點**的藥動學分析：抽血時間不必落在傳統的 peak／trough，任意時點的濃度都能納入擬合。

**線上版**：https://limpid9121.github.io/TDM-project/
**本機使用**：直接以瀏覽器開啟 `index.html`，離線可用。

## 藥物模組

| 模組 | 狀態 | 做法 |
|---|---|---|
| Vancomycin | 可用 | 一室模型貝氏 MAP 擬合，AUC₂₄ 導向劑量建議；含血液透析（HD）情境 |
| Aminoglycoside | 可用 | 依 Cmax/MIC 與間隔策略評估；含 ODD／HDEI 建議起始間隔、TIW、HD 排程 |
| Azole | 可用 | 規則引擎與情境檢查表（非藥動學擬合），見下方說明 |
| 抗癲癇藥物（phenytoin、valproic acid） | **開發中** | 尚未完成，數值與介面可能變動，請勿作為臨床依據 |

### Vancomycin

- 自由抽血時點擬合 ke／Vd／CL：2 點還原 Sawchuk-Zaske、1 點貝氏校正、3 點以上更穩健
- 以 AUC₂₄ 為目標的劑量建議，並比較候選給藥間隔（q8h／q12h／q24h）
- 尚未給藥時可用族群 PK 預測起始劑量，不必等濃度資料
- 族群模型可在 Model A（Matzke 1984，一室）與 Model B（Oda 2024，二室，台灣病人資料）之間切換比較；此切換僅供對照，不會存入病人紀錄
- 長期療程可重新錨定「分析起點」，不必展開整段給藥史
- 血液透析：勾選星期與時段即可批次產生透析時程，並以透析間期視窗處理擬合

### Aminoglycoside

- 以 Cmax/MIC 是否達標評估療效（Moore 1987、Kashuba 1999）
- ODD／HDEI 建議起始間隔依 CrCl 分段（≥60→q24h、40–59→q36h、20–39→q48h、<20 不建議 ODD，依 Hartford nomogram 的分界依據）；有懷孕、體液分布異常、嗜中性球低下、心內膜炎或 CNS 感染等排除因子時一律覆蓋為不建議 ODD
- 院內安瓿劑量捨入（依本院品項換算 mL）
- 支援 TIW 與 HD 排程

### Azole

Voriconazole、posaconazole、isavuconazole。這個模組是**規則引擎與情境檢查表**，不是藥動學擬合：包含感染控制趨勢推論、三級毒性分類、CYP3A4／2C9 交互作用偵測、依院內品項的劑量捨入，以及 posaconazole 偽性醛固酮增多症的組合警示。

### 共通功能

- **病人存檔與追蹤**：依病歷號存檔，每次就診以新增紀錄的方式保存（append-visits），可切換不同次就診、匯入與合併。資料只存在使用者自己瀏覽器的 localStorage，**不會上傳**，也不在程式碼或這個 repo 裡
- **趨勢圖**：多個小圖共用日曆 X 軸，可勾選要顯示的指標
- **整合評估 Prompt**：一鍵產生可貼給任一 AI 的評估文字

## 關於存檔與網址

存檔綁定於「同一個瀏覽器＋同一個網址」。使用固定的 Pages 網址比開本機檔案更穩定：本機檔案路徑（`file://...`）改變或重新下載新檔案時，瀏覽器可能視為不同儲存空間，導致存檔對不上。

## 測試

`tests/` 底下有以 jsdom 執行的回歸測試，以及計算結果的 golden-master 快照（`tests/golden/`）。

```bash
cd tests
npm install
node test_regression_smoke.js   # 以此類推，逐一執行 test_*.js
```

## 專案結構

```
index.html      唯一的產出檔案
tests/          jsdom 回歸測試與 golden-master 快照
docs/           規格書、交接文件（handoff）與 UIUX 稽核／實作規格
```

## 主要文獻

- Matzke et al. 1984：vancomycin 族群藥動學（Model A）
- Oda et al. 2024, *J Infect Chemother*：vancomycin 二室模型（Model B）
- Moore 1987；Kashuba 1999：aminoglycoside Cmax/MIC ≥ 8
- Hartford nomogram：ODD 間隔依 CrCl 分段
- Tverdek 2017：posaconazole 肝毒性
- MSG／EORTC 反應準則：azole 感染趨勢推論
- 2020 ASHP／IDSA／PIDS／SIDP vancomycin 共識指引

所有臨床數值與族群參數皆須能追溯到上述或已註明的文獻。

## 定位聲明

本工具為臨床決策輔助，所有 PK 參數與劑量建議均由輸入資料與明列之族群假設推導。族群先驗與目標值反映一般院內慣例與上述文獻／共識，可能與特定院內 protocol 有出入。最終劑量處方判斷屬使用者之專業責任。
