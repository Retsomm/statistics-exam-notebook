import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import {createElement as h} from 'react';
import {renderToStaticMarkup as render} from 'react-dom/server';
const require=createRequire(import.meta.url),modules=new Map();
function component(name){
 if(modules.has(name))return modules.get(name);
 const source=readFileSync(new URL(`../components/${name}.tsx`,import.meta.url),'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',js)(id=>id.startsWith('./')?component(id.slice(2)):require(id),module,module.exports);
 modules.set(name,module.exports);return module.exports;
}
const bank=JSON.parse(readFileSync(new URL('../data/bank.json',import.meta.url)));
const q=bank.questions[0],exam=bank.exams.find(e=>e.id===q.examId),noop=()=>{};

test('native dialog, repeated page layouts and question actions each have a single owner',()=>{
 const owners={dialog:[],heading:[],empty:[],bar:[],reportAction:[],bookmarkAction:[]};
 for(const file of readdirSync(new URL('../components/',import.meta.url)).filter(f=>f.endsWith('.tsx'))){
  const source=ts.createSourceFile(file,readFileSync(new URL('../components/'+file,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  function visit(node){
   if(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node)){
    if(node.tagName.getText(source)==='dialog')owners.dialog.push(file);
    for(const attribute of node.attributes.properties){
     if(!ts.isJsxAttribute(attribute))continue;
     const name=attribute.name.getText(source),value=attribute.initializer;
     if(name==='className'&&value&&ts.isStringLiteral(value)&&owners[value.text])owners[value.text].push(file);
     if(name==='aria-haspopup'&&node.parent.getText(source).includes('回報題目問題'))owners.reportAction.push(file);
     if(name==='aria-label'&&attribute.getText(source).includes("'取消收藏':'收藏題目'"))owners.bookmarkAction.push(file);
    }
   }
   ts.forEachChild(node,visit);
  }visit(source);
 }
 assert.deepEqual(owners,{dialog:['modal-dialog.tsx'],heading:['study-ui.tsx'],empty:['study-ui.tsx'],bar:['study-ui.tsx'],reportAction:['study-ui.tsx'],bookmarkAction:['study-ui.tsx']});
});
test('source links resolve the same PDF page, answer fallback and optional correction in every view',()=>{
 const Source=component('official-source-link').default;
 const link=(kind,overrides={})=>render(h(Source,{exam:{...exam,...overrides},question:q,kind},'官方來源'));
 assert.ok(link('question').includes(`#page=${q.page+1}`));
 assert.ok(link('answer').includes(exam.answerSource.replaceAll('&','&amp;')));
 assert.ok(link('answer',{answerSource:''}).includes(exam.listing.replaceAll('&','&amp;')));
 assert.equal(link('correction',{correctionPdf:null}),'');
 assert.match(link('correction',{correctionPdf:'https://example.org/correction.pdf'}),/noopener noreferrer/);
});
test('all collection modes share question content and keep their intended actions',()=>{
 const List=component('question-list').default;
 const props={questions:[q],study:{bookmarks:[q.id],notes:{[q.id]:'共同筆記'},wrong:{[q.id]:{active:true}}},page:0,onPageChange:noop,onReport:noop,onBookmark:noop,onExplanationBookmark:noop,onViewExplanation:noop,onMastered:noop,onPractice:noop,onOpenBank:noop};
 for(const mode of ['questions','wrong','explanations']){
  const html=render(h(List,{...props,mode}));
  assert.ok(html.includes(q.stem.slice(0,130).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')));
  assert.match(html,/共同筆記/);assert.match(html,/回報題目問題/);assert.doesNotMatch(html,/<dialog|answer-explanation/);
  if(mode==='explanations'){assert.match(html,/查看解析/);assert.doesNotMatch(html,/aria-label="取消收藏"/);}
  else {assert.match(html,/aria-label="取消收藏"/);assert.doesNotMatch(html,/查看解析/);}
  if(mode==='wrong')assert.match(html,/已掌握/);
 }
 const empty=render(h(List,{...props,questions:[],mode:'questions'}));assert.match(empty,/目前沒有符合條件的題目/);assert.match(empty,/前往題庫/);
});
test('shared progress remains accessible for empty and completed sessions',()=>{
 const {ProgressBar,QuestionBookmarkButton}=component('study-ui');
 assert.match(render(h(ProgressBar,{value:0,total:0,label:'練習進度'})),/aria-valuenow="0"/);
 assert.match(render(h(ProgressBar,{value:12,total:10,label:'練習進度'})),/aria-valuenow="100"/);
 for(const bookmarked of [true,false])assert.match(render(h(QuestionBookmarkButton,{bookmarked,onToggle:noop})),new RegExp(`aria-pressed="${bookmarked}"`));
});

test('shared vocabulary cards expose save state and hide review definitions until requested',()=>{
 const Card=component('vocabulary-card').default;
 const item={word:'reliable',partOfSpeech:'adj.',meaning:'可靠的',usage:'a reliable source：可靠的來源'};
 const explanation=render(h(Card,{item,saved:false,onToggle:noop}));
 assert.match(explanation,/收藏單字 reliable/);assert.match(explanation,/aria-pressed="false"/);assert.doesNotMatch(explanation,/hidden=""/);
 const review=render(h(Card,{item,saved:true,onToggle:noop,review:true,source:'113 年 · 第 41 題',onSource:noop}));
 assert.match(review,/取消收藏單字 reliable/);assert.match(review,/aria-expanded="false"/);assert.match(review,/hidden=""/);assert.match(review,/113 年 · 第 41 題/);
 const Tabs=component('favorites-tabs').default;
 const tabs=render(h(Tabs,{value:'words',counts:{memory:2,wrong:4,questions:1,explanations:2,idioms:5,words:3},onChange:noop}));
 assert.equal((tabs.match(/role="tab"/g)||[]).length,6);assert.equal((tabs.match(/aria-selected="true"/g)||[]).length,1);assert.match(tabs,/id="favorites-tab-words"[^>]*tabIndex="0"/i);
});


test('idiom cards expose a persistent save control',()=>{
 const Card=component('idiom-card').default;
 const entry={term:'江河日下',aliases:[],category:'成語',meaning:'比喻情況愈來愈壞。',example:'局勢江河日下。',questionIds:[],origin:{kind:'典故',reference:'測試',explanation:'測試用說明',url:'https://example.com'}};
 const html=render(h(Card,{entry,year:'all',questions:new Map(),exams:new Map(),saved:true,onToggleSave:noop,onPractice:noop,onViewExplanation:noop}));
 assert.match(html,/取消收藏成語 江河日下/);assert.match(html,/aria-pressed="true"/);
});

test('memory cards start hidden, expose persistent save state and disable saves before cloud hydration',()=>{
 const Card=component('memory-card').default;
 const card={id:'memory-0123456789abcdef',term:'測試觀念',front:'問題',back:'回答',sourceTitle:'章節'};
 const html=render(h(Card,{card,saved:true,onToggle:noop,canSave:false}));
 assert.match(html,/aria-expanded="false"/);assert.match(html,/hidden=""/);assert.match(html,/aria-pressed="true"/);assert.match(html,/disabled=""/);assert.match(html,/正在讀取雲端收藏/);
});
