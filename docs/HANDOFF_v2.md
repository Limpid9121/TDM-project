# TDM 多藥物擬合引擎 — 專案交接文件 v2

> 這份文件是寫給「下一個 Claude」看的。上一份交接文件（v1）的任務是把 aminoglycoside 模組從零建起來；那件事已經完成，而且後續又經過非常多輪優化、除錯、跟兩次外部 AI 稽核的交手。這份 v2 文件的任務是讓下一個完全沒有這段對話記憶的 session，能夠不踩已經踩過的坑、不重工已經做完的事、也不會被表面上合理但實際上有問題的「稽核建議」牽著走，直接接手繼續優化 vancomycin 與 aminoglycoside 兩個模組。
>
> **這份文件是地圖，不是替代品。** 任何公式、閾值、程式碼行為，動手改之前務必回頭看 `index.html` 本人確認一次——這份文件轉述有失真風險，尤其是行號，程式碼每次修改都會讓行號漂移，文件裡列的行號只在交接當下這一刻準確，僅供快速定位，不要當成絕對座標。

---

## 0. 現有檔案在哪裡

- `index.html`：唯一的產出檔案，vancomycin（含 HD 透析特殊情境）與 aminoglycoside（含 TIW 排程）兩個模組都已完整運作並上線。目前約 4200 行。
- `README.md`：已更新為雙模組版本。
- Project 附檔：四份標準化收案表（Vancomycin／Aminoglycoside／Azole／抗癲癇藥物），是最初設計輸入欄位時的藍本，Azole 與抗癲癇藥物兩個模組**尚未建置**（前端切換器已預留「即將推出」按鈕）。
- Skill：`tdm-calculator`（user skill，路徑 `/mnt/skills/user/tdm-calculator/`），內含 `references/aminoglycoside.md`、`azole.md`、`antiepileptic.md`、`vancomycin.md` 四份臨床邏輯參考——**這是族群公式、目標值、抽血時點慣例的權威來源，建置或修改任何藥物邏輯前務必先讀對應那份**，不要憑印象。這份文件裡引用的所有具體數字（族群 CL/Vd、目標範圍、抽血時機）都是先查證這份 skill 或外部文獻後才寫進程式碼的，不是憑空編的——這是這個專案最核心的紀律，請延續。

---

## 1. 專案定位與核心理念（沿用 v1，未變）

給病房臨床藥師長期使用的 TDM 計算工具，核心賣點是**任意抽血時點**的自由採樣擬合。單一 `index.html`，零後端、零安裝、離線可用，所有計算在瀏覽器本機完成，病人資料只存在使用者自己的瀏覽器（localStorage），不上傳。

貫穿整個工具、也貫穿這一整輪優化的原則：

- **絕不杜撰未由資料支持的數值**——這條在這一輪被反覆考驗（見第 8 節的稽核報告評估），每次都是靠回頭查證文獻或程式碼本身守住的，不是憑感覺判斷。
- **可稽核**——擬合模式、殘差、假設都要能被檢查與質疑。
- **臨床決策輔助，不取代專業判斷**——包含不再由工具「推薦」一個最佳方案（見第 3.3 節），改成中性呈現、由藥師勾選決定。
- **不確定就明講，不要為了讓功能看起來完整就編一個效果出來**。
- **外部稽核報告要查證，不要照單全收**——這是這輪新增的紀律，獨立成第 8 節詳述。

---

## 2. 目前完工狀態

### 2.1 Vancomycin 模組
- 自由抽血時點的一室模型疊加預測 + 貝氏 MAP 擬合（0/1/≥2 點三種模式）。
- AUC₂₄ 導向劑量建議。
- 尚未給藥時的族群 PK 起始劑量預測（prospective mode）。
- 「分析起點」可重新錨定。
- 病人存檔／載入（localStorage）。
- AI 諮詢 Prompt 產生器。
- **穩態暖機（steady-state priming）**：勾選後往前補虛擬給藥讓擬合正確解讀早期濃度，數學上有效但畫面上完全不可見（這是使用者明確要求的行為，見第 6 節）。
- **What-if 劑量疊圖（單選勾選機制）**：候選方案與自訂列前面都有 radio，勾一個會在曲線疊加琥珀色「變更後」曲線，可自訂起始時間（模擬跳過幾劑）。原本的自動推薦機制已完全移除。
- **日期橫軸 + 十字準線**：格線對齊日曆午夜，滑鼠／觸控移到曲線上會顯示縱線＋日期時間＋兩條曲線交叉處的精確濃度。
- **HD（血液透析）特殊情境模組**：完整的透析專屬輸入（透析時程記錄、膜通量）、判讀邏輯（只在單一透析間期內擬合，不橫跨透析事件建模）、pre-HD trough 15–20 目標、劑量建議、專屬曲線與 AI prompt。詳見第 3.4 節。PD／CRRT／SLED**這輪刻意沒有比照處理**，維持原本泛用邏輯。

