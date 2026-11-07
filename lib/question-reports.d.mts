import type {Question,Exam} from './types';
export type QuestionReport={id:string;questionId:string;kind:string;detail:string;createdAt:string;snapshotJSON:string;synced?:boolean;status?:string;resolution?:string};
export const reportKinds:Record<string,string>;
export function makeReport(question:Question,exam:Exam,kind:string,detail:string,answer?:string[],now?:string,id?:string):QuestionReport;
export function reportText(report:QuestionReport):string;
export function mergeReports(local:QuestionReport[],remote:QuestionReport[]):QuestionReport[];
