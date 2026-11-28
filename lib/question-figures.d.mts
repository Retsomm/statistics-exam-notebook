export type FigurePath = [data:string, style?:'solid'|'dashed'|'shaded'|'filled'|'grid'|'outline'];
export type FigurePoint = [x:number,y:number,radius?:number];
export type FigureLabel = [x:number,y:number,text:string,align?:'start'|'middle'|'end'];
export type QuestionFigure = {
 title:string;
 description:string;
 width:number;
 height:number;
 paths:FigurePath[];
 points?:FigurePoint[];
 nodes?:FigurePoint[];
 labels?:FigureLabel[];
};
export const questionFigures:Readonly<Partial<Record<string,QuestionFigure>>>;