### 2.2 Aminoglycoside 模組
- Gentamicin／Tobramycin／Amikacin，conventional／ODD 兩種策略，依「藥物 × 策略 × 適應症」三維查表決定 peak/trough 目標。
- 候選給藥間隔 q8h–q48h，個體化 ke／Vd 直接反解（不依賴 Hartford nomogram 圖表判讀，這是刻意的設計選擇，見 v1 文件第 8.5 節，原因未變）。
- **TIW（每週固定星期）排程**：獨立於固定間隔模式，比照星期＋時刻展開給藥，穩態相關數字改用實際給藥史直接推算，不用固定間隔公式。
- 穩態暖機、What-if 疊圖、日期橫軸、十字準線：架構與 vancomycin 共用（見第 3 節），TIW 模式下自動關閉 what-if（因為沒有「單一间隔」可疊）。
- **臨床 peak 採血時機校正（這輪新增，很重要）**：所有 Cmax／peak 相關計算，現在都正確對應「輸注結束後 30 分鐘」的臨床採血慣例，而非輸注結束當下的理論瞬時最大值。這是本輪稽核抓到的真實漏洞，詳見第 8 節 Loop 3。

### 2.3 共用架構
- 藥物切換器（Vancomycin／Aminoglycoside／Azole「即將推出」／抗癲癇藥物「即將推出」）。
- 給藥序號徽章（`.dose-idx`）現在每次 `render()`/`renderAmino()` 都會重新同步，不會因為直接編輯既有給藥列的時間而跟引擎實際排序脫鉤（這輪修的真實 bug，見第 8 節 Bug A）。

---

## 3. 核心技術架構

### 3.1 藥物無關的共用引擎（v1 就有，未變動）
`predictConc`、`nelderMead`、`fitCLV`、`integrateTrapz`、`ibwDevine`、`weightForCG`、`cockcroftGault` —— 這些是純數學／族群體重公式，vancomycin 與 aminoglycoside 共用，這輪沒有改動內部邏輯。

### 3.2 這輪新增的共用機制（v1 之後才有，是這份文件的重點）

| 函式／狀態 | 角色 |
|---|---|
| `primePriorDoses(doses, CL, V, opts)` | 穩態暖機：往前補虛擬給藥（negative `tHr`），**只給 FIT 用**，回傳 `{doses, primeStartHr}`。呼叫端會把回傳陣列中 `tHr<0` 的部分過濾出來，以 `ctx.primeDoses` 傳給 `drawCurve`——但 `drawCurve` 只拿它做「數學延伸」（讓 t=0 當下的濃度已經是墊高後的值），**絕對不會**把它畫成看得見的虛線／底色／延伸的橫軸。這個「數學有效、畫面不可見」的行為是使用者明確要求的（見第 6 節「地雷」），如果之後有人想「順手」把暖機段加回可視化，要先確認這不是走回頭路。 |
| `let vancoPickedKey`／`let amgPickedKey`（模組層級狀態） | What-if 機制目前勾選哪一列，值是 `null`／`'custom'`／`'cand-<tau>'`。不存進病人存檔（視為當次瀏覽的暫存狀態），清除病人／載入病人／切換透析模式時都會重置為 `null`。 |
| `getPickedRegimen(prefix, regimenRows, customResult)` | 把 `vancoPickedKey`/`amgPickedKey` 解析成具體 `{doseMg, tau, infHr}`。如果指向的候選列已經不存在了（例如使用者取消勾選該間隔的 checkbox），會自動把狀態清回 `null`，不會留著一個指向空氣的勾選。 |
| `resolveWhatIf(prefix, regimenRows, customResult, defaults)` | 把 `getPickedRegimen` 的結果轉成 `drawCurve` 要的 `{doseMg, tau, infHr, startRel, startMs}`，並且**只在起始時間欄位是空的時候**才自動填入預設值（下一劑應給藥時間），使用者自己改過就不會再被蓋掉。同時負責切換 `.regimen-pick-bar` 的 `active` class。 |
| `syncPickRadios(prefix)` | 因為候選列的 `<tbody>` 每次 render 都整個重新產生 HTML（radio 的 `checked` 屬性靠字串插值就對了），但「自訂」列在 `<tfoot>` 是固定 DOM 節點，`.checked` 要用 JS 屬性設定，不能只靠字串——這個函式負責把 tfoot 的 radio 狀態同步回來。 |
| `updateWhatIfReadout(prefix, whatIf, CL, ke)` | 疊圖啟用時，在 pick-bar 顯示「變更後穩態 → Cmax/Cmin/AUC」的即時讀數。 |
| `drawCurve(ctx)` | **這輪改動最大的函式**，簽名跟行為都跟 v1 完全不同了，細節見 3.3 節，務必重讀。 |
| `wireCrosshair(svg, g)` | 十字準線互動，獨立於 `drawCurve` 的標記產生邏輯之外，方便測試（見第 7 節）。 |
| `renderRegimenTableVanco(regimenRows, currentLabel)` / `renderRegimenTableAmino(regimenRows, currentTau)` | 候選表格渲染，含 radio pick 欄位，不再有「建議」標籤／不再排序凸顯。 |

