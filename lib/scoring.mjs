// Official initial-exam scoring: singles 2, Chinese multiple-choice 3.
// Each wrong option in a five-option multiple-choice item removes 2/5 of its points.
export const scoringSources=Object.freeze({
 multiple:'https://law.exam.gov.tw/LawContent.aspx?id=GL000010&media=print',
 allocation:'https://wwwc.moex.gov.tw/main/exam/FileHandler.ashx?File=2410&MCode=5009&PCode=3932&f=110&t=P',
 average:'https://wwwc.moex.gov.tw/main/news/wfrmNews.aspx?kind=7&menu_id=1968&news_id=4166',
});
const round=value=>Math.round(value*10000)/10000;
export const questionPoints=q=>Number.isFinite(q.points)&&q.points>0?q.points:(q.multi?3:2);
export const allowsMultipleChoices=q=>q.multi||q.accepted.some(answer=>answer.length>1);
export function questionScore(q,selected=[]){
 const max=questionPoints(q);
 if(q.allCredit)return max;
 const choices=[...new Set(selected)];
 if(!choices.length||choices.some(letter=>!q.options.some(option=>option.letter===letter)))return 0;
 // A few official correction notices also accept a specific double mark on a
 // single-choice item. Those exceptions receive full credit, never partial credit.
 if(!q.multi)return q.accepted.includes(choices.sort().join(''))?max:0;
 if(q.options.length!==5)throw Error('複選題須有五個選項才能套用正式配分');
 const errors=Math.min(...q.accepted.map(answer=>q.options.filter(option=>choices.includes(option.letter)!==answer.includes(option.letter)).length));
 return round(max*Math.max(0,(5-2*errors)/5));
}
export function scoreQuestions(questions,answers){
 let score=0,max=0,answered=0,fullCredit=0,partialCredit=0;
 for(const q of questions){
  const selected=answers[q.id]||[],points=questionScore(q,selected);max+=questionPoints(q);score+=points;
  if(selected.length)answered++;
  if(points===questionPoints(q))fullCredit++;else if(points>0)partialCredit++;
 }
 return {score:round(score),max,answered,total:questions.length,fullCredit,partialCredit,unanswered:questions.length-answered};
}
export function sessionScore(session,questions,exams){
 const selected=session.ids.map(id=>questions.get(id)).filter(Boolean);
 const answers=Object.fromEntries(selected.filter(q=>Object.hasOwn(session.checked,q.id)).map(q=>[q.id,session.choices[q.id]||[]]));
 const score=scoreQuestions(selected,answers),exam=exams.find(exam=>exam.id===selected[0]?.examId);
 const fullPaper=!!exam&&selected.length===exam.count&&new Set(session.ids).size===exam.count&&selected.every(q=>q.examId===exam.id);
 return {...score,fullPaper,exam:fullPaper?exam:null};
}
export function yearScores(bank,records,year){
 const papers=bank.exams.filter(exam=>exam.year===year).sort((a,b)=>a.subjectIndex-b.subjectIndex).map(exam=>{
  const questions=bank.questions.filter(q=>q.examId===exam.id);
  const answers=Object.fromEntries(questions.filter(q=>records[q.id]).map(q=>[q.id,records[q.id].answer.split('')]));
  const score=scoreQuestions(questions,answers);
  return {exam,...score,complete:score.answered===questions.length&&questions.length===exam.count};
 });
 const complete=papers.length===4&&papers.every(paper=>paper.complete&&paper.max===100);
 return {papers,complete,average:complete?round(papers.reduce((sum,paper)=>sum+paper.score,0)/4):null};
}
export const formatScore=value=>Number(value.toFixed(2)).toLocaleString('zh-TW',{maximumFractionDigits:2});
