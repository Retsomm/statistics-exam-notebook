'use client';
import {useMemo,useState} from 'react';
import type {Bank,StudyState,Screen} from '@/lib/types';
import {personalDashboard,type ActivityDay} from '@/lib/personal-dashboard.mjs';
import {taipeiDay} from '@/lib/visit-days.mjs';
import {PageHeading,EmptyState,ProgressBar} from './study-ui';
import Icon from './icons';

const formatDay=(day:string)=>`${Number(day.slice(5,7))} 月 ${Number(day.slice(8))} 日`;
const emptyDay=(date:string):ActivityDay=>({date,visited:false,practice:0,mock:0,answered:0,correct:0,subjects:{}});
const count=(value:number)=>value.toLocaleString('zh-TW');
export default function PersonalDashboard({bank,study,now,onNavigate,onWrong}:{bank:Bank;study:StudyState;now:number;onNavigate:(screen:Screen)=>void;onWrong:()=>void}){
 const data=useMemo(()=>personalDashboard(study,bank.questions,now),[study,bank.questions,now]);
 const [selectedDay,setSelectedDay]=useState(()=>taipeiDay(now)),[month,setMonth]=useState(()=>taipeiDay(now).slice(0,7));
 const selected=data.byDay.get(selectedDay)||emptyDay(selectedDay);
 const start=new Date(`${month}-01T12:00:00Z`),daysInMonth=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
 const monthLabel=`${start.getUTCFullYear()} 年 ${start.getUTCMonth()+1} 月`;
 const activeDates=[data.today,...[...data.byDay.values()].filter(day=>day.visited||day.answered).map(day=>day.date)].sort();
 const firstMonth=activeDates[0].slice(0,7),currentMonth=data.today.slice(0,7);
 const moveMonth=(offset:number)=>{const date=new Date(`${month}-01T12:00:00Z`);date.setUTCMonth(date.getUTCMonth()+offset);setMonth(date.toISOString().slice(0,7));};
 const maximum=Math.max(1,...data.recentDays.map(day=>day.answered));
 const wrong=Object.values(study.wrong).filter(item=>item.active).length;
 const saved=study.bookmarks.length+study.explanationBookmarks.length+study.memoryBookmarks.length+study.vocabularyBookmarks.length+study.idiomBookmarks.length;
 const stats=[
  {label:'連續造訪',value:data.currentStreak,unit:'天',detail:`最長紀錄 ${data.longestStreak} 天`,icon:'calendar'},
  {label:'今日作答',value:data.todayActivity.answered,unit:'次',detail:`答對 ${data.todayActivity.correct} 次`,icon:'check'},
  {label:'近 7 天作答',value:data.weekAnswered,unit:'次',detail:`累積練習 ${data.weekActiveDays} 天`,icon:'chart'},
  {label:'近 7 天正確率',value:data.weekAccuracy,unit:data.weekAccuracy===null?'':'%',detail:'以完全答對計算',icon:'target'},
 ];
 return <>
  <PageHeading title="學習看板" eyebrow="YOUR DAILY PROGRESS"/>
  <div className="personal-stats">{stats.map(item=><article className="personal-stat" key={item.label}><div className="personal-stat-top"><p>{item.label}</p><Icon name={item.icon}/></div><strong>{item.value===null?'—':count(item.value)}<small>{item.unit}</small></strong><p>{item.detail}</p></article>)}</div>
  <div className="personal-shortcuts"><button onClick={onWrong}><span className="personal-shortcut-icon"><Icon name="wrong"/></span><span><strong>待複習錯題</strong><small>{count(wrong)} 題，重新讀懂就更熟悉</small></span><Icon name="arrow"/></button><button onClick={()=>onNavigate('favorites')}><span className="personal-shortcut-icon"><Icon name="star"/></span><span><strong>我的收藏</strong><small>{count(saved)} 項，隨時回來複習</small></span><Icon name="arrow"/></button><button onClick={()=>onNavigate('mock')}><span className="personal-shortcut-icon"><Icon name="stopwatch"/></span><span><strong>我的模擬考</strong><small>{count(study.mockRuns.filter(r=>!r.resetAt).length)} 回，已交卷 {data.completedPapers} 科</small></span><Icon name="arrow"/></button></div>
  <div className="personal-dashboard-grid">
   <section className="personal-card personal-trend"><div className="personal-panel-head"><div><p className="eyebrow">DAILY PRACTICE</p><h2>近 14 天做題紀錄</h2><p>選一天，看看當天的累積。</p></div><span className="personal-pill">共 {count(data.recentDays.reduce((n,day)=>n+day.answered,0))} 次作答</span></div>
    <div className="personal-trend-bars" aria-label="每日作答次數">{data.recentDays.map(day=><button key={day.date} className={`personal-trend-column${day.date===selectedDay?' selected':''}`} aria-label={`查看 ${day.date}，作答 ${day.answered} 次，答對 ${day.correct} 次`} aria-pressed={day.date===selectedDay} onClick={()=>setSelectedDay(day.date)}><strong aria-hidden="true">{day.answered}</strong><span className="personal-bar-track" aria-hidden="true"><i style={{height:day.answered?`${Math.max(5,day.answered/maximum*100)}%`:'3px'}} className={day.answered?'':'no-answers'}/></span><small aria-hidden="true">{Number(day.date.slice(5,7))}/{Number(day.date.slice(8))}</small></button>)}</div>
    
   </section>
   <section className="personal-card personal-calendar"><div className="personal-panel-head"><div><p className="eyebrow">KEEP SHOWING UP</p><h2>我的造訪足跡</h2></div><span className="personal-pill">已記錄 {count(data.totalVisits)} 天</span></div>
    <div className="personal-calendar-controls"><button className="icon-btn" aria-label="上一個月" disabled={month<=firstMonth} onClick={()=>moveMonth(-1)}><Icon name="back"/></button><label><span className="sr-only">選擇活動月份</span><input aria-label="選擇活動月份" type="month" min={firstMonth} max={currentMonth} value={month} onChange={event=>{if(/^\d{4}-\d{2}$/.test(event.target.value)&&event.target.value>=firstMonth&&event.target.value<=currentMonth)setMonth(event.target.value);}}/></label><button className="icon-btn" aria-label="下一個月" disabled={month>=currentMonth} onClick={()=>moveMonth(1)}><Icon name="arrow"/></button></div>
    <div className="personal-calendar-grid" aria-label={monthLabel}>{['日','一','二','三','四','五','六'].map(day=><span className="personal-weekday" key={day}>{day}</span>)}{Array.from({length:start.getUTCDay()},(_,index)=><span key={`blank-${index}`} aria-hidden="true"/>)}{Array.from({length:daysInMonth},(_,index)=>{
     const date=`${month}-${String(index+1).padStart(2,'0')}`,day=data.byDay.get(date)||emptyDay(date),level=day.answered>=30?3:day.answered>=10?2:day.answered>0?1:0;
     return <button key={date} className={`personal-calendar-day level-${level}${day.visited?' visited':''}${date===data.today?' today':''}${date===selectedDay?' selected':''}`} disabled={date>data.today} aria-pressed={date===selectedDay} aria-label={`${date}，${day.visited?'已記錄造訪':'未記錄造訪'}，作答 ${day.answered} 次`} title={`${formatDay(date)} · 作答 ${day.answered} 次`} onClick={()=>setSelectedDay(date)}><span>{index+1}</span><small>{day.answered||' '}</small>{day.visited&&<i aria-hidden="true"/>}</button>;
    })}</div><div className="personal-calendar-legend"><span><i className="visit-marker"/>已造訪</span><span><i className="answer-marker"/>有作答</span><button className="link" onClick={()=>{setMonth(currentMonth);setSelectedDay(data.today);}}>回到今天</button></div>
   </section>
   <section className="personal-card personal-day-detail" aria-label="當日學習紀錄"><div className="personal-panel-head"><div><p className="eyebrow">ONE DAY AT A TIME</p><h2><time dateTime={selectedDay}>{formatDay(selectedDay)}</time>的學習紀錄</h2></div><span className={`personal-pill${selected.visited?' recorded':''}`}>{selected.visited?'當日造訪已記錄':'當日無造訪紀錄'}</span></div>
    <div className="personal-day-summary"><div><strong>{count(selected.answered)}</strong><span>次作答</span></div><div><strong>{count(selected.correct)}</strong><span>次答對</span></div><p>日常練習 {selected.practice} 次<br/>模擬考作答 {selected.mock} 次</p></div>
    {selected.answered?<table className="personal-record-table"><thead><tr><th>科目</th><th>作答</th><th>答對</th><th>正確率</th></tr></thead><tbody>{bank.subjects.map((name,index)=>{const item=selected.subjects[index];return <tr key={name}><th scope="row">{name}</th><td>{item?.answered||0}</td><td>{item?.correct||0}</td><td>{item?.answered?`${Math.round(item.correct/item.answered*100)}%`:'—'}</td></tr>;})}</tbody></table>:<EmptyState title="這天還沒有作答紀錄" description={selectedDay===data.today?'從一題開始，今天的累積就會出現在這裡。':'可以選擇其他日期，回看已保存的練習。'}/>}
    <div className="action-row"><button className="btn" onClick={()=>onNavigate('history')}>查看完整作答紀錄</button><button className="btn primary" onClick={()=>onNavigate('bank')}>前往題庫練習</button></div>
   </section>
   <section className="personal-card personal-subjects"><div className="personal-panel-head"><div><p className="eyebrow">A LITTLE OF EACH</p><h2>近 7 天科目分佈</h2><p>看見投入，也找到下一步。</p></div></div>{bank.subjects.map((name,index)=>{const item=data.subjects.find(subject=>subject.index===index);return <div className="personal-subject" key={name}><div><strong>{name}</strong><span>{item?.answered||0} 次</span></div><ProgressBar value={item?.answered||0} total={data.weekAnswered} label={`${name}近7天作答佔比`}/></div>;})}</section>
  </div>
 </>;
}