### 3.3 `drawCurve` 完整行為說明（務必重讀，這是這輪改最多的地方）

呼叫簽名（新增/改變的欄位以 **粗體** 標出）：

```js
drawCurve({
  doses, levels, CL, V, ke, tau, maintDose, maintInf,
  isFutureRel,      // "現在"（最後一筆已知事件的相對時間）
  cMaxDomain,
  **t0Ms**,          // 新增：t_rel=0 對應的絕對時間戳（epoch ms）。橫軸能畫日期就是靠這個錨點。
  svgId,             // 'curveSvg' 或 'amgCurveSvg'
  toxLine, toxLabel, // 危險參考線（vancomycin 固定 20；aminoglycoside 用該適應症的 troughHi）
  band,              // 陰影目標帶 {lo, hi, label}
  **whatIf**,         // 新增：{doseMg, tau, infHr, startRel, startMs} 或 null。由 resolveWhatIf() 產生。
  **primeDoses**,     // 新增：暖機虛擬劑量（t_rel<0），只餵給內部的 predictConc 算「數學」，不畫成看得見的東西
  **noGhostDoses**,   // 新增：true 時完全不自動延伸「未來 3 劑」的幽靈投影（HD 模組用，因為 HD 沒有固定 τ 可以延伸）
  **domainMaxOverride**, // 新增：直接指定橫軸終點，繞過內部「tau*2.4 或 5 個半衰期」的預設公式（HD 模組用）
  **extraMarkers**,   // 新增：[{rel, label, color}]，畫額外的標記垂直線（HD 用來標「下次透析」）
  **extraBands**      // 新增：[{startRel, endRel, label, color, opacity}]，畫額外的陰影區塊（HD 用來標「透析中」）
})
```

**實線／虛線分界（這輪修的真實 bug，見第 8 節 Bug A 對照）**：分界點不是 `isFutureRel`（最後一筆已知事件時間），而是 `Math.max(isFutureRel, 最後一筆真實劑量.t_rel + tau)`——也就是「下一劑幽靈劑量開始生效的時間」。原因：如果最後一筆已知事件剛好就是最後一劑本身（後面沒再抽血），那一劑接下來的漲跌是**已經確定的藥動學結果**（劑量、擬合出的 ke/Vd 都已知），不是「假設處方會怎麼繼續」的投影，應該畫實線。這條分界邏輯如果又被改回單純用 `isFutureRel`，會重新引入這個視覺 bug。

**穩態暖機在曲線上完全不可見**：`primeDoses` 只用來讓 `predictConc` 在算 `t>=0` 的濃度時，把暖機劑量的貢獻也算進去（所以 t=0 當下的濃度已經是墊高後的值），但：
- 橫軸範圍 `tMin` 永遠是 `0`，不會往負的方向延伸。
- 暖機劑量不會被畫成給藥長條圖。
- 沒有任何底色／文字標示「這裡有暖機」。

這是使用者明確、反覆確認過的要求（先前版本畫過一次淺灰底＋文字，被要求拿掉）。

**What-if 疊圖**：深綠色「目前處方」曲線永遠完整投影到 `tDomainMax`（不管有沒有啟用 what-if），這樣兩條線才能直接比較——這也是修過一次的地方（上一版本啟用 what-if 時深綠色曲線會被砍掉未來投影，使用者明確糾正過，這是原始需求就寫明的：「疊加在現有保持原來劑量的深綠色曲線上」）。琥珀色「變更後」曲線只從 `whatIf.startRel` 開始畫（之前跟深綠色完全一樣，沒必要重複畫）。

**HD 特殊情境**：`noGhostDoses: true` + `domainMaxOverride` + `extraMarkers`/`extraBands`，讓同一個 `drawCurve` 函式可以畫出「聚焦在單一透析間期、沒有固定 τ 幽靈投影、有透析時程標記」的曲線，而不用另外寫一個專門的繪圖函式。這個泛化是刻意設計成低風險的（新增參數都有預設值，不影響原本 vancomycin/aminoglycoside 一般模式的行為）。

**十字準線**：`drawCurve` 產生 SVG 後，尾端呼叫 `wireCrosshair(svg, g)`，`g` 是打包好的閉包上下文（`predBaseline`/`predWhatIf`/`xScale`/`yScale`/`t0Ms` 等）。互動用 `svg.onmousemove =`／`svg.ontouchmove =` 賦值方式綁定（不是 `addEventListener`），這樣每次 `drawCurve` 重畫時舊的 handler 會自動被新的取代，不會累積。座標轉換走 `getScreenCTM().inverse()`（正確處理 `preserveAspectRatio` 造成的 letterbox，比單純用 `getBoundingClientRect()` 換算更準）。**jsdom 沒有實作 `getScreenCTM`**，所以互動的「真的滑鼠移過去長怎樣」沒辦法自動測試，只能測結構（元素存在、handler 有掛上去）跟數學（透過 `svg.__updateCrosshairForTest(x,y)` 這個測試專用 hook，繞過真正的座標轉換直接餵座標進去驗證濃度計算對不對）。

