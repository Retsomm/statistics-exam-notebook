import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const css=readFileSync(new URL('../app/site-themes.css',import.meta.url),'utf8');
const luminance=hex=>{
 const channels=hex.match(/[a-f\d]{2}/gi).map(value=>parseInt(value,16)/255);
 const [red,green,blue]=channels.map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
 return 0.2126*red+0.7152*green+0.0722*blue;
};
const contrast=(one,two)=>{
 const first=luminance(one),second=luminance(two);
 return (Math.max(first,second)+0.05)/(Math.min(first,second)+0.05);
};
const colors=rules=>Object.fromEntries([...rules.matchAll(/--([\w-]+):\s*(#[a-f\d]{6})/gi)].map(([,name,value])=>[name,value]));

test('custom dark themes preserve readable text and distinguishable control borders',()=>{
 const common=colors(css.match(/:root\[data-site-theme\]:not\(\[data-site-theme="ocean"\]\)\{([^}]+)\}/)[1]);
 const themes=[...css.matchAll(/:root\[data-site-theme="([^"]+)"\]\{([^}]+)\}/g)];
 assert.equal(themes.length,4);
 for(const [,name,rules] of themes){
  const palette={...common,...colors(rules)};
  for(const surface of ['bg','paper','input','sage']){
   for(const foreground of ['ink','muted','green']){
    assert.ok(contrast(palette[foreground],palette[surface])>=4.5,`${name}: ${foreground} on ${surface}`);
   }
  }
  assert.ok(contrast(palette['button-ink'],palette.button)>=4.5,name);
  for(const surface of ['paper','input','sage']){
   assert.ok(contrast(palette.line,palette[surface])>=3,`${name}: border on ${surface}`);
  }
  for(const feedback of ['#203b2d','#442830']){
   assert.ok(contrast(palette.ink,feedback)>=4.5,name);
  }
 }
});
