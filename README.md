# BioWatch AI V3.0｜鏡像影像與全球生物候選辨識

正式網址：**https://biowatch-ai.michael09230923.workers.dev/**

此專案使用 Cloudflare Workers Static Assets，部署來源是 `public/index.html`，`index.html` 為同步的本機預覽備份。提交到 GitHub `main` 後，Cloudflare 已連接的 Git 專案會自動建置/部署，同一個正式網址不變。

## V3.0 更新
- **鏡像畫面**：預設水平翻轉，影像、偵測框、截圖一致；文字不會反向。可在「影像來源」區開關，選項保留在目前瀏覽器。
- **全球廣域候選辨識**：預設進階模式會先以 CLIP 比對 12 個大類，再比對約 226 個內建候選名稱；含原版的臺灣野生動物候選、常見哺乳動物、鳥、爬蟲、兩棲、魚、昆蟲、蜘蛛、甲殼、軟體、其他無脊椎、植物、真菌。這些並非已驗證的可辨識物種數量。
- **臺灣保育類優先**：保留專門比較石虎、臺灣黑熊、穿山甲、歐亞水獺、草鴞等候選的模式。
- **自訂候選**：支援輸入最多 20 個生物名稱，用英文或拉丁學名辨識效果通常比較合適；候選清單必須包含真正的物種，否則模型可能猜錯。
- **靜態生物分析**：允許在鏡頭不動時比對植物、真菌和停棲動物；耗費更多運算，也可能增加誤報。
- **標準 COCO-SSD**：繼續提供少數常見動物及人的即時框線偵測，預設 65% 門檻與連續 3 次確認。

## 使用方式
1. 開啟 HTTPS 正式網址並允許鏡頭權限。
2. 在「影像來源」確認「鏡像畫面」開啟。
3. 在「辨識與警報設定」中開啟「跨物種進階辨識（實驗）」。
4. 選「全球廣域」、「臺灣保育」或「自訂候選」，按開始偵測。
5. 第一次進階辨識需下載第三方 CLIP 模型，可能是數百 MB，並需要足夠 RAM 與網路。
6. 自訂候選用逗號分隔英文/學名，例如 `snow leopard, axolotl, horseshoe crab`。

## 非常重要的能力界限
沒有任何一般攝影機或本專案能保證辨識世界上全部生物。地球上包含大量未被模型訓練的、未被發現的、外觀相似的物種，以及肉眼無法看見的微生物。CLIP 是開放候選文字／影像比對，**不是全物種鑑定系統**。候選分數是相對分數，不是統計校準的正確率。出現「疑似」保育類不得視為已確認，應保存原始影像並交給生態專家複核。

進階大類識別是影像整體分類，不保證將每個小目標畫出框線；移動過快、夜間和模糊畫面很容易漏判。網頁需保持開啟，亦無背景遠端監控、關閉網頁後的手機推播。

## 部署
Worker name: `biowatch-ai`; `wrangler.jsonc`:
```json
{"name":"biowatch-ai","compatibility_date":"2026-11-16","assets":{"directory":"./public"}}
```
部署指令：`npx wrangler deploy`。修改正式網站請更新 **`public/index.html`** 並提交至 `main`，必要時在 Cloudflare → Workers & Pages → biowatch-ai → 部署確認最新 commit。


## Google 登入（V3.1 新增，需完成 Google Cloud 設定）

BioWatch 已新增 Google Identity Services 按鈕、登入帳號/頭像、登出，以及 Cloudflare Worker 伺服端驗證 Google 簽章的 ID token。登入目前是**選用功能**，沒有雲端帳號資料庫，也不會自動將本機警報紀錄同步到其他裝置。登入權杖透過 `HttpOnly; Secure; SameSite=Lax` cookie 保存，最長約 58 分鐘（依 Google ID token 有效期更短），到期須重新登入。

### 1. 建立 Google OAuth 2.0 網頁用戶端 ID
1. 開啟 https://console.cloud.google.com/auth/clients ，登入並選擇/建立 Google Cloud 專案。
2. 在 Google Auth Platform 完成 Branding 與 Audience（品牌/受眾）初始化。若保持 Testing 測試模式，請將允許登入的 Google 帳號加入 Test users；對外開放前請依 Google 要求設定正式發布。
3. 到 Clients 建立 OAuth client，類型選 **Web application**。
4. 在 **Authorized JavaScript origins** 增加**不含結尾斜線**：
   `https://biowatch-ai.michael09230923.workers.dev`
5. 儲存並複製 **Client ID**，格式類似 `1234567890-abc.apps.googleusercontent.com`。
6. 此處採用 Google 官方 GIS JavaScript callback popup 流程，因此不需額外設定 redirect URI。

### 2. 在 Cloudflare Worker 設定變數
1. 進入 https://dash.cloudflare.com/ → Workers & Pages → `biowatch-ai` → Settings（設定）。
2. 在 **Variables and Secrets（變數與密鑰）** 按 Add（新增）。
3. 新增 **Text** 變數，名稱必須完全一致：`GOOGLE_CLIENT_ID`。
4. Value 填入上一段的 Google OAuth **Client ID**（**不是** Client Secret），然後選 Deploy/儲存並部署。
5. 到 Deployments 確認最新版成功，刷新網站即可出現 Google 官方登入按鈕。