### 3.4 Vancomycin HD（血液透析）特殊情境模組

這是這輪份量最大的新功能，獨立成一節說明設計思路，避免下一個 session 誤以為可以套用一般模式的邏輯去理解它。

**為什麼不能套用一般邏輯**：HD 病人的 SCr 被透析主導，Cockcroft-Gault 完全不適用；給藥頻次跟著透析排程走（多為 TIW，透析後給藥），不是固定小時間隔；文獻上也沒有可靠的「橫跨透析事件」PK 模型可用（連正式發表的族群 PK 模型，外部驗證表現都不好——這是查證過的，不是我自己的判斷）。

**設計選擇：只在單一透析間期內做擬合，不試圖建模透析當下的濃度變化**。這個選擇背後的理由：
1. 透析結束後濃度會反彈（re-equilibration，通常 3–6 小時），這是雙室（组織槽 vs 血漿槽）現象，現有引擎是單室模型，沒有組織槽的概念，硬做只會畫出一條掉下去卻爬不回來的假曲線。
2. 兩次透析之間（interdialytic window）藥物清除相對穩定（只受殘餘清除率主導，沒有透析事件穿插），這段期間套用既有驗證過的一室模型是站得住腳的，不是新發明的東西。
3. 所以：`findCurrentHDWindow()` 找出「最近一次已完成的透析」到「下一次透析（如果有記錄）」這個區間，只把落在這個區間內的劑量／濃度餵給 `fitCLV()`，用跟其他地方完全一樣的擬合邏輯。

**族群先驗數字的來源**（都是查證過的，不是憑印象）：
- Vd ≈ 0.85 L/kg（文獻範圍 0.65–1.05 L/kg，取中點，UI 上有註明範圍不是假裝精確）。
- 透析間期 CL ≈ 0.30 L/hr（錨定 Suzuki et al. 2023, *Antimicrob Agents Chemother* 的 anuric 病人 nonHD-CL 族群估計值 ~0.316 L/hr）。
- Pre-HD trough 目標 15–20 µg/mL（Lewis & Nolin, *Kidney360* 2021）。
- Loading 25 mg/kg（範圍 25–35），維持 7.5–10 mg/kg 透析後給予（高通量或透析中給藥可能上修至 15）——這組數字跟使用者原本提供的院內表（AJHP 2004;61:1812 引用的移除比例）吻合。

**透析後濃度反彈的處理**：不是用手動標記（怕漏標），而是**自動比對**——只要有濃度落在「距離某次已記錄透析結束時間 6 小時內」，就自動跳出警示，不需要藥師自己標記那是不是 post-HD level。

**這輪範圍界定**：只做 HD。PD／CRRT／SLED **維持現狀**，這是使用者明確拍板的範圍（PD 是固定 q3d，本來就適合既有固定間隔模型；CRRT 是連續清除，既有連續模型架構還算合理；SLED 理論上該比照 HD 處理但文獻標準化程度低，各院 protocol 差異大，這次先不做，明確告知使用者「還沒做」而不是悄悄跳過）。**如果之後要做 SLED，不要直接複製 HD 的邏輯貼上——SLED 的透析時數、頻次跟 HD 差很多，族群先驗數字需要重新查證，不能沿用 HD 那組。**

---

## 4. 設計系統（CSS token，v1 之後未變，照抄不要重新設計）

```css
:root{
  --paper:#F4F5F1; --card:#FFFFFF; --ink:#1B2422; --ink-soft:#57645D; --ink-faint:#8B968F;
  --line:#DADFD8; --line-strong:#C2C9C0;
  --trace:#1F6F6B; --trace-strong:#154E4B; --trace-soft:#D3E9E5; --trace-dim:#93BAB6;
  --amber:#A9701F; --amber-soft:#F2E3C7; --crimson:#A23B3B; --crimson-soft:#F1D8D5;
  --radius:10px;
  --sans:'IBM Plex Sans','PingFang TC','Microsoft JhengHei',-apple-system,BlinkMacSystemFont,sans-serif;
  --mono:'IBM Plex Mono','PingFang TC',ui-monospace,SFMono-Regular,Menlo,monospace;
}
```

What-if 疊圖統一用 `--amber` 系列色（琥珀色＝變更後／假設情境），跟既有的「警示」語意色是同一組顏色但用途不同（一個是狀態警示、一個是情境疊圖），畫面上要注意不要讓兩者混淆——目前是靠「只有曲線疊圖和 pick-bar 用 amber 實體色塊＋圖例」跟「警示只用小面積 badge/底色」做區隔，如果之後要加更多 amber 系元素，記得先確認語意會不會打架。

IBM Plex Sans 排版文字／IBM Plex Mono 排所有數字，這條規則不變。

---

## 5. UI 元件模式庫（更新版，含這輪新增的模式）

