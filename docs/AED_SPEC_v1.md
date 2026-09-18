# 抗癲癇藥物（Phenytoin／Valproic Acid）TDM 模組 — 規劃與結構 Spec v1

> 狀態：**草案，待 Brandon 逐項核可（Go/No-Go）**。本文件只做規劃，`index.html` 未做任何改動。
> 撰寫日期：2026-09-18
> 依據優先序：**① 本院《Guidelines to Therapeutic Drug Monitoring》／臺大醫院療劑監測指引**（`references/Guidelines to Therapeutic Drug Monitoring (1).pdf`，以下簡稱「院內指引」）→ ② `tdm-calculator` skill `references/antiepileptic.md` 與院內 AED 收案表 → ③ 外部權威文獻（僅用於補充院內指引未涵蓋的計算方法、適用限制與安全警示；**與院內指引衝突時一律以院內指引為準，並在介面上標明差異**）。
> 必讀前置：`docs/HANDOFF_v3.md` 第 14–15 節（新模組不照抄既有複製結構）。

---

## 0. 一頁摘要

| 項目 | 決定（提案） |
|---|---|
| 模組定位 | 「濃度校正判讀 ＋ 非線性（phenytoin）／比例（VPA）劑量推估 ＋ 情境檢查」；**不是** vanco/AMG 那種 free-sampling 貝氏時間曲線擬合引擎，架構上較接近 Azole 模組 |
| 模組 ID／前綴 | `aed`（DOM id 前綴 `aed`，section `drug-aed`，header `AED_HEADER`，store key `aed_tdm_patients_v2`） |
| 子藥物 | phenytoin（含 fosphenytoin）、valproic acid（含 divalproex、ER、IV）；模組內切換，比照 Azole 的 vori/posa/isa |
| 共用引擎（直接沿用，不複製） | `makeVersionedPatientStore`、`drawTrendChart`、`ibwDevine`／`cockcroftGault`、`toLocalInputValue` 等日期 helper、`initCollapsibleCards` |
| 新增的「更好的模式」 | ① 所有臨床數值集中在一個 **帶出處欄位的常數表 `AED_RULES`**；② 所有計算寫成**不碰 DOM 的純函式 `AED_CALC`**，可直接在 node 單元測試；③ 藥物切換器改為 registry（**已決定，Q7**） |
| 不做（本版） | 時間-濃度曲線、phenytoin 貝氏 MAP 擬合、carbamazepine／phenobarbital 模組（院內指引有，但收案表沒有，列為後續擴充點） |
| 分期 | P1 骨架＋輸入＋濃度校正判讀＋警示＋存檔 → P2 MM／VPA 劑量推估＋監測計畫 → P3 趨勢圖＋MM 劑量-濃度曲線 → P4（選配）亞洲族群參數／貝氏 |

---

## 1. 院內指引萃取（第一權威，逐字對照）

### 1.1 Phenytoin（院內指引 III. Antiepileptics + 中文總表 p.16）

| 項目 | 院內指引內容 |
|---|---|
| 抽血時點 | PO：trough（正要給藥前）；IV：給藥後 **2–4 小時** |
| 治療範圍 | **10–20 mcg/mL** |
| 達穩態 | **5–30+ 天**（註 2：毒性大或半衰期長之藥品如 phenytoin 應早些測濃度以免過量或劑量太低） |
| 監測參數 | albumin、肝功能、腎功能 |
| 影響濃度因素 | 劑型、給藥途徑（IM、NG feeding）、低白蛋白、腎衰竭、腸胃功能改變、**高膽紅素血症（T-bil > 15 mg/dL）**、酵素誘導劑、酵素抑制劑、蛋白結合置換劑（valproic acid） |
| 低白蛋白校正 | `Cp_normal = Cp_obs / (0.2 × Alb + 0.1)` |
| 腎衰竭校正 | `Cp_normal = Cp_obs / (0.1 × Alb + 0.1)` |
| 併用 VPA 校正 | `Cp_normal = {0.095 + 0.001 × C_VPA} × C_PHT / 0.1` |

### 1.2 Valproic acid

| 項目 | 院內指引內容 |
|---|---|
| 抽血時點 | trough（正要給藥前）；**抽血時間與給藥時間之關係需固定** |
| 治療範圍 | **50–100 mcg/mL** |
| 達穩態 | **2–3 天** |
| 監測參數 | 肝功能、albumin |
| 影響濃度因素 | 低白蛋白、酵素誘導劑、蛋白結合置換劑、**carbapenem 類抗生素** |

### 1.3 院內指引共通原則（會直接寫進判讀邏輯）

- 穩態定義：固定劑量治療 ≥ 4 個半衰期後抽血。
- **不可僅憑血中濃度診斷中毒**；有毒性證據時立即抽血。
- 血中濃度僅供參考，療效與中毒評估須參照臨床症狀與其他檢驗（總表註 1）。
- 腎功能不全者達穩態所需時間較長（總表註 3）。
- 檢驗方法：2014/11/3 起除少數例外全面採 Abbott Architect CMIA → 報告單位 mcg/mL（= mg/L = µg/mL）。

### 1.4 院內指引「沒有寫」、必須由文獻補足的缺口

| 缺口 | 影響 | 本 spec 的處理 |
|---|---|---|
| Free phenytoin 目標範圍 | 有 free level 時無法判讀 | 採文獻 1–2 mg/L（§2.1），標為「文獻補充」 |
| ~~「腎衰竭」的操作型定義~~（**已解決，Q1**） | 不知何時改用 0.1 係數 | CrCl < 10 或正在透析，自動判定＋手動覆寫，見 §9 Q1 |
| 三條校正式的適用優先序 | 同時低白蛋白＋腎衰＋併用 VPA 時要用哪條 | 決策樹見 §4.2 |
| Phenytoin 族群 Vmax/Km/Vd、劑量推估方法 | 無法做劑量建議 | 採 Winter 教科書標準參數與方法（§2.2），全數標明為族群假設 |
| ~~Free VPA 目標~~（**已解決，見 §2.5**）；VPA 白蛋白校正 | 低白蛋白時 total 失真 | Free 目標＝本院檢驗科 5–15 µg/mL；校正式部分文獻顯示不可靠 → 以「建議測 free」為主（§2.4–2.5、§9 Q3） |
| VPA ammonia／platelet 監測 | 院內只列 LFT、albumin | 依 skill／收案表納入，標為「收案表／文獻補充」 |
| 藥物基因（CYP2C9、HLA-B*15:02） | 台灣族群高度相關 | 依 CPIC 2020 納入（§2.3） |

---

## 2. 外部文獻查證結果（補充層）

> 每條都標出處；凡是我**沒有找到可驗證原文數字**的，一律標 ⚠️待查證，不寫進程式常數。

### 2.1 Phenytoin 蛋白結合校正的準確度
- 院內使用的 Winter-Tozer（0.2 係數）在外部驗證中**系統性高估** free/normalized 濃度；衍生式 Anderson（0.25）、Cheng（0.275）、Kane（0.29）各有改善但**皆缺乏一致的外部驗證，且在重症族群全部表現不佳**（Cheng et al., Can J Hosp Pharm 2016；Sheiner-Tozer 衍生式綜述，PubMed 26825643）。
- ESRD 係數 0.1 源自 Liponi et al., *Neurology* 1984（PubMed 6538287）；Soriano et al., *Ann Pharmacother* 2017 對 ESRD 族群做過再評估。
- 併用 VPA 校正式源自 **Haidukewych et al., *Ther Drug Monit* 1989**（PubMed 2497562）。
- 共識：**有實測 free level 時，free 優先於任何校正式**（skill reference＋上述文獻一致）。Free phenytoin 目標 **1–2 mg/L**。
- → 設計含意：校正值一律顯示「套用哪條公式＋為什麼＋已知偏差方向（高估）」，不給單一「正確值」的假象。

