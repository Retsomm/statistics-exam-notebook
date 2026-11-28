// Coordinates are redrawn from the question PDFs. Keep the original axes,
// labels and relationships so the figures can be used before viewing answers.
const line=(x1,y1,x2,y2)=>`M${x1} ${y1}L${x2} ${y2}`;
const rect=(x,y,w,h)=>`M${x} ${y}h${w}v${h}h-${w}Z`;
const ellipse=(x,y,rx,ry)=>`M${x-rx} ${y}a${rx} ${ry} 0 1 0 ${2*rx} 0a${rx} ${ry} 0 1 0 ${-2*rx} 0Z`;

function arrow(x1,y1,x2,y2){
 const angle=Math.atan2(y2-y1,x2-x1);
 const side=offset=>[Math.round(x2-7*Math.cos(angle+offset)),Math.round(y2-7*Math.sin(angle+offset))];
 const left=side(.5),right=side(-.5);
 return [line(x1,y1,x2,y2),`M${left.join(' ')}L${x2} ${y2}L${right.join(' ')}`];
}

function network(positions,edges,directed=false,weights=[]){
 const paths=edges.flatMap(([from,to])=>{
  const [x1,y1]=positions[from],[x2,y2]=positions[to];
  if(!directed)return [[line(x1,y1,x2,y2)]];
  const length=Math.hypot(x2-x1,y2-y1);
  return arrow(x1,y1,Math.round(x2-(x2-x1)*14/length),Math.round(y2-(y2-y1)*14/length)).map(path=>[path]);
 });
 return {
  paths,
  nodes:Object.values(positions),
  labels:[...Object.entries(positions).map(([label,[x,y]])=>[x,y+5,label,'middle']),...weights],
 };
}

function tree(title,description,width,height,positions,edges){
 return {title,description,width,height,...network(positions,edges)};
}

function boxPlots({title,description,width,height,min,max,step,rows}){
 const left=40,right=width-22,base=height-29;
 const x=value=>Math.round(left+(right-left)*(value-min)/(max-min));
 const paths=[[line(left,base,right,base)]],points=[],labels=[];
 for(let tick=Math.ceil(min/step)*step;tick<=max;tick+=step){
  paths.push([line(x(tick),base-4,x(tick),base+4)]);
  labels.push([x(tick),base+20,String(tick),'middle']);
 }
 for(const {y,name,values:[low,q1,median,q3,high],dashed=false,marks=[],ends=false,shade=false} of rows){
  if(name)labels.push([left-10,y+5,name,'end']);
  paths.push([rect(x(q1),y-14,x(q3)-x(q1),28),shade?'shaded':'solid'],[line(x(median),y-14,x(median),y+14)]);
  paths.push([line(x(low),y,x(q1),y),dashed?'dashed':'solid'],[line(x(q3),y,x(high),y),dashed?'dashed':'solid']);
  if(ends)points.push([x(low),y,3.4],[x(high),y,3.4]);
  else paths.push([line(x(low),y-6,x(low),y+6)],[line(x(high),y-6,x(high),y+6)]);
  for(const mark of marks)paths.push([line(x(mark),y-14,x(mark),y+14),'dashed']);
 }
 return {title,description,width,height,paths,points,labels};
}

function histogram({title,description,width,height,yStep,yMax,binLabels,values,labelEdges=false}){
 const left=44,right=width-12,top=20,base=height-(binLabels.length>9?43:30),barWidth=(right-left)/values.length;
 const y=value=>Math.round(base-(base-top)*value/yMax);
 const x=offset=>Math.round(left+offset*barWidth);
 const paths=[[line(left,top,left,base)],[line(left,base,right,base)]],labels=[];
 for(let tick=0;tick<=yMax;tick+=yStep){
  if(tick>0)paths.push([line(left,y(tick),right,y(tick)),'grid']);
  labels.push([left-7,y(tick)+4,String(tick),'end']);
 }
 values.forEach((value,i)=>paths.push([rect(x(i),y(value),x(i+1)-x(i),base-y(value)),'shaded']));
 binLabels.forEach((label,i)=>labels.push([x(i+(labelEdges?0:.5)),base+19+(binLabels.length>9&&i%2?15:0),label,'middle']));
 return {title,description,width,height,paths,labels};
}

