# BioWatch AI 生物偵測警報系統 · V2.0

網址：**https://biowatch-ai.michael09230923.workers.dev/**（Cloudflare Workers；若無法連線請先確認 Worker URL 的「生產」開關已啟用）。

## 使用方式

1. 使用 Chrome/Edge 開啟上方 HTTPS 網址並允許攝影機權限。
2. 選擇鏡頭或上傳照片/影片，按「開始偵測」。
3. 一般辨識（COCO-SSD）會偵測人、貓、狗、鳥、熊、馬等 11 種類別（含人），預設分數門檻 65%，同一種類在相近位置連續辨識 3 次才警報。門檻、次數、冷卻時間皆可調整。
4. 若要擴充野生動物或「疑似保育類」，勾選「進階野生動物辨識（實驗）」。首次需要下載約 150 MB 的 CLIP q8 模型（外加執行資源），之後約每 5 秒做一次場景/動物局部比對。模型較慢、耗流量與記憶體；失敗時不影響基本偵測。
5. 進階比對目前納入石虎、臺灣黑熊、穿山甲、歐亞水獺、黑面琵鷺、草鴞、熊鷹、臺灣藍鵲、藍腹鷴、臺灣野山羊、黃喉貂，及猴子、野豬、鹿、松鼠、兔子、蛇、蛙、蜥蜴、龜、蝴蝶等野生動物候選。

**保育類辨識不是法定物種鑑定。** 進階 CLIP 輸出的百分比僅為固定候選標籤之間的相對分數，不是真實存在機率或統計校準的可信度；相似物種、夜間光線與影像模糊可能誤判。請保存原始畫面，必要時由專家判讀。

保育行動參考：https://www.forest.gov.tw/0004752

## GitHub → Cloudflare 自動部署

Cloudflare Workers 專案：`biowatch-ai`

Wrangler 設定：`wrangler.jsonc`

- **正式提供給網站的檔案在 `public/index.html`**（由 `assets.directory=./public` 指定），部署指令 `npx wrangler deploy`。
- 根目錄的 `index.html` 是方便預覽的同步備份；**只改根目錄而不改 `public/index.html` 不會更新正式網站**。
- 修改 `public/index.html` 並提交到 `main`，Cloudflare 連接 GitHub 的情況下會自動觸發新建置/部署。網址保持不變。
- 建置後可到 Cloudflare → Workers 和 Pages → biowatch-ai → 部署，確認最新 commit 已部署；在瀏覽器按 Ctrl+F5 強制重新載入。

## 注意

- 模型的運算在瀏覽器裝置端進行，頁面需保持開啟。第一次使用需要下載外部模型及依賴 CDN；不包含全天候背景監控、動物真正追蹤、手機離線推播。
- RTSP 不可直接在一般瀏覽器播放；須先由本機或 HTTPS 影像轉接服務提供可讀取的影像來源。
- 警報紀錄存在本機瀏覽器 localStorage；清除網站資料會刪除紀錄。
