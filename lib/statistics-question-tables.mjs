import reviewedTables from '../data/statistics-question-tables.json' with {type:'json'};
import civicsTables from '../data/civics-question-tables.json' with {type:'json'};

const relatedTables={
 '100-2s-24': ['100-2s-23', '樣本共變異數為 710.01。'],
 '100-2s-25': ['100-2s-23', '樣本共變異數為 710.01。'],
 '100-2s-38': ['100-2s-37'],
 '100-2s-39': ['100-2s-37'],
 '109-2s-31': ['109-2s-30'],
 '111-2s-25': ['111-2s-24'],
 '114-2s-39': ['114-2s-38'],
 '115-2s-6': ['115-2s-5'],
 '115-2s-36': ['115-2s-35'],
 '115-2s-37': ['115-2s-35'],
};

function formatTables(blocks){
 return blocks.map(({rows,header=true})=>{
  const formatRow=row=>'| '+row.join(' | ')+' |';
  const [first,...rest]=rows;
  const heading=header?[formatRow(first.map(()=> '---'))]:[];
  return [formatRow(first),...heading,...rest.map(formatRow)].join('\n');
 }).join('\n\n');
}

function insertTable(text,{from,through,blocks}){
 const table=formatTables(blocks);
 if(text.includes(table))return text;
 const lines=text.split('\n');
 const start=lines.findIndex(line=>line.trim()===from);
 const end=through===undefined?start:lines.findIndex((line,index)=>index>=start&&line.trim()===through);
 if(start<0||end<start)return text;
 const before=lines.slice(0,through===undefined?start+1:start).join('\n').trimEnd();
 const after=lines.slice(end+1).join('\n').trimStart();
 return [before,table,after].filter(Boolean).join('\n\n');
}

function reservationTables(passage){
 const lines=passage.split('\n');
 const heading=lines.findIndex(line=>line.trim()==='Reservation Details');
 if(heading<0)return passage;
 const rows=lines.slice(heading+1,heading+5).map(line=>line.trim().split(/[ \t]{2,}/));
 const [number,contact,tripHeader,trip]=rows;
 if(number?.length!==4||contact?.length!==4||tripHeader?.length!==9||trip?.length!==9)return passage;
 if(number[0]!=='Reservation Number'||contact[0]!=='Mobile'||tripHeader[0]!=='Trip')return passage;
 const tables=formatTables([{rows:[number,contact],header:false},{rows:[tripHeader,trip]}]);
 const before=lines.slice(0,heading+1).join('\n').trimEnd();
 const after=lines.slice(heading+5).join('\n').trimStart();
 return [before,tables,after].filter(Boolean).join('\n\n');
}

/** Apply the checked PDF layout for display, leaving the question bank untouched. */
export function applyQuestionTables(question){
 const display=(reviewedTables[question.id]??civicsTables[question.id]??[]).reduce((entry,table)=>({
  ...entry,[table.field]:insertTable(entry[table.field],table),
 }),question);

 if(question.examId==='111-1'&&question.number>=46){
  return {...display,passage:reservationTables(display.passage)};
 }
 const reference=relatedTables[question.id];
 if(!reference)return display;
 const [previousId,detail]=reference;
 const previousTables=reviewedTables[previousId].flatMap(table=>table.blocks);
 const table=formatTables(previousTables);
 if(display.passage.includes(table))return display;
 const passage=[display.passage,'前題資料',table,detail].filter(Boolean).join('\n\n');
 return {...display,passage};
}
