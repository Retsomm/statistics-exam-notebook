import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`new civics and English teaching and saved words at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/demo/');
 const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
 async function practice(year:string,query:string){
  await bank.click();await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);
  await page.getByRole('searchbox',{name:'搜尋題目'}).fill(query);
  await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
  await page.locator('.answer-list .option').first().click();
  await page.getByRole('button',{name:'確認答案',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'查看解析',exact:true}).click();
 }
 await practice('112','學雜費兩年共需');
 let dialog=page.getByRole('dialog');
 await expect(dialog).toContainText('總機會成本92萬');
 await expect(dialog.locator('.option-explanations>div')).toHaveCount(4);
 await expect(dialog).not.toContainText('尚在編寫');
 expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await practice('98','Where is Susan from');dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('region',{name:'題組全文翻譯'})).toContainText('Susan Brown，西雅圖');
 await expect(dialog).toContainText('官方更正亦接受D');
 await expect(dialog.locator('.option-explanations>div')).toHaveCount(4);
 const save=dialog.getByRole('button',{name:'收藏單字 Seattle',exact:true});
 await save.click();await expect(dialog.getByRole('button',{name:'取消收藏單字 Seattle',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await page.getByRole('button',{name:'查看解析',exact:true}).click();
 await expect(page.getByRole('dialog').getByRole('button',{name:'取消收藏單字 Seattle',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await practice('102','Online learning is also called distance education');dialog=page.getByRole('dialog');
 const translation=dialog.getByRole('region',{name:'題組全文翻譯'});
 await expect(translation).toContainText('〔43〕教授');await expect(translation).toContainText('〔47〕會被認可');
 await expect(dialog).toContainText('professors教授');
 expect(await dialog.evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();
 expect(errors).toEqual([]);
});
