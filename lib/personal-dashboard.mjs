import {grade} from './study.mjs';
import {mergeVisitDays,shiftDay,taipeiDay} from './visit-days.mjs';

export function personalDashboard(study,questions,now=Date.now()){
 const today=taipeiDay(now),known=new Map(questions.map(q=>[q.id,q]));
 const visits=mergeVisitDays(study.visitDays).filter(day=>day<=today),visited=new Set(visits),byDay=new Map();
 const getDay=date=>{if(!byDay.has(date))byDay.set(date,{date,visited:visited.has(date),practice:0,mock:0,answered:0,correct:0,subjects:{}});return byDay.get(date);};
 for(const date of visits)getDay(date);
 const seen=new Set();
 const add=(id,time,correct,source,key)=>{
  const question=known.get(id),date=taipeiDay(time);if(!question||!date||date>today||seen.has(key))return;
  seen.add(key);const day=getDay(date);day[source]++;day.answered++;if(correct)day.correct++;
  const subject=day.subjects[question.subjectIndex]||{answered:0,correct:0};
  day.subjects[question.subjectIndex]={answered:subject.answered+1,correct:subject.correct+(correct?1:0)};
 };
 for(const record of study.history||[])add(record.id,record.time,record.correct,'practice',JSON.stringify(['practice',record.id,record.time,record.answer]));
 let completedPapers=0;
 const seenPapers=new Set();
 for(const run of study.mockRuns||[])for(const paper of run.papers||[]){
  const paperKey=JSON.stringify([run.id,paper.subjectIndex]);
  if(!paper.completedAt||!taipeiDay(paper.completedAt)||taipeiDay(paper.completedAt)>today||seenPapers.has(paperKey))continue;
  seenPapers.add(paperKey);completedPapers++;
  for(const id of paper.ids||[]){const answer=paper.choices?.[id],question=known.get(id);if(!question||!Array.isArray(answer)||!answer.length)continue;
   add(id,paper.completedAt,grade(question,answer),'mock',JSON.stringify(['mock',run.id,paper.subjectIndex,id]));
  }
 }
 let currentStreak=0,longestStreak=0,run=0,previous;
 for(const day of visits){run=previous&&shiftDay(previous,1)===day?run+1:1;longestStreak=Math.max(longestStreak,run);previous=day;}
 let cursor=visited.has(today)?today:shiftDay(today,-1);
 while(visited.has(cursor)){currentStreak++;cursor=shiftDay(cursor,-1);}
 const recentDays=Array.from({length:14},(_,i)=>getDay(shiftDay(today,i-13))),week=recentDays.slice(-7);
 const weekAnswered=week.reduce((n,d)=>n+d.answered,0),weekCorrect=week.reduce((n,d)=>n+d.correct,0);
 const subjects=questions.length?[...new Set(questions.map(q=>q.subjectIndex))].map(index=>({index,answered:week.reduce((n,d)=>n+(d.subjects[index]?.answered||0),0),correct:week.reduce((n,d)=>n+(d.subjects[index]?.correct||0),0)})):[];
 return {today,byDay,recentDays,visits,currentStreak,longestStreak,totalVisits:visits.length,todayActivity:getDay(today),weekAnswered,weekCorrect,weekAccuracy:weekAnswered?Math.round(weekCorrect/weekAnswered*100):null,weekActiveDays:week.filter(d=>d.answered>0).length,subjects,completedPapers};
}
