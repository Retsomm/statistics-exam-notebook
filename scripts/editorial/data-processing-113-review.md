# 113 年資料處理大意全卷解析查核（2026-11-08）

起因為第7題回報「頻率最低應該是ab」。讀取原始說明後，比對官方原卷及標準答案，確認原解析錯套其他題目的合併資料。逐題讀取本卷50題，發現二補數加法誤講右移、網路路由誤講資料庫連接、FROM與Chrome誤講ROM、反向題將錯誤敘述說成合理等問題，因此本次重寫全卷50份主解析及200份選項解釋，保存於 reviewed-explanations.json，重建後不會回退至關鍵字生成。

## 核對與改寫範圍

- 1至6：二補數進位與溢位分離、儲存程式架構、OS裝置相容性、CPU各單元用途、二與八及十六進位換算；反向題清楚區分敘述錯與應選。
- 7：A10+B10、C15+F15、D20+AB20、E30+CF30、40+60。A/B/C/F為3位元，D/E為2位元，四選項只有D最短。附原題頻率建立的樹，不指定唯一左右0/1編碼。
- 8：由中序FECAHBDG、後序FECBGDHA還原二元樹，葉為F/B/G，選B。附圖並以兩種走訪反驗。
- 9至13：C布林、降冪氣泡排序逐輪、結構指標別名、三種資料模型、COUNT(*)與COUNT欄位及NULL。C第9、11題原片段實際以gcc編譯執行核對；排序以獨立迴圈驗算。
- 14至23：IRQ與DMA分工、數位載波調變、OOP不可變設計、L2交換器目的MAC、排序穩定反例、BST/B+/R樹與語法樹、集中P2P目錄及檔案分離、JOIN、LAN分層、簽章與加密金鑰方向。
- 24：依原考年度個資法確認行銷拒絕權，保留官方B；指出C的二十人不是唯一團體訴訟要件，不能把民事授權等同刑事告訴。
- 25至35：服務與協定配對（不硬說語音絕不可能使用TCP）、DNS、ready/running、依題設定十進單位及向上取整的框架數、home/root/working/absolute、Linux發行版定位、程式載入、組譯與鏈結、ASCII、作業與應用、搜尋平均與最差條件。
- 36至50：流程圖、河內塔遞迴、三層迴圈求和、WHERE及SQL邏輯次序、正規化、NIST三服務模式、網路選路、社交工程、DES演算法與SSL/TLS/SET協定區別、ICMP防火牆、合法C指定、CSS、UPDATE與WHERE、DBMS資料管理優點。

## 題目限制與保留

- 第3題C的版本更新是一般持續維護情境，不宣稱所有已停產系統仍必定更新。
- 第24題C的團體訴訟程序表述不完整；保留官方答案且列明限制。使用原考年度歷史法規參考。
- 第25題語音協定不能當成所有實作一律排除TCP。
- 第28題依原題150×40MB=6GB的十進單位設定計算，前三程式33、68、30框架，餘19。
- 第35題雜湊為正常負載與分布下平均／期望O(1)，非最差永遠最佳。
- 第38題原文稱C卻含C++的cout，保留原題且依迴圈次數作答。
- 第45題「交易安全機制」措辭過寬。保留官方A，但不說DES從未可作安全系統元件；區別演算法與協定，並明示DES、SSL已過時。
- 第47題以變數已適當宣告的片段語境判斷，不擅加宣告陷阱。

## 驗證

- 原卷：https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=113010&c=509&s=0601&q=1&t=Q
- 官方答案逐十題：ADDCBADBBB、CDCCBBADDC、CACBBABCBA、DACDBBCCDC、ABCCABCCDC。對照官方答案PDF圖像，保持全部題號、答案與分數資料不變。
- 答案：https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=113010&c=509&s=0601&q=1&t=S
- 霍夫曼教材：https://opendsa.org/OpenDSA/Books/Catalog/html/Huffman.html
- SQL：https://www.postgresql.org/docs/current/sql-select.html 、 https://www.postgresql.org/docs/current/functions-aggregate.html
- P2P：https://www.rfc-editor.org/rfc/rfc5694.html
- 語音傳輸：https://www.rfc-editor.org/rfc/rfc3550.html
- NIST雲端：https://csrc.nist.gov/pubs/sp/800/145/final
- DES：https://csrc.nist.gov/pubs/fips/46-3/final
- 歷史個資法：https://law.moj.gov.tw/LawClass/LawOldVer.aspx?pcode=I0050021

測試確認50題都來自審閱來源且與公開解析相同，200個選項解釋逐項具體且不共用空泛句；數值換算、框架數、三層迴圈、霍夫曼深度、中序後序還原各自獨立驗算。瀏覽器確認手機桌面示意圖、反向題限定說明與既有前序圖不互相影響。回報僅於修正正式部署後，以精確回報鍵結案。
