import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`Chinese answer slots appear in practice and review at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
 for(const [year,query] of [['112','一位醫師作家'],['115','我們讀書'],['100','文學家白先勇']]){
  await bank.click();await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);await page.getByRole('searchbox',{name:'搜尋題目'}).fill(query);
  await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
  const stem=page.locator('.question-stem');await expect(stem).toContainText('＿＿＿＿');
  expect((await stem.innerText()).match(/＿＿＿＿/g)).toHaveLength(2);await expect(stem.locator('pre,.question-table-wrap')).toHaveCount(0);
  await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('＿＿＿＿');
  await page.getByRole('button',{name:'關閉解析',exact:true}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
});
