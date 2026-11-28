import {expect,test} from '@playwright/test';

for(const width of [390,1440]){
 test(`the original question figure is visible before answering at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:960});
  await page.goto('/demo/');
  const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
  const openQuestion=async(year:string,query:string)=>{
   await bank.click();
   await page.getByRole('combobox',{name:'選擇年度'}).selectOption(year);
   await page.getByRole('searchbox',{name:'搜尋題目'}).fill(query);
   await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
  };
  await openQuestion('103','敘利亞');
  const figure=page.getByRole('img',{name:/敘利亞生產可能線/});
  await expect(figure).toBeVisible();
  await expect(figure.locator('text')).toHaveText(['0','Y','X','A','C','D','E','B']);
  await expect(page.locator('.question-figure + .answer-list')).toBeVisible();
  await expect(page.getByRole('link',{name:/官方原卷 PDF/})).toHaveAttribute('href',/#page=3$/);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('group',{name:'單選題選項'}).getByRole('button',{name:/D點/}).click();
  await page.getByRole('button',{name:'確認答案'}).click();
  await expect(page.locator('.feedback')).toContainText('答對了');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'查看解析'}).click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.getByRole('button',{name:'關閉解析',exact:true}).click();
  await openQuestion('114','甲乙兩班分數之盒狀圖');
  await expect(page.getByRole('img',{name:/甲、乙兩班分數盒狀圖/})).toBeVisible();
  await expect(page.locator('.figure-reference')).toHaveCount(0);

  await openQuestion('111','下表是大雄');
  const electionSystems=page.locator('.question-stem table');
  await expect(electionSystems.locator('tr').nth(1).locator('td')).toHaveText(['甲','ν','','ν']);
  await expect(electionSystems.locator('tr').nth(2).locator('td')).toHaveText(['乙','','ν','']);

  await openQuestion('115','日本國會眾議院選舉');
  const seats=page.locator('.question-stem table');
  await expect(seats.locator('tr').first().locator('th')).toHaveCount(10);
  await expect(seats.locator('tr').nth(1).locator('td')).toHaveText(['席次','261','96','32','10','1','41','3','11','10']);
  await expect(page.locator('.question-stem')).toHaveText(/總計\s+465 席/);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 });
}
