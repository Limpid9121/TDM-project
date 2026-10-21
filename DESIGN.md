---
name: TDM 工作台
description: 藥師的會診工作底稿——左邊填資料，右邊固定的判讀面板先講數字；黑白灰、深藍、一個可自選的撞色。
colors:
  bg: "#F3F4F6"
  surface: "#FFFFFF"
  field: "#FAFAFB"
  ink: "#14171C"
  ink-soft: "#4F5663"
  line: "#E1E4E8"
  line-strong: "#C9CED6"
  border-input: "#868D99"
  navy: "#1B2A4A"
  navy-2: "#2C3E66"
  navy-soft: "#C9D2E3"
  navy-tint: "#EEF1F6"
  ok: "#1C7A43"
  caution: "#9A5A00"
  danger: "#B42318"
  accent-magenta: "#C2185B"
  accent-vermilion: "#E4572E"
  accent-mustard: "#F2B705"
  accent-none: "#C9D2E3"
typography:
  page-title:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.3
  section-title:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-small:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1.3
  caption:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.45
  value:
    fontFamily: "Segoe UI, system-ui, Microsoft JhengHei, PingFang TC, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tabular-nums"
  value-key:
    fontFamily: "Segoe UI, system-ui, Microsoft JhengHei, PingFang TC, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.1
    fontFeature: "tabular-nums"
rounded:
  sm: "3px"
  md: "4px"
  lg: "6px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  top-bar:
    backgroundColor: "{colors.navy}"
    textColor: "#FFFFFF"
    height: "48px"
    padding: "0 24px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
    height: "32px"
  button-primary:
    backgroundColor: "{colors.navy}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "32px"
  results-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "0 20px 20px"
  tag-current:
    backgroundColor: "{colors.accent-magenta}"
    textColor: "#FFFFFF"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  row-current:
    backgroundColor: "{colors.navy-tint}"
---

# Design System: TDM 工作台

> 狀態：**D1 第三輪後改寫，待 Brandon 核可**（2026-10-21）。取代 D0 版本（藍綠主色、綠色底色的達標標示，已被 Brandon 2026-10-21 否決）。目標系統的實際樣子見 `docs/direction/C3.html` 與 `docs/direction/shots/C3_*`。

## Overview

**Creative North Star: 「會診工作底稿」**

左邊是填寫用的工作底稿，右邊是固定在畫面上的判讀面板：藥師在左邊改任何一個數字，右邊同一個位置立刻反映，不必捲動去找。這是要把事情做完的工具，按鈕、輸入框、表格、分頁都用大家熟悉的標準元件；風格只表現在字體、配色、密度，和兩件事：一個優雅的撞色，以及把給藥、抽血、SCr 排在同一條時間軸上的濃度曲線。

氣質是乾淨、精確、有質感：黑白灰的底，深藍做主色，一個大膽的撞色只在少數地方出現（預設洋紅，使用者可換）。數字是主角——藥師看到「AUC₂₄ 457，目標 400–600」就已經判斷完，不需要再畫成圖。

**Key Characteristics:**
- 數字優先：數字旁邊標目標範圍與狀態字，不畫重講數字的圖（目標帶尺、同尺長條、半衰期尺都不用）。
- 右邊判讀面板固定在畫面上，自己可以捲動；最重要的資訊不捲動就看得到。
- 以 24 吋螢幕（1920×1080，瀏覽器可用約 1920×940）為主要目標；1440 與手機要能用。
- 平的：沒有陰影、沒有漸層；深度靠細線與底色差。
- 狀態用文字顏色加小方塊，不用大片色塊；不只靠顏色（一定有字）。

## Colors

黑白灰的中性底，深藍主色，一個撞色（四選一，預設洋紅），三個狀態文字色。

### Primary
- **深藍 Navy**（`#1B2A4A`）：頂列底色、主要按鈕、選取的單選鈕與勾選框、曲線。白字在上面 14.2:1。
- **深藍 2**（`#2C3E66`）：預測曲線（虛線）、次要深色。
- **淡深藍 Navy Soft**（`#C9D2E3`）：頂列上的次要文字（9.4:1）。
- **深藍底 Navy Tint**（`#EEF1F6`）：目前處方那一列的底色、輸注時段的淡底、輸入中欄位的外光。上面的狀態字都 ≥4.7:1。

