import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`27 data processing sections render and practice at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'重點整理',exact:true}).click();await page.getByRole('button',{name:'完整重點',exact:true}).click();
 await page.getByRole('group',{name:'重點整理科目'}).getByRole('button',{name:/^資料處理大意/}).click();
 const select=page.getByLabel('選擇資料處理章節');await expect(select.locator('option')).toHaveCount(28);
 for(const chapter of ['1-2','2-5','3-4','4-3','4-4']){
  await select.selectOption(chapter);await expect(page.locator('.note-card')).toHaveCount(1);
  await page.locator('.note-lesson>summary').click();
  if(chapter==='1-2')await expect(page.locator('.note-code pre')).toContainText('processArray');
  if(chapter==='2-5'){await expect(page.locator('.note-diagram svg')).toBeVisible();await expect(page.locator('.note-diagram svg text')).toHaveCount(7);}
  if(chapter==='3-4')await expect(page.locator('.note-rich-sections')).toContainText('190.114.1.0');
  if(chapter==='4-3')await expect(page.locator('.note-rich-sections')).toContainText('教師編號 → 辦公室');
  if(chapter==='4-4'){
   await expect(page.locator('.note-table-scroll tbody tr').last()).toContainText('小王');
   const color=await page.locator('.note-table-scroll thead th').first().evaluate(el=>getComputedStyle(el).backgroundColor);
   expect(color).toBe('rgb(16, 42, 60)');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await select.selectOption('3-4');await page.getByRole('button',{name:/練習關聯考題/}).click();
 await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
});
