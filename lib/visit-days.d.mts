export const MAX_VISIT_DAYS:number;
export function validDay(value:unknown):value is string;
export function taipeiDay(value?:string|number|Date):string;
export function shiftDay(day:string,offset:number):string;
export function mergeVisitDays(...groups:(readonly string[]|undefined)[]):string[];
export function readVisitDays(json:string|undefined):string[];
