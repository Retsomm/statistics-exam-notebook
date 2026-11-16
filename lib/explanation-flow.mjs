/** Resolve an explicit open request against current canonical state, never copied question data. */
export const resolveExplanation=(selection,{questions,session,screen,collectionTab,result,savedIds,mockReviewIds=[]})=>{
 if(!selection)return null;
 const question=questions.get(selection.questionId);
 if(!question)return null;
 if(selection.context==='mock'){if(screen!=='mock'||!mockReviewIds.includes(question.id))return null;return {question,context:'mock'};}
 if(selection.context==='practice'){
  if(screen!=='practice'||result||!session||session.ids[session.index]!==question.id||!Object.hasOwn(session.checked,question.id))return null;
  return {question,context:'practice',isLast:session.index===session.ids.length-1};
 }
 if(selection.context==='notes'){
  if(screen!=='notes')return null;
  return {question,context:'notes'};
 }
 if(selection.context==='saved'){
  const index=savedIds.indexOf(question.id);
  if(screen!=='favorites'||collectionTab!=='explanations'||index<0)return null;
  return {question,context:'saved',nextId:savedIds[index+1]};
 }
 return null;
};
