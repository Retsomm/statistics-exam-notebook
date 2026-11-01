import type {StudyState,Question,History} from './types';
export type CloudQuestion={revision?:number;bookmark?:boolean;explanationBookmark?:boolean;note?:string;record?:StudyState['records'][string];wrong?:StudyState['wrong'][string];history?:History[];applied?:string[]};
export type Mutation={id:string;docId:string;patch:CloudQuestion&{attempts?:StudyState['attempts'];sessionJSON?:string;baseSessionJSON?:string;vocabularyBookmarks?:Record<string,boolean>;idiomBookmarks?:Record<string,boolean>};mode:'update'|'migrate'};
export function mergeHistory(a?:History[],b?:History[]):History[];
export function stateChanges(before:StudyState,after:StudyState):Omit<Mutation,'id'>[];
export function canCoalesceStudyMutations(previous:Mutation['patch'],next:Mutation['patch']):boolean;
export function migrationChanges(local:StudyState,remote:Map<string,CloudQuestion>,sessionExists:boolean):Omit<Mutation,'id'>[];
export function applyQuestionMutation(current:CloudQuestion|undefined,mutation:Mutation):CloudQuestion;
export function cloudState(remote:Map<string,CloudQuestion>,sessionJSON:string|undefined,questions:Question[],queue?:Mutation[]):StudyState;

export function readStudyMetadata(json:string|undefined):{attempts:StudyState['attempts'];session:StudyState['session'];vocabularyBookmarks:Record<string,boolean>;idiomBookmarks:Record<string,boolean>};
export function applyStudyMutation(json:string|undefined,patch:Mutation['patch'],mode?:Mutation['mode'],exists?:boolean):string;
export function vocabularyMigration(local:StudyState,json:string|undefined):Omit<Mutation,'id'>[];

export function bookmarkMigration(local:StudyState,remote:Map<string,CloudQuestion>):Omit<Mutation,'id'>[];
