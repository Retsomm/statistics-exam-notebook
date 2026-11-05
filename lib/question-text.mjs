import {restoreChineseBlanks} from './chinese-blanks.mjs';
import {restoreEnglishBlanks} from './english-blanks.mjs';
import {isCodeLine} from './question-layout.mjs';

const han = /\p{Script=Han}/u;
const sentenceEnd = /[。！？.!?][」』”’"')）]*$/u;
const itemStart = /^(?:[甲乙丙丁戊己庚辛壬癸][：:、．]|[①-⑳]|[1-9][、．.)）]|[1-9](?=[\u4e00-\u9fff])|[（(][一二三四五六七八九十\d]+[）)]|(?:BT|NT|RT)\d*\s)/u;
const promptStart = /^(?:根據(?:上|前)|依據(?:上|前)|下列(?:選項|敘述|何者)|以上(?:出自|詞語|敘述)|請(?:問|選))/u;
// Multiple wide column gaps distinguish extracted tables from prose and slots.
const isTableRow = line => (line.trim().match(/\S[ \t]{2,}(?=\S)/g)||[]).length >= 2;
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
 let result='',previous='',previousRaw='',blank=false;
 for(const raw of lines){
  const code=isCodeLine(raw);
  const line=code?raw.replace(/\s+$/,''):raw.trim();
  if(!line){blank=true;continue;}
  if(!result){result=line;previous=line;previousRaw=raw;blank=false;continue;}
  const table=isTableRow(raw)||isTableRow(previousRaw);
  const codeBlock=code||isCodeLine(previousRaw);
  const paragraph=blank&&sentenceEnd.test(previous);
  const indentedParagraph=passage&&/^[ \t]{2,}\S/.test(raw)&&sentenceEnd.test(previous);
  const prompt=promptStart.test(line)&&/[。！？?!：:」』）)]$/.test(previous);
  const structural=itemStart.test(line)||table||prompt||codeBlock;
  const separator=codeBlock?'\n':paragraph||indentedParagraph?'\n\n':structural?'\n':joinSpace(previous,line);
  result+=separator+line;
  previous=line;previousRaw=raw;blank=false;
 }
 return result;
}

/** All question surfaces receive the same display-ready question at load time. */
export function prepareQuestionText(original){
 const q=restoreChineseBlanks(restoreEnglishBlanks(original));
 return {...q,
  stem:reflowQuestionText(q.stem),
  passage:reflowQuestionText(q.passage,{passage:true,preserveLayout:q.examId==='111-1'&&q.number>=46}),
  options:q.options.map(option=>({...option,text:reflowQuestionText(option.text)})),
 };
}