### 5.1 entry-row 自由列輸入模式（v1 就有）
給藥／濃度／SCr 都是這個模式。**這輪新增的變體**：HD 透析時程記錄（`addHdSessionRow`）是兩個 `datetime-local` 並排（開始／結束）而不是一個 datetime + 一個數值，如果之後還要加類似「一列兩個時間」的輸入（例如真的要做 SLED），可以直接照抄這個模式。

### 5.2 病人存檔系統（v1 就有，未變動邏輯，但存檔內容變多了）
`collectState()`/`applyState()` 現在要記得存＋還原：HD 相關欄位（`hdFlux`、`hdMaintDose`、`hdOffsetMin`、`hdMaintInf`、`hdSessionRows`）、`assumeSteadyState`。**What-if 的勾選狀態（`vancoPickedKey`/`amgPickedKey`）刻意不存進病人存檔**——這是設計決定，不是遺漏：what-if 是「當次瀏覽的探索工具」，不是病人資料的一部分，載入不同病人時應該要重置，不應該把上一位病人的假設情境帶到下一位病人身上。

### 5.3 前瞻性族群 PK 預測模式（`renderProspective`/`renderProspectiveAmg`/`renderVancoHDProspective`）
v1 就有 vancomycin／aminoglycoside 兩份，這輪加了第三份 HD 專用的。三份邏輯不共用（各自獨立函式），因為族群先驗公式完全不同（CG-based vs 文獻 nomogram），硬要共用只會讓程式碼更難懂。

### 5.4 自訂劑量列 + What-if pick（這輪整合成一個機制）
v1 的自訂列（自由輸入劑量／輸注／間隔）還在，但現在多了一個 radio（`value="custom"`），勾選後這一列的計算結果會變成 what-if 疊圖的資料來源。**上一版本另外做過一個獨立的「疊加變更劑量」小工具（曲線下方一條可以直接輸入劑量的 bar）已經整個拿掉**，功能併入這個機制——如果之後看到任何提到獨立 what-if bar 的舊描述（包括這份文件更早的草稿或使用者的舊訊息），那個東西已經不存在了。

### 5.5 AI 諮詢 Prompt 產生器
v1 的框架（做得到/做不到、留白段落、最後協助評估清單）保留，但這輪加了「決定劑量」區塊：如果 `whatIf`/`decidedRegimen` 有值，會明確寫「藥師決定處方：X mg／輸注 Y 分／qZh，預計自 [日期時間] 開始」；沒有勾選就維持中性列表，**不再有「本工具建議」字樣**——這是配合拿掉自動推薦機制的對應修改，如果之後要在 prompt 裡加任何「建議」措辭，要先確認不會違背「工具不做排序推薦，決定權在藥師」這個已經明確拍板的方向。HD 模式的 prompt 是完全獨立的模板（`buildAiPromptHD`），因為病人脈絡、擬合範圍、輸出結構都跟一般模式差很多。

### 5.6 SVG 濃度時間曲線
見第 3.3 節，已經是這份文件份量最大的一段，不重複。

### 5.7 What-if pick 機制（新模式，之後加新藥物模組時可以直接照抄）
1. 候選表格＋自訂列的每一列前面加 `<input type="radio" name="{prefix}RegimenPick" class="regimen-pick" value="cand-<tau>或custom">`。
2. 曲線下方放一個 `.regimen-pick-bar`（預設 `display:none`，勾選後加 `active` class 變成 `display:flex`），裡面有：已勾選摘要文字、`datetime-local` 起始時間欄位、取消勾選按鈕、即時讀數。
3. 用事件代理（`document.getElementById('regimenTable').addEventListener('change', ...)`）監聽整個表格的 radio 變化，不要對每一列個別掛監聽器（因為 `<tbody>` 每次 render 都整個重新產生，個別掛的監聽器會失效）。
4. `render()`/`renderAmino()` 每次都呼叫 `resolveWhatIf()` 重新解析目前勾選狀態，餵給 `drawCurve` 的 `whatIf` 參數。

---

## 6. 重要教訓與地雷（v1 的都還適用，這裡只列這輪新增的）

### 6.1 「數學有效、畫面不可見」是這輪最容易被誤解、也最容易被之後的修改不小心破壞的設計
穩態暖機（`primeDoses`）的效果只應該反映在**擬合結果的數字**上（ke/Vd/CL、AUC），**絕對不能**反映在曲線的可視範圍、給藥長條圖、或任何文字標示上。這是使用者明確要求、而且中途修正過一次的行為（最早版本畫了淺灰底＋「假設之穩態暖機段」文字，被要求拿掉，理由是「不必顯示」）。**如果之後又要加任何暖機相關的視覺提示，要先跟使用者確認這不是走回頭路**，不要自己覺得「加個提示比較清楚」就順手加回去。

### 6.2 實線／虛線分界不是「現在」，是「下一劑幽靈劑量開始的時間」
見第 3.3 節跟第 8 節 Bug A。這條邏輯很容易在未來的重構中被不小心改回「用 `isFutureRel` 當分界」（因為那樣寫起來比較直覺），但那樣寫就是回到有 bug 的版本。

