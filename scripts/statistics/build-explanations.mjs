import {mkdirSync,writeFileSync} from 'node:fs';
import {reviewedProfessionalExplanation} from '../professional-import/reviewed.mjs';

const normalise=value=>String(value||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const topics=[
 {match:/平均數|中位數|眾數|四分位|盒狀圖|直方圖|標準差|變異數|變異係數|偏態|柴比雪夫|Chebyshev|調和平均|描述統計/,label:'描述統計',rule:'先確認題目是在比較集中趨勢、離散程度或分布形狀。平均數會受極端值影響；標準差與變異係數用來描述資料的離散程度。'},
 {match:/機率|條件機率|貝氏|Bayes|獨立|聯合|彩券|骰子|抽球|至少|不放回|組合|排列/,label:'機率',rule:'先寫出事件與已知條件，再判斷是否要使用加法法則、乘法法則、條件機率或補事件。抽樣是否放回會改變各次抽取是否獨立。'},
 {match:/常態|標準常態|指數分配|卜瓦松|Poisson|二項|Binomial|隨機變數|機率密度|期望值|變異數|分配|壽命|到達/,label:'機率分配',rule:'先辨認隨機變數的分配種類，再使用該分配的平均數、變異數、累積機率或標準化關係。常態分配常先換成 Z 值；二項分配則要同時利用期望值與變異數。'},
 {match:/抽樣|樣本|母體|信賴區間|估計|抽樣分配|樣本數|系統抽樣|集群抽樣|分層抽樣/,label:'抽樣與區間估計',rule:'先辨識抽樣設計與估計對象。信賴區間以樣本統計量加減誤差範圍表示；樣本數增大通常會讓標準誤下降、區間縮小。'},
 {match:/檢定|虛無|對立假設|p 值|顯著水準|型 I|型 II|拒絕域|檢定統計量|power|比例差異/,label:'假設檢定',rule:'先寫出 H₀ 與 H₁，確認是單尾或雙尾，再用顯著水準、p 值或臨界值做結論。不要把「未拒絕 H₀」誤解成已經證明 H₀ 為真。'},
 {match:/ANOVA|變異數分析|處理間|區集|因子|交互作用|F 分配|MSTR|MSE|平方和|自由度/,label:'變異數分析',rule:'ANOVA 用處理間變異與誤差變異的比值檢驗多組平均數是否相同。解題時依設計種類確認自由度、平方和、均方與 F 統計量。'},
 {match:/迴歸|相關|散布圖|最小平方|SSE|SSR|R²|解釋能力|預測|斜率/,label:'相關與迴歸',rule:'相關係數描述線性關係的方向與強度；迴歸式則用 X 預測 Y。SSR/(SSR+SSE) 是模型解釋變異比例，斜率代表 X 增加一單位時 Y 的預期改變。'},
 {match:/卡方|列聯表|獨立|期望次數|適合度|類別|性別/,label:'卡方檢定',rule:'列聯表問題先計算各格期望次數，公式是「列總和 × 欄總和 ÷ 總數」。再以觀察值與期望值的差異判斷是否支持獨立或分布一致。'},
 {match:/無母數|充分性|估計量|統計量/,label:'統計推論概念',rule:'先從定義判斷統計方法需要的分布假設與資料尺度。無母數方法通常較少依賴特定母體分布，但可能犧牲部分效率。'},
];
const fallback={label:'統計基本概念',rule:'先整理題目給的數值、統計量與限制條件，再從各選項核對定義、公式或推論方向。'};
const topicFor=question=>{
 const text=normalise([question.stem,...question.options.map(option=>option.text)].join(' '));
 const priority=['卡方檢定','變異數分析','相關與迴歸','假設檢定','抽樣與區間估計','機率分配','機率','描述統計','統計推論概念'];
 return priority.map(label=>topics.find(topic=>topic.label===label)).find(topic=>topic?.match.test(text))||fallback;
};

function plainGuide(topic){
 const guides={
  '描述統計':'先看題目是在問資料的中心、分散程度，還是整體形狀；不要把平均數、標準差和相關係數當成同一件事。',
  '機率':'把每一個事件拆開看：哪些情況可以相加、哪些情況要相乘。題目有寫「至少」或「沒有」時，常常從反面去算會更快。',
  '機率分配':'先認出這是哪一種分配，再把題目給的平均數、機率或標準差放到對應的規則裡。',
  '抽樣與區間估計':'先分清楚題目在談母體還是樣本；樣本只是拿來估計母體，不是母體本身。',
  '假設檢定':'把它當成判斷證據夠不夠強：先訂出原本的假設，再看資料有沒有強到足以推翻它。',
  '變異數分析':'它是在比較好幾組平均數。重點不是哪組數字最大，而是組與組之間的差異有沒有大到不像隨機波動。',
  '相關與迴歸':'相關是在看兩件事有沒有一起變動；迴歸則是在用一個變數去預測另一個變數，兩者不要混在一起。',
  '卡方檢定':'先用列總和和欄總和算出「如果沒有關係，理論上應有多少人」，再和實際數字比較。',
  '統計推論概念':'先把名詞換成日常語言：這個方法需要什麼假設、能回答什麼問題，再回頭看選項。',
  '電腦組織與資料表示':'先把題目中的單位、位元或記憶體位置拆開算；不要一次把十進位、二進位和位址混在一起。',
  '作業系統':'把作業系統想成資源管家：誰先用 CPU、資料放在哪裡、程式目前在等什麼，都要分開看。',
  '資料庫':'先看題目在談資料怎麼存、怎麼查，還是資料之間怎麼連結；主鍵、外鍵和 SQL 子句各有不同工作。',
  '電腦網路與資訊安全':'先分清楚資料是在同一個網路內傳，還是要跨網路；再判斷題目問的是設備、協定還是安全目的。',
  '資料結構與演算法':'先把資料怎麼進、怎麼出、怎麼走的順序畫清楚；只要順序抓對，選項通常就能排除。',
  '程式設計':'把程式當成逐行執行的指令：先追變數怎麼改，再判斷迴圈、函式或物件導向概念。',
  '網頁技術':'先記住分工：HTML 放內容結構、CSS 管外觀、JavaScript 做互動；題目問哪一件事，就回到對應工具。',
  '辦公軟體與資料處理':'先想清楚你真正要完成的工作，再找對應的軟體功能或函數，不要只憑名稱猜答案。',
  '資訊倫理與資安治理':'先看題目要保護的是誰的資料、權益或系統安全，再判斷行為有沒有踩到界線。',
  '電子商務與資訊應用':'先分清楚交易雙方和系統在流程中的角色，再看哪個選項真的能完成題目要的服務或流程。',
  '人工智慧':'先分清楚模型是在學習資料，還是在使用已學到的結果回答問題，兩個階段的工作不同。',
  '多媒體資料':'先看題目重視的是音質、檔案大小或能不能還原原始資料；這三件事常常需要取捨。',
  '統計基本概念':'先把題目給的數字和限制條件圈出來，再用最基本的定義逐一排除不符合的選項。',
  '資料處理基本概念':'先把題目真正要問的關鍵字抓出來，再把每個選項放回定義裡比對。',
 };
 return guides[topic.label]||'先把題目的關鍵條件抓出來，換成自己的話理解後，再回頭比對選項。';
}
function questionInPlainWords(question){
 const stem=normalise(question.stem);
 return stem.length>170?`${stem.slice(0,167)}……`:stem;
}

const conceptNotes={
 '平均數':'平均數把全部數值加總後除以筆數，容易受到少數極端值拉動。',
 '中位數':'中位數先排序再取中間位置；資料筆數為偶數時，取中間兩筆的平均。',
 '眾數':'眾數是出現次數最多的值，資料可以有一個、多個或沒有明顯眾數。',
 '標準差':'標準差衡量資料離平均數有多分散；數值越大，資料的波動越大。',
 '變異數':'變異數是離均差平方的平均；標準差是變異數開根號後的單位化結果。',
 '變異係數':'變異係數是標準差除以平均數，適合比較不同單位或不同平均水準資料的相對分散程度。',
 '常態分配':'常態分配以平均數為中心且左右對稱；不同位置的機率常先換算成 Z 值。',
 '二項分配':'二項分配描述固定次數、每次只有成功或失敗且成功機率相同的重複試驗。',
 '卜瓦松分配':'卜瓦松分配常用於固定時間或空間內的事件發生次數，參數 λ 同時是平均數與變異數。',
 '指數分配':'指數分配常描述等待下一次事件的時間；它具有無記憶性，速率 λ 的平均等待時間是 1/λ。',
 '條件機率':'條件機率是在已知事件 B 已發生時，重新計算事件 A 的機率，公式為 P(A∩B)/P(B)。',
 '獨立':'若兩事件獨立，知道其中一件發生不會改變另一件的機率，且 P(A∩B)=P(A)P(B)。',
 '信賴區間':'信賴區間由估計值加減誤差範圍構成；樣本數增加通常使標準誤和區間寬度降低。',
 '虛無假設':'虛無假設 H₀ 是檢定起點，通常表示沒有差異或沒有關係；證據不足時只能說未拒絕它。',
 'p 值':'p 值是在 H₀ 為真時，得到目前或更極端資料的機率；p 值小於顯著水準時拒絕 H₀。',
 '相關係數':'相關係數介於 -1 與 1，表示線性關係的方向與強度，不能單憑它推論因果。',
 '迴歸':'迴歸式用自變數預測依變數；斜率描述 X 增加一單位時，Y 的預期改變量。',
 'R²':'R² 是模型解釋的變異比例，等於 SSR/(SSR+SSE)，不是相關係數本身。',
 '卡方':'卡方檢定比較觀察次數與獨立假設下的期望次數；每格期望次數為列總和乘欄總和再除以總數。',
 'ANOVA':'變異數分析以處理間均方除以誤差均方得到 F 值，用來檢驗多組母體平均數是否相同。',
};
function noteFor(text){
 const compact=normalise(text);
 const key=Object.keys(conceptNotes).find(key=>compact.includes(key));
 return key?conceptNotes[key]:null;
}
function calculationNote(question,correct,topic){
 const stem=normalise(question.stem);
 if(/P\(A∪B\)/.test(stem))return '因為 A、B 獨立，聯集機率是 P(A)+P(B)-P(A)P(B)=0.4+0.5-0.2=0.7。這裡要扣掉同時發生的部分，避免重複計算。';
 if(/4 個燈泡中至少 1 個/.test(stem))return '「至少 1 個」可改算補事件：先求 4 個都沒有瑕疵的機率，再用 1 減掉它。這比逐一列出 1、2、3、4 個瑕疵更不容易漏算。';
 if(/平均長度為 4 分鐘/.test(stem)&&/2 分鐘內沒有/.test(stem))return '平均等待時間為 4 分鐘，所以指數分配速率 λ=1/4。2 分鐘內沒有人到達的機率是 e^{-λt}=e^{-0.5}，約 0.607。';
 if(/P\(X=x\)=ax/.test(stem))return '先讓所有機率加總為 1：a(1+2+3)=1，所以 a=1/6；再依 E(X)=ΣxP(X=x) 把每個可能值乘上它的機率後加總。';
 if(/P1：到達 0/.test(stem))return '這題使用可搶占式最短剩餘時間優先排程。每有新行程到達，就重新比較目前行程的剩餘時間與新行程所需時間，選較短者執行。';
 if(/SSE = 200/.test(stem))return '決定係數 R²=SSR/(SSR+SSE)=600/(600+200)=0.75。也就是模型解釋了 Y 總變異的 75%，剩下 25% 是殘差。';
 if(/中位數/.test(stem)&&/65, 90, 85/.test(stem))return '先排序為 65、68、77、79、81、85、90、100。共有 8 筆資料，因此中位數是第 4 與第 5 筆的平均，即 (79+81)/2=80。';
 if(/期望的 新生人數/.test(stem))return '在「新生組成未改變」的虛無假設下，期望次數等於總人數乘以前一年度比例：300×0.30=90。期望次數不是直接把兩年度人數相減。';
 return `${topic.rule}本題答案是「${normalise(correct.text)}」，因為它符合題幹指定的統計概念或計算結果。`;
}
function optionExplanation(question,option,correct,topic){
 const optionText=normalise(option.text),correctText=normalise(correct.text);
 const concept=noteFor(optionText)||noteFor(question.stem);
 if(option.letter===correct.letter){
  return `（${option.letter}）可以選。${concept||`它符合題目給定的條件，結論為「${correctText}」。`}請把它和題幹的數值、定義或推論方向一起核對。`;
 }
 return `（${option.letter}）不選。${concept||`「${optionText}」沒有得到題幹條件支持；依題意應選「${correctText}」。`}本題問的結論是「${correctText}」，不能只看名詞相近就選它。`;
}
const checkedCalculations={
 '113-2s-1':{
   "summary": "隔天只有兩種價格：80+5=85 或 80−5=75，各有 0.5 的機率。用機率加權，E=85×0.5+75×0.5=80，選 B。",
   "options": {
     "A": "（A）70 比最便宜的可能價格 75 還低。",
     "B": "（B）兩種價格等可能，期望就是 75 和 85 的平均。",
     "C": "（C）85 只涵蓋上漲情況；另一半的情況價格是 75。",
     "D": "（D）只過一天，最多漲 5 元，90 連可能值都不是。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-2':{
   "summary": "Var(X+Y)=Var(X)+Var(Y)+2Cov(X,Y)。獨立使共變異數等於 0，所以兩個變異數直接相加，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）期望值通常不能對比值分子、分母分開套用。獨立時若期望存在，E(Y/X)=E(Y)E(1/X)。",
     "B": "（B）獨立時左右分別化成 E(X) 和 E(Y)，兩者未必相同。",
     "C": "（C）獨立時左右分別化成 Var(Y) 和 Var(X)，兩者也未必相同。",
     "D": "（D）獨立使共變異數項消失，留下兩個變異數之和。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-3':{
   "summary": "柴比雪夫定理保證距離平均數 k 個標準差內的比例至少為 1−1/k²。令它等於 0.84，得到 1/k²=0.16，所以 k=2.5，選 D。",
   "options": {
     "A": "（A）k=1 的公式下限為 0，無法保證 84%。",
     "B": "（B）k=1.5 的下限 1−1/2.25 約為 55.56%。",
     "C": "（C）k=2 只能保證至少 75%。",
     "D": "（D）k=2.5 時，1−1/6.25 正好是 84%。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-4':{
   "summary": "依正側的常態表找 2x。Φ(2x)−Φ(0)=0.1255，因此 Φ(2x)=0.6255，對應 z≈0.32。再除以 2，得到 x=0.16，選 D。若允許負的座標，對稱的 −0.16 也符合相同面積。",
   "options": {
     "A": "（A）x=0.99 對應邊界 1.98，從 0 到該處的面積遠大於 0.1255。",
     "B": "（B）x=0.40 對應邊界 0.80，面積約 0.2881。",
     "C": "（C）0.32 是查表得到的 2x，還要除以 2。",
     "D": "（D）2×0.16=0.32，兩點間面積約 0.1255。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-5':{
   "summary": "組距是分組區間的寬度。先用最大值減最小值得到全距，再除以要分的組數，最後視需要把結果向上調成方便分組的數字，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）兩個次數都描述資料筆數，無法得知橫軸的數值跨度。",
     "B": "（B）組中點通常在決定分組界線之後才計算。",
     "C": "（C）全距提供總跨度，組數提供切成幾段。",
     "D": "（D）組數有用，但平均次數沒有提供資料跨度。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-6':{
   "summary": "在母體變異數固定、採通常獨立抽樣的設定下，平均數標準誤為 σ/√n。n 變為 2n，標準誤變成原來的 1/√2≈0.707，所以選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）降到一半要讓樣本數成為四倍。",
     "B": "（B）0.707 約為 70%，指縮小到原值的約七成。",
     "C": "（C）多收樣本會降低平均數的抽樣波動，方向相反。",
     "D": "（D）根號分母隨樣本數增加而增大。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-7':{
   "summary": "將沖洗與擦乾時間相加。平均為 15+10=25 分鐘，獨立時變異數相加為 3²+4²=25，總標準差為 5。總時間亦為常態，P(T>30)=P(Z>1)≈0.1587，選 B。",
   "options": {
     "A": "（A）0.3413 是從 z=0 到 z=1 的面積。",
     "B": "（B）30 比總平均多 5 分鐘，即一個總標準差，查右尾得 0.1587。",
     "C": "（C）0.4706 不等於 z=1 的右尾面積。",
     "D": "（D）0.029 接近 z=1.90 的右尾，遠比此題的 z=1 更靠右。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-8':{
   "summary": "依官方採用的常態近似，樣本比例的中心是 p=0.60，且 np=60、n(1−p)=40；忽略連續性修正，中心左側約占一半，選 B。若用二項分配精算，「小於 60%」等於最多 59 人，機率約 0.4567。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）抽到少於 60 位喜歡國外旅遊的人有正機率。",
     "B": "（B）不做連續性修正時，常態近似在平均左側給 0.5。",
     "C": "（C）用常態近似中心左右各半，沒有 0.7 的結果。",
     "D": "（D）樣本也可能有 60 位以上符合，機率不可能為 1。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-9':{
   "summary": "五等分的最低與最高組以第 20、80 百分位數為界。標準常態對應 z≈−0.842、+0.842，原分配平均 50、標準差 10，換回 50±8.42 得 41.58；58.42，選 A。",
   "options": {
     "A": "（A）兩值各離平均 0.842 個標準差，切出兩側各 20%。",
     "B": "（B）離平均 2.53 只相當於 0.253 個標準差。",
     "C": "（C）離平均約 0.158 個標準差的切點會把中間區間劃得太窄。",
     "D": "（D）40 和 60 各離平均 1 個標準差，外尾各約 15.87%。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-10':{
   "summary": "平均壽命 2 年給速率 λ=1/2 每年。6 個月換成 0.5 年，P(T<0.5)=1−exp[−(1/2)×0.5]=1−e⁻⁰·²⁵，選 A。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）「少於」要用左尾，指數中的 λt 是 0.25。",
     "B": "（B）0.5 年乘每年 0.5 的速率，結果是 0.25 而非 3。",
     "C": "（C）e⁻⁰·²⁵ 是使用壽命超過半年的右尾機率。",
     "D": "（D）e⁻³ 的尾端方向和速率、時間換算都不符。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-11':{
   "summary": "常態分配約有 68% 落在平均數上下各 1 個標準差。72 和 84 各距平均 78 分達 6 分，故標準差約 6 分，選 C。",
   "options": {
     "A": "（A）標準差若為 2，這個區間就涵蓋正負 3 個標準差，約 99.73%。",
     "B": "（B）標準差若是 3，區間會涵蓋正負 2 個標準差，約 95%。",
     "C": "（C）兩個端點各離中心 6 分，一側距離就是標準差。",
     "D": "（D）12 是整段區間寬度，需除以 2。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-12':{
   "summary": "線性估計量不偏要求權重和為 1，其變異數為 σ²Σwᵢ²。固定五個權重合計 1 時，權重都等於 1/5 可使平方和最小，變異數為 σ²/5。T₃ 正是樣本平均，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）T₁ 對各筆觀測給不同權重，達不到五個權重等分時的最小變異數。",
     "B": "（B）T₂ 的分子係數總和為 11，除以 15 後權重和不是 1。",
     "C": "（C）每筆樣本權重都是 1/5，兼具不偏與最小平方和。",
     "D": "（D）T₄ 即使權重加總為 1，係數不等使其平方和大於 1/5。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=1"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-13':{
   "summary": "逾期率估計為 0.12。95% 常態近似區間約為 0.12±1.96√(0.12×0.88/100)=(0.056,0.184)。若容許誤差為 0.1，採目前比例得 n≥40.57，即 41 人；用最保守 p=0.5 也只需 97 人，故「必須超過 100」錯誤，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）樣本中的 12 次逾期和 88 次未逾期都足夠供常態近似。",
     "B": "（B）標準誤約 0.0325，乘 1.96 後區間半寬約 0.064。",
     "C": "（C）母體比例未知，以樣本比例代入 p(1−p) 估計標準誤。",
     "D": "（D）最保守的 1.96²×0.25/0.1²=96.04，向上取整為 97。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-14':{
   "summary": "題目估計的是平均每天上網時間。母體標準差未知，用樣本 s 代入，常態母體下 (X̄−μ)/(s/√20) 服從自由度 19 的 t 分配，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）卡方可估計常態母體變異數，這裡的目標是平均數。",
     "B": "（B）用樣本標準差當作母體標準差的估計時，以 t₁₉ 建區間。",
     "C": "（C）樣本的偏差和固定為零，只有 20−1 個自由度。",
     "D": "（D）卡方分配和自由度 20 都不是這個平均數區間所需。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-15':{
   "summary": "官方採 A（50），但原卷的左尾對立假設是 μ<100，指定的 μ₁=115 卻落在 H₀。該參數值下無法定義題目所說的型 II 錯誤。若原意是 μ₁=95，代入 n=[(1.645+1.282)×12/(100−95)]²≈49.34，取 50。95 只是能解釋選項的假設，原卷仍寫 115。",
   "options": {
     "A": "（A）50 可由把對立情境改為 95 算得，官方採計此項。",
     "B": "（B）若採 95 的假設，60 已超過所需的 50；原卷給的 115 則無法照題意定義 β。",
     "C": "（C）70 同樣不是按 95 推得的最小整數，也無法補足原題條件。",
     "D": "（D）80 比按 95 推得的門檻更高；要由原題精確決定 n，需先確認 μ₁。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-16':{
   "summary": "新帳戶逾期率 35/250=0.14，舊帳戶 27/300=0.09。H₀ 下合併比例 62/550≈0.1127。Z=0.05/√[0.1127×0.8873×(1/250+1/300)]≈1.85，雙尾 p 約 0.064，選 B。",
   "options": {
     "A": "（A）0.03 近似單尾機率，題目問是否有差異，需計雙尾。",
     "B": "（B）以標準常態查到一尾約 0.032，乘 2 後約 0.06。",
     "C": "（C）0.3 遠高於已觀察到的約 1.85 個標準誤所對應的雙尾面積。",
     "D": "（D）0.6 同樣與 z≈1.85 的雙尾面積不符。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-17':{
   "summary": "A 的 F=MSA/MSE=4，所以 MSE=16/4=4。4×3 個組合，每組三次，組內誤差自由度 4×3×(3−1)=24。SSE=4×24=96，選 B。",
   "options": {
     "A": "（A）48 等於把 MSE 乘 12，漏算每個組合有兩個誤差自由度。",
     "B": "（B）以誤差均方 4 乘誤差自由度 24。",
     "C": "（C）144 是 4×36，總觀測數不是誤差自由度。",
     "D": "（D）從 F 和 MSA 已能求出 MSE，重複次數也已給出。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-18':{
   "summary": "含截距的迴歸中 R²=SSR/SST=0.97，表示以 X 擬合後，模型解釋了樣本中 Y 總變異的 97%，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）只要有定義所需的平方和就能算 R²，並無大樣本門檻。",
     "B": "（B）0.97 接近 1，表示樣本內的解釋比例高。",
     "C": "（C）簡單迴歸的 R² 是 r²，正負號應看斜率。",
     "D": "（D）總變異中有 97% 由擬合模型解釋，約 3% 落在殘差。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-19':{
   "summary": "用斜率除以標準誤。t₁=4.24/3.8≈1.12，殘差自由度 10−2−1=7，雙尾 5% 臨界值約 2.365，故不拒絕 β₁=0，選 B。t₂=1.21/0.2=6.05。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）第一個 t 的絕對值小於臨界值，未達顯著。",
     "B": "（B）第一個斜率的估計誤差相對大，t≈1.12，證據不足以拒絕。",
     "C": "（C）係數大小受單位影響，且 X₂ 的 t 值反而明顯較大。",
     "D": "（D）不宜單憑係數大小刪變數；應看檢定、模型目的與重新配適結果。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-20':{
   "summary": "由資料得 x̄=3.8、ȳ=23.2、Sxx=30.8、Sxy=−57.8。斜率約 −1.877，截距約 30.33。x=5 時 ŷ≈20.95，實測 y=20，殘差 y−ŷ≈−0.95。因此 C 的正號錯誤。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）−57.8/30.8≈−1.877，斜率正確。",
     "B": "（B）23.2−(−1.8766×3.8)≈30.33，截距正確。",
     "C": "（C）預測值高於實際值，殘差應為負數。",
     "D": "（D）含截距的最小平方迴歸使殘差總和為 0。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-21':{
   "summary": "迴歸式 ŷ=−0.74+0.39x。年收入每多 10 萬元，預測家具費用增加 0.39 萬元，且斜率的 p 值顯示為 0.000，代表遠小於 0.05。D 說沒有顯著線性關係，和斜率檢定結果相反。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）截距與斜率從估計值欄讀出，方程式正確。",
     "B": "（B）x 的一單位是 10 萬元，斜率是一單位收入對應的預測費用增量。",
     "C": "（C）200 萬元對應 x=20，−0.74+0.39×20=7.06 萬元。",
     "D": "（D）斜率的 p 值顯示為 0.000 是四捨五入，已支持顯著線性關係。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=2"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-22':{
   "summary": "30 次請假在五個工作日若機率相同，每天期望 30/5=6。χ²=[(6−6)²+(4−6)²+(8−6)²+(3−6)²+(9−6)²]/6=26/6≈4.33，自由度 5−1=4，選 A。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）以五格的平方差除以 6 相加，得到約 4.33，配自由度 4。",
     "B": "（B）總次數固定，知道四天便能推出第五天，所以自由度只有 4。",
     "C": "（C）9.49 是自由度 4 的 5% 右尾臨界值，並非資料算出的統計量。",
     "D": "（D）9.49 和 5 都不是本題要填的統計量與自由度。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-23':{
   "summary": "以 2010 年實際值 17 初始化。指數平滑使用新預測＝0.2×上一年實際值＋0.8×上一年原預測，依序得到 2011 年 17、2012 年 17.8、2013 年 18.04、2014 年 0.2×23+0.8×18.04=19.032，選 B。",
   "options": {
     "A": "（A）18.04 是尚未納入 2013 年實際銷售量時對 2013 年的預測。",
     "B": "（B）19.032 四捨五入至小數點後兩位為 19.03。",
     "C": "（C）18.33 不是以 23 和 18.04 加權所得的結果。",
     "D": "（D）19.19 與 0.2×23+0.8×18.04 不符。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-24':{
   "summary": "入門教材的典型左偏分布左尾較長，低值把平均拉向左側，故預期平均數≤中位數，選 B。只用偏度的符號，無法對所有分布證明這個順序。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）平均數大於中位數通常是右偏圖形的判讀方向。",
     "B": "（B）少數較低的數通常使平均數位在中位數左側。",
     "C": "（C）在典型單峰左偏圖中，眾數在峰頂且比平均數偏右。",
     "D": "（D）典型排序是平均數≤中位數≤眾數，中位數較大與此相反。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-25':{
   "summary": "官方採 D。全距是最大減最小，描述離散程度，並不決定中心位置。例如從 [5,5,5] 換成 [0,0,10]，全距增大，平均、中位數及眾數卻都下降。A 也有例外：資料全是相同正數時，變異數為零，並非正值。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）例如 [3,3,3] 均為正數，但變異數為 0。按嚴格定義，A 也錯。",
     "B": "（B）變異數為零表示所有資料相同，三種中心指標都是同一個數。",
     "C": "（C）在平均數存在且只有一個峰值的對稱分布中，峰值和兩種中心都在對稱中心。",
     "D": "（D）可只拉低最小值，讓全距變大，平均數反而下降。這是官方採計的錯誤敘述。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-26':{
   "summary": "每次抽到紅球的機率為 4/10=0.4。放回使每人面對的機率不變，X 服從 B(10,0.4)。期望 E(X)=10×0.4=4，選 B。",
   "options": {
     "A": "（A）3 需要每人抽到紅球的機率只有 0.3。",
     "B": "（B）十人各有 40% 機率抽中紅球，期望是四份。",
     "C": "（C）6 是抽白球所發一萬五千元獎金的期望份數。",
     "D": "（D）7 對應 70% 紅球機率，實際只有 40%。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-27':{
   "summary": "A、B 機率都非零。若獨立，P(A∩B)=P(A)P(B)>0；互斥卻要求 P(A∩B)=0。兩者不能同時成立，故獨立必不互斥，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）獨立的交集機率為正，互斥的交集機率等於零，不能同時符合。",
     "B": "（B）兩者也可以都不成立。例如 A=B 且機率為 1/2，既非互斥也非獨立。",
     "C": "（C）非零機率保證獨立時相交，因此不互斥。",
     "D": "（D）互斥時交集為零，但機率乘積大於零，故不獨立。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-28':{
   "summary": "左撇子人數可近似視為二項 X∼B(225,0.36)，樣本比例為 X/225。np=81、n(1−p)=144 均足夠大，比例抽樣分配近似常態，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）比例在 0.36 附近較常見，並非各位置一樣可能。",
     "B": "（B）常態近似的平均為 0.36，標準誤 √(0.36×0.64/225)=0.032。",
     "C": "（C）t 分配用於某些以樣本標準差標準化的平均數問題。",
     "D": "（D）指數常用於等待時間，這裡的比例由二項計數而來。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-29':{
   "summary": "母體常態且母體標準差未知，用樣本標準差 3 做推論，則 (X̄−25)/(S/√15) 服從自由度 14 的 t 分配。官方依此選 B。精確來說，若問抽樣前 X̄>27 的無條件機率，X̄ 本身仍為常態，且需要母體 σ 才能給精確機率。",
   "options": {
     "A": "（A）樣本平均本身為常態，但其抽樣標準差含未知 σ，不能直接算出精確機率。",
     "B": "（B）將平均偏差除以樣本標準誤後，用 t₁₄ 推論，符合命題意圖。",
     "C": "（C）卡方適用於常態母體樣本變異數的標準化。",
     "D": "（D）F 常用於變異數比或 ANOVA，此處需標準化平均數。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-30':{
   "summary": "將上下界標準化：(45000−47500)/2500=−1，(50000−47500)/2500=1。兩側各有約 0.3413，合計 0.6826，選 C。",
   "options": {
     "A": "（A）0.3413 只計了平均數到其中一端。",
     "B": "（B）0.5556 不等於兩段相等的常態面積之和。",
     "C": "（C）正負一個標準差的常態機率約 68.26%。",
     "D": "（D）0.7123 大於正負一個標準差的涵蓋率。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-31':{
   "summary": "母體常態時，(n−1)S²/σ²∼χ²ₙ₋₁。n=9、σ²=36，所以以自由度 8 的卡方分配查 8×9.81/36=2.18 到 8×90.405/36≈20.09 之間的機率，選 C。",
   "options": {
     "A": "（A）X̄ 才有常態抽樣分配。S² 是平方後加總的非負量。",
     "B": "（B）t 分配對應未知 σ 時的標準化平均數。",
     "C": "（C）標準化樣本變異數會得到 χ²₈。",
     "D": "（D）F 適用於兩個獨立變異數之比，本題只處理一組。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-32':{
   "summary": "信賴水準與比例固定時，所需樣本數 n≈z²p(1−p)/E²，E 是可容許誤差。E 變大會讓分母增大，所需 n 下降，選 A。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）可容許誤差放寬為兩倍時，未取整的所需樣本數是原來的四分之一。",
     "B": "（B）擴大可容許誤差使樣本需求下降，增加的是要求更精確時的樣本數。",
     "C": "（C）誤差以平方出現在分母，直接影響樣本數。",
     "D": "（D）兩項其他條件都已固定，只要看 E 的變化方向。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=3"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-33':{
   "summary": "型 I 錯誤是 H₀ 真的成立卻被拒絕。題意把放假對應到保留「會經過臺北」的判斷，沒放假對應拒絕。颱風實際會經過卻沒放假，是 A。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）H₀ 為真，決策卻按沒經過來處理，符合型 I 錯誤。",
     "B": "（B）H₀ 為真且保留 H₀，是正確決策。",
     "C": "（C）颱風不經過卻放假，相當於 H₀ 為假卻未拒絕，是型 II 錯誤。",
     "D": "（D）H₀ 為假且被拒絕，是正確決策。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-34':{
   "summary": "F 變數是兩個獨立卡方各除自由度後的比值。取倒數會交換兩項，也交換大小尾端，因此 F₀.₉₀(10,20)=1/F₀.₁₀(20,10)，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）機率尾端有交換，但分子分母自由度忘了交換。",
     "B": "（B）自由度有交換，百分位數也須由 0.10 變 0.90。",
     "C": "（C）取倒數會將高分位翻成低分位，不能兩側都用 0.90。",
     "D": "（D）同時把百分位互補，並交換分子、分母自由度，才是倒數關係。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-35':{
   "summary": "電腦輸出比較兩母體的變異程度。雙尾 F 檢定用 H₀:σ₁=σ₂ 對 H₁:σ₁≠σ₂。輸出 p=0.0102 小於 0.05，因此拒絕等標準差假設，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）假設改成右尾，且既列 F 超過右尾臨界值，便不該寫無法否決。",
     "B": "（B）0.0102 小於 0.05，選項的不等號方向寫反。",
     "C": "（C）把等變異的虛無假設與不等變異的對立假設互換了。",
     "D": "（D）雙尾比較使用等與不等假設，p 值低於顯著水準應拒絕 H₀。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-36':{
   "summary": "Pearson 相關係數衡量線性關係。接近零表示沒有明顯的直線同向或反向趨勢，選 C。仍可能有很強的非線性關係，例如對稱範圍上的 Y=X²。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）明顯同向的直線趨勢應有較大的正相關係數。",
     "B": "（B）明顯反向的直線趨勢應有較大的負相關絕對值。",
     "C": "（C）絕對值接近零，線性關係弱。",
     "D": "（D）線性關係強應是絕對值接近 1。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-37':{
   "summary": "n=10，x̄=9、ȳ=21。Sxx=1080−90²/10=270，Sxy=2615−90×210/10=725，斜率 725/270≈2.6852。截距以斜率約 2.685 算為 21−2.685×9≈−3.165，所以選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）將負號放到 x 項會得到負斜率，與 Sxy 為正不符。",
     "B": "（B）同樣是負斜率，而且截距應約 −3.165。",
     "C": "（C）截距約 −3.165、斜率約 2.685，符合方向與大小。",
     "D": "（D）截距與斜率的數值大小對調了。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-38':{
   "summary": "卡方可用於單一常態母體的變異數、類別比例適合度與列聯表獨立性。傳統 ANOVA 用組間與組內均方的比值做 F 檢定，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）以 (n−1)S²/σ₀² 檢定單一常態母體變異數。",
     "B": "（B）以觀察與期望的類別次數差異構成卡方統計量。",
     "C": "（C）列聯表獨立性可以用卡方來檢定。",
     "D": "（D）ANOVA 的檢定統計量是兩個均方相除，參考 F 分配。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-39':{
   "summary": "七組配對資料做含截距的簡單迴歸，自由度是迴歸 1、誤差 7−2=5。F=(197.2778/1)/(94.822/5)≈10.4025，選 B。也可將斜率的 t 值平方驗算。",
   "options": {
     "A": "（A）應先將殘差平方和除以 5，才能算 F 的分母；2.571 與此結果不同。",
     "B": "（B）迴歸均方約 197.278，除以殘差均方約 18.964 得 10.4025。",
     "C": "（C）6.616 與兩個正確均方相除的結果不符。",
     "D": "（D）斜率除以標準誤約 3.23；F 要用它的平方，3.823 不是本題 F 值。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '113-2s-40':{
   "summary": "三組共 8 筆資料，自由度是 3−1=2 與 8−3=5。依給定均方，F=241.67/77.33≈3.125，低於 F(2,5) 的 5% 右尾臨界值約 5.79，因此證據不足以判定三種方法平均有差異，選 A。題表處理平方和與均方略有不一致，按原始資料重算仍得相同結論。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）在 5% 水準未進入拒絕域，選「沒有顯著差異」。",
     "B": "（B）若要判為顯著，F 需超過約 5.79。",
     "C": "（C）題目已給定 α=0.05，可以直接做判斷。",
     "D": "（D）不必另外取得 p 值才能判斷；與臨界值比較就知道 p 大於 0.05。"
   },
   "sources": [
     {
       "title": "113 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=Q#page=4"
     },
     {
       "title": "113 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=509&code=113010&q=1&s=0505&t=S"
     }
   ]
 },
 '114-2s-1':{
   "summary": "獨立時 E(XY)=E(X)E(Y)，所以共變異數為 0。反方向不成立，例如 X 等機率取 −1、0、1，令 Y=X²，則 E(X)=E(XY)=0，但知道 X 就知道 Y。選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）在相關係數有定義時，共變異數為零便使相關係數為零。",
     "B": "（B）X 與 X² 可不相關卻相依，此句錯誤。",
     "C": "（C）獨立讓聯合機率分解，因此乘積的期望也可分解。",
     "D": "（D）將 E(XY)=E(X)E(Y) 代入共變異數公式即得零。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-2':{
   "summary": "名冊已有順序，按固定間隔 1,000 名往下取，是系統抽樣，選 C。正式設計通常先隨機選第一名的位置。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）分層是先按特徵分層，再從各層抽樣。",
     "B": "（B）集體抽樣會以自然群組為抽取單位。",
     "C": "（C）按名冊固定間隔取樣符合本法。",
     "D": "（D）立意抽樣按研究者判斷挑人，並非固定間隔。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-3':{
   "summary": "樣本平均是 300/50=6。離均差平方和為 2842−300²/50=1042。官方 D（4.7329, 7.2671）與用分母 50 估計變異數、再乘常態臨界值 1.96 所得的 (4.735,7.265) 接近。若依未知母體標準差的標準 t 作法，使用 s²=1042/49、t₀.₉₇₅,₄₉≈2.010，區間約為 (4.689,7.311)，四個選項中 D 最接近。",
   "options": {
     "A": "（A）中心是 6，但半寬 2.3782 遠大於按標準誤求得的約 1.31。",
     "B": "（B）半寬 1.9337 也大於本題標準誤約 0.652 乘上臨界值的結果。",
     "C": "（C）區間中心約 4.44，和本題樣本平均 6 不符。",
     "D": "（D）中心正確，也是最接近標準 t 區間的選項。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-4':{
   "summary": "固定樣本數及對立假設的參數值時，增加 α 會擴大拒絕域。當 H₁ 為真時變得更容易拒絕 H₀，漏掉效果的機率 β 因而下降，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）拒絕域變大時，H₁ 下落在不拒絕域的機率會減少。",
     "B": "（B）這正是固定樣本數下兩種錯誤的取捨。",
     "C": "（C）固定 α 時，樣本數增加通常使固定效果更易被看出，降低 β。",
     "D": "（D）增加樣本數提高辨別力，所以維持同一 β 時通常可以降低 α。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-5':{
   "summary": "總自由度 20 減誤差 18 得 c=2。處理平方和 a=28×2=56，誤差平方和 b=272−56=216，誤差均方 d=216/18=12。相加 56+216+2+12=286，選 A。",
   "options": {
     "A": "（A）四格分別為 56、216、2、12。",
     "B": "（B）293 會要求 c+d=21，表中數值給出的合計是 14。",
     "C": "（C）275 會要求 c+d=3，僅 d 就已經是 12。",
     "D": "（D）280 會要求 c+d=8，少算了部分自由度與均方。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-6':{
   "summary": "比較相對表現要用 z=(分數−全班平均)/標準差。數學 z=3/8=0.375，英文 z=4/12≈0.333，數學略高，選 A。",
   "options": {
     "A": "（A）數學高於平均 0.375 個標準差，比英文略多。",
     "B": "（B）英文多 4 分，但該科標準差也較大。",
     "C": "（C）數學為 0.375、英文約 0.333，兩個標準分數並不相同。",
     "D": "（D）有各科平均與標準差，就能比較標準化後的位置。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-7':{
   "summary": "機率密度須非負，曲線下總面積為 1，選 A。高度可以超過 1，例如均勻分配 U(0,0.5) 在區間內的密度為 2。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）機率來自密度積分，密度為負會破壞非負性。",
     "B": "（B）密度高度可超過 1，只要總面積是 1。",
     "C": "（C）連續分配的總機率用積分求和。",
     "D": "（D）這個範圍只給出平凡界限，任何實數都符合，無法區分密度可否為負。A 才是密度實際須滿足的限制。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-8':{
   "summary": "樣本瑕疵率為 10/100=0.10，標準誤 √(0.1×0.9/100)=0.03。95% 常態近似區間為 0.10±1.96×0.03=(0.0412, 0.1588)，選 C。抽樣比例僅 0.2%，有限母體修正影響很小。",
   "options": {
     "A": "（A）半寬 0.0789，相當於約 2.63 個標準誤。",
     "B": "（B）半寬 0.0675，相當於 2.25 個標準誤。",
     "C": "（C）半寬 0.0588，正是 1.96×0.03。",
     "D": "（D）兩端甚至沒有以本題樣本比例 0.10 為中心。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-9':{
   "summary": "H₁: μ<μ₀ 是左尾檢定，拒絕域在臨界值 A 左側。把左尾面積從 0.05 縮至 0.001，分界得向左，選 A。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）向左移會把左尾面積從 5% 縮到 0.1%，符合變更後的顯著水準。",
     "B": "（B）向右移會把更多統計量納入左尾拒絕域，使型 I 錯誤率上升。",
     "C": "（C）在相同連續分配下，臨界點固定就不會改變左尾面積。",
     "D": "（D）左尾方向已由 H₁ 決定，因此移動方向可判定。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-10':{
   "summary": "三組各五筆，共 15 筆。F=處理均方/誤差均方，分子自由度 3−1=2，分母自由度 15−3=12。H₀ 下為 F(2, 12)，選 D。",
   "options": {
     "A": "（A）把分子與分母自由度對調了。",
     "B": "（B）三組給的是 2 個組間自由度；14 是總自由度。",
     "C": "（C）14 不能當成處理均方自由度，3 也不是誤差自由度。",
     "D": "（D）依組間、組內順序填入 2、12。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=1"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-11':{
   "summary": "含截距的最小平方迴歸線通過 (X̄,Ȳ)。將 Ȳ=512 代入 512=0.72X̄+141.2，得 X̄=(512−141.2)/0.72=515，選 D。",
   "options": {
     "A": "（A）141.2 是截距，代表 X 為零時的預測值。",
     "B": "（B）0.72 是斜率，表示 X 每增加 1 單位，預測的 Y 增加 0.72。",
     "C": "（C）若 X̄=420，預測 Ȳ=443.6，和 512 不符。",
     "D": "（D）代回 0.72×515+141.2=512。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-12':{
   "summary": "前題的 Y 對 X 迴歸斜率 b₁=rSᵧ/Sₓ。整理得 r=0.72×100/98≈0.735，選 B。",
   "options": {
     "A": "（A）0.624 沒有滿足斜率與標準差的換算式。",
     "B": "（B）以斜率乘 Sₓ，再除以 Sᵧ，結果約 0.735。",
     "C": "（C）0.512 不符合換算公式，將 Y 平均 512 小數化也不能得到相關係數。",
     "D": "（D）若 r 是 0.887，斜率約為 0.869，與 0.72 不符。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-13':{
   "summary": "把 X 標準化為 Z=(X−μ)/σ。所求為 P(−3≤Z≤3)=Φ(3)−Φ(−3)≈0.99865−0.00135=0.9973，選 D。",
   "options": {
     "A": "（A）0.6827 約是正負 1 個標準差的比例。",
     "B": "（B）0.9534 接近正負 2 個標準差的比例。",
     "C": "（C）95% 的等尾區間約至正負 1.96 個標準差。",
     "D": "（D）正負 3 個標準差包含約 99.73% 的機率。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-14':{
   "summary": "區域為 0<x<1 且 x<y<1，是單位正方形對角線上方的三角形，面積 1/2。密度固定 k，故總機率 k×1/2=1，得 k=2，選 B。",
   "options": {
     "A": "（A）k=1 時積分只有 1/2。",
     "B": "（B）積分 ∫₀¹ k(1−x)dx=k/2，k=2 使積分等於 1。",
     "C": "（C）k=3 得 1.5，機率總和超過 1。",
     "D": "（D）k=4 得 2，超過應有的總機率。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-15':{
   "summary": "常態密度的二階導數為零的兩點在 μ±σ。這裡曲線由向下彎轉為向上彎；μ±3σ 常用來描述涵蓋範圍，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）密度曲線確實以 μ 對稱，呈鐘形。",
     "B": "（B）任何機率密度的總面積都等於 1。",
     "C": "（C）平均數、中位數與密度峰值都位於 μ。",
     "D": "（D）反曲點距平均數各 1 個標準差，所以此敘述錯誤。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-16':{
   "summary": "官方採 A。充分性要看在指定模型裡，給定統計量後，樣本的條件分配是否仍依賴未知參數，無法單憑樣本數判定。按一般統計定義，B、D 的無條件說法也有反例，題目缺少限定。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）樣本數本身無法判定充分性，是官方列出的錯誤選項。",
     "B": "（B）需保留原充分統計量的資訊。例如對充分統計量取常數通常就喪失充分性。",
     "C": "（C）若已有充分統計量，Rao–Blackwell 定理可將不偏估計量條件化；在通常的最小變異條件下，原 MVUE 與條件化結果幾乎處處相同。",
     "D": "（D）MLE 若是充分統計量的函數，仍須看轉換保留多少資訊；最大概似本身不保證充分。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-17':{
   "summary": "左尾拒絕界為 3−2.3263×0.3/√n。真均數為 2.9 時，令該界等於 2.9+0.8416×0.3/√n，就能讓右側的型 II 錯誤約為 0.2。因此 n≥[(2.3263+0.8416)×0.3/0.1]²≈90.32，向上取整 91，選 C。",
   "options": {
     "A": "（A）89 小於所需門檻 90.32，型 II 錯誤會稍大於 0.2。",
     "B": "（B）90 也小於門檻，樣本數不能四捨五入向下。",
     "C": "（C）91 是第一個達到兩個誤差要求的整數。",
     "D": "（D）92 也足夠，但比所需的最小樣本數多 1。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-18':{
   "summary": "無重複二因子表可把總平方和拆成 A、B 與殘差。各均方分別用各自平方和除以各自自由度，因分母不同，不能照原樣相加。錯的是 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）每格只有一筆時常用加法模型，交互作用不能與誤差分開估計。",
     "B": "（B）總平方和可依加法模型拆成三部分。",
     "C": "（C）均方各除以不同自由度，只有平方和可以直接相加。",
     "D": "（D）殘差自由度為 ab−1−(a−1)−(b−1)=ab−a−b+1。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-19':{
   "summary": "在傳統簡單線性迴歸中，誤差假設為獨立同分配、平均零、共同的未知變異數 σ²，正態性用於精確的 t 與 F 推論，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）把誤差變異數限制成 1，題目沒有此限制。",
     "B": "（B）誤差應以 0 為中心，且變異數未必是 1。",
     "C": "（C）N(0,σ²) 同時符合零均值、等變異與常態條件。",
     "D": "（D）若誤差平均為未知的非零常數，會與模型截距混在一起。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-20':{
   "summary": "絕對值至少 1.38 同時包含左尾 X≤−1.38 和右尾 X≥1.38。右尾為 1−0.9162=0.0838，對稱的左尾也是 0.0838，相加 0.1676，選 A。",
   "options": {
     "A": "（A）兩個尾端各 0.0838，相加正確。",
     "B": "（B）0.8324 是中間區間的機率。",
     "C": "（C）依已知累積機率求得一尾只有 0.0838，兩尾也不到 0.4543。",
     "D": "（D）只計入一個尾端，漏了另一邊。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-21':{
   "summary": "設 S 為得至少 30 分，W 為贏球。兩條贏球路徑的機率是 P(S∩W)=0.4×0.9=0.36、P(Sᶜ∩W)=0.6×0.3=0.18。已知贏球，只在這兩條路徑中比較，P(S∣W)=0.36/(0.36+0.18)=2/3，選 A。",
   "options": {
     "A": "（A）贏球機率為 0.54，其中 0.36 同時符合高得分。",
     "B": "（B）3/4 需要高得分贏球的機率是另一條路徑的三倍，實際為兩倍。",
     "C": "（C）兩條贏球路徑不等可能，0.36 比 0.18 大。",
     "D": "（D）0.8 等於 4/5，本題分子除以分母是 0.36/0.54。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-22':{
   "summary": "邊界假設 p=0.50，支持人數的期望為 1024×0.5=512，標準差為 √(1024×0.5×0.5)=16。右尾 5% 臨界點換回人數是 512+1.645×16≈538.32，常態近似的整數門檻約 539 人。選項中 540 最接近，選 A。",
   "options": {
     "A": "（A）540 和約 539 人的門檻只差 1 人。",
     "B": "（B）560 已高於所需門檻約 21 人。",
     "C": "（C）600 約超出平均 5.5 個標準差，遠超右尾 5% 的門檻。",
     "D": "（D）640 超出平均 8 個標準差，遠比題目要求的門檻高。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-23':{
   "summary": "依同速率且不重疊時段獨立的卜瓦松過程來理解，每分鐘平均 1 輛，兩分鐘的平均數是 2。兩分鐘零輛的機率為 e⁻²×2⁰/0!=e⁻²，選 B。若只知道單分鐘的邊際分配而未假設時段間獨立，無法推得兩分鐘的結果。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）e⁻¹ 是一分鐘零輛的機率。",
     "B": "（B）兩個獨立分鐘都沒車的機率為 e⁻¹×e⁻¹=e⁻²。",
     "C": "（C）不能把單分鐘零輛機率乘 2，因為題目要求兩分鐘都沒車。",
     "D": "（D）2e⁻² 是平均為 2 的卜瓦松分配恰有一輛的機率。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=2"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-24':{
   "summary": "等距三段各 10 公里。若速度是 v₁、v₂、v₃，總時間為 10/v₁+10/v₂+10/v₃，總平均速度為 30 除以這段時間，化簡就是調和平均，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）平均身高通常將每人身高相加再除以人數。",
     "B": "（B）路段距離相等，計算總時間會把速度取倒數相加。",
     "C": "（C）平均收入通常以總收入除以人數。",
     "D": "（D）同一期股票報酬做等權橫斷面平均時用算術平均；若是跨期複利則看幾何平均。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-25':{
   "summary": "每胎獨立且生男機率 p=1/2，等到第一次生男為止的總胎數 N 是從 1 起算的幾何分配。期望 E(N)=1/p=2，選 C。也可用遞迴 E(N)=1+(1/2)E(N)。",
   "options": {
     "A": "（A）只有第一胎生男才生一胎；其他家庭會多於一胎。",
     "B": "（B）1.5 只算首胎及可能的第二胎，漏掉連續生女而再生的家庭。",
     "C": "（C）幾何分配包含最後一胎男孩，平均總數是兩胎。",
     "D": "（D）要使幾何分配平均為 3，成功機率需為 1/3，題設為 1/2。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-26':{
   "summary": "第一四分位數 Q₁ 是累積面積達到各曲線總面積 25% 的薪資位置。在原卷圖示中，甲的低薪分布延伸較左，與題目預期的圖形解讀一致時，甲的 Q₁ 較小，所以選 A。全距讀左右端點；標準差和變異係數涉及整體分布，圖形只能提供定性比較。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）圖示支持甲的第一四分位數較小，故「甲較大」是要選的敘述。",
     "B": "（B）甲的曲線涵蓋薪資區間較寬，按圖示的左右端點解讀，甲全距較大。",
     "C": "（C）甲曲線的薪資分布較分散，題目以此作標準差較大的定性判斷。",
     "D": "（D）變異係數為標準差除以平均薪資；題目把甲較分散且中心薪資較低的圖形用來支持此敘述。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-27':{
   "summary": "把兩顆骰子分先後，共 36 組。已知點數不同，刪掉 6 組同點，剩 30 組。和為奇數需一奇一偶，共 3×3×2=18 組，這些都點數不同。因此 18/30=3/5，選 C。",
   "options": {
     "A": "（A）2/5 是已知點數不同時，和為偶數的補事件機率。",
     "B": "（B）1/2 是以全 36 組為分母的未條件化機率。",
     "C": "（C）18 組一奇一偶除以 30 組不同點。",
     "D": "（D）1/3 等於 30 組中只有 10 組符合，漏算了一奇一偶的組合。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-28':{
   "summary": "無母數法常能處理次序資料，也常無需指定母體常態。若有母數法的分配假設成立，有母數檢定往往更有檢定力，無母數法沒有推論效率較高的一般保證，故選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）許多入門無母數方法使用秩次或符號，計算概念簡單。",
     "B": "（B）類別、符號或順序資料也可用適合的無母數方法分析。",
     "C": "（C）推論效率視母體與方法而定，此項不是普遍優點。",
     "D": "（D）許多方法不需常態母體，仍可能需要獨立等其他條件。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-29':{
   "summary": "同一套方法的雙尾 5% 檢定與 95% 信賴區間對應。若 H₀ 為真，0 就是真參數；95% 信賴區間漏掉真值的機率至多 5%，選 D。\n\n官方計分選項為（D）。",
   "options": {
     "A": "（A）0 不在信賴區間時，對應的雙尾檢定應拒絕 H₀。",
     "B": "（B）上界大於 0 仍可能跨過 0，例如 (−1,2)。",
     "C": "（C）下界小於 0 也可能跨過 0，例如 (−2,1)。",
     "D": "（D）95% 涵蓋率讓漏掉真值的機率至多為 0.05。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-30':{
   "summary": "男性樣本比例 100/400=0.25，女性 260/800=0.325。H₀ 下合併比例為 360/1200=0.30；用女性減男性，Z=0.075/√[0.3×0.7×(1/800+1/400)]≈2.67，選 D。反向相減則是 −2.67，雙尾結論相同。",
   "options": {
     "A": "（A）1.67 接近採 5% 右尾檢定時的臨界值，本題問樣本算出的統計量。",
     "B": "（B）1.97 接近常用的雙尾 5% 臨界值，題目未要求臨界值。",
     "C": "（C）2.27 與比例差 0.075 除以合併標準誤約 0.0281 的結果不符。",
     "D": "（D）依兩個樣本數及合併比例求得統計量的絕對值約 2.67。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-31':{
   "summary": "Y=2X−1，因此 E(Y)=2a−1=9，得 a=5。常數 −1 只移動位置，Var(Y)=2²Var(X)=4×1=4，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）a=4 會使 E(Y)=7，且變異數也應為 4。",
     "B": "（B）b=4 正確，但 a 應由 2a−1=9 解為 5。",
     "C": "（C）乘 2 讓變異數乘 4，常數平移不影響變異數。",
     "D": "（D）a=5 正確，變異數不受減 1 影響，b 等於 4。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-32':{
   "summary": "指數分配的平均為 1/λ=2 年，故 λ=1/2 每年。壽命超過一年是右尾機率 P(X>1)=e⁻¹ᐟ²≈0.6065，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）e⁻² 會把平均 2 誤當成速率 2。",
     "B": "（B）速率乘時間是 (1/2)×1，因此指數為 −1/2。",
     "C": "（C）1−e⁻² 把速率設錯，也是在算左尾。",
     "D": "（D）1−e⁻¹ᐟ² 是一年內失效的機率。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-33':{
   "summary": "檢驗滿意度是否改善應用右尾單樣本 t，統計量 t=(84−77)/(28/√n)=√n/4。n=64 得 t=2，未達 1% 右尾臨界值約 2.39；n=50 得 t≈1.768，超過 5% 右尾臨界值約 1.677。只有 B 正確。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）t=2 大於零，但 1% 門檻約 2.39，故不顯著。",
     "B": "（B）t≈1.768 超過自由度 49 的右尾 5% 界約 1.677。",
     "C": "（C）兩者沒有同時成立。A 的 t 值 2 未達 1% 的右尾臨界值。",
     "D": "（D）B 成立，因此並非兩個都錯。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=3"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-34':{
   "summary": "Y=X²−1，已知 E(Y)=9，所以 E(X²)=10。變異數 Var(X)=E(X²)−[E(X)]²=10−1²=9，選 D。給的 Var(Y)=7 描述平方後變數的波動，這個計算不需使用。",
   "options": {
     "A": "（A）6 是把 Var(Y)=7 減 1，平方轉換無法這樣反推。",
     "B": "（B）7 是 Y 的變異數，題目問的是 X。",
     "C": "（C）8 會把期望關係誤算為 E(X²)=9。",
     "D": "（D）先加回 Y 式的 1 得二階動差 10，再扣平均的平方 1。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-35':{
   "summary": "在常態母體假設下，檢定 H₀:σ≤4，以邊界 σ₀²=16 做右尾卡方檢定。統計量為 (64−1)×20/16=78.75，自由度 63 的右尾 5% 臨界值約 82.53，故不拒絕，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）檢定統計量是 78.75；樣本平均 26.9 不用於這項變異數檢定。",
     "B": "（B）78.75 未進入右尾拒絕域，證據不足以判定標準差大於 4。",
     "C": "（C）樣本變異數的檢定用 n−1=63 個自由度。",
     "D": "（D）t 分配常用於平均數的推論，本題檢定變異數。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-36':{
   "summary": "盒狀圖的盒子兩端是 Q₁ 和 Q₃，橫向寬度就是 Q₃−Q₁。原卷的甲盒比乙盒長，因此甲的四分位距較大，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）一般盒狀圖沒有樣本數，箱子寬度表示四分位距。",
     "B": "（B）盒內的線通常是中位數，圖中沒有另外標示平均數。",
     "C": "（C）比較兩個盒子的長度即可看出甲的四分位距較大。",
     "D": "（D）變異數需用每筆觀測值與平均的距離，只憑兩個盒子的寬度無法比較。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-37':{
   "summary": "原圖顯示右側尾端較長，依盒狀圖的常見判讀屬右偏，官方選 A。盒子的兩端相差約 20。偏度符號與平均數的位置在教材中常按右偏分布的典型樣貌推估；要精確確認則需要原始資料。\n\n官方計分選項為（A）。",
   "options": {
     "A": "（A）圖示右尾較長，左偏會是左尾較長，因此這是官方判錯項。",
     "B": "（B）典型右偏分布偏度為正，但盒狀圖本身不提供可直接計算偏度的資料。",
     "C": "（C）讀出 Q₃ 與 Q₁ 後相減，約為 20，鬚端不算入盒長。",
     "D": "（D）右偏資料的高值常把平均數拉到中位數右側，屬本題預期的定性判讀。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-38':{
   "summary": "所有機率相加必須為 1。0.2+0.1(k+1)+0.3(k−1)+0.2=0.2+0.4k，所以 k=(1−0.2)/0.4=2，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）代 k=1，機率總和只有 0.6。",
     "B": "（B）代 k=2，機率依序為 0.2、0.3、0.3、0.2，總和為 1。",
     "C": "（C）代 k=3，總和為 1.4。",
     "D": "（D）代 k=4，總和為 1.8，超過 1。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-39':{
   "summary": "前題機率依序為 0.2、0.3、0.3、0.2。E(X)=0×0.2+1×0.3+2×0.3+3×0.2=1.5。E(X²)=0.3+1.2+1.8=3.3，故 Var(X)=3.3−1.5²=1.05，選 C。\n\n官方計分選項為（C）。",
   "options": {
     "A": "（A）X≤2 要加 0、1、2 三格，總和 0.8。",
     "B": "（B）X>1 要加 2、3 兩格，得到 0.5。",
     "C": "（C）將各可能值乘上相對機率後加總得到 1.5。",
     "D": "（D）變異數為 1.05，略大於 1。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '114-2s-40':{
   "summary": "二項分配平均 np=7，變異數 np(1−p)=6。把變異數除以平均得 1−p=6/7，故 p=1/7，再由 n=7/p=49，選 B。\n\n官方計分選項為（B）。",
   "options": {
     "A": "（A）n=30、p=1/2 會給平均 15。",
     "B": "（B）49×(1/7)=7，且 7×(6/7)=6，兩式都吻合。",
     "C": "（C）36×(1/6)=6，和平均 7 不符。",
     "D": "（D）6/7 是單次失敗機率 1−p，拿來當成功機率會使平均過大。"
   },
   "sources": [
     {
       "title": "114 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=Q#page=4"
     },
     {
       "title": "114 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?c=512&code=114010&q=1&s=0605&t=S"
     }
   ]
 },
 '115-2s-2':{
   "summary": "抽到女性已是已知條件，所以分母只算女性。女性占 0.07 + 0.28 + 0.10 = 0.45；女性且滿意占 0.07。條件機率為 0.07 ÷ 0.45 ≈ 0.1556，選 D（0.16）。",
   "options": {
     "A": "（A）0.41。0.41 高於女性中的滿意比例 7/45。",
     "B": "（B）0.07。0.07 是全體中同時為女性且滿意的比例，還要除以女性比例。",
     "C": "（C）0.36。0.36 與女性中滿意的 7/45 不符。將女性且滿意的 0.07 除以女性總比例 0.45，才得到題目指定的條件機率。",
     "D": "（D）0.16。每 100 人約有 45 位女性，其中 7 位滿意，故 7/45 ≈ 0.16。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-4':{
   "summary": "先估計中獎張數。A 店 450 × 6% = 27 張，B 店 550 × 4% = 22 張。既然已知中獎，分母取全部 49 張中獎票，所以是 27/49 ≈ 0.551，選 D。",
   "options": {
     "A": "（A）0.251。0.251 與以全部 49 張中獎票為分母的 27/49 不符。",
     "B": "（B）0.749。0.749 與 27/49 不符，A 店的中獎票只比 B 店多 5 張，不會接近四分之三。",
     "C": "（C）0.449。22/49 ≈ 0.449 是中獎票來自 B 店的機率。",
     "D": "（D）0.551。27/(27+22) ≈ 0.551，正是中獎後回推來自 A 店的機率。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-5':{
   "summary": "兩組各有 10 筆，總和都是 320，故平均都是 32。大眾運輸離均差平方和為 194，汽機車為 30。樣本標準差用 n−1 = 9 當分母，分別是 √(194/9) ≈ 4.64 和 √(30/9) ≈ 1.83，選 C。\n\n官方計分選項為（C）(32, 4.64);(32, 1.83)。",
   "options": {
     "A": "（A）(30, 4.42);(30, 1.61)。兩組平均都應是 320/10 = 32。",
     "B": "（B）(30, 4.53);(30, 1.72)。平均 30 已與兩組總和不符，且所列標準差也不等於用 9 當分母的結果。",
     "C": "（C）(32, 4.64);(32, 1.83)。平均都是 32，樣本標準差分別為 4.64 與 1.83。",
     "D": "（D）(32, 4.75);(32, 1.95)。平均 32 正確，但 4.75 和 1.95 都大於以平方和除以 9 後開根號的結果。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-6':{
   "summary": "變異係數是標準差除以平均數。依前題，大眾運輸約 4.64/32 = 14.5%，汽機車約 1.83/32 = 5.7%。按題意以相對耗時越穩定越有利，選 B。這項數據只能比較耗時的相對波動。",
   "options": {
     "A": "（A）大眾運輸。大眾運輸的相對波動為 14.5%，比汽機車大。",
     "B": "（B）汽機車。汽機車的變異係數約 5.7%，兩組之中較低。",
     "C": "（C）天氣好時為大眾運輸。題目沒有依晴天分組，無法求晴天的大眾運輸變異係數。",
     "D": "（D）天氣不好時為汽機車。樣本沒有依天氣分組，無法把汽機車的整體優勢限於天氣不好時。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-7':{
   "summary": "酒齡平均 29.6 年，價格平均 210.2 元。從表中五組配對值計得離均差乘積和 898.4，酒齡與價格的離均差平方和分別為 141.2、5964.8。Pearson r = 898.4/√(141.2×5964.8) ≈ 0.979，表示強正向線性關係，選 C。\n\n官方計分選項為（C）0.979;正向關係。",
   "options": {
     "A": "（A）-179.68;負向關係。−179.68 超出相關係數可取的 −1 到 1，且離均差乘積和為正。",
     "B": "（B）179.68;正向關係。179.68 = 898.4/5，是以 5 為分母的共變異量，還未標準化成相關係數。",
     "C": "（C）0.979;正向關係。以兩組離均差平方和的幾何平均數標準化，得到正的 0.979。",
     "D": "（D）-0.979;無關係。−0.979 會代表強負相關，本題算出的符號為正。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-8':{
   "summary": "依教科書常用的單峰左偏排序，平均數應小於中位數，中位數再小於眾數。官方選 B，數值 −2.6 < −2.4 < 0，且甲的中位數、乙的平均數各採一項。不過 A 也符合 −1.9 < −1.3 < 0，且同樣是甲、乙各錯一項。照題目所給條件與這項排序，無法唯一排除 A，網站依官方答案計分。\n\n官方計分選項為（B）眾數=0,中位數= −2.4,平均數= −2.6。",
   "options": {
     "A": "（A）眾數=0,中位數= −1.3,平均數= −1.9。−1.9 < −1.3 < 0，取甲的平均數、乙的中位數，也符合題目敘述。",
     "B": "（B）眾數=0,中位數= −2.4,平均數= −2.6。−2.6 < −2.4 < 0，取乙的平均數、甲的中位數，符合題意且為官方答案。",
     "C": "（C）眾數=0,中位數= −1.3,平均數= −2.6。平均數和中位數都取自乙，加上共同的眾數後，乙會三項全對。",
     "D": "（D）眾數=0,中位數= −2.6,平均數= −1.3。−2.6 是乙填的平均數，不是任何人填的中位數；平均數也會大於中位數。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-9':{
   "summary": "以樣本標準差除以樣本平均。x 平均 47/6 ≈ 7.833、樣本標準差約 4.446；y 平均 269/6 ≈ 44.833、樣本標準差約 8.060。兩者變異係數約 56.76%、17.98%，依 x、y 順序選 A。\n\n官方計分選項為（A）(57%, 18%)。",
   "options": {
     "A": "（A）(57%, 18%)。以 4.446/7.833 與 8.060/44.833 換算百分比，依序得 x 約 57%、y 約 18%。",
     "B": "（B）(18%, 57%)。把 57% 和 18% 的 x、y 順序對調了。",
     "C": "（C）(52%, 18%)。x 的 52% 來自以 n 而非 n−1 算標準差；按樣本標準差計得約 57%。",
     "D": "（D）(18%, 52%)。第一個數字應是 x 的 57%，第二個才是 y 的 18%。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-10':{
   "summary": "「至少一個有瑕疵」的反面是四個都良好。47 個良品中不放回抽四個的機率為 (47/50)(46/49)(45/48)(44/47) ≈ 0.7745。要求的機率為 1−0.7745 ≈ 0.2255，選最接近的 A（0.23）。",
   "options": {
     "A": "（A）0.23。0.23 是 0.2255 四捨五入後的結果。",
     "B": "（B）0.32。0.32 高於補事件計算的 0.2255。",
     "C": "（C）0.37。四次抽取各輪抽中瑕疵的邊際機率都是 3/50，至少一次也不會大於四者加總 0.24。",
     "D": "（D）0.39。0.39 超過四輪瑕疵機率相加所給的 0.24 上界。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-11':{
   "summary": "不計順序有 C(5,2)=10 組等可能結果。以 (1,9)、(3,7) 平均等於 5，其餘各有四組大於、四組小於 5。樣本平均會隨抽到的組合改變；兩次抽取各自的期望值都是母體平均 5，故樣本平均的期望也是 5，選 D。\n\n官方計分選項為（D）是一個隨機變數,其期望值是 5。",
   "options": {
     "A": "（A）一定是 5。抽到 1 和 3 時平均是 2，足以排除「一定是 5」。",
     "B": "（B）有超過一半的機率是 5。能得到 5 的只有兩組，機率為 2/10。",
     "C": "（C）有超過一半的機率會大於 5。大於 5 的有 (3,9)、(5,7)、(5,9)、(7,9)，機率為 4/10。",
     "D": "（D）是一個隨機變數,其期望值是 5。樣本平均是隨機變數，線性期望給出 (5+5)/2 = 5。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-12':{
   "summary": "以 T 表示下一位顧客的等待時間。指數分配平均為 4 分鐘，所以每分鐘到達率 λ = 1/4。兩分鐘內沒人抵達即 T>2，P(T>2)=exp(−2/4)≈0.607，選 C。",
   "options": {
     "A": "（A）0.135。0.135 約為 exp(−2)，等同把兩分鐘誤當成兩個平均間隔。",
     "B": "（B）0.523。0.523 與以 λt = (1/4)×2 = 0.5 求出的右尾機率不符。",
     "C": "（C）0.607。exp(−0.5)≈0.607，是等待時間超過兩分鐘的機率。",
     "D": "（D）0.393。0.393 約是 1−exp(−0.5)，對應兩分鐘內有抵達的機率。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-13':{
   "summary": "原卷寫 P(X=x)=ax，x=1、2、3。由 a+2a+3a=1 得 a=1/6。依期望值公式，E(X)=1×(1/6)+2×(2/6)+3×(3/6) = 14/6 = 7/3。四個選項沒有精確結果；官方列 A（2），網站依官方答案計分。",
   "options": {
     "A": "（A）2。2 是三個值以相同權重計算的平均，也是最接近 7/3 的選項，但題幹未要求取最接近的整數。",
     "B": "（B）4。X 最大只有 3，期望值不可能是 4。",
     "C": "（C）1/2。1/2 是 X=3 的機率，並非 X 各值的加權平均。",
     "D": "（D）1。X 雖然最小是 1，仍有正機率取 2 和 3，因此期望值大於 1。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-14':{
   "summary": "設壽命 X 平均 4 年，標準差為 σ。保證期內退貨表示 P(X≤2)=0.006。查標準常態表，左尾 0.006 約對應 z=−2.51。由 (2−4)/σ≈−2.51 得 σ≈0.797 年，故變異數 σ²≈0.635 年²，選 B。",
   "options": {
     "A": "（A）0.797。0.797 約是標準差，求變異數還要平方。",
     "B": "（B）0.635。(2/2.51)²≈0.635，與題目的左尾機率相符。",
     "C": "（C）0.876。若變異數為 0.876，z 約為 −2.14，左尾約 0.016，較 0.006 大。",
     "D": "（D）0.905。若變異數為 0.905，z 約為 −2.10，左尾約 0.018，較 0.006 大。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-15':{
   "summary": "每個航班是一個群集。研究者先隨機抽 5 個航班，再訪問被抽中航班的全體乘客，符合一階段集群抽樣，選 B。",
   "options": {
     "A": "（A）分層抽樣。分層抽樣會在各層分別抽取個體；這題有些航班完全未被抽中。",
     "B": "（B）集群抽樣。被隨機抽中的航班整群納入，符合一階段集群抽樣。",
     "C": "（C）系統抽樣。系統抽樣會從排序清單中按固定間隔取樣，題目沒有這種操作。",
     "D": "（D）方便抽樣。方便抽樣靠接觸便利性選人，這題以隨機方式抽航班。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-16':{
   "summary": "藥物組和糖錠組各 80 人。藥物組治癒比例 60/80=0.75，糖錠組 30/80=0.375。以藥物組減糖錠組，差 0.375，即 37.5 個百分點，選 B。",
   "options": {
     "A": "（A）0.25。0.25 是藥物組未治癒比例 20/80。",
     "B": "（B）0.375。60/80−30/80=30/80=0.375。",
     "C": "（C）0.45。差值的分子是 30，組別分母都是 80，結果比 0.45 小。",
     "D": "（D）0.50。糖錠組治癒人數是藥物組的一半，但治癒率之差要做減法，得到 0.375。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-17':{
   "summary": "樣本支持率為 80/100=0.80。標準誤 √[0.8×0.2/100]=0.04，95% 常態臨界值 1.96。區間為 0.80±1.96×0.04，即 (0.7216,0.8784)，選 A。\n\n官方計分選項為（A）0.72 至 0.88。",
   "options": {
     "A": "（A）0.72 至 0.88。兩端四捨五入後為 0.72 與 0.88。",
     "B": "（B）0.76 至 0.84。0.76 到 0.84 只有正負一個標準誤，95% 要用約 1.96 個。",
     "C": "（C）0.78 至 0.90。此區間中點是 0.84，常用近似區間應以樣本比例 0.80 為中心。",
     "D": "（D）0.83 至 0.88。下界 0.83 比樣本估計 0.80 還高，和本題對稱區間的算法不符。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-18':{
   "summary": "兩次皆從同一母體做不放回隨機抽樣，兩個樣本平均的期望值都是母體平均 μ。若母體大小為 N，標準誤為 σ√[(N−n)/(n(N−1))]，n 越大越小，故 100 人樣本較穩定，選 B。\n\n官方計分選項為（B）兩者期望值相同,但標準誤不同。",
   "options": {
     "A": "（A）兩者期望值相同,標準誤也相同。抽樣方式相同可讓兩者估計同一個 μ，但樣本數不同會改變波動。",
     "B": "（B）兩者期望值相同,但標準誤不同。兩者中心都是 μ，100 個樣本的標準誤較小。",
     "C": "（C）兩者期望值不同,標準誤也不同。樣本數改變標準誤，兩者仍來自相同母體，因此期望值相同。",
     "D": "（D）兩者期望值不同,但標準誤相同。兩個期望值相同，標準誤則受 n 與有限母體修正影響。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 2 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=2"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-19':{
   "summary": "以常態母體的卡方區間估計標準差。六筆資料平均 140.5，離均差平方和 639.5，自由度 5。卡方分布的 2.5% 與 97.5% 分位數約為 0.831 和 12.833。變異數區間約為 (639.5/12.833,639.5/0.831)=(49.83,769.56)，各端開根號後約為 (7.06,27.74)，選 C。\n\n官方計分選項為（C）7.06~27.74。",
   "options": {
     "A": "（A）121.01~852.1。兩端都大幅超出以毫米表示的標準差區間。",
     "B": "（B）49.83~769.36。數量級接近變異數區間，單位是平方毫米，還要分別開根號。",
     "C": "（C）7.06~27.74。兩端各開根號，得到約 7.06 與 27.74 毫米。",
     "D": "（D）12.9~30.0。按卡方分位數計算，下界約為 7.06，無法得到 12.9。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-20':{
   "summary": "每人抽一次且放回，抽中紅球的機率每次都是 4/10=0.4。發兩萬元的份數 X 服從 B(10,0.4)，期望值 np=10×0.4=4，選 B。",
   "options": {
     "A": "（A）3。3 份相當於把每次抽中紅球的機率當成 0.3。",
     "B": "（B）4。十次各有 0.4 的紅球機率，平均發出 4 份。",
     "C": "（C）5。5 份相當於每次紅白機率各半，盒中球數與此不符。",
     "D": "（D）6。6 份是白球所對應的一萬五千元獎金的期望份數。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-21':{
   "summary": "問題問成效是否提升，做右尾 Z 檢定。虛無假設邊界的平均為 30，母體標準差已知為 4。Z=(32−30)/(4/√10)≈1.58，右尾 P(Z≥1.58)≈0.057，選 A。",
   "options": {
     "A": "（A）0.057。查 z=1.58 的標準常態右尾，得到約 0.057。",
     "B": "（B）0.134。0.134 大於 z=1.58 的右尾面積，與樣本平均的標準化結果不符。",
     "C": "（C）0.113。0.113 約為 2×0.057，接近雙尾 p 值，題目只問增加。",
     "D": "（D）0.159。0.159 接近 z=1 的右尾，但本題統計量約是 1.58。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-22':{
   "summary": "依題面是已知 σ 的雙尾 Z 檢定。α=0.05 的臨界值為 1.96。真平均 30 時，以主要的上側界計算型 II 錯誤，令 1.96−(30−28)√n/6≈−1.036，得到 n≈80.8，向上取整為 81。把兩側都代入計算也得到最小 81。官方標準答案為 C（162），網站沿用官方計分；題目未提供讓樣本數加倍的設計條件。",
   "options": {
     "A": "（A）259。259 可把型 II 錯誤壓得更低，但遠大於所需最小樣本數。",
     "B": "（B）324。324 同樣高於所需最小樣本數。",
     "C": "（C）162。162 是官方答案，約為公式所得最小整數 81 的兩倍，題面只設定一個母體平均數檢定。",
     "D": "（D）97。97 足以達到 β≤0.15，且是選項中最小的可行數，但精確最小值為 81。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-23':{
   "summary": "傳統單因子 ANOVA 以獨立抽樣、各組常態、同變異數為基本條件，並比較至少兩組。各母體平均相同是虛無假設要檢驗的主張，選 A。\n\n官方計分選項為（A）母體須有相同的平均數。",
   "options": {
     "A": "（A）母體須有相同的平均數。正確選項。等平均是檢定的 H₀，檢定本來就允許不同組有不同平均。",
     "B": "（B）須考慮至少 2 個母體。不選。ANOVA 比較多組平均，至少得有兩組可比較。",
     "C": "（C）每一個母體隨機變數的變異數必須相等。不選。傳統等變異數 F 檢定要求各組母體變異數相同。",
     "D": "（D）每一個我們所感興趣母體的隨機變數須服從常態分配。不選。傳統小樣本 F 檢定的模型假定各組誤差為常態。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-24':{
   "summary": "95% 雙尾信賴區間的下界 28 已高於 27。對應到同一估計方法的單尾檢定，97.5% 單側下界為 28；在常用的 5% 顯著水準也足以拒絕 μ≤27，支持 μ>27，選 A。\n\n官方計分選項為（A）拒絕 H0 而支持 H1。",
   "options": {
     "A": "（A）拒絕 H0 而支持 H1。整個區間都高於 27，足以支持朝右尾方向拒絕 H₀。",
     "B": "（B）不拒絕 H0。按虛無假設的檢定流程，本題有足夠證據拒絕 H₀。",
     "C": "（C）不拒絕 H0 也不拒絕 H1。同時談不拒絕 H₀ 與 H₁，且忽略了區間下界大於 27 的訊息。",
     "D": "（D）我們無法從資訊中做出判斷。區間的全部範圍都落在 μ>27，足以做出方向判斷。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 3 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=3"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-27':{
   "summary": "依表內各列計算，a=250×20=5000，b=2000/4=500，e=6000/1200=5，c=500/250=2，d=2000+6000+5000=13000，選 A。總自由度按各來源應為 4+5+20=29，表列 229 與各列不一致。\n\n官方計分選項為（A）a, b, e 分別約為 5000, 500, 5。",
   "options": {
     "A": "（A）a, b, e 分別約為 5000, 500, 5。a、b、e 分別由誤差均方、處理平方和、區集均方得出 5000、500、5。",
     "B": "（B）a, b, e 分別約為 8000, 500, 5。誤差平方和按 20×250 得 5000。",
     "C": "（C）b, c, d 分別約為 500, 3, 9000。F 值是 2，總平方和是 13000，與 3 和 9000 不符。",
     "D": "（D）a, c, d 分別約為 5000, 1.8, 13000。a 與 d 正確，但 c=500/250=2，無法得到 1.8。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-28':{
   "summary": "a×b 個因子組合共有 ab−1 個處理自由度。扣除 A 主效果 a−1 與 B 主效果 b−1，得到交互作用自由度 ab−1−(a−1)−(b−1)=(a−1)(b−1)，選 A。\n\n官方計分選項為（A）(a – 1)(b – 1)。",
   "options": {
     "A": "（A）(a – 1)(b – 1)。兩個因子各自的獨立對比數相乘，得到 (a−1)(b−1)。",
     "B": "（B）(a – 1)(r – 1)(r – 1)。重複次數 r 影響組內誤差自由度，交互作用以兩因子水準數 a、b 決定。",
     "C": "（C）Abr – 1。abr−1 是 abr 筆觀察值的總自由度。",
     "D": "（D）n – ab + r。以 n=abr 代入，組內誤差自由度是 n−ab；另加 r 也無法得到交互作用自由度。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-29':{
   "summary": "x 平均 3，y 平均 4.4。由五筆資料計算 Σ(x−3)(y−4.4)=13，Σ(x−3)²=10。最小平方法的斜率 β̂₁=13/10=1.3，選 D。",
   "options": {
     "A": "（A）2.5。固定分母為 10，斜率 2.5 需要離均差乘積和 25；資料算出的是 13。",
     "B": "（B）3.8。3.8 需要乘積和 38，與五組配對資料不符。",
     "C": "（C）5.1。5.1 需要乘積和 51，與實際分子 13 不符。",
     "D": "（D）1.3。代入斜率公式得 13/10=1.3，意即每多刊登一次，預測月銷售額增加 1.3 百萬。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-30':{
   "summary": "斜率為 5，表示 X 增加 1 元，預測 Y 增加 5 個單位。Y 的一個單位是 1,000 元，故預測銷售增加 5,000 元，選 D。\n\n官方計分選項為（D）增加$1 的廣告會增加$5,000 的銷售。",
   "options": {
     "A": "（A）增加$4 的廣告會增加$5,000 的銷售。增加 4 元時，預測變化為 5×4×1,000=20,000 元。",
     "B": "（B）增加$1 的廣告會增加$5 的銷售。5 是以千元為單位的變化，換算後是 5,000 元。",
     "C": "（C）增加$1 的廣告會增加$2,500 的銷售。2,500 元只有正確預測增量的一半。",
     "D": "（D）增加$1 的廣告會增加$5,000 的銷售。1 元廣告增加 5 個 Y 單位，也就是 5,000 元銷售。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-31':{
   "summary": "有截距的最小平方法迴歸中，總平方和 SST=SSR+SSE=600+200=800。決定係數 R²=SSR/SST=600/800=75%，選 C。",
   "options": {
     "A": "（A）25%。25%=200/800，是殘差平方和占比。",
     "B": "（B）50%。50% 需要解釋平方和與殘差平方和相等，本題是 600 對 200。",
     "C": "（C）75%。75%=600/(600+200)，代表模型解釋的樣本變異占比。",
     "D": "（D）95%。仍有四分之一的變異留在殘差中，因此解釋比例達不到 95%。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-32':{
   "summary": "取迴歸表的「係數」欄。截距列 12.88 是常數，X 列 −0.38 是乘在 x 上的斜率，得到 ŷ=12.88−0.38x，選 B。\n\n官方計分選項為（B）ŷ =12.88 -0.38x。",
   "options": {
     "A": "（A）ŷ = 12.88x - 0.38。把截距 12.88 與斜率 −0.38 的角色對調。",
     "B": "（B）ŷ =12.88 -0.38x。常數、斜率分別是 12.88、−0.38。",
     "C": "（C）ŷ = 10.13x - 4.84。10.13 與 −4.84 都是 t 統計值，不能放進預測公式。",
     "D": "（D）ŷ = 10.13 - 4.84x。位置形式雖正確，數字卻讀自 t 統計值欄。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-33':{
   "summary": "題目要找錯誤敘述。官方選 C，因為截距是否顯著只涉及 x=0 時的模型基準，無法據此判定預測效果。R²=0.8241 是樣本內解釋比例，斜率顯著是線性關聯的證據。嚴格說，兩者都不能單獨保證新個案的預測準確度。\n\n官方計分選項為（C）p–值趨於 0,否決 H0:截距係數 = 0,所以估計模式在資料 X 範圍內,預測效果好。",
   "options": {
     "A": "（A）判定係數 R2 = 0.8241 大於 0.7,表示迴歸平方和夠大,占總變異八成多,所以估計模式在資料 X 範 圍內,預測效果好。R² 的確表示模型解釋樣本變異的 82.41%。0.7 作為好壞門檻並非通用；仍需看預測誤差。",
     "B": "（B）p–值均趨於 0,否決 H0:截距係數 = 0 及 H0:斜率係數 = 0,所以估計模式在資料 X 範圍內,預 測效果好。兩個係數均顯著，但其中能支持線性關係的是斜率。顯著結果本身不足以驗證預測準確度。",
     "C": "（C）p–值趨於 0,否決 H0:截距係數 = 0,所以估計模式在資料 X 範圍內,預測效果好。只靠截距顯著來主張模型預測良好，缺少對斜率與預測誤差的證據，因此是官方選項。",
     "D": "（D）p–值趨於 0,否決 H0:斜率係數 = 0,所以估計模式在資料 X 範圍內,預測效果好。斜率顯著支持 x 和 y 有線性關係；要判斷實際預測表現還要檢查殘差或驗證資料。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 4 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=4"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-34':{
   "summary": "x 平均為 3.2，Σ(x−3.2)²=0.74。斜率估計的標準誤為 √(3.17/0.74)≈2.07。比較斜率估計 10.95 和虛無假設的 0，t=(10.95−0)/2.07≈5.29，自由度 6−2=4，選 C。\n\n官方計分選項為（C）t = 5.29。",
   "options": {
     "A": "（A）t =0.697。0.697 與 10.95 除以斜率標準誤 2.07 的結果不符。",
     "B": "（B）t = -0.697。斜率為正且標準誤為正，t 不會是負值。",
     "C": "（C）t = 5.29。樣本斜率 10.95 除以標準誤約 2.07，得到 5.29。",
     "D": "（D）t = 3.43。3.43 與所需斜率標準誤不符。分母須先用 MSE 除以 x 的離均差平方和，再開根號。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-35':{
   "summary": "同一群人按性別和投票立場分類，問題是兩個類別變數在這群人中是否相關，因此用卡方獨立性檢定，選 C。",
   "options": {
     "A": "（A）卡方同質性檢定。同質性檢定常對分別獨立抽取的群體比較類別比例；本題把同一群人按兩個變數交叉分類。",
     "B": "（B）卡方配合適合度檢定。適合度檢定比較一個類別變數的觀察分布和指定比例，本題是兩個變數。",
     "C": "（C）卡方獨立性檢定。檢驗性別與投票立場是否獨立，適用列聯表卡方獨立性檢定。",
     "D": "（D）變方分析。變異數分析用來比較數值反應的組別平均數；這裡是類別次數。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-36':{
   "summary": "獨立假設下，每格期望次數是列總數×欄總數/500。女性用 300/500 分別乘 330、100、70，得 198、60、42；男性用 200/500 乘同樣欄總數，得 132、40、28，選 C。\n\n官方計分選項為（C）(198, 60, 42, 132, 40, 28)。",
   "options": {
     "A": "（A）(198, 55, 40, 130, 40, 28)。女性未定應為 60，女性反對為 42，男性支持為 132。",
     "B": "（B）(198, 60, 40, 130, 40, 28)。第三格應為 300×70/500=42，第四格應為 200×330/500=132。",
     "C": "（C）(198, 60, 42, 132, 40, 28)。六個數值依女性三格、男性三格的順序排列均正確。",
     "D": "（D）(198, 55, 42, 132, 40, 28)。女性未定是 300×100/500=60，55 會使女性列加總和 300 不一致。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-37':{
   "summary": "用六格的 (觀察−期望)²/期望相加：(180−198)²/198+(80−60)²/60+(40−42)²/42+(150−132)²/132+(20−40)²/40+(30−28)²/28≈20.996。自由度 (2−1)(3−1)=2，右尾 p 約 0.000028，表列 0 是四捨五入。在常用 5% 顯著水準拒絕獨立，選 D。\n\n官方計分選項為（D）(20.996, 0, 否決虛無假設:性別與投票獨立)。",
   "options": {
     "A": "（A）(13.996, 0, 無法否決虛無假設:性別與投票相依)。13.996 與六格加總不符，且虛無假設應為獨立。",
     "B": "（B）(14.996, 0, 無法否決虛無假設:性別與投票獨立)。14.996 與計算不符，這麼小的 p 值也支持拒絕獨立。",
     "C": "（C）(16.996, 0, 否決虛無假設:性別與投票相依)。虛無假設應是獨立，統計量也不是 16.996。",
     "D": "（D）(20.996, 0, 否決虛無假設:性別與投票獨立)。統計量約 20.996，p 值很小，拒絕性別與投票立場獨立的假設。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-38':{
   "summary": "將八筆分數由小到大排列：65、68、77、79、81、85、90、100。筆數為偶數，取排序後第 4 與第 5 筆的平均，得 (79+81)/2=80，選 A。",
   "options": {
     "A": "（A）80。80 是排序後中間兩個數 79 與 81 的平均。",
     "B": "（B）77。77 是排序後第 3 筆，比中間兩個位置都早。",
     "C": "（C）82。82 不是第 4、5 筆 79、81 的平均。",
     "D": "（D）85。85 是排序後第 6 筆，不在中間兩個位置。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-39':{
   "summary": "咖啡、茶、冷飲和其他是 4 欄，年齡層是 2 列。卡方獨立性檢定的自由度為 (2−1)(4−1)=3。顯著水準 0.05 查自由度 3 的右尾，臨界值為 7.815，選 B。",
   "options": {
     "A": "（A）6.251。6.251 約是自由度 3 的右尾 0.10 臨界值。",
     "B": "（B）7.815。自由度 3，在右側保留 5% 面積的位置是 7.815。",
     "C": "（C）12.592。12.592 約是自由度 6 的右尾 0.05 臨界值，自由度不能把列與欄的類別數直接相加。",
     "D": "（D）14.449。14.449 在自由度 3 的分布上會留下遠小於 5% 的右尾面積。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '115-2s-40':{
   "summary": "虛無假設為年級組成維持上學年的比例，新生仍占 30%。以本學年抽樣總數 300 為基準，期望新生數是 300×0.30=90，選 D；調查實際看到的是 82 位。\n\n官方計分選項為（D）90 人。",
   "options": {
     "A": "（A）60 人。60 是 300×20%，對應高年級生的期望值。",
     "B": "（B）70 人。70/300≈23.3%，與虛無假設的新生 30% 不符。",
     "C": "（C）80 人。80 接近今年觀察到的 82，期望人數要用原比例 30% 計算。",
     "D": "（D）90 人。以 300 × 30% 算得 90 位，這是組成不變時的期望人數。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 5 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=5"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     }
   ]
 },
 '106-2s-31':{
  summary:'原卷的迴歸式為 ŷ = 1 + 5x。殘差是實際觀察值 y 減掉迴歸線預測值 ŷ；殘差平方和 SSE 則是逐筆將殘差平方後相加。\n\n資料點（2, 8）：ŷ=1+5×2=11，殘差為 8−11=−3，平方為 9。\n資料點（1, 5）：ŷ=1+5×1=6，殘差為 5−6=−1，平方為 1。\n資料點（2, 7）：ŷ=1+5×2=11，殘差為 7−11=−4，平方為 16。\n\nSSE=(8−11)²+(5−6)²+(7−11)²=9+1+16=26，所以選（C）。第一筆和第三筆雖然 x 都是 2，仍是兩筆不同的觀察值，必須各算一次殘差。',
  options:{
   A:'（A）20：不選。三筆資料的殘差平方分別為 9、1、16，應相加為 26，並非 20。',
   B:'（B）28：不選。將 x=2、1、2 代入後，預測值為 11、6、11；逐筆計算後得到 9+1+16=26，並非 28。',
   C:'（C）26：可以選。殘差平方和為 (8−11)²+(5−6)²+(7−11)²=9+1+16=26。',
   D:'（D）30：不選。必須把每筆 y 與其預測值 ŷ 的差平方後相加，本題合計為 26，與 30 不符。'
  },
  sources:[{title:'106 年統計學大意官方原卷第 3 頁，第 31 題',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=106010&c=508&s=0602&q=1&t=Q#page=3'},{title:'106 年統計學大意官方標準答案：第 31 題 C',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=106010&c=508&s=0602&q=1&t=S'}]
 },
 '106-2s-25':{
  summary:'這題要先用「平方和 ÷ 均方」算出自由度，再加 1 得到處理種類或集區的個數。自由度不是組數本身。\n\n設處理數為 t、集區數為 b。隨機集區設計中，處理自由度是 t−1，集區自由度是 b−1。\n\n處理部分：MSTR=SSTR/(t−1)，所以 t−1=150÷50=3，得到 t=4 種處理。\n\n集區部分：MSB=SSB/(b−1)，所以 b−1=100÷25=4，得到 b=5 個集區。\n\n因此答案是（B）4 種處理，5 個集區。題目的 SST=350 是總平方和，求這兩個個數時不必使用。',
  options:{
   A:'（A）3 種處理，5 個集區：不選。集區數 5 正確，但 150÷50=3 是處理自由度 t−1，還要加 1 才得到 4 種處理，不能把自由度直接當成處理種類數。',
   B:'（B）4 種處理，5 個集區：可以選。處理數為 150÷50+1=4，集區數為 100÷25+1=5，兩者都符合題目給定的平方和與均方。',
   C:'（C）5 種處理，4 個集區：不選。5 種處理應有 4 個處理自由度，4 個集區應有 3 個集區自由度；但本題算出的自由度分別是 3 與 4，兩者都不符。',
   D:'（D）5 種處理，3 個集區：不選。5 種處理、3 個集區對應的自由度是 4 與 2，與本題由平方和除以均方得到的 3 與 4 不符。'
  },
  sources:[{title:'106 年統計學大意官方原卷第 3 頁，第 25 題',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=106010&c=508&s=0602&q=1&t=Q#page=3'},{title:'106 年統計學大意官方標準答案：第 25 題 B',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=106010&c=508&s=0602&q=1&t=S'}]
 },
 '115-2s-1':{
  summary:'P(A ∪ B) 是 A、B 至少一件發生的機率，包含只有 A、只有 B，以及兩件都發生。第一步，因為 A、B 獨立，同時發生的機率是 P(A ∩ B) = P(A) × P(B) = 0.4 × 0.5 = 0.20。\n\n第二步，直接把 0.4 和 0.5 相加，會把兩件都發生的 0.20 算兩次，所以要扣掉一次。P(A ∪ B) = P(A) + P(B) − P(A ∩ B) = 0.4 + 0.5 − 0.20 = 0.70，選（D）。\n\n也可以用補事件驗算。兩件都沒發生的機率是 (1 − 0.4) × (1 − 0.5) = 0.30，因此至少一件發生的機率是 1 − 0.30 = 0.70。',
  options:{
   A:'（A）0.55，錯誤。從 0.90 扣到 0.55 等於扣了 0.35，但兩事件同時發生的機率是 0.4 × 0.5 = 0.20，所以只需扣 0.20。',
   B:'（B）0.60，錯誤。0.60 = 1 − 0.4 是 A 沒發生的機率。用補事件求聯集時，要從 1 扣掉兩件都沒發生的機率 0.60 × 0.50 = 0.30，得到 0.70。',
   C:'（C）0.65，錯誤。只有 A 發生的機率是 0.40 − 0.20 = 0.20，只有 B 發生的機率是 0.50 − 0.20 = 0.30。加上兩件都發生的 0.20，三種情況合計 0.70。',
   D:'（D）0.70，正確。把 A、B 的機率相加，再扣除重複計入的交集，得到 0.40 + 0.50 − 0.20 = 0.70。'
  },
  sources:[
   {title:'115 年統計學大意官方原卷第 1 頁',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1'},
   {title:'115 年統計學大意官方標準答案',url:'https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S'}
  ]
 },
 '115-2s-3':{
   "summary": "題目要用柴比雪夫定理求區間內比例的下限。先看兩個端點離平均數多遠。\n\n6.9 − 4.5 = 2.4 小時，9.3 − 6.9 = 2.4 小時。每個標準差是 1.2 小時，所以兩側各距平均數 2.4 ÷ 1.2 = 2 個標準差。\n\n柴比雪夫定理指出，距離平均數達 k 個標準差或更遠的比例最多是 1/k²。代入 k = 2，得到 1/2² = 1/4 = 25%。因此區間內的比例至少為 1 − 25% = 75%，選（C）。實際比例可能更高，光靠平均數和標準差無法得知精確比例。",
   "options": {
     "A": "（A）31%，錯誤。若只有 31% 在區間內，就有 69% 在區間外，超過定理容許的 25% 上限。",
     "B": "（B）69%，錯誤。若有 69% 在區間內，就有 31% 在區間外，仍超過 25% 上限。區間內至少有 75%。",
     "C": "（C）75%，正確。兩端各距平均數 2 個標準差，區間內比例的下限為 1 − 1/2² = 75%。",
     "D": "（D）25%，錯誤。25% 是區間外比例的上限。題目問區間內，應算 100% − 25% = 75%。"
   },
   "sources": [
     {
       "title": "115 年統計學大意官方原卷第 1 頁",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=Q#page=1"
     },
     {
       "title": "115 年統計學大意官方標準答案",
       "url": "https://wwwq.moex.gov.tw/exam/wHandExamQandA_File.ashx?code=115010&c=511&s=0605&q=1&t=S"
     },
     {
       "title": "NIST 統計手冊，柴比雪夫定理",
       "url": "https://www.itl.nist.gov/div898/handbook/prc/section2/prc261.htm"
     }
   ]
 },
 '115-2s-25':{
  summary:'先算三組平均數：A 組 23、B 組 27.25、C 組 20.75；全部 12 筆資料的總平均為 23.67。處理間平方和 SSTR = 4×[(23−23.67)²+(27.25−23.67)²+(20.75−23.67)²]，約為 87.17。三組的處理自由度為 3−1=2，因此處理間均方 MSTR = 87.17÷2，約為 43.58，選 A。',
  options:{A:'43.58 是處理間平方和約 87.17 除以自由度 2 的結果。',B:'7.33 不是由三組平均數計得的處理間均方。',C:'5.94 不符合以組間平方和除以 2 的結果。',D:'53.51 不是本題組間均方；計算時須先將各組平均與總平均的差平方，再乘各組樣本數。'}
 },
 '115-2s-26':{
  summary:'信賴區間總寬度不超過 0.10，因此單側誤差不得超過 0.05。90% 信賴水準取 z ≈ 1.645，已知瑕疵比例 p = 0.10。代入 n ≥ z²p(1−p)/E²，得到 1.645²×0.1×0.9÷0.05² ≈ 97.42；樣本數要向上取整，至少 98，選 D。',
  options:{A:'45 人不足以把總寬度控制在 0.10 以內。',B:'68 人小於向上取整所需的 98 人。',C:'78 人仍小於 98 人，不能滿足要求。',D:'98 人是將約 97.42 向上取整後的最少樣本數。'}
 },
 '106-2s-8':{
  summary:'莖葉圖例如 6｜2 代表 62 分。將 50 筆資料按大小排列，前 25 筆的中位數是第 13 筆 62，後 25 筆的中位數是第 38 筆 79。因此四分位距為 Q3−Q1=79−62=17，選 C。',
  options:{A:'13 不是上四分位數 79 與下四分位數 62 的差。',B:'15 不是 79−62 的結果。',C:'上四分位數 79 減下四分位數 62，四分位距為 17。',D:'19 與原卷莖葉圖計算出的四分位距 17 不符。'}
 },
 '107-2s-1':{
  summary:'先由條件機率算 P(A ∩ B)=P(A | B)P(B)=0.4×0.6=0.24。已知 P(A ∩ Bᶜ)=0.2，因此 A 在 B 外的部分為 0.2；聯集可視為整個 B 加上 A 在 B 外的部分，P(A ∪ B)=0.6+0.2=0.8，選 C。',
  options:{A:'0.6 只算了事件 B，漏掉 A 在 B 之外的 0.2。',B:'0.7 不是 0.6 加 0.2 的結果。',C:'聯集為 P(B)+P(A ∩ Bᶜ)=0.6+0.2=0.8。',D:'0.9 高於依題意算出的聯集機率 0.8。'}
 },
};
function explanationFor(question,exam){
 const reviewed=reviewedProfessionalExplanation(question,exam);if(reviewed)return reviewed;
 const checked=checkedCalculations[question.id];
 if(checked)return {summary:checked.summary.replace('。','。\n\n'),options:checked.options,optionVerdicts:Object.fromEntries(question.options.map(option=>[option.letter,question.accepted.includes(option.letter)?'可以選。':'不選。'])),sources:checked.sources||[{title:`${exam.year} 年初等考試統計學大意官方試題與答案`,url:exam.source}]};
 const topic=topicFor(question),correct=question.options.find(option=>question.accepted.includes(option.letter));
 if(!correct)throw Error(`Missing answer for ${question.id}`);
 const calculation=calculationNote(question,correct,topic),visualNote=question.hasVisual?'\n\n題目含表格、圖形或公式時，請同時開啟官方原卷核對原始版面與數值。':'';
 const shownAnswer=normalise(correct.text),shownQuestion=questionInPlainWords(question);
 const summary=`這題其實在問：${shownQuestion}\n\n學習重點：${plainGuide(topic)}\n\n判斷方式：${calculation}\n\n因此應選（${correct.letter}）${shownAnswer}。${visualNote}`;
 const options=Object.fromEntries(question.options.map(option=>[option.letter,optionExplanation(question,option,correct,topic)]));
 const optionVerdicts=Object.fromEntries(question.options.map(option=>[option.letter,option.letter===correct.letter
  ? `可以選。（${option.letter}）${normalise(option.text)}符合題幹要求。`
  : `不選。（${option.letter}）${normalise(option.text)}不是本題要求的結論。`,
 ]));
 return {summary,options,optionVerdicts,sources:[{title:`${exam.year} 年初等考試統計學大意官方試題與答案`,url:exam.source}]};
}

export function buildStatisticsExplanations(bank){
 const output=new Map();
 for(const exam of bank.exams.filter(exam=>exam.subjectIndex===2)){
  const entries=Object.fromEntries(bank.questions.filter(question=>question.examId===exam.id).map(question=>[question.id,explanationFor(question,exam)]));
  output.set(exam.id,entries);
 }
 return output;
}
export function writeStatisticsExplanations(bank,baseUrl=new URL('../../data/explanations/',import.meta.url)){
 mkdirSync(baseUrl,{recursive:true});
 for(const [examId,entries] of buildStatisticsExplanations(bank))writeFileSync(new URL(`${examId}.json`,baseUrl),JSON.stringify(entries,null,2)+'\n');
}
