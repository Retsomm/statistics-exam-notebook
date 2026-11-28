/** A submitted wrong answer also completes a question. Choices alone do not. */
export function sessionResumeIndex(session){
 if(!session?.ids.length)return null;
 const start=Number.isInteger(session.index)&&session.index>=0&&session.index<session.ids.length?session.index:0;
 for(let offset=0;offset<session.ids.length;offset++){
  const index=(start+offset)%session.ids.length;
  if(!Object.hasOwn(session.checked,session.ids[index]))return index;
 }
 return null;
}

export function trackExamSessions(before,after){
 const leaving=before.session;
 const active=after.session;
 const examSessions={...after.examSessions};
 if(leaving?.examId&&leaving.attemptId!==active?.attemptId&&!examSessions[leaving.examId]&&sessionResumeIndex(leaving)!==null){
  examSessions[leaving.examId]=leaving;
 }
 if(active?.examId&&JSON.stringify(active)!==JSON.stringify(leaving)){
  if(sessionResumeIndex(active)!==null)examSessions[active.examId]=active;
  else delete examSessions[active.examId];
 }
 return {...after,examSessions};
}

export function unfinishedExamSessions(bank,study){
 const byExam=new Map();
 for(const question of bank.questions){
  if(!byExam.has(question.examId))byExam.set(question.examId,[]);
  byExam.get(question.examId).push(question);
 }
 const completed=new Map();
 const completedIds=new Set(study.attempts.map(attempt=>attempt.id));
 for(const attempt of study.attempts){
  if(attempt.completedAt>(completed.get(attempt.examId)||''))completed.set(attempt.examId,attempt.completedAt);
 }
 const submissions=new Map(Object.entries(study.records).filter(([,record])=>record.nonExamPractice!==true));
 for(const event of study.history){
  if(event.nonExamPractice!==true&&event.time>(submissions.get(event.id)?.time||''))submissions.set(event.id,event);
 }
 const progress=[];
 for(const exam of bank.exams){
  const questions=byExam.get(exam.id)||[];
  const ids=questions.map(question=>question.id);
  const saved=study.examSessions[exam.id]??(study.session?.examId===exam.id?study.session:null);
  if(saved&&saved.ids.length===exam.count&&ids.every(id=>saved.ids.includes(id))){
   if(completedIds.has(saved.attemptId)||sessionResumeIndex(saved)===null)continue;
   const submitted=saved.ids.filter(id=>Object.hasOwn(saved.checked,id));
   const latestAt=[saved.startedAt,...submitted.map(id=>submissions.get(id)?.time)].filter(Boolean).sort().at(-1)||'';
   progress.push({exam,session:saved,answered:submitted.length,latestAt,recovered:false});
   continue;
  }

  // Old versions could replace the entire session. The per-question records
  // still hold submitted answers, but cannot restore unsubmitted selections.
  const cutoff=completed.get(exam.id)||'';
  const submitted=ids.filter(id=>submissions.get(id)?.time>cutoff);
  if(!submitted.length||submitted.length>=ids.length)continue;
  const times=submitted.map(id=>submissions.get(id).time).sort();
  const choices=Object.fromEntries(submitted.map(id=>[id,submissions.get(id).answer.split('')]));
  const checked=Object.fromEntries(submitted.map(id=>[id,submissions.get(id).correct]));
  const session={examId:exam.id,startedAt:times[0],ids,index:ids.findIndex(id=>!Object.hasOwn(checked,id)),title:`${exam.year} 年 · ${exam.subject}`,choices,checked};
  progress.push({exam,session,answered:submitted.length,latestAt:times.at(-1),recovered:true});
 }
 return progress.sort((a,b)=>b.latestAt.localeCompare(a.latestAt)||Number(a.recovered)-Number(b.recovered));
}