### 6.3 What-if 疊圖時，深綠色「目前處方」曲線絕對不能消失
使用者在原始需求裡就寫明「疊加在現有保持原來劑量的深綠色曲線上」，中途我曾經誤把這個當成「開放式問題」去問使用者要不要保留，被明確糾正「這個我從來都如此要求」。**這不是一個可以重新討論的設計選項，是從第一版需求就存在的硬性規格。**

### 6.4 外部 AI 稽核報告不能照單全收，但也不能因為「防禦心態」就整批拒絕——要逐條查證
這輪收到兩份外部 AI 寫的「稽核報告」，格式做得很像正式的技術審查文件（有臨床案例、程式碼片段、二次審核），但其中一份報告分析的 `pickRecommendedAmino` 函式，在稽核當下**早就已經被拿掉了**（該報告顯然是對著舊版程式碼寫的）；另一份報告建議的修法之一（幫沒有 peak 目標的適應症塞一個沒有引用來源的假設數字如「45」「18」）如果照做會直接違反「絕不杜撰數值」的核心原則。但同一批報告裡也有貨真價實、查證後成立的漏洞（見第 8 節）。**處理方式是：每一條都去讀對應的實際程式碼確認現況，該接受的接受、該拒絕的講清楚拒絕的理由，不要因為報告寫得像正式文件就照單全收，也不要因為抓到一條是假的就整批不信任。**

### 6.5 修正「單方向」的公式時，要檢查對稱的反方向有沒有一起修
第 8 節 Loop 3（aminoglycoside 臨床採血時機校正）修的時候，一開始容易只想到「用劑量算出來的 Cmax 要往回衰減 30 分鐘」，但候選表格還有一個「反過來，從目標 peak 反推需要的劑量」的方向（`computeCandidateAmino` 裡 `target.peak` 存在時的分支）——如果只修前者不修後者，兩個方向會對不上（用校正後的目標反推出的劑量，middle結果又沒有校正回去比較，等於白修）。這輪已經兩個方向都修了，但這是一個值得記住的通用教訓：**任何「A 算 B」跟「從 B 反推 A」同時存在的地方，修正一邊一定要檢查另一邊要不要跟著動。**

### 6.6 str_replace 工具偶爾會出現 transient「Field required」錯誤
這輪多次遇到 `str_replace` 明明參數齊全卻回報 `description: Field required` 或 `path: Field required` 的錯誤，重試同樣的呼叫通常就會成功。目前判斷是工具本身的暫時性問題，不是程式碼或參數邏輯的問題，遇到直接重試即可，不需要懷疑自己的呼叫格式錯了。

### 6.7 這個使用者對「排版我看不到」這件事的要求沒有變
延續 v1 文件的提醒：這個環境沒有瀏覽器，任何涉及排版/CSS/視覺互動（十字準線滑不滑順、pick-bar 會不會擋到東西、HD 卡片間距）的改動，做完都要明講「這部分我只能驗證邏輯，視覺結果需要你截圖或實際操作確認」，不要對視覺結果打包票。這輪十字準線功能尤其如此——jsdom 沒有 `getScreenCTM`，互動測試只能測到「數學對不對」，測不到「滑起來順不順」。

---

## 7. 測試基礎設施

測試檔案都在跟 `index.html` 同一個工作目錄（`/home/claude/`），用 Node + jsdom 跑，不需要瀏覽器。**每一輪改動後，這八份都要重新跑一次確認全過，這是這個專案至今維持品質的關鍵紀律，請延續。**

| 檔案 | 覆蓋範圍 |
|---|---|
| `test_load.js` | 最基本的載入 smoke test，兩個模組都能無錯誤 render |
| `test_comprehensive.js` | Aminoglycoside 核心路徑（單選/複選、TIW、custom row、patient save/load） |
| `test_edge_cases.js` | Aminoglycoside 極端情境（透析、ARC、null-peak 目標、完全空白狀態） |
| `test_headermeta.js` | 確認共用的 `headerMeta` 元素在切換模組時不會互相污染 |
| `test_new_features.js` | TIW 排程、卡片版面修正、候選列不再自動推薦（含單選互斥驗證） |
| `test_ss_whatif.js` | 穩態暖機（數學有效、畫面不可見雙重驗證）、pick-based what-if、日期橫軸、十字準線結構與數學、**給藥序號同步（這輪修的 bug）** |
| `test_hd.js` | HD 模組完整覆蓋：UI 切換、透析時程展開對齊、反彈警示、實測 pre-HD trough 驅動的劑量建議數學、切回非 HD 模式的還原 |
| `test_audit_fixes.js` | 這輪稽核報告接受的修正：aminoglycoside 臨床 peak 30 分鐘校正的往返一致性、peak:null 情境的透明化訊息（不是杜撰數字） |