注意：無需提供 Google 帳戶密碼或用戶端密鑰給聊天機器人。Google OAuth Client ID 是公開的用戶端識別碼，Client Secret 不能放到前端或 GitHub。

### 程式部署與安全
- `src/worker.js`：只處理 `/api/auth/*`，在 Worker 透過 Google 公開 JWK 驗證 RS256 JWT 簽章，以及 aud/iss/exp/email_verified。
- `wrangler.jsonc`：`main: ./src/worker.js`，`assets.run_worker_first: ['/api/auth/*']`，其他網址仍由 `public/` 靜態資產服務。
- `/api/auth/config` 和 `/api/auth/session` 可供確認配置；未設 Client ID 時會回應 `configured:false`，**不是登入故障**。
- 登入功能只顯示帳號狀態，不會自動將監控畫面、紀錄或 Google 個人資料傳給第三方資料庫。模型仍依既有 CDN 與本機推論機制運作。
- 本專案沒有完全鎖住網站：不登入仍可進行生物偵測。若未來需要「一定要登入才能看監控」、雲端紀錄與跨裝置同步，需另行設計存取控制與資料庫。

## 自動部署重新觸發

2026-11-16：GitHub App 重新授權後，更新此文件以測試 Cloudflare Workers Builds 的 `main` 分支自動部署。若未出現新建置，請在 Cloudflare → Settings → Builds 檢查 Git 授權與觸發狀態。


## V4.0｜提高偵測可靠性（2026-11-16）

本次更新直接修改 `public/index.html` 與根目錄 `index.html`，不更換固定網址。

- **逐個體追蹤**：不再把所有同一類動物當成單一目標。使用相鄰影格的偵測框位置和交集，比對不同個體，連續觀察後才認列。
- **模型分數平滑**：一般 COCO-SSD 在同一目標上的多影格分數加權平均，減少單次高分誤警報。仍非經統計校準的真實辨識正確率。
- **三種設定檔**：高精準預設 75% / 4 次 / 24%；平衡為 65% / 3 次 / 18%；高靈敏為 50% / 2 次 / 12%（依序為 COCO 模型門檻／目標確認次數／CLIP 候選相對比對分數基本門檻）。可繼續手動調整滑桿。
- **進階物種更嚴格的拒判**：全球模式先檢查生物大類與次高候選差距。高精準模式對疑似保育類要求更高的相對分數門檻及類別間差距，至少 3 次候選一致才發出警示。這可能減少誤報，但也可能漏掉真正的保育類。
- **影像品質篩選**：高精準進階辨識在畫面極暗、過曝或細節不足時先提示「拒判」，避免無條件猜物種。此檢查是簡易影像品質啟發式，夜視及熱影像可能受到影響。
- **靜態生物分析預設關閉**：降低靜止背景被錯誤分類造成的警報；觀察植物、真菌或靜止動物時可自行開啟。

### 測試與限制
- 已完成內嵌 JavaScript 語法檢查、兩份 HTML 一致性檢查、逐個體追蹤模擬（同類雙目標、4 次確認、離開後清理）。
- 尚未用標註資料集進行真實 Precision／Recall 評測，**不能保證實際正確率提高多少，更不應宣稱 90%、99%**。
- COCO-SSD 的支援類別仍有限；CLIP 依候選影像與文字做相對比對，不是專用的野生物種鑑識器。
- 實際效果必須用鏡頭在白天、夜間、雨天、移動速度及保育類相似種等情況測試，再使用具標註的實拍資料調整門檻。
- GitHub 更新後須由 Cloudflare Workers 自動部署成功；若未更新，請至 Workers & Pages → biowatch-ai → Deployments 查詢。


## V4.1｜極嚴格模式永遠預設（2026-11-16）

**注意：高精準代表更保守的判斷策略，不等於已測得更高的正確率。**

- 每次重新開啟／重新整理網站，會重設為 **極嚴格驗證**，COCO-SSD 分數門檻 **80%**、至少 **5 次**相同實體目標比對，且追蹤持續 **至少 1 秒**才能確認；此條件可能實際需要超過 5 個影格。
- 進階全球物種候選辨識預設啟用，首次需下載較大型的 CLIP 模型（若無法載入一般辨識仍可繼續）。裝置效能不足可手動關閉；下次重新載入仍恢復預設。
- 高精準進階候選門檻 **26%** 是 CLIP 候選間的*相對比對分數*，不是正確率。疑似保育類另須滿足至少 **34% 候選分數**、與次高分至少 **14 個百分點差距**、候選連續 **4 次一致**，並通過**同一 CLIP 模型的水平翻轉影像比對**；非保育候選的嚴格門檻也提高。
- 低畫質拒判與「不確定／無法確認」保留，避免為了追求物種覆蓋而強制猜測。
- 仍可在單次使用期間手動切換平衡／高靈敏模式或自訂門檻；**重新開啟頁面會回到極嚴格預設**。
- 不能承諾 90%、95%、99% 等辨識正確率。要量化「再次增加」的實際效果，必須蒐集有專家標註的照片／影片（含空景、相似種、逆光、夜間），分別計算 precision、recall、漏判率並校準門檻。更嚴格的模式可能顯著增加漏判。
- 語法檢查與同類雙目標的計數、追蹤時間門檻模擬已通過；尚未使用真實野外攝影機或標註物種資料集測試。
