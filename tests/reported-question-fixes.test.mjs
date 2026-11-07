import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {vocabularyId} from '../lib/vocabulary.mjs';
const read=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
test('reported SQL NULL question teaches every syntax alternative and survives regeneration',()=>{
 const reviewed=read('scripts/data-processing/reviewed-explanations.json')['114-3d-24'];
 assert.deepEqual(read('data/explanations/114-3d.json')['114-3d-24'],reviewed);
 assert.deepEqual(read('public/explanations/114-3d.json')['114-3d-24'],reviewed);
 assert.match(reviewed.summary,/小安.*小美.*小林/s);assert.match(reviewed.summary,/email = NULL.*UNKNOWN/s);
 assert.match(reviewed.options.A,/EQUAL EMPTY.*空字串/s);assert.match(reviewed.options.B,/UNKNOWN/);assert.match(reviewed.options.C,/IS EMPYT.*IS EMPTY/s);assert.match(reviewed.options.D,/TRUE.*FALSE/s);
 assert.equal(new Set(Object.values(reviewed.options)).size,4);
});
test('reported fiscal-policy explanation separates each affected group and short versus long term',()=>{
 const entry=read('public/explanations/113-1.json')['113-1-4'];
 assert.match(entry.summary,/2 萬元.*20 萬元.*5%.*0.5%/s);
 assert.match(entry.options.A,/消費者.*本國就業/s);assert.match(entry.options.B,/累進.*配套/s);assert.match(entry.options.C,/漲價歸公/);assert.match(entry.options.D,/總需求.*長期供給/s);
});
test('reported English question has full shared passage, translated choices, and collectible words from every choice',()=>{
 const entry=read('public/explanations/113-1.json')['113-1-49'],group=read('data/english-passages.json')['113-1-46'],vocabulary=read('public/vocabulary.json');
 assert.deepEqual(entry.passageTranslation.paragraphs,group.paragraphs);assert.equal(group.paragraphs.length,3);
 assert.match(group.paragraphs[0],/斯里蘭卡.*巴基斯坦.*孟加拉.*伊朗/s);assert.match(group.paragraphs[1],/殖民.*英語能力/s);assert.match(group.paragraphs[2],/電影.*故事書.*社會倫理/s);
 for(const letter of ['A','B','C','D'])assert.match(entry.options[letter],/^完整翻譯：/);
 for(const word of ['potential','medium','risk','education','nation','social','cultural','development','decline','marginalization','underprivileged','overwhelming','frustration','talent','widespread','discrimination','master']){
  const card=entry.questionVocabulary.find(item=>item.word===word);assert.ok(card,word);assert.ok(vocabulary[vocabularyId('113-1',card)].questionIds.includes('113-1-49'),word);
 }
 for(const id of group.questionIds)assert.deepEqual(read('public/explanations/113-1.json')[id].passageTranslation.paragraphs,group.paragraphs);
});

import {reflowQuestionText} from '../lib/question-text.mjs';
test('retired report is not mapped to statistics and the former Chinese word split reflows naturally',()=>{
 assert.equal(read('data/bank.json').questions.some(q=>q.id==='111-2-6'),false);
 assert.equal(read('data/bank.json').questions.find(q=>q.id==='111-2s-6').subject,'統計學大意');
 assert.equal(reflowQuestionText('①索引語\n  言 ②分類系統'),'①索引語言 ②分類系統');
});
