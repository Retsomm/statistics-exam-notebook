import type { Question, StudyState } from './types';
export const STORAGE_KEY: string;
export const emptyState: () => StudyState;
export const grade: (q:Question,selected:string[]) => boolean;
export const recordAnswer: (state:StudyState,q:Question,selected:string[],now?:string) => boolean;
export const validateBackup: (raw:unknown,known:Set<string>|Map<string,Question>) => StudyState;
export const mergeStates: (current:StudyState,incoming:StudyState) => StudyState;
