/** Official PDFs draw these answer slots as lines rather than text glyphs.
 * Checked: 112010 c508 s0101 page 2 (Q12), 115010 c507 s0101 page 2
 * (Q9), 100010 c508 s0102 page 2 (Q24). Preserve raw extraction for audit.
 * Do not infer slots from whitespace globally: indentation, paired statements
 * and extracted tables also contain wide spaces.
 */
const confirmedSlots=new Set(['112-0-12','115-0-9','100-0-24']);
export function restoreChineseBlanks(question){
 if(question.subjectIndex!==0||!confirmedSlots.has(question.id))return question;
 return {...question,stem:question.stem.replace(/(?<=\S)[ \t]{3,}(?=\S)/g,'＿＿＿＿').replace(/＿+/g,'＿＿＿＿')};
}
