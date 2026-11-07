# 2026-11-07 題目回報查核

本次讀取公開維護 artifact 的原始說明，處理四個題號、六筆回報。回報只是查核線索，依官方原題、答案與權威文件判斷，不依回報類型名稱猜測問題。

## 114-3d-24

原回報三筆均要求逐選項說明。核對原卷第2頁與標準答案，答案 D：IS NULL。C 原卷拼作 IS EMPYT，保留原題文字，不擅改選項。新增 NULL、空字串、0／字串 NULL 的區別，三筆 email 教學例子，說明 `= NULL` 為 UNKNOWN、WHERE 保留 TRUE，各項具體語法理由與 IS NOT NULL 的用途。來源保存在 reviewed-explanations.json，重建不會覆蓋。

來源：
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=114010&c=512&s=0701&q=1&t=Q#page=2
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=114010&c=512&s=0701&q=1&t=S
- https://www.postgresql.org/docs/current/functions-comparison.html

## 113-1-4

回報要求詳細說明。核對官方答案 C，保留 D 公共投資可有長期供給效果的限制，不硬說完全沒有供給效果。補上關稅對消費者與生產者的不同影響、消費稅占所得比例的算例、漲價歸公與可能誘因、公共支出短期總需求及長期產能的區別。同時更新逐題編寫來源與生成解析。

來源：
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=113010&c=505&s=0102&q=1#page=1
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=S&code=113010&c=505&s=0102&q=1
- https://www.imf.org/external/pubs/ft/fandd/basics/36-fiscal-policy.htm
- https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-q-and-a/local/land-value-increment-tax/o9RMNA8

## 113-1-49

原回報要求題目、選項的單字收藏與題組全文中文翻譯。核對官方答案 A；目前完整三段翻譯與部分選項單字已存在，保留既有字卡ID與全文翻譯。補齊 potential、risk、education、nation、social、cultural、development、talent／talents 等缺項，沿用共用單字辨識、收藏與同步流程。新增題目完整語譯及四個選項的完整中文翻譯，解釋為何不能把其他可能後果當作原文直接支持的答案。測試第46至50題共用同份全文翻譯，以及各選項單字在實際靜態字庫可收藏。

來源：
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=113010&c=505&s=0102&q=1#page=4
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=S&code=113010&c=505&s=0102&q=1

## 111-2-6

原回報指題目不自然斷行。比對回報日期以前的公開題庫（commit 5424e2206ba733fc694a9a9db9994a64c2940691 的 data/bank.json，blob f0e901a1f0bd8492f6ddbaed70622a6ace5076fe），確認此題是圖書館學的 Cranfield 研究題；並核對官方原卷第1頁，原題「索引語／言」是 PDF 實體換行。該科目已依使用者需求下架，現行題庫不存在此題。此回報以原題退役完成查核，不復原舊科目，不把它錯當成現行 111-2s-6 統計題，也不宣稱重寫了已下架題目。現行共同文字重排會合併這種中文實體換行；加測此字詞案例。回報區已下架題目的按鈕改為停用並說明，不再出現點擊沒有反應的按鈕。

來源：
- https://github.com/Retsomm/statistics-exam-notebook/blob/5424e2206ba733fc694a9a9db9994a64c2940691/data/bank.json
- https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?t=Q&code=111010&c=505&s=0402&q=1#page=1

所有回報只在修正成功部署後，以精確原始回報鍵結案；同題後來新增的回報不一併關閉。退役項目在 resolution 寫明查核結論，不冒充現行題目已修正。
