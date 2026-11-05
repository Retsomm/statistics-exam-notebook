import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`statistics study notes and explanation dialog work at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 const nav=page.getByRole('navigation',{name:'主要導覽'});await nav.getByRole('button',{name:'重點整理',exact:true}).click();
 for(const subject of ['統計學大意','資料處理大意']){await page.getByRole('group',{name:'重點整理科目'}).getByRole('button',{name:new RegExp(`^${subject}`)}).click();await expect(page.locator('.note-card')).toHaveCount(8);}
 await page.getByRole('group',{name:'重點整理科目'}).getByRole('button',{name:/^統計學大意/}).click();await page.getByRole('button',{name:/練習關聯考題/}).first().click();
 await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
 const optionHeading=page.locator('.option-explanations dt').first();
 const [letterTop,textTop]=await Promise.all([optionHeading.locator('.option-explanation-letter').evaluate(el=>el.getBoundingClientRect().top),optionHeading.locator('.option-explanation-text').evaluate(el=>el.getBoundingClientRect().top)]);
 expect(Math.abs(letterTop-textTop)).toBeLessThan(2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
