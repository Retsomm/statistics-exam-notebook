export type Question = {id:string;examId:string;year:number;subject:string;subjectIndex:number;number:number;points?:number;multi:boolean;images:string[];text:string;page:number;accepted:string[];correction:string|null;allCredit?:boolean;stem:string;options:{letter:string;text:string}[];passage:string;hasVisual:boolean;textFallback:boolean;englishFormat?:'standalone'|'cloze'|'reading';clozeNumbers?:number[]};
export type Exam = {id:string;year:number;subject:string;subjectIndex:number;count:number;explanationCount?:number;pages:string[];source:string;answerSource:string;listing:string;correctionPdf:string|null;practiceNote?:string;explanationStatus?:'pending'};
export type Bank = {exams:Exam[];questions:Question[];subjects:string[];updatedAt:string};
export type StudyRecord = {answer:string;correct:boolean;attempts:number;time:string};
export type Wrong = {active:boolean;time:string;answer:string};
export type History = {id:string;answer:string;correct:boolean;time:string};
export type ExamAttempt = {id:string;examId:string;startedAt:string;completedAt:string;score:number;max:number;total:number};
export type StudySession = {attemptId?:string;examId?:string;startedAt?:string;ids:string[];index:number;title:string;choices:Record<string,string[]>;checked:Record<string,boolean>};
export type StudyState = {version:1;attempts:ExamAttempt[];bookmarks:string[];explanationBookmarks:string[];vocabularyBookmarks:string[];idiomBookmarks:string[];memoryBookmarks:string[];notes:Record<string,string>;records:Record<string,StudyRecord>;wrong:Record<string,Wrong>;history:History[];session:StudySession|null};
export type Screen = 'overview'|'bank'|'wrong'|'favorites'|'history'|'settings'|'practice'|'reports'|'notes';

export type CollectionTab = 'wrong'|'questions'|'explanations'|'idioms'|'words'|'memory';
export type Vocabulary = {word:string;partOfSpeech:string;meaning:string;usage:string};
export type SavedVocabulary = Vocabulary & {questionId:string;questionIds:string[];legacyIds:string[]};
export type ExplanationDiagram = {kind:'binary-tree'|'graph-traversal';title:string;description:string;nodes:{id:string;label:string;x:number;y:number;step?:number}[];edges:[string,string][];sequence:string[];sequenceLabel?:string;breadthSequence?:string[]};
export type QuestionExplanation = {summary:string;options:Record<string,string>;optionVerdicts?:Record<string,string>;diagram?:ExplanationDiagram;vocabulary?:Vocabulary[];questionVocabulary?:Vocabulary[];passageTranslation?:{paragraphs:string[];note:string};classical?:{translation:string;vocabulary:string;optionTranslations?:Record<string,string>};sources?:{title:string;url:string}[]};
