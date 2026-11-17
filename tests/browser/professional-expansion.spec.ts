import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

const openQuestion=async(page:Page,year:string,search:string)=>{
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);
 await expect(page.locator('.exam-card')).toHaveCount(4);
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill(search);
 await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
};
const showExplanation=async(page:Page)=>{
 await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查看解析',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
};
for(const width of [390,1440]){
 test(`professional years, formulas, source links and hidden explanations at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/demo/');
  await openQuestion(page,'101','z²');
  await expect(page.locator('.answer-list')).toContainText('√(2π)');
  await page.locator('.answer-list .option').first().click();await showExplanation(page);
  await expect(page.getByRole('dialog')).toContainText('E(Z²)');
  await expect(page.getByRole('dialog').locator('.option-explanations>div')).toHaveCount(4);
  await expect(page.getByRole('dialog').locator('.explanation-sources a').first()).toHaveAttribute('href',/wwwq\.moex\.gov\.tw/);
  await page.getByRole('button',{name:'收藏解析',exact:true}).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
 test(`Basic source and correction-specific double marks are usable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/demo/');
  await openQuestion(page,'105','Call M(X)');
  const code=page.locator('.question-stem pre');await expect(code).toHaveCount(1);
  await expect(code).toContainText('X = 100');await expect(code).toContainText('End Sub');
  await page.locator('.answer-list .option').nth(1).click();await showExplanation(page);
  await expect(page.getByRole('dialog')).toContainText('ByRef');
  await page.keyboard.press('Escape');
  await openQuestion(page,'97','會被否決的最小');
  await page.locator('.answer-list .option').nth(0).click();await page.locator('.answer-list .option').nth(3).click();
  await expect(page.locator('.answer-list .option[aria-pressed="true"]')).toHaveCount(2);
  await showExplanation(page);await expect(page.getByRole('dialog')).toContainText('上確界');
  await page.keyboard.press('Escape');await expect(page.locator('.feedback')).toContainText('本題得分：2.5 / 2.5 分');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
 test(`restored weighted graph table and shortest path explanation at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/demo/');
  await openQuestion(page,'112','最小成本擴張樹');
  await expect(page.locator('.question-passage table')).toHaveCount(1);
  await expect(page.locator('.question-passage table')).toContainText('1–6');
  await page.locator('.answer-list .option').nth(1).click();await showExplanation(page);
  await expect(page.getByRole('dialog')).toContainText('50');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
 test(`statistics table labels and missing ANOVA cells stay aligned at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/demo/');
  await openQuestion(page,'112','畢業流向');
  const table=page.locator('.question-stem table');await expect(table).toHaveCount(1);
  await expect(table.locator('tr').first().locator('th')).toHaveCount(4);
  await expect(table).toContainText('女生');await expect(table).toContainText('自行創業');
  await page.locator('.answer-list .option').nth(2).click();await showExplanation(page);
  await expect(page.getByRole('dialog')).toContainText('13.42');await page.keyboard.press('Escape');
  await openQuestion(page,'99','2073.6');
  const anova=page.locator('.question-stem table');await expect(anova).toHaveCount(1);
  await expect(anova.locator('tr').nth(3)).toHaveText('誤差—20288—');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });

}
