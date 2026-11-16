# BioWatch AI｜生物偵測警報系統

這是 BioWatch AI 的固定網址網站版本。主程式為根目錄的 `index.html`，CSS 與 JavaScript 均內嵌，不需要額外建置或安裝套件。

## Cloudflare Pages 部署
1. 進入 https://dash.cloudflare.com/ → Workers & Pages → Create application → Pages。
2. 選 Connect to Git / Import existing Git repository，授權並選擇 `Michael-0923/biowatch-ai`。
3. 建議 Project name: `biowatch-ai`（以 Cloudflare 可用名稱為準）；Production branch: `main`。
4. Framework preset: None；Build command: 留空（如果要求填寫可用 `exit 0`）；Build output directory: `.`。
5. 部署完成後，到 Cloudflare 專案首頁確認正式的 `https://<project>.pages.dev/` 網址。

## 更新
之後每次修改並提交 `main` 分支的 `index.html`，Cloudflare Pages 的 Git 整合便會自動部署，新版本沿用原本的正式網址。請不要把 ZIP 直接當成 index.html 上傳。

## 功能及限制
- 支援目前裝置的內建/USB/手機鏡頭、照片與影片測試、網路影像 URL（網路鏡頭需另外架設 HTTPS 與允許跨來源讀取；不能直接開 RTSP）。
- 利用瀏覽器端 TensorFlow.js COCO-SSD 進行人、貓、狗、鳥等常見生物辨識，提供聲音警示與本機紀錄。
- **不是所有生物都能辨識**；網頁需保持開啟、瀏覽器允許攝影機，才能持續偵測。
- 首次載入 AI 模型需要網路，且可能受 CDN 與裝置效能影響；若無法啟動，請先檢查瀏覽器主控台及鏡頭授權。
- Cloudflare Pages 只負責網站託管，並非全天候的雲端攝影機監控服務。