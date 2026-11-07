# 題目回報維護

登入後按「儲存回報」會沿用 `users/{uid}/questionReports/{rid}` 同步，不再需要建立 Issue。訪客、離線或同步失敗的回報仍只在裝置上，必須成功送達雲端才會進入維護清單。

## 查詢待處理題目

GitHub Actions 的 `Question report maintenance` 每半小時執行，也會在 `Deploy Firebase Hosting` 成功後執行，可從 Actions 手動執行。排程可能因 GitHub 排隊延後。使用既有 Firebase 服務帳戶，須具備 Firestore 查詢與更新權限；不公開資料庫讀寫規則。

1. 用 GitHub 工具讀取 `actions/runs?per_page=100` 並篩選名稱 `Question report maintenance`，選最新成功執行。
2. 讀取 job log 的 `Report queue` 及 JSON；或下載 `pending-question-reports` artifact 的 `pending-question-reports.json`。
3. JSON 只含題號、問題種類及不可回推帳戶路徑的 SHA-256 回報鍵。同題回報已合併。沒有使用者 ID、作答歷史、原始說明或題目快照，可直接用題號讀取題庫並批次檢查。
4. 若需要原始補充文字，使用具權限的 Firebase CLI 執行 `node scripts/read-question-reports.cjs --details`。不得將原始回報或帳戶路徑放到公開 repository、Actions log、artifact 或網站。

回報不會自行啟動 ChatGPT。使用者要求查核回報時，由維護者讀取清單並逐題核對，不能把彙整排程說成自動修題。

## 修正後移出待處理區

先查核原卷、官方答案及權威資料，完成修改、檢查、推送 main 並確認 Hosting 成功。再更新 `data/maintenance/report-resolutions.json` 的 `resolutions` 陣列，每筆含：

```json
{
  "key": "從批次清單取得的64位SHA-256回報鍵",
  "questionId": "114-3d-20",
  "kind": "explanation",
  "fixCommit": "已成功部署的40位Git提交SHA",
  "resolution": "具體說明修正內容與查核結果",
  "evidence": ["https://權威資料來源"]
}
```

提交這份清單後，維護流程會檢查題號、種類、精確回報鍵及 fixCommit 的正式部署紀錄，再用 updateTime 前提只更新對應回報的 status、resolution、fixCommit、resolvedAt。失敗不會假裝成功。同題其他回報、新回報不受影響。重跑已完成項目不會重複寫入。

前端收到雲端 `resolved` 狀態後，自動移到「已處理」，保留結果供查閱，不刪除原始回報。原始說明留在受權限保護的 Firestore。批次清單 artifact 保留14天，每次排程重新產生。

若流程失敗，先確認 GitHub 服務帳戶是否有 Firestore IAM 權限。流程只會記錄服務名稱、HTTP 狀態及錯誤代碼，不記錄帳戶識別資訊。專案擁有者需在 Google Cloud IAM 確認部署服務帳戶的 Firestore 權限。Firestore 403 不等於沒有回報；必須授權後重跑，看到成功清單才能宣稱已讀取。不要將流程錯誤當成零筆回報，也不要放寬使用者資料的 Firestore 規則。