### 2.2 Phenytoin 非線性（Michaelis-Menten）劑量推估
- 族群參數（教科書預設，Winter's *Basic Clinical Pharmacokinetics*；Zimmerman, *Antiepileptics* 章）：Vmax ≈ 7 mg/kg/day（>59 歲約 5.8）、Km ≈ 4 mg/L（部分教材 4.3）、**Vd ≈ 0.65–0.7 L/kg**（肥胖以 IBW + 1.33×(TBW−IBW)）。Salt factor：phenytoin sodium（膠囊、IV）與 fosphenytoin（以 PE 計）**S = 0.92**；phenytoin acid（懸浮液、咀嚼錠）**S = 1.0**。**Vmax 預設已由 §2.2.1 台灣文獻取代，見下；Vd 與 salt factor 沿用教科書值。**
- 方法（pkineticdrugdosing.com phenytoin 頁、Winter）：
  - **單點法**：假設族群 Km，由一個穩態濃度反解 Vmax：`Vmax = R × (Km + Css) / Css`，R = S·F·每日劑量。
  - **兩點法**（兩個不同劑量各自的穩態濃度）：`Km = (R2 − R1) / (R1/C1 − R2/C2)`，`Vmax = R1 + Km × R1/C1`。
  - **達標劑量**：`R_new = Vmax × C_target / (Km + C_target)`，處方劑量 = R_new ÷ (S·F)。
  - **達 90% 穩態時間**：`t90(days) = [Km × Vd / (Vmax − R)²] × (2.3 Vmax − 0.9 R)`。
  - 負荷／補充負荷：`LD = Vd × (C_target − C_current) / S`；院內指引未規範，族群常用 15–20 mg/kg（pkineticdrugdosing）；status epilepticus 以 fosphenytoin 20 mg PE/kg（AES 2016 指引，本版不做，見 §9 Q9）。
- 族群 Km 個體間變異極大，單點法對 Km 假設極敏感。以實算示範（S=0.92，phenytoin sodium 300 mg/day，穩態 total 8 mg/L，目標 15）：

| 假設 Km (mg/L) | 反解 Vmax (mg/day) | 達 15 mg/L 所需 phenytoin sodium (mg/day) |
|---|---|---|
| 2 | 345 | 331 |
| 4 | 414 | 355 |
| 6 | 483 | 375 |

  → 設計含意：單點法**必須同時顯示 Km 敏感度帶**，不能只給一個數字。兩點法示範：300 mg→8 mg/L、400 mg→20 mg/L，解得 Km 5.71 mg/L、Vmax 473 mg/day（驗算 R2 = 473×20/25.71 = 368 ✓）。t90 示範（Vmax 414、Km 4、Vd 49 L、目標 15）約 **17 天**——正好說明院內指引「5–30+ 天」的由來。**（此段示範數字沿用教科書 Km=4 僅作方法演示；實際預設 Km 敏感度帶已依 §2.2.1 擴充為亞洲文獻值，示範用哪一組不影響方法本身）**

### 2.2.1 族群參數：亞洲／台灣文獻補充（Q5 已解決，2026-09-18 追加）

> 你要求「現在就查」而非留到 P4。查證結果：**Vmax 在各亞洲研究間相對一致（7.0–9.8 mg/kg/day，與 Winter 的 7 差距不大）；Km 在各研究間差異極大（1.45–9.19 mg/L，逾 6 倍），文獻本身對 Km 的估計法不穩定，不是查證不足。** 因此採用你選定的方式：**Vmax 預設改用台灣本地數據；Km 不改預設值，但敏感度帶擴充納入亞洲文獻數值，讓藥師自己看到分歧有多大。**

| 研究 | 族群／人數 | Vmax | Km | 出處 |
|---|---|---|---|---|
| **Hung CC, et al.（採用為新 Vmax 預設）** | **台灣，n=169** | **G1（CYP2C9\*1/\*1＋CYP2C19\*1/\*1）基線 8.29 mg/kg/day**；G2(CYP2C9 IM) 相近；G3(CYP2C19 PM) +15.1%；G4(CYP2C9 PM) +27.4%；G5(雙 PM) +91.7% | 摘要未附絕對值，⚠️待查證（需全文） | *Ther Drug Monit* 2004;26(5):534-540（PMID 15385837） |
| Samsung Medical Center | 韓國，n=97（G1 野生型/野生型 n=36） | 7.04 ± 1.6（6.5–7.6）mg/kg/day | **1.45 ± 0.6（1.2–1.7）mg/L** | 韓國族群研究，見 §10 |
| （通訊作者機構顯示為新加坡） | 新加坡華人，n=66（成人+兒童） | 30.72 × BW^0.656 mg/day（體重依 0.656 次方縮放，非簡單 mg/kg/day 常數） | **2.307 mg/L**（作者稱「明顯低於歐美研究」） | *Eur J Clin Pharmacol*（見 §10） |
| Odani et al. 1996 | 日本，n=116（531 次濃度） | 9.80 mg/kg/day（體重依 0.463 次方縮放） | **9.19 mg/L**（併用 zonisamide 使 Km ↑16%） | *Biol Pharm Bull* 1996;19(3):444（doi:10.1248/bpb.19.444） |

**對 spec 的影響（Q5 已解決）：**

1. **`AED_RULES.phenytoin.pop.vmaxMgKgDay` 預設由 7 改為 8.29**（Hung 2004 台灣 G1 基線），`src` 標明「台灣本地族群數據，取代 Winter 教科書通用值」；`vmaxElderly`（教科書 5.8）與 `vd`／`km` 暫維持不變，因台灣研究未提供對應絕對值。
2. **新增 `AED_RULES.phenytoin.cypDoseAdj`**：直接採用 Hung 2004 的基因型分層劑量建議範圍（mg/kg/day）——G1 5.5–7、G2 5–7、G3 5–6、G4 3–4、G5 2–3——作為 §2.3 CPIC 百分比調整之外的**台灣本地實證備選參考**，兩者並列顯示、標明不同出處與方法（CPIC 為藥物基因學指引的通用百分比折減；Hung 為台灣本地實測劑量範圍），不互相取代。
3. **`phtKmSensitivity` 的預設候選值由 `{2,4,6}` 擴充為 `{1.45, 2.3, 4, 6, 9.19}`**（韓國、新加坡華人、教科書、教科書上緣、日本），每個候選值旁標出處；不做「哪個對台灣最準」的判斷，因為現有資料無法支持這個判斷——UI 呈現方式與既有 Km 敏感度帶一致，只是候選值變多、來源更具體。
4. Hung 2004 的**絕對 Km 值摘要未附**，僅有相對百分比與劑量建議表；若之後你能取得全文或本院藥劑部有轉載，可以再補上。目前 spec 不假設一個未經驗證的 Hung Km 數字。

### 2.3 藥物基因（CPIC 2020，Karnes et al., *Clin Pharmacol Ther* 2021）
- **HLA-B*15:02 陽性**：未曾使用者**避免 phenytoin**（SJS/TEN 風險）；已連續使用 ≥3 個月無皮膚反應者可審慎續用。陰性不代表零風險。台灣族群此等位基因頻率高，臨床意義大。
- **CYP2C9**：NM 標準劑量；IM（AS 1.5）不調；IM（AS 1.0）維持劑量約減 **25%**；PM 約減 **50%**；負荷劑量不因 CYP2C9 調整；之後依 TDM 滴定。
- CYP2C19 對 phenytoin 的影響 CPIC 未給劑量建議 → 只作資訊欄位，不影響計算。