const employee={
 title:'EMPLOYEE 實體關聯圖',
 description:'EMPLOYEE 連到 empID、empName、empAddress、empBirthday、empSalary、empAge 和 empSex。empID 有底線，empAge 是虛線橢圓。empName 再連到 empLName 和 empFName。',
 width:430,height:263,
 paths:[
  ['M120 45L164 82M191 45L164 82M184 115L217 140M274 74V140M330 111L307 140M108 156H211M189 188L222 172M274 172V211M315 172L350 194'],
  [rect(211,140,124,32),'outline'],
  ...[[82,26],[175,26],[154,99],[274,57],[374,99],[66,156],[154,207],[274,230]].map(([x,y])=>[ellipse(x,y,41,17),'outline']),
  [ellipse(374,207,41,17),'dashed'],[line(42,162,90,162)],
 ],
 labels:[[82,31,'empLName','middle'],[175,31,'empFName','middle'],[154,104,'empName','middle'],[274,62,'empAddress','middle'],[374,104,'empBirthday','middle'],[66,160,'empID','middle'],[273,161,'EMPLOYEE','middle'],[154,212,'empSalary','middle'],[374,212,'empAge','middle'],[274,235,'empSex','middle']],
};

const production={
 title:'敘利亞生產可能線',
 description:'橫軸為 X，縱軸為 Y。斜線自左上向右下延伸，依序通過 A、E、B。C 點在線的右上方，D 點在線的左下方。',
 width:276,height:196,
 paths:[...arrow(30,167,30,19).map(path=>[path]),...arrow(30,167,249,167).map(path=>[path]),[line(30,46,193,167)]],
 points:[[75,79],[112,83],[78,116],[130,120],[162,144]],
 labels:[[22,184,'0','end'],[20,23,'Y','end'],[253,173,'X'],[82,80,'A'],[119,84,'C'],[72,129,'D','end'],[138,119,'E'],[169,142,'B']],
};

const bankScores=boxPlots({
 title:'108 年初等考試統計學科目分數箱型圖',
 description:'分數軸從 0 到 100，每 10 分有一個刻度。箱體兩側落在約 30 分與 70 分，內部中位線略高於 50 分。',
 width:378,height:121,min:0,max:100,step:10,
 rows:[{y:49,values:[5,30,53,71,96],dashed:true,shade:true}],
});

const donation={
 title:'離校年數與每年捐獻散布圖',
 description:'橫軸為校友離校年數，縱軸為每年捐獻。圖中標示 R² 等於 0.8241，含七個資料點和一條由左向右下降的迴歸線。',
 width:364,height:188,
 paths:[['M45 29V137H338'],[line(45,65,265,127)],['M45 133v8M118 133v8M191 133v8M264 133v8M337 133v8M41 30h8M41 83h8M41 137h8']],
 points:[[52,69],[66,83],[82,57],[118,90],[155,109],[220,119],[264,124]],
 labels:[[37,34,'20','end'],[37,87,'10','end'],[37,141,'0','end'],[45,158,'0','middle'],[118,158,'10','middle'],[191,158,'20','middle'],[264,158,'30','middle'],[337,158,'40','middle'],[191,178,'X：校友離校年數','middle'],[12,19,'Y：每年捐獻'],[328,46,'R² = 0.8241','end']],
};

