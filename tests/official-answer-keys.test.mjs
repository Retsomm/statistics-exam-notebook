import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const keys=JSON.parse(fs.readFileSync(new URL('../data/official-answer-keys.json',import.meta.url)));
const bank=JSON.parse(fs.readFileSync(new URL('../data/bank.json',import.meta.url)));

test('all papers retain their published official answer keys',()=>{
 assert.equal(Object.keys(keys).length,bank.exams.length);
 for(const exam of bank.exams){
  const key=keys[exam.id];
  assert.ok(key,`missing answer key for ${exam.id}`);
  assert.equal(key.source,exam.answerSource);
  const questions=bank.questions.filter(question=>question.examId===exam.id).sort((a,b)=>a.number-b.number);
  assert.equal(key.answers.length,questions.length,exam.id);
  questions.forEach((question,index)=>assert.ok(question.allCredit||question.accepted.includes(key.answers[index]),`${question.id}: published answer ${key.answers[index]}`));
 }
});
