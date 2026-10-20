---
name: TDM 工作台
description: 藥師的會診工作底稿——左邊填資料，右邊先講結論；密度高、顏色少、數字對齊。
colors:
  paper: "#F4F5F1"
  surface: "#FFFFFF"
  field: "#FBFBF9"
  ink: "#1B2422"
  ink-soft: "#52605A"
  line: "#DADFD8"
  line-strong: "#C2C9C0"
  border-input: "#7F8B84"
  bar: "#12423F"
  bar-text: "#FFFFFF"
  bar-text-soft: "#CFE5E1"
  trace: "#1F6F6B"
  trace-strong: "#154E4B"
  trace-soft: "#D3E9E5"
  ok-text: "#17603A"
  ok-soft: "#DDEFE2"
  ok-mark: "#2E7D4F"
  caution-text: "#6F4609"
  caution-soft: "#F2E3C7"
  caution-mark: "#A9701F"
  danger-text: "#8A2B2B"
  danger-soft: "#F1D8D5"
  danger-mark: "#A23B3B"
typography:
  page-title:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1.3
  section-title:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Microsoft JhengHei, PingFang TC, Noto Sans TC, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
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
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.2
    fontFeature: "tabular-nums"
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  top-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.bar-text}"
    height: "48px"
    padding: "0 24px"
  section-title:
    textColor: "{colors.ink}"
    typography: "{typography.section-title}"
    padding: "0 0 8px"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 8px"
    height: "32px"
  button-primary:
    backgroundColor: "{colors.trace}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "32px"
  button-primary-hover:
    backgroundColor: "{colors.trace-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "32px"
  chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  chip-caution:
    backgroundColor: "{colors.caution-soft}"
    textColor: "{colors.caution-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  chip-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  param-row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "6px 0"
---

# Design System: TDM 工作台

> 狀態：**D0 草案，待 Brandon 核可**（2026-10-20）。這份描述的是改版要達到的目標系統（D2 起照做）。目前的 `index.html` 還沒套用；與現況不同的地方集中在最後一節「從現況到目標」。第 4 節 Typography 裡的數字字體堆疊與兩個 Named Rules 是我提出的，請核可時特別看。

## Overview

**Creative North Star: 「會診工作底稿」**

藥師的會診工作底稿：左邊是一張填寫用的底稿，右邊是一份判讀報告，結論在最上面，依據在下面。這是要把事情做完的工具，不是展示品，所以按鈕、輸入框、表格、分頁都用大家熟悉的標準元件；風格只表現在字體、配色、密度，和一個招牌設計——共用時間軸（給藥、抽血、SCr 排在同一條時間線上）。

氣質是安靜、準確、略帶實驗室紙本的乾淨感：近白的紙色底、深藍綠的頂列與主色、細線分隔、數字右對齊。顏色只在有意義的地方出現——紅是超標或危險，琥珀是留意，綠是目標內；其餘都是中性灰綠。

**Key Characteristics:**
- 結論先講：右區第一眼是結論列，再是候選方案，最後才是曲線與參數。
- 密度偏高、節奏規律：像一張排得整齊的表單，而不是一堆卡片。
- 一個字體家族、兩個字重（400／700）；數字一律等寬對齊。
- 平的：沒有陰影、沒有漸層、沒有裝飾性動畫；深度靠細線與底色差。
- 狀態不只靠顏色：每個紅／琥珀／綠都有文字或符號。

## Colors

一組冷調的灰綠中性色，加一個深藍綠主色，再加三組狀態色（綠／琥珀／紅，各有文字色、底色、標記色）。

### Primary
- **深藍綠 Trace**（`#1F6F6B`）：主要按鈕、目前選取、連結、焦點外框。白字在上面 5.9:1。
- **深藍綠加深 Trace Strong**（`#154E4B`）：按鈕按下與懸停、強調文字、選取的分頁底線。
- **淺藍綠 Trace Soft**（`#D3E9E5`）：選取列、資訊提示的底色。上面的文字用 `trace-strong`。