跑法：
```bash
cd /home/claude
python3 -c "
import re
with open('index.html', encoding='utf-8') as f: content = f.read()
m = re.search(r'<script>(.*)</script>', content, re.S)
with open('extracted.js','w',encoding='utf-8') as f: f.write(m.group(1))
"
node --check extracted.js && echo SYNTAX_OK
for t in test_load.js test_comprehensive.js test_edge_cases.js test_headermeta.js test_new_features.js test_ss_whatif.js test_hd.js test_audit_fixes.js; do
  echo "=== $t ==="; node $t 2>&1 | grep -E "FAIL|ALL TESTS|DONE OK"
done
```
另外要單獨跑 `node test_headermeta.js 2>&1 | grep -E "PASS|FAIL"`，因為它的輸出格式跟其他檔案不同，上面那個迴圈的 grep pattern 抓不到它的 PASS 訊息（不是測試沒過，是 grep 條件寫得不夠寬，之前交接時也踩過這個小陷阱）。

**每加一個新功能／每修一個 bug，都要對應寫一條新的自動化測試鎖住正確行為**，不要只手動驗證一次就算了——這輪好幾個真的 bug（給藥序號同步、HD 模式切回非 HD 沒還原表格 header/footer）都是在寫測試的過程中才發現的，不是一開始就設計出來的測試案例，測試本身就是除錯過程的一部分。

---

## 8. 外部稽核報告評估紀錄（重要：避免重複踩坑或重複被誤導）

這輪收到兩批外部 AI 寫的稽核報告，格式仿照正式技術審查文件。以下是逐條查證後的結論，**如果之後又收到類似格式的稽核報告，重複提到以下已經處理過的項目，可以直接引用這裡的結論，不需要從頭重新論證**（但如果是全新的項目，還是要重新查證，不能因為「之前的報告有問題」就預設之後的報告也有問題）。

### 8.1 第一批報告（兩個 Loop）

**Bug A（已接受並修正）：給藥序號徽章（`.dose-idx`）與實際時序脫鉤**
- 報告內容：直接編輯既有給藥列的時間（不透過展開/新增/刪除前置），畫面上的「第 N 劑」標籤不會重新排序，跟引擎實際使用的時序脫鉤。
- 查證結果：**真實存在**。`renumberDoseRows()`／`renumberDoseRowsAmg()` 原本只掛在展開/新增/prune 幾個動作上，直接編輯現有列只觸發 `render()`，不會重新排序徽章。
- 修法：把 `renumberDoseRows()`／`renumberDoseRowsAmg()` 綁到 `render()`／`renderAmino()` 最前面（確認過這兩個函式只改文字內容不搬動 DOM 節點，所以不會讓列表在打字時跳動）。**兩個模組都修了**（原報告只分析 vancomycin，但 aminoglycoside 是同樣架構同樣漏洞，一併處理）。
- 對應測試：`test_ss_whatif.js` 裡兩則「directly editing a dose row's date...」測試。

**Bug B（已確認不適用，不是漏洞）：`pickRecommendedAmino` 全部方案皆危險時的 fallback 邏輯**
- 報告內容：宣稱當所有候選方案都被標記 `danger` 時，系統會 fallback 回傳 `sorted[0]`（間隔最短、最危險的方案），存在臨床風險，並提供了修正程式碼。
- 查證結果：**這個函式已經不存在了**。稽核報告分析的是這個對話更早期、使用者要求「拿掉自動推薦」之前的版本。目前的候選表格完全中性呈現三色標籤，不做任何排序或自動選擇，這個 fallback 邏輯的問題已經隨著整個推薦機制被移除而不存在。
- 動作：無需修改，因為要修的程式碼已經不在了。

### 8.2 第二批報告（三個 Loop）

**Loop 1（已查證，判斷不採用）：`auc24Actual` 積分下界 `Math.max(0, lastEventRel-24)`**
- 報告內容：宣稱穩態假設啟用時，這個下界夾箝會「抹除」`primePriorDoses` 建構的負時間域暴露面積，導致 UI 顯示的 AUC 嚴重縮水，建議拿掉 `Math.max(0,...)`。
- 查證結果：程式碼描述正確（`auc24Actual` 確實吃 `dosesForFit`，含暖機劑量），但**不同意這是漏洞**。這個欄位的標籤明確寫「近 24h 實際 AUC（**依已發生給藥推算**）」——如果拿掉下界讓積分吃到暖機虛擬劑量，等於把假設的暴露量混進一個標榜「已發生」的數字裡，直接違反「不杜撰數值」原則。如果病人真的穩態，`AUC₂₄,ss`（閉式穩態公式）已經提供這個資訊，不需要這個欄位重複做又犧牲誠實度。既有的「療程未滿 24h，僅供參考」副標已經是足夠誠實的處理。
- 動作：**未採用**，維持原狀。

