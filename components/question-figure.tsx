import type {QuestionFigure as Figure} from '@/lib/question-figures.mjs';
import styles from './question-figure.module.css';

export default function QuestionFigure({figure}:{figure:Figure}){
 return <figure className={`question-figure ${styles.figure}`} style={{maxWidth:figure.width*1.3}}>
  <svg viewBox={`0 0 ${figure.width} ${figure.height}`} role="img" aria-label={`${figure.title}。${figure.description}`}>
   {figure.paths.map(([data,style='solid'])=><path key={data} className={style==='solid'?undefined:styles[style]} d={data}/>)}
   {figure.points?.map(([x,y,radius=2.5],index)=><circle className={styles.filled} key={index} cx={x} cy={y} r={radius}/>)}
   {figure.nodes?.map(([x,y,radius=14],index)=><circle className={styles.outline} key={index} cx={x} cy={y} r={radius}/>)}
   {figure.labels?.map(([x,y,text,align='start'],index)=><text key={index} x={x} y={y} textAnchor={align}>{text}</text>)}
  </svg>
 </figure>;
}