### 2.4 Valproic acid
- 蛋白結合 74–93%、**濃度依賴性飽和結合**；半衰期成人 12–16 h；trough 採樣（Patsalos et al., *Ther Drug Monit* 2018）。高 total 時 free fraction 不成比例上升 → 「total 等比例調劑量」會低估 free 的上升幅度。
- **白蛋白校正（Hermida & Tutor, *J Pharmacol Sci* 2005）**：`C_N = α_H × C_H / 6.5`（α_H 由 Parent 指數式依白蛋白查表）；**只在 total ≤ 75 mg/L 可靠**，**不適用於黃疸、尿毒、腎衰竭**。*Neurocrit Care* 2019（PubMed 30328046）與神經重症研究顯示校正式準確度不足。
- **重症**：*Neurocrit Care* 2025 多中心回溯研究——重症病人 free fraction 中位數 35%（遠高於正常的 ~10%）；低白蛋白、BUN 上升、**propofol 暴露**為不成比例 free 升高的危險因子；free 升高與血小板低下、肝毒性相關；結論：**重症病人應直接測 free VPA**。
- **Carbapenem 交互作用**（統合分析，PubMed 33322967）：VPA 濃度平均下降 **約 44 mg/L**，**1–3 天內**發生，停用 carbapenem 後 **1–2 週**才回到原水準；增加 VPA 劑量無法抵銷；發作頻率上升 → 原則避免併用。與院內指引「carbapenem 影響 VPA 濃度」一致並量化。
- ER 劑型（原始文獻調查，**已被 §2.7 的本院品項資料部分取代，見下方修正**）：美國 divalproex ER 生體可用率低於 DR，由 DR 轉 ER 通常需增加每日劑量約 8–20%（仿單；Clin Drug Investig 2004 轉換研究）。

### 2.5 本院檢驗科數據（Brandon 提供，2026-09-18 追加 — **取代 §2.4 末項「待查證」，Q2 已解決**）

本院「Free-form Valproic acid（游離態丙戊酸）」醫令說明（醫令代碼 10510CYP）：

| 項目 | 內容 | 對 spec 的影響 |
|---|---|---|
| **有效治療濃度範圍** | **5–15 µg/mL** | **取代**原本 skill reference 的「約 7–23」與外部文獻的不一致範圍；`AED_RULES.valproate.freeRange = {lo:5, hi:15}`，src 標「本院檢驗科 10510CYP」，**權威層級等同院內指引**（優先於文獻） |
| 檢體種類 | 血清（紅頭黑頂管） | 供收案表提示 |
| **採檢時機** | **低谷：給藥前一小時內抽血** | 比院內指引「trough＝正要給藥前」更精確；`AED_CALC.aedSamplingCheck` 採**窄窗（給藥前 60 分鐘內）**判斷——**這條窗口不是 free VPA 獨有，見 §2.6：本院 total VPA／phenytoin 醫令也是同一條「給藥前一小時內」，不是原本以為的寬鬆 trough** |
| **操作時間（排班）** | **僅週二、週五（W2、W5）** | **設計結論已變更（Q11 已解決，2026-09-18）**：free VPA 不是隨時可以加驗，這件事本身仍寫進 UI，但**只做成固定提示文字**（例如「提醒：本院 free VPA 僅週二、週五執行，報告需 3 天」），**不對「今天到下次 W2/W5 還有幾天」做日期運算**——監測建議的天數一律只給臨床天數（如 t90、2–3 天），排班資訊是旁註，不折算進那個天數裡 |
| **檢驗報告時間** | 3 天 | 同上：3 天 TAT 隨排班提示一起用固定文字顯示（「排班＋TAT」僅供參考說明，不是監測建議天數的計算輸入），Q11 已解決 |
| 方法學 | Homogeneous enzyme immunoassay | 資訊性欄位 |
| **臨床意義（原文）** | 「血液中90%以上的 VPA 與白蛋白高度結合，只有游離態可穿過血管到達組織產生藥理作用。**尿毒症、低白蛋白症、free fatty acid（例如 Intralipid、propofol 或 clevidipine）的給予，或是一些會競爭白蛋白的藥物（例如 aspirin 或 ibuprofen）**，游離態 VPA 會明顯升高。」 | **擴充 §4.3 的風險旗標清單**：原本只有「低白蛋白、high total、ICU、propofol」（文獻），本院說明額外點名 **尿毒症（不只低白蛋白）、Intralipid、clevidipine、aspirin、ibuprofen** 作為明確的競爭／置換因子，這些要各自成為 `vpaAssess()` 的獨立旗標，且是**本院檢驗科親自列名**，權威層級高，應優先於外部文獻清單呈現 |
| 干擾物質 | Icterus（bilirubin ≤30）、Lipemia（TG ≤750）、Hemolysis（Hb ≤800）皆無臨床顯著干擾 | 供「檢體品質」提示用，非計算邏輯 |

### 2.6 本院檢驗醫學部醫令擷取（Brandon 提供，`醫令英文名稱.docx`，2026-09-18 追加）

新增三筆本院醫令，**全部改寫了「採檢時機」與「排班／TAT」這兩件事，比 §2.5 只有 free VPA 一筆時掌握得更完整**：

| 醫令 | 代碼 | 治療範圍 | 採檢時機 | 排班 | TAT | 備註 |
|---|---|---|---|---|---|---|
| Valproic acid（total） | 10510B0P | 50–100 µg/mL | **給藥前一小時內** | W1–W5、8:00–17:00 | **1 天** | 一般病房常規可用 |
| Phenytoin（total，常規） | 10502BZP | 10–20 µg/mL | **給藥前一小時內** | W1–W5、8:00–17:00 | **1 天** | |
| **Phenytoin（STAT）** | 10502BYP | 10–20 µg/mL | 給藥前一小時內 | **24 小時作業** | **急診 30 分鐘；病房 1 小時** | 執行科室 RL_BC（常規是 BC），**不提供院外代檢**；臨床意義原文提到「診斷是否用藥過量」——對應院內指引 I-2-d「有中毒證據時應立即測濃度」 |

**這筆資料改變 spec 的三個地方：**

1. **「給藥前一小時內」是本院 total／free 共通的採檢窗，不是 free 專屬的窄窗。** §2.5 的措辭已回頭修正（見上）。原本 §1.1/§1.2 引用院內《Guidelines to Therapeutic Drug Monitoring》寫的「trough＝正要給藥前」是較粗略的通則，**本院檢驗醫學部醫令是更精確、可執行的版本，`AED_CALC` 一律採 60 分鐘窗**，不分 total／free、不分 phenytoin／VPA。
2. **Total 濃度（phenytoin、VPA）的排班遠比 free VPA 寬鬆——平日隨時可送，隔天出結果**，跟 §2.5 那個「只有週二週五、要等 3 天」的 free VPA 完全是两回事。**這個差異本身仍值得讓藥師知道，但 Q11 已解決（2026-09-18）：UI 只用固定提示文字並列顯示各項目的排班／TAT 事實（total「平日次日」／free VPA「僅 W2、W5，報告 3 天」／phenytoin STAT「急診 30 分鐘、病房 1 小時」），不做「今天到下次可送驗日還剩幾天」的日期運算，監測建議的天數只給臨床天數（t90 或 2–3 天）。**
3. **新增 Phenytoin STAT 路徑**：急診 30 分鐘、病房 1 小時就有結果，24 小時皆可送。這直接對應院內指引通則「有中毒證據或懷疑 overdose 時應立即測濃度」——建議在 §4.1 的毒性徵象 checklist 若有陽性勾選（眼震、共濟失調、構音障礙、嗜睡、意識改變），UI 提示「可送 STAT phenytoin（代碼 10502BYP，急診 30 分鐘／病房 1 小時），不必等下一個常規排程」——**這是固定提示文字，不是排班日期運算**，與 Q11 的決定一致。**VPA 沒有對應的 STAT 醫令**（這份擷取資料裡沒有），VPA 疑似中毒/高血氨腦病時的處置走「立即評估＋送常規 total（1 天 TAT）＋視情況送 free（見 §2.5，僅提示排程限制文字）」，兩者步調不同，UI 需要分開處理，不能套用同一個「緊急送檢」按鈕邏輯。

**✅ 已確認（Q12 解決，Brandon 2026-09-18 回覆）：本院沒有 free phenytoin 檢測。** §4.1／§4.2 的「優先 1：有實測 free」對 phenytoin **不再是待確認分支，而是確定不存在的路徑**——phenytoin 的濃度判讀只能依賴白蛋白／腎功能／VPA 併用三條校正式，UI 上不放「建議測 free phenytoin」這個選項（畫面上可以放一句固定提示「本院無 free phenytoin 醫令，如需 free level 須外送」，不做成互動按鈕，避免藥師誤以為可以院內直接照會）。VPA 則維持原設計，有本院醫令（10510CYP）可送。