### 撞色（Accent，使用者可選，存在這台電腦）
頂列右邊一組色塊切換，選擇存在 `localStorage` 的 `tdm_ui_accent`（`tdm_ui_` 開頭，符合紅線 R10）；沒選過就是洋紅。
- **洋紅**（`#C2185B`，預設）：撞色上的字用白（5.9:1）；深藍頂列上的分頁底線改用白色（洋紅在深藍上只有 2.4:1）。
- **朱紅**（`#E4572E`）：撞色上的字用墨色（4.9:1）；分頁底線用朱紅（3.9:1）。
- **芥末黃**（`#F2B705`）：撞色上的字用墨色（9.9:1）；分頁底線用芥末黃（7.8:1）。芥末黃在白底只有 1.8:1，**不可當白底上的線或字**。
- **不用撞色**（`#C9D2E3`）：撞色位置改成淡深藍，分頁底線用白。

撞色只出現在三個地方：頂列下緣一條 3 px 的線、候選方案表「現行」標籤、曲線上的「現在」標籤。不可用在狀態、按鈕、大面積底色。

### Neutral
- **頁面底 Bg**（`#F3F4F6`）、**白 Surface**（`#FFFFFF`）、**欄位底 Field**（`#FAFAFB`）。
- **墨 Ink**（`#14171C`）：主要文字。
- **次要墨 Ink Soft**（`#4F5663`）：標籤、單位、說明、表頭；在所有底色上 ≥6.5:1。全站沒有比它更淡的文字色。
- **細線 Line**（`#E1E4E8`）／**加強細線 Line Strong**（`#C9CED6`）：分隔線、表頭底線。不承載資訊。
- **輸入框邊界 Border Input**（`#868D99`）：輸入框、下拉、勾選框的邊；對白 3.3:1、對頁面底 3.0:1。

### Status（只用文字顏色＋小方塊）
- **綠 OK**（`#1C7A43`）：「目標內」。白底 5.4:1。
- **琥珀 Caution**（`#9A5A00`）：「留意」。白底 5.5:1。
- **紅 Danger**（`#B42318`）：「超標」「風險」、曲線上的 Cmin 關切線。白底 6.6:1。

### Named Rules
**數字不畫圖規則。** 能用「數字＋目標範圍＋狀態字」說清楚的，就不畫尺、長條、儀表。只有圖能提供數字給不了的資訊時才畫（例：抽血時點相對給藥的位置）。
**撞色三處規則。** 撞色只出現在頂列下緣、「現行」標籤、「現在」標籤。它的稀少就是重點。
**狀態不靠底色規則。** 達標、留意、超標用文字顏色加 8 px 小方塊，永遠有字；不用綠底、紅底的大色塊。

## Typography

**字體堆疊（內文與標題）：** `"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", system-ui, sans-serif`。系統字，不載入網路字體（R9）。
**數字字體堆疊：** `"Segoe UI", system-ui, "Microsoft JhengHei", "PingFang TC", sans-serif`，一律 `tabular-nums`（D2 在 Windows 實機確認；不行就退回單一堆疊）。
**字重只用 400 與 700**（微軟正黑體只有這兩檔）。

### Hierarchy
基準 14 px；**全站最小 12 px**；手機輸入框 16 px。
- **Page title**（700、17 px）：頂列「TDM 工作台」。
- **Section title**（700、15 px）：左邊段落標題與右邊區塊標題。
- **Body**（400、14 px）／**Body small**（400、13 px）：輸入框、表格、說明句。
- **Label**（700、12 px）：欄位標籤、參數名稱、表頭。
- **Caption**（400、12 px，`ink-soft`）：單位、目標範圍、來源。
- **Value**（700、22 px，24 吋上 24 px）：參數值。
- **Value key**（700、40 px）：AUC₂₄ 這種最關鍵的一個數字，全頁只有一個。

