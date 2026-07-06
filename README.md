# Vancomycin TDM 擬合引擎

任意抽血時點的 vancomycin TDM 計算工具——一室模型、貝氏 MAP 擬合，不需要 peak/trough 落在同一給藥區間。純前端（單一 `index.html`，無後端、無需安裝），所有計算在瀏覽器本機完成。

## 功能

- 自由抽血時點擬合 ke／Vd／CL（2 點還原 Sawchuk-Zaske、1 點貝氏校正、≥3 點更穩健）
- AUC₂₄ 導向的劑量建議，候選給藥間隔（q8h/q12h/q24h）比較表
- 尚未給藥時的族群 PK 起始劑量預測（population PK，無需等待濃度資料）
- 長期療程可重新錨定「分析起點」，不必展開整段給藥史
- 依病歷號存檔／載入（僅存在瀏覽器本機 localStorage，不上傳）
- 一鍵產生可貼給任一 AI 的整合評估 Prompt

## 使用方式

**直接使用**：開啟 `index.html`（雙擊，或用瀏覽器開啟本機檔案），離線可用。

**發佈成網址給同事**：見下方「發佈到 GitHub」。

## 發佈到 GitHub

### 方法一：不用指令列（推薦給不熟 git 的人）

1. 到 [github.com](https://github.com) 註冊／登入。
2. 右上角 **+** → **New repository**，取個名字（如 `vanco-tdm`），選 Public 或 Private，建立。
3. 進入剛建立的 repo → **Add file** → **Upload files**，把 `index.html`（和這份 `README.md`）拖進去 → **Commit changes**。
4. 進入 **Settings** → 左側 **Pages** → Source 選 `main` branch、`/ (root)` → **Save**。
5. 等 1–2 分鐘，頁面會顯示網址，通常是 `https://你的帳號.github.io/repo名稱/`，把這個網址傳給同事即可，任何裝置開瀏覽器就能用。

### 方法二：用 git 指令列

```bash
git init
git add index.html README.md
git commit -m "vancomycin TDM engine"
git branch -M main
git remote add origin https://github.com/你的帳號/repo名稱.git
git push -u origin main
```
接著同「方法一」第 4 步開啟 GitHub Pages。

### Public 或 Private？

- **GitHub Pages 在免費方案下只能用在 Public repo**——要用 Private repo 開 Pages 需要付費方案（Pro 或以上）。
- 這個工具本身不含任何病人資料（存檔功能只寫在使用者自己瀏覽器的 localStorage，從來不會進到程式碼或這個 repo 裡），所以就算 repo 設成 Public，也不會外洩病人資訊——外洩風險是零，因為程式碼裡本來就沒有資料。
- 如果還是想保持 Private（例如不想公開院內校正的族群假設、目標值），兩個選項：
  - 花小錢升級 GitHub Pro（約每月 4 美元），Private repo 也能開 Pages。
  - 維持 Private + 不開 Pages，同事改用「下載 `index.html` 回去自己開」的方式使用（跟你們現在的用法一樣，只是用 GitHub 集中管理版本，不是網址分享）。

### 發佈後的一個好處

用 GitHub Pages 這種固定網址後，「病歷號存檔」功能反而比開本機檔案更穩定：本機檔案的路徑（`file://...`）換了或重新下載一份新檔案，瀏覽器可能認成不同的儲存空間，存檔會對不起來；固定網址不會有這個問題，只要是同一個瀏覽器、同一個網址，存檔永遠找得到。

## 更新版本時

之後如果又改版，同事只要重新整理網頁（或你重新 push 覆蓋 `index.html`）就會拿到新版，不用重新下載檔案。

## 定位聲明

本工具為臨床決策輔助，所有 PK 參數與劑量建議均由輸入資料與明列之族群假設推導。族群先驗、目標值反映一般院內慣例與 2020 ASHP/IDSA/PIDS/SIDP 共識，可能與特定院內 protocol 有出入。最終劑量處方判斷屬使用者之專業責任。
