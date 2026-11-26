import {Fragment} from 'react';
import {questionLayout} from '@/lib/question-layout.mjs';

type Props={text:string;className?:string;style?:React.CSSProperties};
type QuestionBlock={type:'text'|'code';lines:string[]}|{type:'table';rows:string[][];columnHeaders?:boolean};

const TextBlock=({lines}:{lines:string[]})=><>{lines.join('\n').split(/\n{2,}/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</>;

export default function QuestionText({text,className,style}:Props){
 const blocks=questionLayout(text) as QuestionBlock[];
 return <div className={className} style={style}>{blocks.map((block,index)=>{
  if(block.type==='code')return <pre className="question-code" key={index}><code>{block.lines.join('\n')}</code></pre>;
  if(block.type==='table')return <div className="question-table-wrap" key={index}><table className="question-table"><caption>題目資料表</caption><tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,cellIndex)=>rowIndex===0&&block.columnHeaders!==false?<th scope="col" key={cellIndex}>{cell}</th>:<td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
  return <Fragment key={index}><TextBlock lines={block.lines}/></Fragment>;
 })}</div>;
}