### Named Rules
**最小 12 px 規則。** 包括表頭、單位、圖表上的字。圖表在並排版面縮小時，要用對應寬度的畫布重畫，不可整張縮放到字小於 12 px。

## Layout

**以 24 吋（1920×1080，瀏覽器可用約 1920×940）為主要目標。**
- **雙欄**：左邊工作底稿 540 px，右邊判讀面板佔其餘寬度；最大寬度 1920。1440 寬時左欄 500 px。≤980 px 改單欄，≤640 px 是手機。
- **右邊判讀面板固定在畫面上**（`position: sticky` 放在右欄外層，面板本身 `height: 100vh − 頂列與邊距`、自己捲動）。左邊捲到哪裡，右邊最重要的資訊都在。
- **右邊順序**，前四項不捲動就要看得到（24 吋上全部都在首屏）：
  1. 判讀標題列：現行處方、擬合方式（幾點、兩點相距幾小時）、「已依左側輸入即時更新」。
  2. 參數區：10 個參數排兩列（見 Components）。
  3. 注意事項一行（有警示時展開成清單）。
  4. 濃度曲線與時間軸、候選方案表（含自訂列）。≥1600 px 時兩者並排（約 1.15 : 1），≤1599 px 上下排。
  5. 監測與下次抽血（24 吋上在首屏）。
  6. 往下捲：AI Prompt（預設收合）。
- **左邊 6 個段落**（編號 01 到 06 與順序不變）：細線分隔、小標題，不包圓角卡片。**每段都可收合**，收起來時標題列顯示摘要（例：「01　55 歲・男・168 cm・65 kg・非透析・SCr 0.95（10/20）」），不打開就知道填了什麼。
- **左欄頂端段落列**（固定在頂列下方）：01–06 六個按鈕（點了只展開該段並跳過去、短暫標亮；展開中的段落按鈕是實心）＋「全部收合」「全部展開」。目的是只改某幾個數字時不用整頁捲動；在 24 吋上只展開一段時，整頁一屏看完。
- **給藥紀錄只顯示最近 3 筆**，較早的收成一行「較早 N 筆（起訖時間）已收起，點這裡展開」。時間軸上點到較早的劑次時自動展開。
- **欄位列靠上對齊**；間距用 4 為底的刻度：4／8／12／16／24／32。
- **手機（次要）**：頂端「輸入／結果」切換，底部固定一條結論摘要（AUC₂₄ 與狀態），參數區改兩欄。

## Elevation & Depth

平的。面板與段落用細線和底色差分層。唯一的陰影是浮在內容上的東西（下拉選單、提示）：`0 4px 14px rgba(0,0,0,.08)`；手機底部摘要條用向上的淡陰影。

## Shapes

圓角很小：3 px（標籤）、4 px（輸入框、按鈕、勾選框、單選題外框）、6 px（判讀面板）。控制項高度桌機 32 px、手機 44 px。

## Components

每個互動元件都有預設、懸停、焦點、按下、停用、錯誤（適用時）。焦點：2 px 深藍外框、2 px 間距。

- **頂列**：深藍底、白字；左邊品名與藥物分頁（目前分頁粗體加底線），右邊病人身分條（病歷號、年齡／性別／身高／體重、CrCl、透析狀態）、**強調色選擇**（四個 18 px 色塊，選中的有白圈；`aria-pressed`），以及存檔、清空。頂列下緣一條撞色線。
- **參數區**（取代舊的 10 格數字磚，也取代「完整參數」清單）：AUC₂₄ 大字跨兩列在最左；第一列 Cmin、Cmax、AUC/MIC、近 24h 實際 AUC；第二列 t½（下附 ke）、CL、Vd（下附 L/kg）、CrCl（下附體重法）。每格：標籤／數值＋單位／一行說明（目標、關切線或計算依據）。格與格用細線分隔。D2 用 CSS 把工具既有的 10 格排成這樣，不改 render 輸出。
- **狀態字**：`目標內`（綠）、`留意`（琥珀）、`超標`（紅），前面一個 8 px 小方塊。
- **候選方案表**：方案、劑量／輸注、AUC₂₄、Cmin、Cmax、判讀（狀態字＋原因）；目前處方那列用深藍底色，方案名旁有撞色「現行」標籤；最後一列是自訂（輸入劑量、輸注、間隔即算）。判讀欄不換行。
- **濃度曲線與時間軸**：曲線深藍實線、預測深藍虛線、輸注時段淡深藍底；實測濃度實心黑點加數值（白色描邊防壓線）；Cmin 關切線紅色虛線；「現在」是黑色直線加撞色標籤。下方三條事件軌：給藥＝深藍短條（寬度＝輸注時間）、抽血＝黑點、SCr＝空心菱形（形狀就是圖例）。點事件跳到左邊對應列並標亮。
- **注意事項**：一行摘要；有警示時每則一行，前面狀態字。不用色塊底。
- **輸入框**：欄位底、邊界色 1 px、4 px 圓角；目前正在編輯或剛被時間軸點到的列，邊框深藍加淡深藍外光。
- **必答單選題**（第一筆給藥是不是療程第一劑）：白底細框、深藍選中點；永遠展開，不放在收合區。
- **動效**：150 到 250 ms，只用來傳達狀態；尊重 `prefers-reduced-motion`。

