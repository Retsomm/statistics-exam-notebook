'use client';

import {useRef,useState} from 'react';
import type {Exam,Question} from '@/lib/types';
import {statisticsReferenceTable} from '@/lib/statistics-reference-tables';
import ModalDialog from './modal-dialog';
import OfficialSourceLink from './official-source-link';

export default function StatisticsReferenceLookup({exam,question}:{exam:Exam;question:Question}){
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const table=statisticsReferenceTable(question.id);
 if(!table)return null;

 return <div className="statistics-reference">
  <button ref={trigger} className="btn" type="button" aria-haspopup="dialog" onClick={()=>setOpen(true)}>
   查表：{table.title}
  </button>
  {open&&<ModalDialog
   className="statistics-reference-dialog"
   title={table.title}
   subtitle={table.description}
   closeLabel="關閉查表"
   onClose={()=>setOpen(false)}
   returnFocusRef={trigger}
   closeOnBackdrop
   footer={<OfficialSourceLink className="btn" exam={exam} question={question} kind="question" page={table.page}>
    查看考選部原卷附表（第 {table.page} 頁）
   </OfficialSourceLink>}
  >
   <div className="question-table-wrap" role="region" aria-label={`${table.title}捲動區`} tabIndex={0}>
    <table className="question-table" aria-label={table.title}>
     <thead><tr>
      <th scope="col">{table.rowHeading}</th>
      {table.columns.map(column=><th key={column} scope="col">{column}</th>)}
     </tr></thead>
     <tbody>{table.rows.map(({label,values})=><tr key={label}>
      <th scope="row">{label}</th>
      {values.map((value,index)=><td key={table.columns[index]}>{value}</td>)}
     </tr>)}</tbody>
    </table>
   </div>
  </ModalDialog>}
 </div>;
}
