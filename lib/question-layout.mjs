const han=/\p{Script=Han}/u;
const codeStart=/^\$\s+|^#include\b|^(?:public|private|protected|static|final|class|interface|void|int|long|float|double|char|boolean|String|return|if|else|for|while|switch|case|break|continue|try|catch|throw|def|function|const|let|var|print|printf|scanf|cout|cin|SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|WHERE|JOIN|GROUP BY|ORDER BY)\b|^[{}]$|[{}]|=>|\+\+|--|:=/i;
const tableHint=/(?:如下表|下表|列表|表格|列聯表|ANOVA|次數分配|資料如下|分布如下|結果如下|莖葉圖|Stem-and-leaf|變異來源|自由度|平方和|標準誤|估計值|機率函數|資料表)/i;
const numeric=/^(?:[−-]?\d+(?:\.\d+)?%?|[①-⑳]|[a-eA-E]|[?？]|[○●]|[=＝]|[α-ωΑ-Ω])$/u;

export const isCodeLine=line=>{
 const trimmed=line.trim();
 return codeStart.test(trimmed)||(!han.test(trimmed)&&/;\s*$/.test(trimmed));
};

const cellsOf=line=>{
 const trimmed=line.trim();
 if(!trimmed||/[。！？?!]$/.test(trimmed))return [];
 const wide=trimmed.split(/\s{2,}/).filter(Boolean);
 const cells=wide.length>=2?wide:trimmed.split(/\s+/).filter(Boolean);
 if(cells.length<2||cells.length>12||cells.some(cell=>cell.length>22))return [];
 const short=cells.filter(cell=>cell.length<=12).length;
 const values=cells.filter(cell=>numeric.test(cell)||/^\d/.test(cell)).length;
 return short===cells.length||values>=Math.ceil(cells.length/2)?cells:[];
};

const sameShape=(left,right)=>Math.abs(left.length-right.length)<=1;
const tableRunAt=(lines,start)=>{
 const rows=[];
 for(let index=start;index<lines.length;index+=1){
  const cells=cellsOf(lines[index]);
  if(!cells.length||isCodeLine(lines[index]))break;
  if(rows.length&&!sameShape(rows[0],cells))break;
  rows.push(cells);
 }
 const preceding=lines.slice(Math.max(0,start-2),start).join(' ');
 const enoughRows=rows.length>=3;
 const hinted=tableHint.test(preceding);
 return (rows.length>=2&&(enoughRows||hinted))?rows:[];
};

/** Converts imported question text into display blocks without changing the source wording. */
export function questionLayout(value){
 const lines=value.replace(/\r\n?/g,'\n').split('\n');
 const blocks=[];
 let text=[];
 const flushText=()=>{if(text.some(line=>line.trim()))blocks.push({type:'text',lines:text});text=[];};
 for(let index=0;index<lines.length;){
  if(isCodeLine(lines[index])){
   flushText();
   const code=[];
   while(index<lines.length&&(isCodeLine(lines[index])||(!lines[index].trim()&&code.length))){code.push(lines[index]);index+=1;}
   blocks.push({type:'code',lines:code});
   continue;
  }
  const rows=tableRunAt(lines,index);
  if(rows.length){
   flushText();
   const [header,...body]=rows;
   const countries=body.length>0&&header.every(cell=>/^\d{4}\s*年$/.test(cell))&&body.every(row=>row.length===header.length+1&&/國$/.test(row[0]));
   if(countries)blocks.push({type:'table',rows:[['國家',...header],...body]});
   else if(rows.every(row=>row.length===header.length))blocks.push({type:'table',rows});
   else blocks.push({type:'text',lines:lines.slice(index,index+rows.length)});
   index+=rows.length;continue;
  }
  text.push(lines[index]);index+=1;
 }
 flushText();
 return blocks;
}