### Neutral
- **紙色 Paper**（`#F4F5F1`）：整頁底色（工作區）。
- **白 Surface**（`#FFFFFF`）：段落內容底、結果區底。
- **欄位底 Field**（`#FBFBF9`）：輸入框底色，比白略暗，讓輸入框看得出來。
- **墨 Ink**（`#1B2422`）：主要文字。
- **次要墨 Ink Soft**（`#52605A`）：說明文字、單位、表頭。**取代舊的 `ink-faint`（`#8B968F`，只有 2.4–3.1:1）**；在所有底色（紙、白、欄位、各種狀態底色）上都 ≥4.8:1。
- **細線 Line**（`#DADFD8`）：段落分隔線、表格橫線。純分隔，不承載資訊。
- **加強細線 Line Strong**（`#C2C9C0`）：裝飾性的較明顯分隔，不用於控制項邊界。
- **輸入框邊界 Border Input**（`#7F8B84`）：輸入框、下拉選單、勾選框的邊界。對白 3.5:1、對紙色 3.2:1，符合介面元件 3:1。
- **頂列 Bar**（`#12423F`）：頂列底色；白字 11.2:1，次要字 `bar-text-soft`（`#CFE5E1`）8.5:1。

### Status（紅／琥珀／綠）
每組有三個色：**文字色**（放在任何底色上的字）、**底色**（標籤與提示列的底）、**標記色**（小圓點、左邊線、圖示）。
- **綠 OK**：文字 `#17603A`、底 `#DDEFE2`、標記 `#2E7D4F`。意思是「在目標內」。
- **琥珀 Caution**：文字 `#6F4609`、底 `#F2E3C7`、標記 `#A9701F`。意思是「留意，但不是危險」。
- **紅 Danger**：文字 `#8A2B2B`、底 `#F1D8D5`、標記 `#A23B3B`。意思是「超標或危險」。

### Named Rules
**文字不用標記色規則。** 標記色（`*-mark`）只用在圓點、邊線、圖示；字一律用 `*-text` 或 `ink`／`ink-soft`。舊版把 `#A9701F` 當字色用，在琥珀底上只有 3.3:1。
**顏色只在有意義的地方規則。** 主色只用在主要動作、目前選取、焦點；狀態色只在真的有狀態時出現；其他一律中性。一個畫面上的狀態色底塊應該少到每一塊都值得看。
**不靠顏色規則。** 紅、琥珀、綠每一次出現都要搭配文字（「風險」「留意」「OK」）或形狀，不能只有顏色。

## Typography

**字體堆疊（內文與標題）：** `"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", system-ui, sans-serif`。系統字，不載入任何網路字體（紅線 R9：離線可用，也不向外連線）。
**數字字體堆疊（參數值、表格數字）：** `"Segoe UI", system-ui, "Microsoft JhengHei", "PingFang TC", sans-serif`，一律 `font-variant-numeric: tabular-nums`。理由：我無法確認微軟正黑體的拉丁數字是否等寬，Segoe UI 與 SF（system-ui）確定支援；中文字會自動落到後面的中文字體。（**我提出的，D2 在 Windows 實機確認；不行就退回計畫指定的單一堆疊。**）

**字重只用 400 與 700。** 微軟正黑體只有一般與粗體兩檔，寫 500／600 在 Windows 上會悄悄變成 700，在 Mac 上卻不同，兩邊長得不一樣。

**Character:** 一個家族扛全部（標題、按鈕、標籤、數據）；層次靠大小與粗細，不靠換字體。

### Hierarchy
基準 14 px、比例約 1.125；**全站最小 12 px**。手機輸入框 16 px（避免 iOS 自動放大）。
- **Page title**（700、22 px、1.3）：頁首「TDM 工作台」。
- **Section title**（700、16 px、1.4）：段落標題（「01 病人與腎功能」等）。
- **Body**（400、14 px、1.55）：輸入框、表格內文、結論句。說明性長文行寬 65–75 字。
- **Body small**（400、13 px、1.5）：次要內容、表格內的說明欄。
- **Label**（700、12 px）：欄位標籤、表頭、標籤晶片。
- **Caption**（400、12 px、1.45，用 `ink-soft`）：單位、提示、來源。
- **Value**（700、20 px、tabular-nums）：右區的關鍵數值（AUC₂₄、Cmin 等）。