### 2.7 本院藥品品項（Brandon 提供，2026-09-18 追加 — **部分解決 Q6**）

| 學名 | 八碼 | 中文名 | 商品名／規格 | 劑型 | Salt factor |
|---|---|---|---|---|---|
| Phenytoin | ALE4JA07 | 阿雷彼阿慶錠 | Aleviatin Tablet **100 mg/tab** | PO 錠劑 | **S = 1.0**（游離酸型，非 sodium 鹽，依 §2.2 salt factor 表） |
| Phenytoin Sodium | AL 1JA07 | 無正式中文名 | Aleviatin Injection **250 mg/5 mL/amp**（濃度 50 mg/mL） | IV | **S = 0.92** |
| Valproate Sodium | DEP1JA15 | 帝拔癲凍晶注射劑 | Depakine Lyophilized Injection **400 mg/vial** | IV | — |
| Valproate Sodium | DEP5JA10 | 帝拔癲口服液 | Depakine Oral Solution **200 mg/mL，40 mL/btl** | PO 液劑 | — |
| Valproic Acid 145 mg + Valproate Sodium 333 mg | DEP4JA15 | 帝拔癲持續性藥效膜衣錠 | Depakine Chrono Film Coated Tablet，**相當於 500 mg valproate sodium/tab** | PO ER 膜衣錠 | — |

**對 spec 的影響：**

1. **候選劑量表格點改用實際品項，取代原本 §9 Q6 的暫定 25 mg（PHT）／50 mg（VPA）格點：**
   - Phenytoin PO：**可剝半**（Brandon 確認），格點 = **50 mg 的整數倍**（100 mg/tab 剝半＝50 mg）。
   - Phenytoin IV：以 **50 mg/mL** 濃度計算輸注體積／速率（250 mg/amp）。
   - VPA IV：以 **400 mg/vial** 為單位。
   - VPA PO 液劑：200 mg/mL，可連續劑量（不受限於整數格點），適合精細調整。
   - VPA PO ER：**本院僅 500 mg 一種規格，且可剝半**（Brandon 確認），格點 = **250 mg 的整數倍**。
2. **修正 §2.2 的 salt factor 假設**：原本泛用「Na salt（膠囊、IV）S=0.92 vs free acid（懸浮液、咀嚼錠）S=1.0」的教科書分類，套到本院實際品項後是：**口服錠（Aleviatin Tablet）= phenytoin 游離酸，S=1.0；注射劑（Aleviatin Injection）= phenytoin sodium，S=0.92**——跟教科書通則方向一致，但這裡是**本院實際品項確認過的**，不再是泛用假設。院內目前似乎沒有懸浮液或咀嚼錠品項，`AED_RULES.phenytoin.salt` 的 UI 選項應改成直接對應這兩個本院品項（Aleviatin Tablet / Aleviatin Injection），而不是列一堆本院沒有的教科書劑型選項造成選擇困擾。
3. **修正 §2.4 的 ER 劑型段落**：原本引用的「divalproex ER」換算資料（8–20% 生體可用率差異）**是美國 divalproex 產品的資料，本院用的是歐系 Depakine Chrono（valproic acid + valproate sodium 混合鹽），兩者不是同一個產品，不能直接套用那個轉換百分比**。這段落應該改成：本院只有 Depakine Chrono 一種 ER 劑型，**沒有找到 Chrono 與傳統劑型（如 Depakine 一般錠）之間本院適用的轉換係數**，UI 只做「IR/ER 之間切換劑型時建議諮詢原廠仿單或藥劑部，不自動換算劑量」的提示，不寫死任何換算數字。⚠️ 待查證（若你有本院藥劑部的轉換建議，可以補進來）。

---

## 3. 模組架構

### 3.1 檔案內的分層（仍是單一 `index.html`）

```
AED_RULES   ── 帶出處的臨床常數表（純資料）
AED_CALC    ── 純函式計算層（不碰 DOM，node 可直接測）
AED_UI      ── collectStateAed / applyStateAed / renderAed / clearAllFnAed / initDefaultsAed
共用引擎     ── makeVersionedPatientStore、drawTrendChart、ibwDevine、cockcroftGault、日期 helper
```

### 3.2 `AED_RULES`（範例結構，每個數字都有 src）

```js
const AED_RULES = {
  phenytoin: {
    range:      { lo:10, hi:20, unit:'mcg/mL', src:'院內指引 III；本院醫令 10502BZP／10502BYP' },
    freeRange:  { lo:1, hi:2, unit:'mcg/mL', src:'文獻補充（Winter；skill reference）— ✅已確認本院無 free phenytoin 醫令（Q12），此範圍僅供外送報告對照用，UI 不主動呈現送檢選項', localTest:false },
    sampling:   { windowMinBeforeDose:60, iv:{ fromH:2, toH:4 }, src:'本院醫令 10502BZP（給藥前一小時內抽血，取代院內指引通則 PO trough／IV 2–4h 的粗略版本）' },
    lab: {
      routine:  { code:'10502BZP', schedule:'W1-W5 08:00-17:00', tatDays:1, dept:'BC', externalRef:true, src:'本院醫令擷取 2026-09-18' },
      stat:     { code:'10502BYP', schedule:'24hr', tatMin:{ ER:30, ward:60 }, dept:'RL_BC', externalRef:false, indication:'中毒／overdose 疑慮時，比照院內指引通則 I-2-d 立即測濃度', src:'本院醫令擷取 2026-09-18' }
    },
    ssDays:     { lo:5, hi:30, open:true, src:'院內指引 III' },
    tbilFlag:   { gt:15, unit:'mg/dL', src:'院內指引 III-5' },
    corr: {
      hypoAlb:  { a:0.2, b:0.1, src:'院內指引 III-6（Winter-Tozer）' },
      hypoAlbRef: { a:0.275, b:0.1, label:'Cheng 衍生式（非院內公式，僅供參考）', hospitalFormula:false, display:'grey', src:'Cheng et al., Can J Hosp Pharm 2016（§2.1）；Q4 已解決（2026-09-18）——加，灰字標非院內公式' },
      renal:    { a:0.1, b:0.1, trigger:{ crClLt:10, orDialysis:true, manualOverride:true }, src:'院內指引 III-7（Liponi 1984）；觸發條件 Q1 已解決（2026-09-18）' },
      vpa:      { c0:0.095, c1:0.001, src:'院內指引 III-8（Haidukewych 1989）' }
    },
    salt:       {
      products: [
        { code:'ALE4JA07', name:'Aleviatin Tablet 100 mg/tab', form:'PO 錠劑', salt:'acid', S:1.0 },
        { code:'AL 1JA07', name:'Aleviatin Injection 250 mg/5 mL/amp（50 mg/mL）', form:'IV', salt:'sodium', S:0.92 }
      ],
      src:'本院藥品品項（Brandon 2026-09-18 提供，§2.7）；UI 劑型下拉選單直接對應這兩個本院品項，不列本院沒有的教科書劑型'
    },
    pop:        { vmaxMgKgDay:8.29, vmaxElderly:5.8, elderlyAge:60, km:4, vdLkg:0.7, src:'Vmax：Hung CC et al., Ther Drug Monit 2004;26(5):534-540（台灣 n=169，CYP2C9*1/*1＋CYP2C19*1/*1 基線，Q5 已解決 2026-09-18，取代 Winter 7）；vmaxElderly／vdLkg 仍沿用 Winter（台灣研究未提供對應值）' },
    kmSensitivityCandidates: [
      { km:1.45, label:'韓國（Samsung Medical Center，n=97，G1野生型/野生型 n=36）' },
      { km:2.307, label:'新加坡華人（n=66，成人+兒童）' },
      { km:4, label:'教科書（Winter；部分教材 4.3）' },
      { km:6, label:'教科書上緣示範值' },
      { km:9.19, label:'日本（Odani 1996, Biol Pharm Bull 19:444，n=116；併用 zonisamide ↑16%）' }
    ], // Q5 已解決：Km 各研究差異逾6倍，不挑單一「最準」值，全部並列標出處，見 §2.2.1
    cypDoseAdj: {
      src:'Hung CC et al. 2004（台灣 n=169）；與下方 cpic 百分比並列顯示，不互相取代，見 §2.2.1',
      groups: [
        { g:'G1', genotype:'CYP2C9 EM／CYP2C19 EM', doseMgKgDay:[5.5,7] },
        { g:'G2', genotype:'CYP2C9 IM／CYP2C19 EM', doseMgKgDay:[5,7] },
        { g:'G3', genotype:'CYP2C9 EM／CYP2C19 PM', doseMgKgDay:[5,6] },
        { g:'G4', genotype:'CYP2C9 PM／CYP2C19 EM', doseMgKgDay:[3,4] },
        { g:'G5', genotype:'CYP2C9 PM／CYP2C19 PM', doseMgKgDay:[2,3] }
      ]
    },
    cpic:       { cyp2c9_AS1: -0.25, cyp2c9_PM: -0.5, src:'CPIC 2020' }
  },
  valproate: {
    range:      { lo:50, hi:100, unit:'mcg/mL', src:'院內指引 III；本院醫令 10510B0P' },
    freeRange:  { lo:5, hi:15, unit:'µg/mL', src:'本院檢驗科 Free-form Valproic acid 醫令 10510CYP（2026-09-18 提供，Q2 已解決）' },
    sampling:   { windowMinBeforeDose:60, fixedRelation:true, src:'本院醫令 10510B0P（給藥前一小時內抽血，取代院內指引通則的寬鬆 trough）' },
    lab: {
      total:    { code:'10510B0P', schedule:'W1-W5 08:00-17:00', tatDays:1, dept:'BC', externalRef:true, src:'本院醫令擷取 2026-09-18' },
      free:     { code:'10510CYP', schedule:'W2,W5 only', tatDays:3, dept:'BC', src:'本院醫令擷取 2026-09-18（見 §2.5）' },
      stat:     null   // 本院擷取資料未見 VPA STAT 醫令，見 §2.6
    },
    freeRiskFactorsHospital: {
      list:['尿毒症(uremia)','低白蛋白症','free fatty acid 輸注(Intralipid／propofol／clevidipine)','蛋白結合競爭藥物(aspirin／ibuprofen)'],
      src:'本院檢驗科 10510CYP 臨床意義說明'
    },
    ssDays:     { lo:2, hi:3, src:'院內指引 III' },
    hermida: { c:6.5, maxTotalReliable:75, unit:'mg/L', excludeIf:['jaundice','uremia','renalFailure'], src:'Hermida & Tutor 2005；Q3 已解決——顯示數字但標適用限制' },
    carbapenem: { meanDrop:44, onsetDays:[1,3], recoverWeeks:[1,2], src:'Meta-analysis PMID 33322967' },
    products: [
      { code:'DEP1JA15', name:'Depakine Lyophilized Injection 400 mg/vial', form:'IV' },
      { code:'DEP5JA10', name:'Depakine Oral Solution 200 mg/mL, 40 mL/btl', form:'PO 液劑（連續劑量，非整數格點）' },
      { code:'DEP4JA15', name:'Depakine Chrono Film Coated Tablet, 相當於 500 mg valproate sodium/tab', form:'PO ER 膜衣錠' }
    ]
    // ⚠️ 本院無「divalproex」品項（該產品為美國常用鹽型），§2.4 引用的 8–20% ER 換算數字不適用本院 Depakine Chrono，見 §2.7 第 3 點
  }
};
```
→ 介面上每個目標值旁邊都能 hover 顯示 `src`，對應「所有臨床數值可追溯」的專案鐵則。`sampling.windowMinBeforeDose` 現在是 phenytoin／VPA、total／free 共通的 60 分鐘窗，不再分開定義。

