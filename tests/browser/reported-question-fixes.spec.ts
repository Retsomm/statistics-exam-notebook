import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`reported explanations show concrete reasons and English cards at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
 async function open(year:string,query:string){await bank.click();await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);await page.getByRole('searchbox',{name:'搜尋題目'}).fill(query);await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'查看解析',exact:true}).click();}
 await open('114','檢查欄位值是否為空值');let dialog=page.getByRole('dialog');
 await expect(dialog.locator('.option-explanations>div')).toHaveCount(4);await expect(dialog.locator('.option-explanations>div').nth(1)).toContainText('UNKNOWN');await expect(dialog.locator('.option-explanations>div').nth(2)).toContainText('IS EMPYT');await expect(dialog.locator('code.explanation-inline-code').filter({hasText:'WHERE email IS NULL'}).first()).toBeVisible();
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();await open('113','政府利用租稅課徵');dialog=page.getByRole('dialog');await expect(dialog).toContainText('0.5%');await expect(dialog.locator('.option-explanations>div').nth(3)).toContainText('長期供給');
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();await open('113','What is the potential risk');dialog=page.getByRole('dialog');await expect(dialog.getByRole('region',{name:'題組全文翻譯'})).toContainText('社會倫理');
 await expect(dialog.locator('.option-explanations')).toContainText('來自弱勢家庭的兒童');await expect(dialog.locator('.option-explanations')).toContainText('無法精通英語的人');
 await dialog.getByRole('button',{name:'收藏單字 talent',exact:true}).click();await expect(dialog.getByRole('button',{name:'取消收藏單字 talent',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();await page.getByRole('button',{name:'查看解析',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'取消收藏單字 talent',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
