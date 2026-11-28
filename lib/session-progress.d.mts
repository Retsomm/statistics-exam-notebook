import type {Bank,Exam,StudySession,StudyState} from './types';
export function sessionResumeIndex(session:StudySession|null|undefined):number|null;
export function trackExamSessions(before:StudyState,after:StudyState):StudyState;
export type ExamProgress={exam:Exam;session:StudySession;answered:number;latestAt:string;recovered:boolean};
export function unfinishedExamSessions(bank:Bank,study:StudyState):ExamProgress[];