### 3.3 `AED_CALC` 純函式清單

| 函式 | 輸入 | 輸出 | 備註 |
|---|---|---|---|
| `phtSaltFactor(form)` | 'sodium'/'acid'/'fos' | S | |
| `phtNormalize({total, free, albumin, renalFailure, vpaLevel})` | | `{candidates:[{method, value, formula, applicable, caveat}], suggested, refOnly:[{method, value, formula}]}` | 所有可用公式都算，依 §4.2 決策樹標出建議者；不自動丟掉其他值；`refOnly` 額外附 Cheng 衍生式（0.275 係數，`AED_RULES.phenytoin.corr.hypoAlbRef`）數值，UI 灰字顯示於院內 0.2 係數結果旁，**不參與**建議者選取與 MM 計算（Q4 已解決） |
| `phtMmSinglePoint({R, Css, km})` | | `{vmax, assumption}` | Css 用校正後值 |
| `phtMmTwoPoint({R1,C1,R2,C2})` | | `{km, vmax, valid, reasons[]}` | 合理性檢查：R2≠R1、C 同向變化、Km>0、Vmax>max(R) |
| `phtDoseForTarget({vmax, km, target, S, F})` | | 每日處方劑量 | |
| `phtPredictCss({vmax, km, R})` | | Css 或 `Infinity`（R ≥ Vmax → 無穩態，紅旗） | |
| `phtKmSensitivity({R, Css, target, kms})` | | 表格列 | **Q5 已解決**：`kms` 預設讀 `AED_RULES.phenytoin.kmSensitivityCandidates`（韓／新加坡華人／教科書/教科書上緣／日本，5 個候選值＋出處），不再是寫死的 `{2,4,6}`；UI 每列標明來源，不挑單一建議值 |
| `phtT90({vmax, km, vd, R})` | | 天數 | 用來排下次抽血 |
| `phtLoadingDose({vd, target, current, S})` | | mg | |
| `aedSamplingCheck({doseTime, drawTime, windowMinBeforeDose})` | | ok / 警示 | 共用版，phenytoin／VPA、total／free 都吃同一個 60 分鐘窗參數（來自 `AED_RULES.<drug>.sampling`），取代原本分開寫的 PO/IV 邏輯；phenytoin IV 給藥另外仍檢查 2–4h 峰值窗（`AED_RULES.phenytoin.sampling.iv`） |
| `aedLabScheduleNote({drug, levelType})` | 藥物、total/free/stat | `{scheduleText}`（固定字串，讀 `AED_RULES.<drug>.lab.<levelType>` 組出） | **Q11 已解決（2026-09-18，改為「只給臨床天數」）**：取代原設計的 `aedNextLabWindow` 日期運算函式——**不算「今天到下次可送驗還剩幾天」**，只組一句固定提示文字（例如「本院 free VPA 僅週二、週五執行，報告需 3 天」／「total 平日常規可送，約 1 天報告」／「可送 STAT，急診 30 分鐘、病房 1 小時」），純字串組裝、不含日期運算，之後排班改變只需改 `AED_RULES` 的 `lab` 條目文字 |
| `phtToxicityStatPrompt({sxFlags})` | 毒性徵象 checklist | bool＋文字 | 任一徵象陽性 → 提示可送 STAT phenytoin（10502BYP），對應院內指引通則 I-2-d；VPA 無對應 STAT 醫令，不出現此提示 |
| `vpaAssess({total, free, albumin, uremia, ffaInfusion, competingDrug, bun, icu, tbil, jaundice, renalFailure})` | | `{status, freeRiskFlags[], recommendFree:bool}` | 旗標來源分兩層標示：本院檢驗科明列（尿毒症／低白蛋白／Intralipid·propofol·clevidipine／aspirin·ibuprofen）優先於文獻補充（total 過高／ICU／BUN） |
| `vpaHermidaCorrect({total, albumin})` | | `{normalized, reliable:bool, reason}` | **Q3 已解決**：一律計算並顯示，`reliable=false` 時（total>75 或 jaundice/uremia/renalFailure）UI 改灰字＋警語，不隱藏數字 |
| `vpaProportionalDose({dose, total, target, riskFlags})` | | `riskFlags` 為空 → `{doseMg, roundedTo:250}`；`riskFlags` 非空 → `{doseMg:null, direction:'up'\|'down'\|'hold', reason}`（不給具體數字） | **Q3 已解決**：有飽和結合風險旗標時不再輸出比例估算的劑量數字，只給方向與建議先測 free；格點依 §2.7 實際品項（250mg 或 Chrono 半錠）|
| `aedSteadyStateCheck({drug, lastChangeMs, drawMs, t90Days?})` | | 已穩態／未穩態／不確定 | phenytoin 有 Vmax/Km 時用 t90，否則用院內 5 天下限 |
| `aedInteractionScan(text, drug)` | 併用藥自由文字 | 命中清單 | 關鍵字表需附出處；比照 Azole `checkCypInteractionsAzole`，但改寫成可參數化的共用版 |

