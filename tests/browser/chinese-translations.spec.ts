import {test,expect} from '@playwright/test';

for(const width of [390,1440])test(`classical readings and option translations are complete at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/demo/');
 const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
 async function practice(year:string,query:string){
  await bank.click();
  await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);
  await page.getByRole('searchbox',{name:'搜尋題目'}).fill(query);
  await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
  await page.locator('.answer-list .option').first().click();
  await page.getByRole('button',{name:'確認答案',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'查看解析',exact:true}).click();
 }
 await practice('103','童寄者');
 let dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'文言文完整白話翻譯',exact:true})).toBeVisible();
 await expect(dialog.getByRole('region',{name:'文言文白話翻譯'})).toContainText('拿刀殺死了這個強盜');
 await expect(dialog).toContainText('完整的答案判斷及逐選項解題理由仍在編寫中');
 await expect(dialog.getByRole('heading',{name:'逐選項詳解',exact:true})).toHaveCount(0);
 await expect(dialog.getByRole('button',{name:'收藏解析',exact:true})).toBeEnabled();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await practice('109','陰陽之和');
 dialog=page.getByRole('dialog');
 const reading=dialog.getByRole('region',{name:'文言文白話翻譯'});
 await expect(reading).toContainText('不應偏袒或迎合某一個人');
 await expect(reading.getByRole('heading',{name:'各選項原句白話翻譯'})).toBeVisible();
 await expect(reading.locator('h4')).toHaveCount(4);
 await expect(reading).toContainText('王者施行正道便寬廣平正');
 await expect(dialog.getByRole('heading',{name:'逐選項詳解',exact:true})).toHaveCount(1);
 await expect(dialog).not.toContainText('完整白話翻譯：');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});
