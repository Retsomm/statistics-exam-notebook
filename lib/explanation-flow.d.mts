import type {Question,StudySession,Screen,CollectionTab} from './types';
export type ExplanationSelection={questionId:string;context:'practice'|'saved'|'notes'|'mock'};
export type ExplanationTarget={question:Question;context:'mock';nextId?:undefined}|{question:Question;context:'practice';isLast:boolean}|{question:Question;context:'saved';nextId?:string}|{question:Question;context:'notes';nextId?:undefined};
export function resolveExplanation(selection:ExplanationSelection|null,state:{questions:Map<string,Question>;session:StudySession|null;screen:Screen;collectionTab?:CollectionTab;result:boolean;savedIds:string[];mockReviewIds?:string[]}):ExplanationTarget|null;