### 3.4 與既有程式的介接點（實作時只動這些地方）

1. 切換器按鈕（line ~408）：移除 `coming-soon`／`disabled`，改 `data-drug="aed"`。
2. `showDrugModule` / `clearCurrentDrug`（line ~6140）：**改為 registry 模式（Q7 已解決，2026-09-18）**——見下方 3.4.1，新增 `aed` 僅需在 registry 註冊一筆條目，不再往 if/else 加分支。
3. `let lastAedDerived = null;`（line ~1368 區塊）。
4. 新 `<div class="drug-module" id="drug-aed">`，內含 `aedInputPanel` / `aedResultsPanel`。
5. `DOMContentLoaded` 內：`initDefaultsAed()`、事件綁定、複製 prompt。
6. 既有 vanco/AMG/Azole 程式碼**一律不改**（§15：不回頭重構 24 對複製函式）；registry 化只包裝 `showDrugModule`/`clearCurrentDrug` 這兩個既有的頂層分派函式本體，vanco/AMG/Azole 各自的 `collectState*`/`applyState*`/`renderX` 等內部函式簽名與呼叫方式完全不動，只是被註冊進表裡而不是寫在 if/else 鏈中。

#### 3.4.1 Registry 設計（Q7 已解決）

```js
const DRUG_MODULE_REGISTRY = {
  vanco:  { show: showVancoModule,  clear: clearVancoModule  },
  amg:    { show: showAmgModule,    clear: clearAmgModule    },
  azole:  { show: showAzoleModule,  clear: clearAzoleModule  },
  aed:    { show: showAedModule,    clear: clearAedModule    }
};

function showDrugModule(drugKey) {
  const entry = DRUG_MODULE_REGISTRY[drugKey];
  if (!entry) return; // 未知 drugKey，安全忽略，不拋錯
  entry.show();
}
function clearCurrentDrug(drugKey) {
  const entry = DRUG_MODULE_REGISTRY[drugKey];
  if (entry) entry.clear();
}
```

- 現有 `showDrugModule`/`clearCurrentDrug` 內部原本各藥物的 if/else 區塊，**原樣抽成** `showVancoModule`／`showAmgModule`／`showAzoleModule` 等既有邏輯的薄包裝函式（函式體幾乎照抄原 if 分支內容，不重新設計），再逐一登記進 `DRUG_MODULE_REGISTRY`。這一步是**機械式抽取**，不是重構既有藥物邏輯，符合 §15 不回頭動既有程式的原則。
- 之後新增 carbamazepine／phenobarbital（Q8）等模組，只需要新增一個 `show*`/`clear*` 函式並在 registry 多一行，兩個既有的頂層函式本體完全不用再改。
- 風險：低。改動範圍限定在這兩個既有頂層函式的**內部實作**，呼叫方（按鈕事件、`DOMContentLoaded` 綁定）看到的函式簽名與行為不變，回歸測試只需確認 vanco/AMG/Azole 三顆切換行為不變（§7 `test_aed_integration.js` 已列入回歸項目）。

---

## 4. 臨床邏輯細部設計

### 4.1 Phenytoin 判讀流程

```
輸入 → 劑型/salt → S
     → 採樣時點檢查（給藥前一小時內，本院醫令 10502BZP／§2.6；IV 額外查 2–4h 峰值窗）
     → 毒性徵象交叉（眼震、共濟失調、構音障礙、嗜睡、意識改變）
         → 任一陽性：提示可送 STAT phenytoin（10502BYP，急診 30 分鐘／病房 1 小時，§2.6）
     → 穩態檢查
     → 濃度校正（§4.2）
     → 目標比對（total 10–20 或 free 1–2，§9 Q12 待確認本院有無 free 醫令）
     → PK：單點（附 Km 敏感度）＋ 兩點（若有資料）並排
     → 候選劑量表（中性呈現，藥師勾選）
     → 監測：t90 → 下次抽血建議天數（純臨床天數，Q11 已解決不折算排班）；旁附 `aedLabScheduleNote` 固定排班提示文字（routine／STAT）；albumin/LFT/腎功能（院內）
     → 旗標：HLA-B*15:02、CYP2C9、T-bil>15、IM/NG feeding、交互作用
```

### 4.2 校正式決策樹（全部都算、只「標示」建議者）

| 優先 | 條件 | 建議採用 | 理由 |
|---|---|---|---|
| 1 | 有實測 free | free 對照 1–2 | 文獻共識：free 優於任何校正式 |
| 2 | 併用 VPA 且有 VPA 濃度 | Haidukewych 式 | 院內 III-8；**此式未納入白蛋白，與白蛋白校正不可串接**，同時低白蛋白時加註「強烈建議測 free」 |
| 3 | 腎衰竭（**CrCl < 10 或正在透析，自動判定＋手動覆寫勾選**，Q1 已解決） | 0.1×Alb+0.1 | 院內 III-7 |
| 4 | 有白蛋白 | 0.2×Alb+0.1 | 院內 III-6（Alb 4.5 時係數剛好 1.0，故一律計算不會誤傷正常白蛋白者） |
| 5 | 無白蛋白 | 只報 total | 提示補 albumin |
| 加註 | T-bil > 15、重症、尿毒、多種高蛋白結合藥 | 無論上面選哪條，都亮「建議測 free」 | 院內 III-5＋文獻 |
| 加註（Q4 已解決） | 只要算出 0.2×Alb+0.1 校正值 | 旁邊多顯示一列 Cheng 衍生式（0.275 係數）結果，**灰字＋「非院內公式，僅供參考」** | §2.1 Cheng et al. 2016；純敏感度參考，不影響建議者判定、不進 MM 計算 |

→ MM 計算一律使用「被標示建議的那個值」（free 則 ×10 換算成 normalized total 等價），並在結果旁寫明用的是哪個值。

### 4.3 Valproic acid 判讀流程

```
輸入 → 劑型（本院三品項：注射 400mg/vial／口服液 200mg/mL／Chrono 錠 500mg 可剝半，§2.7）
     → 採樣檢查：給藥前一小時內（本院醫令 10510B0P／10510CYP 共通窗，§2.6）
     → 穩態（2–3 天）
     → total 對照 50–100（院內）；適應症為雙相時加註「文獻可至 ~125，院內指引未列」
     → free fraction 風險旗標（本院檢驗科 10510CYP 明列，優先於文獻清單）：
         尿毒症、低白蛋白症、free fatty acid 輸注（Intralipid／propofol／clevidipine）、
         蛋白結合競爭藥物（aspirin／ibuprofen）；文獻補充：total 過高、ICU、BUN 上升
         → 任一成立：「total 可能低估有效藥量，建議測 free」
     → 若有 free：free fraction = free/total 顯示；目標 5–15 µg/mL（本院檢驗科 10510CYP，Q2 已解決）
     → 劑量（Q3 已解決，2026-09-18）：
         無風險旗標成立 → 線性範圍內比例估算（`vpaProportionalDose`，格點 250mg／Chrono 半錠）
         任一風險旗標成立 → 不算具體劑量數字，只給方向性判讀（偏高/偏低/持平）＋強烈建議先測 free，
         等 free 結果出來再決定劑量——因為此時 total 換算劑量的比例關係已經不可靠
     → 硬警示：carbapenem（避免併用；量化資料）、懷孕/育齡女性致畸性
     → 監測：LFT、albumin（院內）＋ ammonia、platelet（收案表）；高血氨可在 total 正常時發生
     → 若建議測 free：監測天數仍只給臨床天數（調整後 2–3 天複測），**不換算實際送驗日期**（Q11 已解決）；
         旁附固定提示文字「本院 free VPA 僅週二、週五執行，報告需 3 天」，提醒藥師自行對照排班，但不由系統算日期
```