export const questionFigures={
 '102-3d-42':employee,
 '103-1-35':production,
 '103-2s-3':{
  title:'國文成績分配曲線',description:'曲線由左側靠近水平軸處逐漸上升，接近右端時達到高點，隨後迅速下降回到水平軸。',
  width:332,height:158,
  paths:[...arrow(27,131,27,19).map(path=>[path]),...arrow(27,131,310,131).map(path=>[path]),['M27 130C75 126 118 105 163 84S208 61 228 36C244 15 255 62 267 101C273 120 288 128 303 130']],
 },
 '104-2s-6':histogram({
  title:'員工能力測驗成績直方圖',description:'橫軸為 20 到 90 分，以 10 分分組。從左到右，各組的柱高約為 1、7、26、23、18、4、1。',
  width:366,height:214,yStep:10,yMax:33,
  binLabels:['20','30','40','50','60','70','80','90'],values:[1,7,26,23,18,4,1],labelEdges:true,
 }),
 '105-3d-33':tree('二元樹','A 的左子節點為 B。B 左接 D、右接 C，D 的右子節點為 E。',235,196,
  {A:[148,24],B:[93,71],C:[148,120],D:[54,120],E:[110,167]},
  [['A','B'],['B','D'],['B','C'],['D','E']]),
 '106-2s-7':boxPlots({
  title:'A 班與 B 班商業統計成績盒鬚圖',description:'兩班使用相同的分數刻度。A 班箱體約從 63 到 81 分，B 班箱體約從 71 到 80 分。A 班兩端約為 48 與 90，B 班約為 59 與 84。',
  width:372,height:157,min:45,max:92,step:10,
  rows:[{name:'B',y:40,values:[59,71,78,80,84],dashed:true},{name:'A',y:90,values:[48,63,75,81,90],dashed:true}],
 }),
 '106-2s-9':histogram({
  title:'薪資級距直方圖',description:'橫軸從低於 2、2 到 4、4 到 6 等級距至高於 20。2 到 4 的柱最高，接近 900。4 到 6 約 560，6 到 8 約 310，此後各組柱高明顯降低。',
  width:390,height:225,yStep:100,yMax:1000,
  binLabels:['<2','2–4','4–6','6–8','8–10','10–12','12–14','14–16','16–18','18–20','>20'],
  values:[470,920,560,310,220,115,70,45,29,18,34],
 }),
 '106-3d-13':{
  title:'S、R、T 實體關聯圖',description:'S 與 T 透過菱形關係 R 相連，S 端標 1，T 端標 N。S 有 A1、A2、A3，A1 有底線、A3 用雙橢圓。T 有 B1、B2，B1 有底線。',
  width:384,height:119,
  paths:[
   ['M30 42L85 68M90 42V68M155 42L90 68M269 42L305 68M338 42L305 68M128 85H174M218 85H270'],
   [rect(48,68,80,34),'outline'],['M174 85L196 64L218 85L196 106Z','outline'],[rect(270,68,80,34),'outline'],
   ...[28,90,155,270,338].map(x=>[ellipse(x,27,26,15),'outline']),
   [ellipse(155,27,32,20)],[line(19,35,37,35)],[line(261,35,279,35)],
  ],
  labels:[[28,32,'A1','middle'],[90,32,'A2','middle'],[155,32,'A3','middle'],[270,32,'B1','middle'],[338,32,'B2','middle'],[88,90,'S','middle'],[196,90,'R','middle'],[310,90,'T','middle'],[151,79,'1','middle'],[244,79,'N','middle']],
 },
 '109-3d-47':tree('二元樹','根節點 1 左接 2、右接 3。2 左接 4、右接 5。5 左接 7。3 右接 6，6 左接 8、右接 9。',282,211,
  {1:[126,25],2:[73,75],3:[178,75],4:[26,125],5:[111,125],6:[217,130],7:[64,184],8:[172,184],9:[264,184]},
  [['1','2'],['1','3'],['2','4'],['2','5'],['5','7'],['3','6'],['6','8'],['6','9']]),
 '110-2s-5':bankScores,
 '110-2s-17':{
  title:'上網時間與統計學成績的散布圖',description:'橫軸為 X，縱軸為 Y。資料點從左下升到中段，再下降到右下。兩端都接近橫軸。',
  width:334,height:193,
  paths:[['M37 21V169H316']],
  points:[
  [45,160],[55,150],[56,157],[65,151],[78,126],[79,137],[92,129],[96,123],[109,120],[124,108],
  [134,113],[141,109],[159,106],[173,97],[175,106],[184,111],[196,108],[212,107],[214,120],[221,113],
  [222,104],[227,119],[237,124],[240,116],[252,131],[261,132],[266,143],[277,157],[285,154],[285,160],
  [296,163],
  ],
  labels:[[23,25,'Y','end'],[319,175,'X']],
 },
 '110-2s-19':{
  title:'迴歸殘差對擬合值散布圖',description:'橫軸從 0 到 7。縱軸有一條殘差為 0 的水平線，資料在左側聚集於水平線附近，往右側向線的上、下方散開。',
  width:385,height:242,
  paths:[[rect(42,19,322,172)],[line(42,111,364,111)],
   ...Array.from({length:8},(_,i)=>[line(65+i*41,191,65+i*41,196)]),
   ...Array.from({length:10},(_,i)=>[line(37,19+i*18.3,42,19+i*18.3)]),
   ['M65 108C71 100 80 104 87 107C99 106 103 94 113 104C124 107 130 99 134 113C143 112 143 125 138 128C132 122 119 118 104 120C91 114 78 119 65 108Z','shaded'],
  ],
  points:[
  [58,106],[59,70],[67,98],[89,89],[91,82],[95,79],[106,98],[108,88],[118,84],[122,73],
  [139,100],[140,91],[145,113],[150,134],[151,110],[151,117],[152,125],[158,114],[161,102],[161,125],
  [166,109],[167,120],[168,132],[174,114],[180,139],[181,96],[185,106],[185,126],[188,137],[189,119],
  [190,148],[192,102],[194,79],[194,118],[194,144],[195,135],[198,102],[198,125],[200,109],[200,140],
  [202,148],[206,62],[206,84],[206,101],[206,137],[207,117],[209,143],[209,163],[212,50],[212,96],
  [213,88],[213,132],[213,139],[215,108],[217,146],[217,153],[219,52],[219,118],[220,124],[221,105],
  [221,132],[222,84],[225,128],[228,91],[230,119],[231,72],[234,111],[235,99],[237,105],[238,88],
  [240,120],[240,137],[243,142],[244,112],[246,125],[247,97],[250,182],[252,103],[254,150],[257,125],
  [261,115],[261,146],[267,111],[269,142],[272,97],[278,143],[283,126],[284,92],[285,163],[286,81],
  [287,115],[289,133],[291,48],[293,142],[295,104],[297,132],[305,40],[306,134],[310,88],[310,117],
  [332,115],[347,91],
  ],
  labels:[
   ...Array.from({length:8},(_,i)=>[65+i*41,212,String(i),'middle']),
   ...Array.from({length:10},(_,i)=>[31,24+i*18.3,String(5-i),'end']),
   [202,233,'Ŷ（擬合值）','middle'],
  ],
 },
 '110-3d-3':{
  title:'A 與 B 邏輯閘電路',description:'A 的左輸入為 1，右輸入接到 Y 的線路，輸出為 X。B 的兩個輸入都是 0，輸出為 Y。',
  width:222,height:184,
  paths:[[rect(44,71,45,42),'outline'],[rect(135,71,45,42),'outline'],['M66 71V42M158 71V42M56 113V143M67 113V130H122V58H158M147 113V143M168 113V143']],
  labels:[[66,34,'X','middle'],[158,34,'Y','middle'],[66,98,'A','middle'],[158,98,'B','middle'],[56,161,'1','middle'],[147,161,'0','middle'],[168,161,'0','middle']],
 },
 '110-3d-50':{
  title:'學校與三位學生之間的路線圖',description:'A 與 B 間標 3、A 與 C 間標 6、C 與 D 間標 2、B 與 D 間標 4、A 與 D 的對角線標 8、B 與 C 的對角線標 9。',
  width:284,height:185,
  paths:[['M45 31H236V153H45V31L236 153M236 31L45 153']],
  points:[[45,31,5],[236,31,5],[45,153,5],[236,153,5]],
  labels:[[33,34,'A','end'],[247,35,'B'],[33,161,'C','end'],[247,161,'D'],[142,25,'3','middle'],[36,99,'6','end'],[248,99,'4'],[142,172,'2','middle'],[179,109,'8'],[103,109,'9','end']],
 },
 '112-3d-46':tree('二元樹','A 左接 B、右接 C。B 左接 D、右接 E。C 左接 F、右接 G。D 的右子節點為 H，F 的右子節點為 I。',320,176,
  {A:[160,24],B:[90,65],C:[233,65],D:[31,108],E:[124,108],F:[196,108],G:[278,108],H:[72,152],I:[233,152]},
  [['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G'],['D','H'],['F','I']]),
 '112-3d-47':tree('引線二元樹的原始結構','A 左接 B、右接 C。B 左接 D、右接 E。C 左接 F、右接 G。D 左接 H、右接 I，F 左接 J、右接 K。',350,170,
  {A:[183,22],B:[107,61],C:[251,61],D:[60,105],E:[146,105],F:[214,105],G:[289,105],H:[19,147],I:[89,147],J:[175,147],K:[255,147]},
  [['A','B'],['A','C'],['B','D'],['B','E'],['C','F'],['C','G'],['D','H'],['D','I'],['F','J'],['F','K']]),
 '112-3d-49':{
  title:'七個頂點的加權無向圖',
  description:'各邊及其權重為：1 與 6 為 1、1 與 2 為 25、1 與 7 為 30、2 與 7 為 4、2 與 3 為 6、3 與 4 為 2、4 與 7 為 8、4 與 5 為 16、5 與 7 為 18、5 與 6 為 21。',
  width:250,height:259,
  ...network({1:[118,23],2:[182,83],3:[208,163],4:[130,234],5:[52,196],6:[33,114],7:[118,145]},[['1','6'],['1','2'],['1','7'],['2','7'],['2','3'],['3','4'],['4','7'],['4','5'],['5','7'],['5','6']],false,[[68,74,'1'],[151,46,'25'],[96,92,'30'],[151,120,'4'],[198,122,'6'],[178,206,'2'],[130,190,'8'],[77,230,'16'],[70,171,'18'],[24,163,'21']]),
 },
 '112-3d-50':{
  title:'七個頂點的加權有向圖',
  description:'箭頭方向及權重為：1 到 2 為 4、1 到 3 為 6、1 到 4 為 6、2 到 3 為 1、2 到 5 為 7、3 到 5 為 6、3 到 6 為 4、4 到 3 為 2、4 到 6 為 5、6 到 5 為 1、5 到 7 為 6、6 到 7 為 8。',
  width:405,height:164,
  ...network({1:[22,83],2:[112,24],3:[205,83],4:[112,139],5:[291,24],6:[294,139],7:[382,83]},[['1','2'],['1','3'],['1','4'],['2','3'],['2','5'],['3','5'],['3','6'],['4','3'],['4','6'],['6','5'],['5','7'],['6','7']],true,[[52,52,'4'],[95,76,'6'],[49,121,'6'],[148,40,'1'],[193,18,'7'],[241,50,'6'],[241,100,'4'],[148,106,'2'],[193,133,'5'],[270,91,'1'],[333,47,'6'],[340,119,'8']]),
 },
 '113-2s-35':{
  title:'兩樣本 F 檢定的計算機圖形',description:'曲線自左側上升至高點，再隨橫軸向右漸降。原圖標示 F = 2.6522，p = 0.0102。',
  width:294,height:157,
  paths:[[rect(21,15,251,109)],['M30 113C43 113 49 25 71 22C91 25 94 65 115 88C132 108 156 113 260 113']],
  labels:[[34,145,'F = 2.6522'],[163,145,'p = 0.0102']],
 },
 '114-2s-26':{
  title:'甲、乙兩家公司的薪資分布',
  description:'橫軸為薪資，縱軸為人數。甲曲線從低薪資端起升，在較左邊達到較低的高峰，右尾延伸到乙曲線右端之外。乙曲線從較右邊起升，峰值較高，曲線較集中。',
  width:416,height:184,
  paths:[...arrow(39,154,39,16).map(path=>[path]),...arrow(16,146,396,146).map(path=>[path]),['M39 134C79 138 87 46 122 58C152 69 168 101 220 122C247 134 278 132 305 146'],['M116 146C158 143 161 34 196 30C253 25 250 140 271 146','dashed']],
  labels:[[32,26,'人數','end'],[391,169,'薪資','end'],[88,72,'甲'],[241,58,'乙']],
 },
 '114-2s-36':boxPlots({
  title:'甲、乙兩班分數盒狀圖',description:'刻度由負 15 到 35。甲班箱體約從 6 到 12，中位數約 9。乙班箱體約從 6 到 11，中位數也約 9。兩班各自保留原圖的虛線標記。',
  width:406,height:148,min:-15,max:35,step:5,
  rows:[{name:'甲',y:36,values:[2,6,9,12,15],marks:[-12,-3,21,30],ends:true},{name:'乙',y:84,values:[0,6,9,11,17],marks:[-9,-1.5,18.5,26],ends:true}],
 }),
 '114-2s-37':boxPlots({
  title:'資料分布盒狀圖',description:'刻度由負 60 到 120。箱體約從 21 到 40，中位數約 27。盒鬚兩端位於約 11 與 62，軸上還有四條虛線標記。',
  width:406,height:110,min:-60,max:120,step:20,
  rows:[{y:44,values:[11,21,27,40,62],marks:[-36,-7.5,68,97],ends:true}],
 }),
 '115-2s-32':donation,
 '115-2s-33':donation,
};
