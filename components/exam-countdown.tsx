'use client';
import {useEffect,useState} from 'react';
import {examCountdown,upcomingExam} from '../lib/exam-countdown.mjs';
export default function ExamCountdown(){
 const [now,setNow]=useState<number|null>(null);
 useEffect(()=>{
  const update=()=>setNow(Date.now());update();
  const timer=window.setInterval(update,60000);
  document.addEventListener('visibilitychange',update);
  return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',update);};
 },[]);
 const countdown=now===null?null:examCountdown(now);
 return <section className="exam-countdown" aria-labelledby="exam-countdown-title">
  <div className="countdown-intro"><h2 id="exam-countdown-title">考試倒數</h2><p>{upcomingExam.name}</p><time dateTime={upcomingExam.date}>{upcomingExam.dateLabel}</time></div>
  <div className="countdown-time" aria-label="距考試日期倒數" role="timer">
   {!countdown?<p>正在計算剩餘天數…</p>:countdown.status==='upcoming'?<><span>距離考試日</span><strong>{countdown.days}<small>天</small></strong><p>把今天的努力，寫進下一章。</p></>:<><strong className="countdown-message">{countdown.status==='today'?'考試日到了':'本次考試日期已過'}</strong><p>{countdown.status==='today'?'帶著累積的每一頁，從容應試。':'請查看考選部公告，等待下一次考期。'}</p></>}
  </div>
  <div className="countdown-details"><p>報名期間 <strong>{upcomingExam.registration}</strong></p><small>依臺灣日期計算至考試日；實際節次請依准考證。日期如有異動，以考選部公告為準。</small><a className="link" href={upcomingExam.source} target="_blank" rel="noopener noreferrer">考選部考試公告 ↗</a></div>
 </section>;
}