### 4.4 兩藥並用（同一病人）

- Phenytoin 畫面有「併用 VPA 濃度」欄；若同病人在 VPA 子畫面已有最近一次 total，提供「帶入」按鈕（**不自動帶入**，避免用到過期值；帶入時顯示抽血時間）。
- 雙向交互作用提示：VPA 置換 phenytoin（院內）；phenytoin 誘導使 VPA 下降（文獻，需附出處）。

---

## 5. UI 結構（卡片對應收案表 A–J）

### 5.1 輸入面板 `aedInputPanel`

| 卡片 | 內容 | 對應收案表 |
|---|---|---|
| 00 病人存檔 | `makeVersionedPatientStore`（visit、asOf、匯入匯出） | — |
| 01 藥物與目的 | phenytoin / VPA 切換；TDM 目的；輸出粒度 | A、G |
| 02 人口學 | 年齡、性別、身高、TBW、懷孕/哺乳；自動 IBW、CrCl（沿用共用函式） | B |
| 03 實驗室 | albumin、AST/ALT、T-bil、platelet、NH₃、SCr、BUN、透析狀態＋採檢日期 | C |
| 04 處方 | 劑型/salt/途徑、維持劑量、間隔、本劑量起始日（=最近一次調整日）、loading（劑量＋時間）、漏給 | E |
| 05 濃度 | 可多筆：類型（total/free）、抽血時間、數值、最近一劑時間 → 自動算「相對給藥時間」與採樣合理性 | F |
| 06a Phenytoin 子表 | CYP2C9（NM/IM1.5/IM1.0/PM/未知）、HLA-B*15:02（陽/陰/未驗）、併用 VPA 濃度＋時間、IM/NG feeding、重症 | G-PHT |
| 06b VPA 子表 | 適應症、ICU、propofol、carbapenem（勾選＋併用藥自動偵測雙保險） | G-VPA |
| 07 穩態劑量-濃度配對表 | 列出歷次「劑量＋穩態濃度」配對（可從 visit 歷史帶入），每列有「確認已達穩態」勾選 → 兩點法只使用有勾的列 | E+F（跨 visit） |
| 08 臨床 | 發作頻率/控制、本次調整誘因、毒性徵象 checklist | D |
| 09 併用藥 | 自由文字＋自動掃描 | H |
| 10 目標與限制 | 治療目標、療程、給藥限制、既往 ADR、備註 | I、J |

### 5.2 結果面板 `aedResultsPanel`

1. **資料快照與旗標**（紅/黃/綠，比照既有 flags 樣式）
2. **濃度判讀表**：實測 → 各校正式結果（公式、是否建議、已知偏差）→ 目標比對
3. **PK 參數**（phenytoin）：單點 Vmax（Km 敏感度帶）｜兩點 Vmax/Km（有資料才出現）｜t90
4. **候選劑量表**：多個整數化每日劑量 → 預估 Css（依方法分欄）；R ≥ Vmax 列直接標紅「無法達穩態」；藥師勾選一列，AI prompt 只帶勾選者（比照 vanco 的中性呈現原則）
5. **監測計畫**：下次抽血日（phenytoin 用 t90，VPA 用 2–3 天）、lab 表、臨床徵象、再評估觸發條件
6. **趨勢圖**（P3）：沿用 `drawTrendChart`，序列：total、校正後、free、albumin、每日劑量
7. **AI 諮詢 Prompt**

---

## 6. 資料模型（`collectStateAed` 形狀）

```js
{
  drug:'phenytoin'|'valproate', purpose, granularity,
  age, sex, height, tbw, pregnancy,
  labs:{ albumin, astAlt, tbil, platelet, nh3, scr, bun, labDate, dialysis },
  regimen:{ form, route, dose, tauH, regimenStart, loading:{dose, time}, missed },
  levels:[ { type:'total'|'free', drawAt, value, lastDoseAt } ],
  pht:{ cyp2c9, hlab1502, vpaLevel, vpaLevelAt, imNg, critical },
  vpa:{ indication, icu, propofol, carbapenem },
  ssPairs:[ { date, dailyDose, form, level, levelType, albumin, confirmedSS } ],
  clinical:{ seizureControl, trigger, sx:{...} },
  concomitant, goal, duration, constraints, priorAdr, notes,
  pickedCandidate            // 勾選的候選劑量
}
```
`lastAedDerived`：校正後濃度（含採用公式）、Vmax/Km（含方法）、t90、旗標清單——供存檔 derived snapshot 與趨勢圖使用。

---

## 7. 測試計畫（jsdom，沿用 `tests/load_harness.js`）

| 檔案 | 內容 |
|---|---|
| `test_aed_calc.js` | 純函式：三條校正式（院內公式手算值，例：total 12、Alb 2.5 → 20.0；腎衰 → 34.3；VPA 80 → 21.0）、單點/兩點 MM（§2.2 示範數字）、t90（≈16.98 天）、R≥Vmax 邊界、兩點法無效資料拒絕 |
| `test_aed_integration.js` | DOM：切換器、子藥物切換、collect↔apply 對稱（比照 v3 §14 的欄位比對）、存讀檔 visit、決策樹標示正確 |
| `test_aed_flags.js` | carbapenem、HLA-B*15:02、T-bil>15、PO/IV 採樣時點、懷孕 VPA 警示 |
| 回歸 | 既有 smoke：vanco/AMG/Azole 切換與渲染不受影響 |

版面仍需你用瀏覽器截圖確認（jsdom 無法驗證視覺）。

---

## 8. 分期

| 期 | 範圍 | 預估新增行數 |
|---|---|---|
| P1 | 骨架、切換器、卡片 00–10 輸入、存檔、濃度校正判讀、全部旗標、AI prompt、`test_aed_calc`/`flags` | ~700–900 |
| P2 | Phenytoin MM（單點＋敏感度、兩點、t90、負荷）、候選劑量表與勾選、VPA 比例估算、監測計畫 | ~400–500 |
| P3 | 趨勢圖、phenytoin 劑量-穩態濃度 MM 曲線（非時間軸） | ~250 |
| P4（選配） | 亞洲／台灣族群 Vmax/Km（需另查文獻並經你同意）、貝氏 MAP | 另議 |

---

## 9. 待你決定的問題（逐項 Go/No-Go）

