import {test,expect} from '@playwright/test';
import course from '../../data/statistics-course.json';
for(const width of [390,1440])test(`all 39 statistics lessons render and practice at ${width}px`,async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width,height:900});await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'重點整理',exact:true}).click();
 await page.getByRole('group',{name:'重點整理科目'}).getByRole('button',{name:/^統計學大意/}).click();
 const select=page.getByLabel('選擇統計學章節');await expect(select.locator('option')).toHaveCount(40);
 for(const note of course.notes){
  await select.selectOption(note.chapter);await expect(page.locator('.note-card')).toHaveCount(1);await expect(page.locator('.note-card h3')).toHaveText(note.title);
  await page.locator('.note-lesson>summary').click();await expect(page.locator('.note-example')).toContainText(note.example);
  for(const section of note.sections){if('plot'in section&&section.plot)await expect(page.getByRole('img',{name:section.plot.description,exact:true})).toBeVisible();}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await select.selectOption('10-1');await page.locator('.note-lesson>summary').click();
 expect(await page.locator('.note-table-scroll thead th').first().evaluate(el=>getComputedStyle(el).backgroundColor)).toBe('rgb(16, 42, 60)');
 await page.getByRole('button',{name:/練習關聯考題/}).click();await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
});
