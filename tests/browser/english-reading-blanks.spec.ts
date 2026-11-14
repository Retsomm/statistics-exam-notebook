import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`104 reading answer slot appears in practice and review at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('combobox',{name:'選擇年度'}).selectOption('104');
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill('The journey taken together by the faithful followers');
 await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
 await expect(page.locator('.question-stem')).toContainText('called a _____');
 await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('called a _____');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
