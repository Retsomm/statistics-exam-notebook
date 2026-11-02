/** Restore visible answer slots lost when PDF drawing lines became whitespace.
 * Only English fill-in questions are eligible: PDF line-wrap indentation and
 * reservation-table spacing are not answer slots. Keep original `text` intact.
 */
export const restoreEnglishBlanks = question => {
  if (question.subjectIndex !== 1 || question.number < 36) return question;
  if(question.englishFormat==='reading')return question;
  if(question.englishFormat==='cloze'){
    const numbers=question.clozeNumbers;
    const pattern=new RegExp(`\\b(${numbers.join('|')})\\b`,'g');
    return {...question,passage:question.passage.replace(pattern,'____$1____')};
  }
  const standalone = question.number <= 40 ||
    ([111, 115].includes(question.year) && question.number <= 45)||question.englishFormat==='standalone';
  if (standalone) {
    // Some PDF extractions prepend fragments from an overlapping text layer.
    const repeatedNumber = new RegExp(`^[A-Za-z](?:[ \\t]+[A-Za-z])*[ \\t]*\\n[ \\t]*${question.number}[ \\t]+`);
    let stem = question.stem.replace(repeatedNumber, '');
    // A wrapped line starts after a newline: do not turn its indentation into
    // a blank. Existing underscore blanks are normalized to the same length.
    stem = stem.replace(/_+/g, '_____')
      .replace(/(?<=\S)[ \t]{3,}(?=\S)/g, ' _____ ');
    // This leading slot was stripped entirely by the original PDF parser.
    if (question.id === '111-1-38' && !stem.startsWith('_____')) stem = '_____ ' + stem;
    return {...question, stem};
  }
  if (question.number >= 41 && question.number <= 45 && question.passage) {
    const passage = question.passage.replace(/[ \t]{2,}(4[1-5])[ \t]{2,}/g, ' ____$1____ ');
    return {...question, passage, stem: `請選出文中第 ${question.number} 空格最合適的答案。`};
  }
  return question;
};
