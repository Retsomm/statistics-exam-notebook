import type {Bank,MockRun,MockPaper,Question} from './types';
export const MOCK_DURATION:number;
export function drawMockPaper(bank:Bank,subjectIndex:number,runs:MockRun[],random?:()=>number):MockPaper;
export function createMockRun(bank:Bank,runs:MockRun[],id:string,now?:number,random?:()=>number,subjects?:number[]):MockRun;
export function remainingMs(paper:MockPaper,now:number):number;
export function finishMockPaper(paper:MockPaper,questions:Map<string,Question>,now?:number):MockPaper;
export function validMockRun(run:unknown):run is MockRun;
export function mergeMockRun(current:MockRun|undefined,incoming:MockRun):MockRun;
export function mergeMockRuns(a?:MockRun[],b?:MockRun[]):MockRun[];
export function mockAverage(run:MockRun):number|null;
export function formatDuration(ms:number,roundUp?:boolean):string;

export function resetMockRuns(runs:MockRun[],now?:number):MockRun[];
export function latestMockScores(runs:MockRun[]):{papers:(MockPaper|null)[];average:number|null};
