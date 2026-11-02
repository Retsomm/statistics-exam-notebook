import {cleanExamQuestion} from '../lib/exam-text-cleanup.mjs';
import {enrichEnglishExplanation} from '../lib/english-learning.mjs';
import {buildVocabularyIndex} from '../lib/vocabulary.mjs';
import {buildVersion} from './build-version.mjs';
import {writeDataProcessingExplanations} from './data-processing/build-explanations.mjs';
import {writeStatisticsExplanations} from './statistics/build-explanations.mjs';
import { readFileSync,writeFileSync } from 'node:fs';
import {gunzipSync} from 'node:zlib';
const legacyBank=JSON.parse(gunzipSync(readFileSync(new URL('../data/common-bank.json.gz',import.meta.url))).toString('utf8'));
const metadata=JSON.parse(readFileSync(new URL('../data/statistics-bank-meta.json',import.meta.url),'utf8'));
const common=JSON.parse(readFileSync(new URL('../data/common-bank-meta.json',import.meta.url),'utf8'));
const imported=[...metadata.exams,...common.exams];
const bank={...legacyBank,subjects:metadata.subjects,updatedAt:'2026-11-02',exams:[...legacyBank.exams.filter(exam=>exam.subjectIndex<2),...imported].sort((a,b)=>b.year-a.year||a.subjectIndex-b.subjectIndex),questions:[...legacyBank.questions.filter(question=>question.subjectIndex<2),...imported.flatMap(exam=>JSON.parse(readFileSync(new URL(`../data/papers/${exam.id}.json`,import.meta.url),'utf8')))]};
writeStatisticsExplanations(bank);
writeDataProcessingExplanations(bank);
bank.questions=bank.questions.map(cleanExamQuestion);
writeFileSync(new URL('../data/bank.json',import.meta.url),JSON.stringify(bank));

import {mkdirSync,readdirSync,rmSync} from 'node:fs';
const source=new URL('../data/explanations/',import.meta.url);
mkdirSync(source,{recursive:true});
const target=new URL('../public/explanations/',import.meta.url);rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});
const passages=JSON.parse(readFileSync(new URL('../data/english-passages.json',import.meta.url),'utf8'));
const questionLexicon=JSON.parse(readFileSync(new URL('../data/english-question-vocabulary.json',import.meta.url),'utf8'));
const explanations={};
const classical=JSON.parse(readFileSync(new URL('../data/chinese-classical.json',import.meta.url),'utf8')).entries;
const oldTranslations=JSON.parse(readFileSync(new URL('./editorial/chinese-classical-translations.json',import.meta.url),'utf8'));
const oldClassicalWords=JSON.parse(readFileSync(new URL('./editorial/chinese-classical-vocabulary.json',import.meta.url),'utf8'));
for(const exam of bank.exams){
 const name=`${exam.id}.json`;
 const entries=readdirSync(source).includes(name)?JSON.parse(readFileSync(new URL(name,source),'utf8')):{};
 for(const question of bank.questions.filter(q=>q.examId===exam.id)){
  if(entries[question.id])entries[question.id]=enrichEnglishExplanation(question,entries[question.id],passages,questionLexicon);
  const reading=classical[question.id];
  if(reading){
   const entry=entries[question.id]||{summary:'',options:{}};
   const oldPrefix=oldTranslations[question.id]+'\n\n常見字詞與語助詞：'+oldClassicalWords[question.id]+'\n\n';
   const summary=entry.summary.startsWith(oldPrefix)?entry.summary.slice(oldPrefix.length):entry.summary;
   // The original 109-3 explanation embedded its translation separately from the old catalog.
   const reasoning=question.id==='109-0-3'?summary.slice(summary.indexOf('答案依據：')):summary;
   entries[question.id]={...entry,summary:reasoning,classical:{translation:reading.translation,vocabulary:reading.vocabulary,...(reading.optionTranslations?{optionTranslations:reading.optionTranslations}:{})}};
  }
 }
 explanations[exam.id]=entries;
 writeFileSync(new URL(name,target),JSON.stringify(entries,null,2)+'\n');
 const ids=bank.questions.filter(question=>question.examId===exam.id).map(question=>question.id);
 exam.explanationCount=ids.filter(id=>entries[id]?.summary&&entries[id]?.options).length;
}
writeFileSync(new URL('../public/vocabulary.json',import.meta.url),JSON.stringify(buildVocabularyIndex(bank.questions,explanations)));
writeFileSync(new URL('../public/bank.json',import.meta.url),JSON.stringify(bank));

writeFileSync(new URL('../public/version.json',import.meta.url),JSON.stringify({version:buildVersion()})+'\n');