### Named Rules
**最小 12 px 規則。** 任何文字不得小於 12 px，包括表頭、單位、徽章。舊版有 9.5、10、10.5、11、11.5 px。
**數字靠右、位數對齊規則。** 表格與參數表的數字右對齊、等寬，單位放在另一欄。

## Layout

**雙區：左邊工作底稿、右邊判讀報告。** 桌機（≥981 px）左右並排，右區與左區上緣對齊；單欄在 ≤980 px。最大寬度 1400 px，左右留 24 px。
**共用時間軸（招牌設計）**放在右區曲線的正上方，與曲線共用同一個時間範圍；點時間軸上的事件，左邊對應的列會捲到並短暫標亮。
**右區順序固定：** 結論列 → 候選方案表 → 曲線（含時間軸）→ 參數表 → 注意事項 → 監測建議 → AI Prompt（預設收合）。
**左區 6 個段落（編號 01 到 06 與順序不變）：** 01 病人與腎功能、02 感染／臨床脈絡、03 給藥處方與紀錄、04 血中濃度量測（自由時點）、05 目標與情境設定、06 併用藥物與其他備註。段落用細線與小標題分隔，不再包成圓角卡片。
**間距用 4 px 為底的刻度：** 4／8／12／16／24／32。舊版有 5、6、9、10、14、18 等零散值，D2 起收斂。
**斷點：** 981（雙區）、640（手機）。手機的結構變化（頂端「輸入／結果」切換、底部固定結論摘要）在 D7 處理，不靠縮放字級。
**欄位列靠上對齊。** 同一列的欄位標題有固定最小高度，輸入框上緣就會齊；不用靠下對齊（下方多一行說明的欄位會把隔壁擠歪）。

## Elevation & Depth

平的。段落、表格、欄位都用細線與底色差分層，不用陰影。唯一允許的陰影是會浮在內容上的東西（下拉選單、提示氣泡）：`0 4px 14px rgba(0,0,0,.08)`。

### Named Rules
**預設平面規則。** 靜止狀態沒有陰影；陰影只代表「這個東西浮在別的上面」。

## Shapes

圓角三階：4 px（標籤晶片、勾選框）、6 px（輸入框、按鈕）、8 px（浮層、說明塊）。段落不再有外框與圓角，用細線分隔。
控制項高度桌機 32 px、手機 44 px（點擊目標）。邊界：輸入框用 `border-input` 1 px；段落分隔用 `line` 1 px。

## Components

**原則：標準元件，標準行為。** 每個互動元件都要有：預設、懸停、焦點、按下、停用、錯誤（有適用時）。焦點：2 px `trace` 外框、2 px 間距，對紙色與白底都 ≥5.4:1。

- **頂列（`top-bar`）**：深藍綠底、白字；左邊品名與藥物分頁，右邊病人身分條（病歷號、年齡／性別／體重、CrCl、透析狀態）。高 48 px。
- **藥物分頁**：一行排完，手機可橫向捲動；目前分頁用底線加粗體，不只靠顏色。
- **段落標題（`section-title`）**：編號用小方塊（`trace-soft` 底、`trace-strong` 字）＋標題；下方細線。
- **輸入框（`input`）**：`field` 底、`border-input` 邊、6 px 圓角；錯誤時邊框換 `danger-mark`、下方一行 `danger-text` 說明。必填未填用同一套錯誤樣式，並在右區列出缺哪些。
- **按鈕**：主要（`trace` 底白字）每個區塊最多一個；次要（白底、`border-input` 邊）；危險動作（清除、刪除）用次要樣式加 `danger-text` 文字，確認視窗再出現紅色。
- **狀態標籤（`chip-ok`／`chip-caution`／`chip-danger`）**：底色＋同色系文字色，內容固定是文字（「OK」「留意」「風險」），不是只有色塊。
- **結論列**：右區最上面一條，內容是現行處方、預測 AUC₂₄ 與目標、Cmin、擬合方式與兩點間隔；狀態用 chip，數字用 `value`。
- **參數表（`param-row`）**：兩欄定義表——標籤在左、數字右對齊、單位另一欄；取代舊的 10 格數字磚。
- **候選方案表**：標準表格；方案、劑量、間隔、預測 Cmax／Cmin／AUC、評語（chip＋文字）；目前處方列用細線底色標示，選取列用 `trace-soft`。
- **旗標清單（`flag-item`）**：左邊 3 px 標記色邊線＋圓點，文字用 `ink`；紅／琥珀才用狀態底色，綠與一般說明不加底。
- **共用時間軸（`tl-`）**：給藥＝短直條、抽血＝實心圓、SCr＝菱形（形狀就是圖例，不靠顏色）；Tab 可聚焦事件，Enter 跳到左邊對應列。
- **空白狀態與缺資料**：講清楚缺什麼（列出欄位、點了跳過去），不是「沒有資料」。
- **動效**：150 到 250 ms，只用來傳達狀態（展開、選取、標亮）；尊重 `prefers-reduced-motion`；沒有進場動畫。

