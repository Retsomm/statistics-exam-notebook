const han=/\p{Script=Han}/u;
const tableHint=/(?:如下表|下表|列表|表格|列聯表|ANOVA|次數分配|資料如下|分布如下|結果如下|莖葉圖|Stem-and-leaf|變異來源|自由度|平方和|標準誤|估計值|機率函數|資料表)/i;
const numeric=/^(?:[−-]?\d+(?:\.\d+)?%?|[①-⑳]|[a-eA-E]|[?？]|[○●]|[=＝]|[α-ωΑ-Ω])$/u;

export const isCodeLine=line=>{
 const trimmed=line.trim();
 if(!trimmed)return false;
 // Words such as “for”, “if” and “while” also begin ordinary English prose.
 // Require program syntax rather than classifying a line by a keyword alone.
 if(/^\$\s+|^#include\b/.test(trimmed))return true;
 if(/^[{}]+;?$/.test(trimmed))return true;
 if(/^\);$/.test(trimmed)||/^VALUES\s*\(/i.test(trimmed)||/^\(\d+\s*,\s*N?'[^']*'/.test(trimmed))return true;
 if(/^\}\s*else\b|^\{\s*(?:if|for|while|int|return)\b/i.test(trimmed))return true;
 if(/^struct\s+[A-Za-z_]\w*$/.test(trimmed))return true;
 if(/^(?:(?:export\s+)?(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(|def\s+[A-Za-z_]\w*\s*\([^\n]*\)\s*:|(?:try|else|finally)\s*[{:]\s*$)/.test(trimmed))return true;
 if(/^(?:if|for|while|switch|catch)\s*\(/i.test(trimmed))return true;
 if(/^else\s+(?:if\s*\(|return\b.*;|\{)/.test(trimmed))return true;
 if(/^(?:public|private|protected|static|final)?\s*(?:void|int|long|float|double|char|boolean|String|struct|class|interface|const|let|var)\s+\**[A-Za-z_$][\w$]*(?:\s*\[|\s*\(|\s*=|\s*[,;{]|\s+[A-Za-z_$][\w$]*\s*[(;=,{])/i.test(trimmed))return true;
 if(/^(?:SELECT\s+\S+|INSERT\s+INTO\b|UPDATE\s+\S+\s+SET\b|DELETE\s+FROM\b|CREATE\s+TABLE\b|ALTER\s+TABLE\b|DROP\s+TABLE\b|WHERE\s+\S+\s*(?:=|<|>|\(|LIKE\b))/i.test(trimmed))return true;
 if(/^FROM\s+\S+\s+\S+/.test(trimmed))return true;
 if(/^(?:return|break|continue|throw)\b.*;\s*}?$/.test(trimmed))return true;
 if(/^[A-Za-z_$*][\w.$*\[\]]*\s*(?:\([^\n]*\)\s*[;{]|(?:[+*/%-]?=|\+\+|--)\s*[^\n]*;)\s*$/.test(trimmed))return true;
 if(!han.test(trimmed)&&/^(?:printf|scanf|print|cout|cin)\b.*[;<>]/.test(trimmed))return true;
 return false;
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
   while(index<lines.length&&(isCodeLine(lines[index])||(!lines[index].trim()&&code.length)||(/^\s*else\s*$/.test(lines[index])&&index+1<lines.length&&isCodeLine(lines[index+1])))){code.push(lines[index]);index+=1;}
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
