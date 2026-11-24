import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
import {resolveExplanation} from '../lib/explanation-flow.mjs';
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url))),questions=new Map(bank.questions.map(q=>[q.id,q]));
const ids=['115-0-1','115-0-2'];
const state={questions,screen:'practice',result:false,savedIds:ids,session:{ids,index:0,title:'練習',choices:{[ids[0]]:['A']},checked:{}}};
test('practice explanations require an explicit request and a submitted answer, regardless of correctness',()=>{
 assert.equal(resolveExplanation(null,state),null);
 const selection={questionId:ids[0],context:'practice'};
 assert.equal(resolveExplanation(selection,state),null);
 for(const correct of [true,false]){
  const submitted={...state,session:{...state.session,checked:{[ids[0]]:correct}}};
  assert.equal(resolveExplanation(null,submitted),null);
  const target=resolveExplanation(selection,submitted);
  assert.strictEqual(target.question,questions.get(ids[0]));assert.equal(target.isLast,false);
 }
});
test('moving questions, restarting a session or showing results cannot reveal a stale explanation',()=>{
 const selection={questionId:ids[0],context:'practice'};
 for(const patch of [{session:null},{screen:'wrong'},{result:true},{session:{...state.session,index:1,checked:{[ids[0]]:true}}},{session:{...state.session,checked:{}}}])assert.equal(resolveExplanation(selection,{...state,...patch}),null);
 assert.equal(resolveExplanation({questionId:'unknown',context:'practice'},state),null);
});
test('saved explanations and practice resolve the same question object and preserve their next actions',()=>{
 const saved={...state,screen:'favorites',collectionTab:'explanations'};
 const target=resolveExplanation({questionId:ids[0],context:'saved'},saved);
 assert.strictEqual(target.question,questions.get(ids[0]));assert.equal(target.nextId,ids[1]);
 assert.equal(resolveExplanation({questionId:ids[1],context:'saved'},saved).nextId,undefined);
 assert.equal(resolveExplanation({questionId:ids[0],context:'saved'},{...saved,savedIds:[]}),null);
 for(const collectionTab of ['questions','words'])assert.equal(resolveExplanation({questionId:ids[0],context:'saved'},{...saved,collectionTab}),null);
 const last={...state,session:{...state.session,index:1,checked:{[ids[1]]:false}}};
 assert.equal(resolveExplanation({questionId:ids[1],context:'practice'},last).isLast,true);
});
test('mock explanations advance only within the reviewed paper and stop at the end',()=>{
 const paperIds=[ids[1],ids[0]];
 const reviewing={...state,screen:'mock',mockReviewIds:paperIds,mockReviewIndex:0};
 const first={questionId:paperIds[0],context:'mock'};
 const last={questionId:paperIds[1],context:'mock'};
 assert.equal(resolveExplanation(first,reviewing).nextId,paperIds[1]);
 assert.equal(resolveExplanation(last,reviewing),null);
 assert.equal(resolveExplanation(last,{...reviewing,mockReviewIndex:1}).nextId,undefined);
 assert.equal(resolveExplanation(first,{...reviewing,mockReviewIds:undefined}),null);
});
test('the app has one practice renderer, one explanation dialog host, and no inline explanation consumer',()=>{
 const consumers={QuestionPractice:[],ExplanationDialog:[],AnswerExplanation:[]};
 for(const file of readdirSync(new URL('../components/',import.meta.url)).filter(x=>x.endsWith('.tsx'))){
  const source=ts.createSourceFile(file,readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=node=>{
   if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
    const name=node.tagName.getText(source);if(consumers[name])consumers[name].push(file);
   }
   ts.forEachChild(node,visit);
  };visit(source);
 }
 assert.deepEqual(consumers,{QuestionPractice:['study-app.tsx'],ExplanationDialog:['study-app.tsx'],AnswerExplanation:['explanation-dialog.tsx']});
});
test('notes open canonical explanations only on an explicit request, without changing practice',()=>{
 const selection={questionId:ids[0],context:'notes'},notesState={...state,screen:'notes'};
 assert.equal(resolveExplanation(null,notesState),null);
 const before=JSON.stringify(notesState.session);
 const target=resolveExplanation(selection,notesState);
 assert.strictEqual(target.question,questions.get(ids[0]));assert.equal(target.context,'notes');assert.equal(target.nextId,undefined);
 assert.equal(JSON.stringify(notesState.session),before);
 for(const screen of ['practice','favorites','overview'])assert.equal(resolveExplanation(selection,{...notesState,screen}),null);
});
