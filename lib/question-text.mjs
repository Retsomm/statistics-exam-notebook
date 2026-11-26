import {restoreChineseBlanks} from './chinese-blanks.mjs';
import {restoreEnglishBlanks} from './english-blanks.mjs';
import {applyStatisticsQuestionTables} from './statistics-question-tables.mjs';
import {isCodeLineAt,isMarkedTableRow} from './question-layout.mjs';

const han = /\p{Script=Han}/u;
const sentenceEnd = /[。！？.!?][」』”’"')）]*$/u;
const itemStart = /^(?:[甲乙丙丁戊己庚辛壬癸][：:、．]|[①-⑳]|[1-9][、．.)）]|[1-9](?=[\u4e00-\u9fff])|[（(][一二三四五六七八九十\d]+[）)]|(?:BT|NT|RT)\d*\s)/u;
const promptStart = /^(?:根據(?:上|前)|依據(?:上|前)|下列(?:選項|敘述|何者)|以上(?:出自|詞語|敘述)|請(?:問|選))/u;
// Multiple wide column gaps distinguish extracted tables from prose and slots.
const isTableRow = line => (line.trim().match(/\S[ \t]{2,}(?=\S)/g)||[]).length >= 2;
const twoColumnTableLines=lines=>{
 const marked=new Set();
 for(let start=0;start<lines.length;start++){
  const rows=[];
  for(let index=start;index<lines.length;index++){
   const cells=lines[index].trim().split(/[ \t]{2,}/);
   if(cells.length!==2||cells.some(cell=>!cell||cell.length>22))break;
   rows.push(cells);
  }
  if(rows.length>=3&&rows.slice(1).every(row=>/^[−-]?\d+(?:\.\d+)?%?$/.test(row[1]))){
   rows.forEach((_,offset)=>marked.add(start+offset));start+=rows.length-1;
  }
 }
 return marked;
};
const joinSpace = (left,right) => {
 const a=left.at(-1),b=right[0];
 if(/[A-Za-z]-$/.test(left)&&/^[A-Za-z]/.test(right))return '';
 if(han.test(a)||han.test(b)||/[，。；：！？、「『（]/u.test(a)||/[，。；：！？、」』）]/u.test(b))return '';
 return ' ';
};

/** Reflow physical PDF lines without editing wording, answer slots or raw text.
 * Paragraph indentation is meaningful in English passages; Chinese extraction
 * indents every wrapped line, so it cannot by itself imply a paragraph.
 */
export function reflowQuestionText(value,{passage=false,preserveLayout=false}={}){
 if(!value||preserveLayout)return value;
 const lines=value.replace(/\r\n?/g,'\n').replace(/([?？。])\s+(?=(?:void|int|long|float|double|char)\s+[A-Za-z_]\w*\s*\([^\n)]*\)\s*\{)/g,'$1\n').split('\n');
 const twoColumns=twoColumnTableLines(lines);
 let result='',previous='',previousRaw='',blank=false,previousCode=false;
 for(const [index,raw] of lines.entries()){
  const code=isCodeLineAt(lines,index);
  const line=code?raw.replace(/\s+$/,''):raw.trim();
  if(!line){blank=true;continue;}
  if(!result){result=line;previous=line;previousRaw=raw;previousCode=code;blank=false;continue;}
  const markedTable=isMarkedTableRow(raw)||isMarkedTableRow(previousRaw);
  const table=markedTable||isTableRow(raw)||isTableRow(previousRaw)||twoColumns.has(index)||twoColumns.has(index-1);
  const codeBlock=code||previousCode;
  const paragraph=blank&&(markedTable||sentenceEnd.test(previous));
  const indentedParagraph=passage&&/^[ \t]{2,}\S/.test(raw)&&sentenceEnd.test(previous);
  const prompt=promptStart.test(line)&&/[。！？?!：:」』）)]$/.test(previous);
  const structural=itemStart.test(line)||table||prompt||codeBlock;
  const separator=codeBlock?'\n':paragraph||indentedParagraph?'\n\n':structural?'\n':joinSpace(previous,line);
  result+=separator+line;
  previous=line;previousRaw=raw;previousCode=code;blank=false;
 }
 return result;
}

/** All question surfaces receive the same display-ready question at load time. */
export function prepareQuestionText(original){
 const q=restoreChineseBlanks(restoreEnglishBlanks(applyStatisticsQuestionTables(original)));
 return {...q,
  stem:reflowQuestionText(q.stem),
  passage:reflowQuestionText(q.passage,{passage:true,preserveLayout:q.examId==='111-1'&&q.number>=46}),
  options:q.options.map(option=>({...option,text:reflowQuestionText(option.text)})),
 };
}
