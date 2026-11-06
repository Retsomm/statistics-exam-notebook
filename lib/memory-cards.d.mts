export type MemoryCard={id:string;noteId:string;subjectIndex:number;group:string;chapter:string;sourceTitle:string;term:string;front:string;back:string};
export function memoryCardId(noteId:string,term:string):string;
export function validMemoryCardId(id:unknown):boolean;
export function buildMemoryCards(notes:{id:string;subjectIndex:number;group:string;chapter?:string;title:string;points:{term:string;detail:string}[]}[]):MemoryCard[];