### Class 命名
沿用舊詞彙（`docs/UIUX_IMPL_SPEC_v1.md` 附錄 B）；新增一律加前綴：`ws-`（左區）、`rp-`（右區判讀面板）、`tl-`（時間軸）、`ui-`（共用元件）。新 id 用模組前綴 `vanco`／`amg`／`azl`／`aed`，全域元件用 `tdm`。不可用 `entry-row` class、不可放進 entry-list 容器（R4）。

## Do's and Don'ts

**Do**
- 先讓藥師在 24 吋螢幕上不捲動就看到判讀數字、曲線、候選方案。
- 數字旁邊寫目標範圍與狀態字；單位小一號、灰色。
- 用標準元件、熟悉的位置；撞色只放三處。
- 改版只動外觀與容器位置，render 輸出不變（golden 0 差異）。

**Don't**
- 不畫重講數字的圖（目標帶尺、同尺長條、半衰期尺、儀表）。
- 不用大片綠底、紅底；不用薄荷綠、藍綠這類「AI 生成介面」常見配色。
- 不用網路字體與外部資源；不用小於 12 px 的字；不用比 `ink-soft` 更淡的文字。
- 不用卡片外框堆疊、陰影、漸層、圓形打勾大圖示當裝飾。
- 不把必答題藏進收合區。

## 從現況到目標（D2 施工用對照）

| 現況（`index.html`） | 目標 | 備註 |
|---|---|---|
| IBM Plex 網路字體 | 系統字＋數字堆疊 | 拿掉 Google Fonts `<link>`（R9） |
| 藍綠主色 `--trace`、紙色 `--paper` | 深藍 `--navy`、頁面底 `--bg` | 保留舊變數名稱、換值，或新增後逐步替換 |
| `--ink-faint`（2.4–3.1:1） | 一律 `--ink-soft` | 目前約 60 處對比不足 |
| 琥珀／紅當字色但對比不足 | `--ok`／`--caution`／`--danger` 文字色 | |
| 6 張圓角卡片 | 細線段落 | 段落編號 01–06 不變（R6） |
| 右欄隨頁面捲動 | 右欄外層 sticky、面板自己捲動 | 1920×940 首屏要看到判讀、曲線、候選方案 |
| 10 格數字磚 | 兩列參數區，AUC 大字跨兩列 | 只改 CSS，render 輸出不變 |
| 沒有強調色設定 | 頂列四色塊，`tdm_ui_accent` | 新元素，id 用 `tdm` 前綴 |
| 卡片收合（`initCollapsibleCards`，標題列無摘要） | 段落收合＋收起時顯示摘要＋左欄頂端段落列 | R7：改寫收合功能那一包單獨驗收；摘要是純顯示，讀欄位值，不改計算 |
| 給藥紀錄全部列出 | 只顯示最近 3 筆，較早的收成一行 | 純顯示；列仍在 DOM 裡，`readDoseRows` 不受影響 |
| 字級 9.5–19 px 零散 | 12／13／14／15／17／22／40 | 全站最小 12 |
