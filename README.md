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
