import type {ReactNode} from 'react';
import Icon from './icons';
import BrandLogo from './brand-logo';
import {brand} from '../lib/brand.mjs';

export function PageHeading({title,sub,eyebrow=brand.english}:{title:string;sub?:string;eyebrow?:string}){
 return <div className="heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{sub&&<p className="subtext">{sub}</p>}</div></div>;
}
export function EmptyState({title,description,icon,children}:{title:string;description:string;icon?:string;children?:ReactNode}){
 return <section className="empty">{icon&&<Icon name={icon}/>}<h3>{title}</h3><p>{description}</p>{children}</section>;
}
export function LoadingState({message,inline=false}:{message:string;inline?:boolean}){
 const Container=inline?'div':'main';
 return <Container className={`loading${inline?' loading-inline':''}`} role="status"><BrandLogo variant="mark"/><p>{message}</p></Container>;
}
export function QuestionBookmarkButton({bookmarked,onToggle}:{bookmarked:boolean;onToggle:()=>void}){
 return <button type="button" className={`icon-btn ${bookmarked?'selected':''}`} onClick={onToggle} aria-label={bookmarked?'取消收藏':'收藏題目'} aria-pressed={bookmarked}><Icon name="star"/></button>;
}
export function ReportQuestionButton({onClick}:{onClick:()=>void}){
 return <button type="button" className="btn" onClick={onClick} aria-haspopup="dialog">回報題目問題</button>;
}
export function ProgressBar({value,total,label}:{value:number;total:number;label:string}){
 const percent=total>0?Math.max(0,Math.min(100,Math.round(value/total*100))):0;
 return <div className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><span style={{width:`${percent}%`}}/></div>;
}
