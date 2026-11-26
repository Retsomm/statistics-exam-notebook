import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {reviewedProfessionalExplanation} from '../professional-import/reviewed.mjs';

const sourceUrl = new URL('../../data/explanations/', import.meta.url);

function explanationFor(question, exam, entries) {
 const reviewed = reviewedProfessionalExplanation(question, exam);
 if (reviewed) return reviewed;

 const entry = entries[question.id];
 if (!entry) throw Error(`Missing statistics explanation for ${question.id}`);

 const optionVerdicts = Object.fromEntries(question.options.map(({letter}) => [
  letter, question.accepted.includes(letter) ? '可以選。' : '不選。',
 ]));
 return {...entry, optionVerdicts};
}

export function buildStatisticsExplanations(bank) {
 const output = new Map();
 for (const exam of bank.exams.filter(exam => exam.subjectIndex === 2)) {
  const reviewed = exam.authoredReviewRequired
   ? {}
   : JSON.parse(readFileSync(new URL(`${exam.id}.json`, sourceUrl), 'utf8'));
  const questions = bank.questions.filter(question => question.examId === exam.id);
  output.set(exam.id, Object.fromEntries(
   questions.map(question => [question.id, explanationFor(question, exam, reviewed)]),
  ));
 }
 return output;
}

export function writeStatisticsExplanations(bank, baseUrl = sourceUrl) {
 mkdirSync(baseUrl, {recursive: true});
 for (const [examId, entries] of buildStatisticsExplanations(bank)) {
  writeFileSync(new URL(`${examId}.json`, baseUrl), JSON.stringify(entries, null, 2)+'\n');
 }
}
