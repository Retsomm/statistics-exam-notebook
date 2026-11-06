const normalize=value=>value.normalize('NFKC').trim().replace(/\s+/g,' ');
/** IDs depend on the source note and concept, never array order or answer text. */
export const memoryCardId=(noteId,term)=>'memory-'+Array.from(`${noteId}:${normalize(term)}`).reduce((hash,char)=>BigInt.asUintN(64,(hash^BigInt(char.codePointAt(0)))*1099511628211n),14695981039346656037n).toString(16).padStart(16,'0');
export const validMemoryCardId=id=>typeof id==='string'&&/^memory-[a-f0-9]{16}$/.test(id);
export function buildMemoryCards(notes){
 return notes.flatMap(note=>{
  const points=note.id==='dp-course-3-3'?[{term:'資料鏈結層的責任',detail:'資料鏈結層負責同一條鏈路上相鄰節點之間的資料傳送，例如區域網路內的乙太網路或 Wi-Fi 訊框傳送。跨網段的路由選擇則由網路層處理。',prompt:'資料鏈結層負責哪一段資料傳送？'},...note.points]:note.points;
  return points.filter(point=>point.term.trim()&&point.detail.trim()).map(point=>({
   id:memoryCardId(note.id,point.term),noteId:note.id,subjectIndex:note.subjectIndex,group:note.group,chapter:note.chapter||'',sourceTitle:note.title,term:point.term,
   front:point.prompt||`「${point.term}」的意思、用途或判斷重點是什麼？`,back:point.detail,
  }));
 });
}
