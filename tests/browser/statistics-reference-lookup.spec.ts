import {expect,test,type Page} from '@playwright/test';

async function openQuestion(page:Page,search:string,year='115'){
 await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill(search);
 await page.locator('.question-row').getByRole('button',{name:'練習 →',exact:true}).click();
}

test('114 confidence interval questions use the corresponding appendix before scoring',async({page})=>{
 await openQuestion(page,'某電視公司從客戶中隨機抽出','114');
 await page.getByRole('button',{name:'查表：t 分配臨界值表'}).click();
 const studentT=page.getByRole('dialog',{name:'t 分配臨界值表'});
 const df49=studentT.getByRole('row').filter({has:page.getByRole('rowheader',{name:'49',exact:true})});
 await expect(df49.getByRole('cell').nth(2)).toHaveText('2.010');
 await expect(studentT.getByRole('link')).toHaveAttribute('href',/#page=6$/);
 await studentT.getByRole('button',{name:'關閉查表'}).click();

 await openQuestion(page,'玩具商最近一批出廠','114');
 await page.getByRole('button',{name:'查表：標準常態分配表'}).click();
 const normal=page.getByRole('dialog',{name:'標準常態分配表'});
 const z19=normal.getByRole('row').filter({has:page.getByRole('rowheader',{name:'1.9',exact:true})});
 await expect(z19.getByRole('cell').nth(6)).toHaveText('0.4750');
 await expect(normal.getByRole('link')).toHaveAttribute('href',/#page=5$/);
});

for(const width of [390,1440])test(`Chi-square critical values are available before scoring at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:820});
 await openQuestion(page,'青少年與成年人飲料偏好');
 const lookup=page.getByRole('button',{name:'查表：卡方分配臨界值表'});
 const dialog=page.getByRole('dialog',{name:'卡方分配臨界值表'});
 const choice=page.getByRole('button',{name:/A\s*6\.251/});
 await expect(page.locator('.question-stem').getByRole('table')).toContainText('1100');
 await expect(dialog).toHaveCount(0);
 await choice.click();
 await lookup.click();
 await expect(dialog).toBeVisible();
 const headers=await dialog.getByRole('columnheader').allTextContents();
 const row=dialog.getByRole('row').filter({has:page.getByRole('rowheader',{name:'3',exact:true})});
 await expect(row.getByRole('cell').nth(headers.indexOf('0.050')-1)).toHaveText('7.8147');
 await expect(row.getByRole('cell').nth(headers.indexOf('0.100')-1)).toHaveText('6.2514');
 await expect(dialog.getByRole('link',{name:'查看考選部原卷附表（第 7 頁）'})).toHaveAttribute('href',/#page=7$/);
 await expect(dialog.getByRole('button',{name:'關閉查表'})).toBeFocused();
 if(width===390){
  const scroll=dialog.getByRole('region',{name:'卡方分配臨界值表捲動區'});
  expect(await scroll.evaluate(element=>element.scrollWidth>element.clientWidth)).toBe(true);
  await scroll.evaluate(element=>element.scrollBy({left:200}));
  expect(await scroll.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
 }
 await page.keyboard.press('Escape');
 await expect(dialog).toHaveCount(0);
 await expect(lookup).toBeFocused();
 await expect(choice).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'確認答案'}).click();
 await expect(page.locator('.feedback')).toContainText('正確答案：B');
 await expect(page.getByRole('button',{name:'查看解析'})).toBeVisible();
 await page.getByRole('button',{name:'查看解析'}).click();
 await expect(page.getByRole('dialog')).toContainText('7.8147');
});

test('Practice shows the appropriate table only on questions with a reference',async({page})=>{
 await openQuestion(page,'某品牌家電用品');
 await page.getByRole('button',{name:'查表：標準常態累加機率表'}).click();
 const dialog=page.getByRole('dialog',{name:'標準常態累加機率表'});
 await expect(dialog.getByRole('table')).toContainText('0.9940');
 await expect(dialog.getByRole('link',{name:'查看考選部原卷附表（第 6 頁）'})).toHaveAttribute('href',/#page=6$/);
 await dialog.getByRole('button',{name:'關閉查表'}).click();
 await expect(dialog).toHaveCount(0);

 await openQuestion(page,'青少年與成年人飲料偏好');
 await expect(page.getByRole('button',{name:'查表：標準常態累加機率表'})).toHaveCount(0);
 await expect(page.getByRole('button',{name:'查表：卡方分配臨界值表'})).toBeVisible();

 await openQuestion(page,'某公司員工的能力測驗成績');
 await expect(page.getByRole('button',{name:/查表：/})).toHaveCount(0);
});
