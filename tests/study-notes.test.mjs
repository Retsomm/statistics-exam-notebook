import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const notes=JSON.parse(readFileSync(new URL('../data/study-notes.json',import.meta.url))).notes;
test('legacy generic professional cards are replaced without removing common-subject notes',()=>{
 assert.equal(notes.filter(note=>note.subjectIndex===2||note.subjectIndex===3).length,0);
 assert.ok(notes.some(note=>note.subjectIndex===0));assert.ok(notes.some(note=>note.subjectIndex===1));
 assert.equal(notes.length,new Set(notes.map(note=>note.id)).size);
});
