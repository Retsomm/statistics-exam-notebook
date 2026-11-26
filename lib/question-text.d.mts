import type {Question} from './types';
export function reflowQuestionText(value:string,options?:{passage?:boolean;preserveLayout?:boolean}):string;
export function prepareQuestionText<T extends Question>(question:T):T;
export function questionTextPreview(value:string,length:number):string;