| # | 問題 | 我的建議（預設） |
|---|---|---|
| Q1 | 「腎衰竭」採 0.1 係數的觸發條件 | **已解決**——CrCl < 10 mL/min **或** 正在透析，自動判定，並提供手動覆寫勾選 |
| Q2 | Free VPA 目標範圍 | **已解決**——你提供的本院檢驗科 Free-form VPA 醫令（10510CYP）：**5–15 µg/mL**，已寫入 `AED_RULES.valproate.freeRange`，見 §2.5 |
| Q3 | 是否顯示 Hermida-Tutor VPA 白蛋白校正值 | **已解決**——顯示校正後數字，但緊鄰標明適用限制（total ≤75 mg/L、非黃疸/尿毒/腎衰竭才適用），超出適用範圍時數字仍算但改標灰色＋警語「超出本公式驗證範圍，僅供參考」，不隱藏數字 |
| Q4 | 是否加一列 Winter-Tozer 衍生式（0.275）作敏感度參考 | **已解決**——加，灰字標「非院內公式，僅供參考」，顯示在院內 0.2 係數校正值旁；不參與建議者選取、不進 MM 計算。見 `AED_RULES.phenytoin.corr.hypoAlbRef`、§3.3 `phtNormalize`、§4.2 決策樹加註 |
| Q5 | Phenytoin 族群參數 | **已解決（2026-09-18，現在就查，不留 P4）**——Vmax 預設改用 Hung 2004 台灣數據（8.29 mg/kg/day，G1 基線）；Km 敏感度帶擴充為韓／新加坡華人／教科書／教科書上緣／日本 5 個候選值（1.45–9.19 mg/L），不挑單一「最準」值；另新增 Hung 2004 基因型分層劑量建議表（`cypDoseAdj`）與現有 CPIC 百分比並列顯示。詳見 §2.2.1 |
| Q6 | 本院品項與劑量捨入 | **已解決**——見 §2.7：phenytoin 錠 100mg（可剝半，格點 50mg）／注射 250mg/5mL，VPA 注射 400mg/vial／口服液 200mg/mL（連續劑量）／Chrono 錠僅 500mg 一種規格且可剝半（格點 250mg）。院內**沒有 fosphenytoin**，負荷劑量只用 Aleviatin Injection |
| Q7 | 切換器改 registry | **已解決**——改成 registry（`DRUG_MODULE_REGISTRY`）。只動 `showDrugModule`/`clearCurrentDrug` 兩個既有頂層函式的內部實作（機械式抽取，不重構既有藥物邏輯），低風險；未來加 carbamazepine 等新藥物只需在 registry 多一行。見 §3.4.1 |
| Q8 | Carbamazepine、phenobarbital（院內指引有目標與穩態） | **已解決**——本版不做；架構已預留（registry，見 Q7／§3.4.1），之後只要加 `AED_RULES` 條目＋簡單 trough 判讀即可，不動本次 phenytoin/VPA 範圍 |
| Q9 | Status epilepticus 負荷劑量情境 | **已解決**——P2 只做「補充負荷劑量」計算（`phtLoadingDose`，有現有濃度、想補到目標時使用）；從零開始的 SE 負荷劑量（如 fosphenytoin 20 mg PE/kg）不做，屬急診給藥流程而非 TDM 範圍 |
| Q10 | MM 劑量-濃度曲線（非時間軸） | **已解決**——P3 做。橫軸每日劑量／縱軸預估 Css，用已估得的 Vmax/Km 畫曲線；直觀呈現「接近 Km 時小幅加量濃度暴衝」這個 phenytoin 最大陷阱。與既有 `drawTrendChart` 的時間軸趨勢圖是兩張不同的圖，不是同一引擎的參數變化 |
| Q11 | Free VPA／各項目監測建議要不要把「排班＋TAT」算進去，還是只給臨床天數 | 建議算進去——`aedNextLabWindow()` 依項目分流：total（phenytoin／VPA）平日次日可拿到，free VPA 要等下個 W2/W5＋3 天，phenytoin STAT 幾十分鐘內。UI 呈現「最快可送驗：X 月 X 日（週Y），預計 X 月 X 日出結果」，不影響臨床判斷本身 |
| Q12 | 本院是否有 Free phenytoin 醫令？ | **已解決**——你確認本院沒有。phenytoin 判讀只走白蛋白／腎功能／VPA 併用三條校正式，UI 固定顯示「本院無 free phenytoin 醫令，如需 free level 須外送」，不做成可互動的送檢選項 |
| Q13（新增） | VPA 是否要有量化的「劑量調整建議」邏輯，還是只做定性判讀？ | **已解決**——無風險旗標時線性比例估算（有具體數字）；任一風險旗標成立時**不給具體劑量數字**，只給方向＋強烈建議先測 free，等結果出來再決定。見 §4.3、`vpaProportionalDose` |

---

## 10. 參考文獻

- 臺大醫院《Guidelines to Therapeutic Drug Monitoring》／療劑監測指引（`references/`，2026/03 版 PDF）— **主要依據**
- 臺大醫院檢驗醫學部「Free-form Valproic acid（游離態丙戊酸）」醫令說明，醫令代碼 10510CYP（Brandon 於 2026-09-18 提供）— **§2.5、Q2 依據，權威層級同院內指引**
- 臺大醫院檢驗醫學部醫令擷取（`醫令英文名稱.docx`：Valproic acid 10510B0P、Phenytoin 10502BZP、Phenytoin STAT 10502BYP，Brandon 於 2026-09-18 提供）— **§2.6 依據，權威層級同院內指引**
- `tdm-calculator` skill `references/antiepileptic.md`；院內 TDM 收案表（抗癲癇藥物）
- Cheng W, et al. Predictive Performance of the Winter–Tozer and Derivative Equations for Estimating Free Phenytoin Concentration. *Can J Hosp Pharm* 2016. https://pubmed.ncbi.nlm.nih.gov/27621486/
- A Comprehensive Review on the Predictive Performance of the Sheiner-Tozer and Derivative Equations. https://pubmed.ncbi.nlm.nih.gov/26825643/
- Liponi DF, et al. Renal function and therapeutic concentrations of phenytoin. *Neurology* 1984. https://pubmed.ncbi.nlm.nih.gov/6538287/
- Soriano VV, et al. Characterization of Free Phenytoin Concentrations in ESRD Using the Winter-Tozer Equation. *Ann Pharmacother* 2017. https://doi.org/10.1177/1060028017707541
- Haidukewych D, et al. Derivation and evaluation of an equation for prediction of free phenytoin concentration in patients co-medicated with valproic acid. *Ther Drug Monit* 1989. https://pubmed.ncbi.nlm.nih.gov/2497562/
- Karnes JH, et al. CPIC Guideline for CYP2C9 and HLA-B Genotypes and Phenytoin Dosing: 2020 Update. *Clin Pharmacol Ther* 2021. https://pubmed.ncbi.nlm.nih.gov/32779747/
- Patsalos PN, et al. Therapeutic Drug Monitoring of Antiepileptic Drugs in Epilepsy: A 2018 Update. *Ther Drug Monit* 2018. https://pubmed.ncbi.nlm.nih.gov/29957667/
- Hermida J, Tutor JC. A theoretical method for normalizing total serum valproic acid concentration in hypoalbuminemic patients. *J Pharmacol Sci* 2005. https://pubmed.ncbi.nlm.nih.gov/15840952/
- Accuracy of Valproic Acid Concentration Correction Based on Serum Albumin. *Neurocrit Care* 2019. https://pubmed.ncbi.nlm.nih.gov/30328046/
- Clinical Consequences of Disproportionate Free Valproate Elevation in Critically Ill Adult Patients. *Neurocrit Care* 2025. https://link.springer.com/article/10.1007/s12028-025-02243-y
- Effect of drug interactions between carbapenems and valproate on serum valproate concentration: systematic review and meta-analysis. https://pubmed.ncbi.nlm.nih.gov/33322967/
- Phenytoin & Fosphenytoin Pharmacokinetic Dosing（Winter 方法彙整）. https://pkineticdrugdosing.com/documents/phenytoin.html
- Zimmerman DE. Antiepileptics（教科書章節，族群參數）. https://basicmedicalkey.com/antiepileptics-2/
- AES Guideline: Treatment of Convulsive Status Epilepticus in Children and Adults (2016). https://www.guidelinecentral.com/guideline/14040/
- Divalproex to Divalproex Extended Release Conversion. *Clin Drug Investig* 2004. https://link.springer.com/article/10.2165/00044011-200424090-00001
- **Hung CC, Lin CJ, Chen CC, Chang CJ, Liou HH. Dosage recommendation of phenytoin for patients with epilepsy with different CYP2C9/CYP2C19 polymorphisms.** *Ther Drug Monit* 2004;26(5):534-540. https://pubmed.ncbi.nlm.nih.gov/15385837/ — **§2.2.1、Q5 依據，台灣本地族群數據**
- Population pharmacokinetics of phenytoin in Singapore Chinese. *Eur J Clin Pharmacol* 1990. https://pubmed.ncbi.nlm.nih.gov/2253670/ — §2.2.1
- Odani A, et al. Population pharmacokinetics of phenytoin in Japanese patients with epilepsy: analysis with a dose-dependent clearance model. *Biol Pharm Bull* 1996;19(3):444. https://doi.org/10.1248/bpb.19.444 — §2.2.1
- Contributions of CYP2C9/CYP2C19 genotypes and drug interaction to the phenytoin treatment in the Korean epileptic patients in the clinical setting. https://pubmed.ncbi.nlm.nih.gov/17562299/ — §2.2.1
