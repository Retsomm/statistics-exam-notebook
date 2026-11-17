import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';

const reviews=new Map();
export const professionalQuestionHash=question=>createHash('sha256').update(JSON.stringify([question.stem,question.passage,question.options,question.accepted,question.allCredit||false])).digest('hex');
export function reviewedProfessionalExplanation(question,exam){
 if(!exam.authoredReviewRequired)return null;
 if(!reviews.has(exam.id)){
  const path=new URL(`../../data/professional-reviews/${exam.id}.json`,import.meta.url);
  if(!existsSync(path))throw Error(`${exam.id}: missing authored explanation review`);
  reviews.set(exam.id,JSON.parse(readFileSync(path,'utf8')));
 }
 const review=reviews.get(exam.id),entry=review.entries[question.id];
 if(review.questionPdfSha256!==exam.sourceSha256||review.answerPdfSha256!==exam.answerSha256)throw Error(`${exam.id}: official source changed; review is required`);
 if(!entry||entry.questionSha256!==professionalQuestionHash(question))throw Error(`${question.id}: question or answer changed after explanation review`);
 const explanation=entry.explanation;
 if(!explanation.summary||question.options.some(option=>!explanation.options?.[option.letter]))throw Error(`${question.id}: incomplete authored explanation`);
 return structuredClone(explanation);
}
