import type {Question,StudyState} from './types';
export type ActivityDay={date:string;visited:boolean;practice:number;mock:number;answered:number;correct:number;subjects:Record<number,{answered:number;correct:number}>};
export type PersonalDashboardData={today:string;byDay:Map<string,ActivityDay>;recentDays:ActivityDay[];visits:string[];currentStreak:number;longestStreak:number;totalVisits:number;todayActivity:ActivityDay;weekAnswered:number;weekCorrect:number;weekAccuracy:number|null;weekActiveDays:number;subjects:{index:number;answered:number;correct:number}[];completedPapers:number};
export function personalDashboard(study:StudyState,questions:Question[],now?:number):PersonalDashboardData;
