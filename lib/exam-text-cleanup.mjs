import sourceCheckIds from '../data/statistics-source-checks.json' with {type:'json'};
const sourceChecks=new Set(sourceCheckIds);
// Verified against the official 107, 108 and 113 exam PDFs. These isolated
// fragments were extracted from surrounding choices, before the next question.
const prefixedQuestions=new Set([
 ...Array.from({length:10},(_,index)=>`107-0-${26+index}`),
 ...[3,4,6,7,9,10,12].map(number=>`108-1-${number}`),
 ...[6,37,38,40].map(number=>`113-1-${number}`),
]);
const appendixChoices=new Set(['115-2s-40','114-2s-40','113-2s-40','110-2s-40','109-2s-40']);
const removeLeadingDebris=(text,number)=>{
 const pattern=new RegExp(`^\\s*[^\\n]{1,80}\\n\\s*${number}\\s+`);
 return text.replace(pattern,'');
};
const removeAppendices=text=>text.replace(/\n\s*\n\s*附表一[\s\S]*$/u,'').trimEnd();
export const cleanExamQuestion=question=>{
 let {stem,text,options}=question;
 if(prefixedQuestions.has(question.id)){
  stem=removeLeadingDebris(stem,question.number);
  text=removeLeadingDebris(text,question.number);
 }
 if(appendixChoices.has(question.id)){
  options=options.map(option=>option.letter==='D'?{...option,text:removeAppendices(option.text)}:option);
  text=removeAppendices(text);
 }
 // Symbol-font private-use glyphs cannot be reliably interpreted by a browser.
 // Keep the original text and expose the corresponding official PDF page until
 // a human verifies the formula; do not silently guess a mathematical operator.
 const needsFormulaSource=question.subjectIndex===2&&(sourceChecks.has(question.id)||/[\uE000-\uF8FF]|本選項含有公式或圖表/u.test([stem,...options.map(option=>option.text)].join(' ')));
 return {...question,stem,text,options,hasVisual:question.hasVisual||needsFormulaSource};
};
