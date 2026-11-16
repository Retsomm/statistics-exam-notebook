import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const open=async(page:any)=>page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'模擬考',exact:true}).click();
for(const width of [390,1440])test(`mock exam saves answers, timing and scores at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');await open(page);
 await expect(page.getByRole('table')).toBeVisible();await expect(page.getByRole('row')).toHaveCount(11);
 await page.getByRole('button',{name:'建立新一回四科模擬考',exact:true}).click();await page.getByRole('button',{name:'開始國文',exact:true}).click();
 await expect(page.getByLabel('模擬考計時')).toBeVisible();
 await page.getByRole('group',{name:/選項/}).getByRole('button').first().click();
 await expect(page.locator('.feedback')).toHaveCount(0);await expect(page.getByRole('button',{name:'查看解析',exact:true})).toHaveCount(0);
 await page.reload();await open(page);await expect(page.getByRole('group',{name:/選項/}).getByRole('button').first()).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('模擬考計時').getByRole('button',{name:'提前交卷',exact:true}).click();await page.getByRole('button',{name:'確認交卷並計分',exact:true}).click();
 await expect(page.getByText(/提前交卷 · 用時/)).toBeVisible();
 await page.getByRole('button',{name:'檢視作答與解析',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await page.reload();await open(page);await expect(page.getByText(/提前交卷 · 用時/)).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
test('expired mock paper submits automatically after reload and preserves elapsed and remaining time',async({page})=>{
 await page.goto('/demo/');await open(page);await page.getByRole('button',{name:'建立新一回四科模擬考',exact:true}).click();await page.getByRole('button',{name:'開始國文',exact:true}).click();
 await page.evaluate(()=>{for(const key of Object.keys(localStorage)){try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s?.mockRuns?.length){s.mockRuns[0].papers[0].startedAt=new Date(Date.now()-3601000).toISOString();localStorage.setItem(key,JSON.stringify(s));}}catch{}}});
 await page.reload();await open(page);await expect(page.getByText('時間到自動交卷 · 用時 60:00 · 剩餘 00:00',{exact:true})).toBeVisible();
 await page.reload();await open(page);await expect(page.getByText('時間到自動交卷 · 用時 60:00 · 剩餘 00:00',{exact:true})).toBeVisible();
});

test('finishing all answers automatically scores and retains the result',async({page})=>{
 await page.goto('/demo/');await open(page);await page.getByRole('button',{name:'建立新一回四科模擬考',exact:true}).click();await page.getByRole('button',{name:'開始國文',exact:true}).click();
 const answers=Object.fromEntries(JSON.parse(readFileSync('data/bank.json','utf8')).questions.map((q:any)=>[q.id,q.accepted[0].split('')]));
 await page.addInitScript(({answers})=>{for(const key of Object.keys(localStorage)){try{const s=JSON.parse(localStorage.getItem(key)||'null');if(s?.mockRuns?.length){const p=s.mockRuns[0].papers[0];if(!p.completedAt){p.choices=Object.fromEntries(p.ids.map((id:string)=>[id,answers[id]]));p.index=p.ids.length-1;localStorage.setItem(key,JSON.stringify(s));}}}catch{}}},{answers});
 await page.reload();await open(page);await page.getByRole('button',{name:'保存並下一題',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByText('100 分',{exact:true})).toBeVisible();await expect(page.getByText(/提前交卷 · 用時/)).toBeVisible();
});
