# 題目回報維護

登入後按「儲存回報」會沿用 `users/{uid}/questionReports/{rid}` 同步，不再需要建立 Issue。訪客、離線或同步失敗的回報仍只在裝置上，必須成功送達雲端才會進入維護清單。

## 查詢待處理題目

GitHub Actions 的 `Question report maintenance` 每半小時執行，也會在 `Deploy Firebase Hosting` 成功後執行，可從 Actions 手動執行。排程可能因 GitHub 排隊延後。使用既有 Firebase 服務帳戶，須具備 Firestore 查詢與更新權限；不公開資料庫讀寫規則。

1. 用 GitHub 工具讀取 `actions/runs?per_page=100` 並篩選名稱 `Question report maintenance`，選最新成功執行。
2. 讀取 job log 的 `Report queue` 及 JSON；或下載 `pending-question-reports` artifact 的 `pending-question-reports.json`。
3. JSON 只含題號、問題種類及不可回推帳戶路徑的 SHA-256 回報鍵。同題回報已合併。沒有使用者 ID、作答歷史、原始說明或題目快照，可直接用題號讀取題庫並批次檢查。
4. 若需要原始補充文字，使用具權限的 Firebase CLI 執行 `node scripts/read-question-reports.cjs --details`。不得將原始回報或帳戶路徑放到公開 repository、Actions log、artifact 或網站。

舊版 `年-2-題號` 格式也會列入清單，不會因現行題號使用 `2s`／`3d` 而被略過。清單與結案資料保留回報原有題號；若要找現行題庫的對應題目，先用受保護的原始快照及官方來源確認學科，不自行猜測或改寫舊題號。精確回報鍵仍依原始文件路徑計算。

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

## 最小 IAM 授權與驗證

維護流程與 Hosting 部署共用 `FIREBASE_SERVICE_ACCOUNT_LIBRARY_EXAM_NOTEBOOK`。專案仍為 `library-exam-notebook`，網站儲存庫改名不代表 Firebase 專案或資料庫已搬移。Hosting 角色不包含 Firestore 資料權限。

使用專案自訂角色 `projects/library-exam-notebook/roles/questionReportMaintainer`，只包含：

- `datastore.entities.get`、`datastore.entities.list`：collection-group `runQuery` 的欄位投影查詢。
- `datastore.entities.create`、`datastore.entities.update`：REST PATCH 的底層 `UpdateDocument` 授權需要兩者。程式仍強制 `currentDocument.updateTime` 前提與欄位遮罩，因此只能更新已讀取版本的既有回報，不會建立文件。

將角色授予既有 GitHub Actions Hosting 服務帳戶，條件綁定只涵蓋 `(default)` 資料庫及其文件資源；`library-exam-notebook` 與專案編號 `371206950927` 是同一專案的兩種名稱表示。修改 IAM 時保留其他綁定及條件，使用最新 policy 的 etag 避免覆蓋同步變更。不要改授 Owner、Editor、Datastore User 或含刪除／資料庫管理權限的廣泛角色。Firestore IAM 可限制資料庫，無法藉此限制特定 collection 或欄位；維護程式仍須只查回報並以精確鍵更新。

IAM 變更可能需數分鐘生效。先手動執行 `Question report maintenance`，勾選 `verify_update_permission`：流程只查一筆既有回報的文件名稱，不載入原始欄位，再送出帶有 `1970-01-01T00:00:00Z` 版本前提的 update。這個早於 Firestore 建立時間的版本不可能成立，所以不會建立或修改任何文件；只有收到明確的版本前提拒絕或文件在查詢後已不存在的錯誤，才視為更新權限檢查通過。403、網路錯誤與其他失敗都會讓流程失敗。若完全沒有回報，診斷會明確失敗，無法宣稱已驗證更新；不要用不存在的文件測試 update-only IAM，因為那可能觸發新增文件權限的判斷。預設排程不執行此診斷。

接著確認流程成功產生匿名題號清單。只有 IAM 設定存在、管理者能查詢，或 Hosting 發佈成功，都不足以證明維護服務帳戶可用。Google 串流 API 的錯誤也可能包在陣列中；日誌僅顯示安全的錯誤代碼，不輸出 Google 錯誤訊息、metadata 或原始回報。

若本機有多個 Google 帳號，使用具備本專案 IAM 管理權限的 Firebase CLI 登入帳號；ChatGPT 的登入帳號與 GitHub Actions 的服務帳戶是分開的。可以比對 secret 的專案與服務帳戶是否符合既有 Hosting 發佈紀錄，但只輸出比對結果，不能輸出憑證。

權限依據：[Firestore UpdateDocument 稽核權限表](https://docs.cloud.google.com/firestore/native/docs/audit-logging)、[Firestore IAM API 簡表](https://firebase.google.com/docs/firestore/security/iam)、[資料庫條件式存取](https://firebase.google.com/docs/firestore/manage-databases#configure_per-database_access_permissions)。注意簡表只列 PATCH 的 update，完整方法表另列 create；請以相同服務帳戶的實測為準。