**Loop 2（部分接受）：`computeCandidateAmino` 在 `target.peak === null` 時退化為等比例分配**
- 報告內容：宣稱這個 fallback「屏棄」了 Bayesian 擬合出的 CL/V，直接線性投射使用者填的現行劑量（可能有誤），建議在缺乏 peak 目標時，強制注入一個「推斷錨點」（amikacin 用 45、gentamicin 用 18）當作隱含目標去反解。
- 查證結果：程式碼行為描述正確，這個 fallback 確實不透過 CL/V 反解、依賴使用者填的現行劑量準確性。**但建議的修法不採用**——45、18 這兩個數字沒有引用來源，是報告自己編的，真的塞進計算式就是杜撰數值，比原本的問題更嚴重。
- 採用的替代修法：**不發明目標，改成誠實揭露**。候選表格在這種情況下的評語欄位會明講「此適應症無 peak 目標，劑量按現行每日總量比例分配，請確認現行劑量正確」。
- 對應測試：`test_audit_fixes.js` 裡「peak:null candidates explicitly disclose...」跟「target display still honestly states no peak target...」。

**Loop 3（已接受並修正）：理論 Cmax（輸注結束當下）vs. 臨床採血時機（輸注後 30 分）**
- 報告內容：宣稱既有的 aminoglycoside cmax 計算，比對的是輸注結束當下的理論極大值，但臨床規範的 peak 採血時機是輸注結束後 30 分鐘，兩者有系統性落差，導致優良方案被誤判為風險。
- 查證結果：**真實存在，而且是三個 Loop 裡唯一站得住腳、有明確文獻依據的**。回頭查了專案自己引用的 `references/aminoglycoside.md`，裡面明確寫「傳統法：peak 在輸注結束後 30 分鐘」——確認目標值本來就是對著這個時間點校準的。以典型 ke（半衰期 ~2.3h）估算，30 分鐘衰減幅度約 14%，清除更快的病人（ARC）衰減幅度可到 22%，不是可以忽略的誤差。
- 修法：所有 `cmax`／`CmaxSS` 相關計算，都乘上 `Math.exp(-ke*0.5)` 校正到臨床採血時間點。**同時修正了報告沒提到的反方向**——從目標 peak 反推劑量時（`computeCandidateAmino` 的 `target.peak` 分支），要先把目標值往回推算成輸注結束當下的等效值（乘上 `Math.exp(ke*0.5)`）才能代入既有的反解公式，否則兩個方向會對不上。修改範圍：`updateCustomRowAmg`、`computeCandidateAmino`（含正反兩個方向）、`renderProspectiveAmg`／`renderAmino` 的 fixed-interval CmaxSS 分支。TIW 模式的 peak 計算（用 `predictConc(...+0.5,...)` 直接算）在更早之前就已經是對的，這次是把 fixed-interval 模式補齊到跟 TIW 一致。Trough 判讀不受影響（trough 採血慣例本來就是下一劑前，沒有這個時間差問題）。
- 對應測試：`test_audit_fixes.js` 裡「candidate dose-solving lands the clinical peak close to the target midpoint...」。

---

## 9. 明確延後、還沒做的範圍（不是遺漏，是刻意決定，不要自己覺得「順手」就做了）

- **Azole、抗癲癇藥物模組**：完全還沒建置，只有切換器上的「即將推出」佔位按鈕。要做的話，架構上比照 aminoglycoside 當初從零建起的模式（v1 文件的做法），但目標值、族群公式要重新查證各自的 skill 參考檔案。
- **Vancomycin：SLED／PD／CRRT 特殊情境**：這輪只做了 HD。PD 目前用既有固定間隔模型（族群清除率可能還可以再查證補強，但版面不變）；CRRT 維持連續模型；SLED 完全沒做特殊處理。如果要做 SLED，**不要直接複製 HD 的邏輯**，SLED 的透析時數/頻次/族群動力學跟 HD 差異大，需要重新查證數字。
- **What-if 多選比較**：目前是單選（一次只能疊一條 what-if 曲線），這是使用者明確選擇的（相對於「可同時疊多條方案比較」的複選方案）。如果之後要改成複選，是一個有共識基礎但還沒被要求做的功能，不要自己覺得「這樣更好」就加上去。
- **HD 模式的自訂列 what-if 疊圖**：HD 模式目前完全不提供 what-if pick 機制（連自訂列的疊圖功能都關閉），只給單一建議劑量。這是為了控制範圍複雜度的刻意簡化，如果之後要加，需要重新設計「新處方起始時間」在 HD 情境下該怎麼跟透析時程對齊。

---

## 10. 給新 session 的提醒

這個使用者（Brandon，臨床藥師）現在會**主動找外部 AI 來稽核這份程式碼**，這代表兩件事：第一，他對這個工具的期待持續是「精密儀器」等級的嚴謹，不會滿足於「看起來對」；第二，你會遇到看起來很有條理、甚至附了「二次審核報告」格式的稽核建議，**但格式做得正式不代表內容正確**——這輪三個被查證的漏洞裡，有一個根本是分析舊版程式碼、一個的建議修法本身就違反專案原則。**收到任何稽核報告（不管是這個使用者自己發現的，還是他請其他 AI 抓出來的），第一步永遠是回頭讀 `index.html` 現在的實際內容確認現況，不是直接照著報告的程式碼片段改。** 這件事本身也是這個專案維持品質的核心紀律之一，請延續下去。