### Class 命名
沿用舊的詞彙（見 `docs/UIUX_IMPL_SPEC_v1.md` 附錄 B）；新增一律加前綴：`ws-`（左區工作底稿）、`rp-`（右區判讀報告）、`tl-`（時間軸）、`ui-`（共用元件）。新 id 用模組前綴 `vanco`／`amg`／`azl`／`aed`，跨模組全域元件用 `tdm`。表頭、說明列、新元素不可用 `entry-row` class，也不可放進 entry-list 容器（紅線 R4）。

## Do's and Don'ts

**Do**
- 結論先講；每個畫面先回答「目前處方達不達標、要不要動」。
- 用標準元件與熟悉的位置（頂列、分頁、表格、下拉）。
- 數字右對齊、用同一種小數位數；單位另一欄。
- 狀態一律配文字；紅、琥珀、綠只在真的有狀態時用。
- 手機：輸入框 16 px、點擊目標 44 px、結論在第一屏。

**Don't**
- 不用任何網路字體或外部資源（離線可用、資料不離開電腦）。
- 不用小於 12 px 的字；不用 `ink-soft` 以外的淡灰當文字。
- 不用卡片外框、陰影、漸層、玻璃效果、進場動畫當裝飾。
- 不用標記色當文字顏色；不用顏色當唯一的訊號。
- 不用 modal 當第一個想法；能行內就行內（`alert()` 在 D8 全部改成行內提示）。
- 不改計算函式、不改既有 element id（改版只動外觀與容器位置）。

## 從現況到目標（D2 施工用對照）

| 現況（`index.html`） | 目標 | 備註 |
|---|---|---|
| IBM Plex Sans／Mono 網路字體（Google Fonts `<link>`） | 系統字堆疊；數字用 `font-num` 堆疊 | 拿掉 `<link>`（R9） |
| `--ink-faint:#8B968F`（2.4–3.1:1） | 一律改 `--ink-soft`（`#52605A`） | 目前還有約 60 處對比不足 |
| `--ink-soft:#57645D` | `#52605A` | 微調以留餘裕 |
| `--line-strong:#C2C9C0` 當輸入框邊界（1.7:1） | `--border-input:#7F8B84` | 可見的視覺改變：輸入框邊界變深 |
| `--amber:#A9701F`、`--crimson:#A23B3B` 當字色 | 字用 `*-text`；`*-mark` 只做標記 | |
| 沒有「綠」 | 新增 ok 三色 | 目前「OK」用主色 |
| 字級 9.5／10／10.5／11／11.5／12.5／13.5／15／17／19 px | 12／13／14／16／20／22 | 全站最小 12 |
| 圓角 3／4／5／6／7／8／10 | 4／6／8 | |
| 間距 1–24 的零散值 | 4／8／12／16／24／32 | |
| 6 張圓角卡片、右區 10 格數字磚 | 細線段落、兩欄參數表 | 見計畫 D2 |
| 手寫的 `.hint` 等類別 | 保留類別名，換值 | 新增元素才用新前綴 |
