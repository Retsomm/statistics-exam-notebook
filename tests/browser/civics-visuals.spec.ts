import {expect,test} from '@playwright/test';

const papers=[
 {year:98,questions:[[32,3,1]]},
 {year:100,questions:[[27,3,1],[32,3,1]]},
 {year:103,questions:[[35,3,0]]},
 {year:108,questions:[[14,2,1],[31,3,1]]},
 {year:109,questions:[[49,4,0]]},
 {year:111,questions:[[25,3,1],...[46,47,48,49,50].map(number=>[number,4,2])]},
 {year:115,questions:[[3,1,1],[11,2,1],[12,2,1]]},
];

for(const width of [390,1440]){
 test(`all audited civics and English tables and figures appear before answering at ${width}px`,async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width,height:920});
  await page.goto('/demo/');
  const bank=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true});
  const paper=page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'公民與英文',exact:true})});
  const questionCard=page.locator('.question-card');
  for(const {year,questions} of papers){
   await bank.click();
   await page.getByRole('combobox',{name:'選擇年度'}).selectOption(String(year));
   await paper.getByRole('button',{name:'開始練習',exact:true}).click();
   for(const [number,pdfPage,tableCount] of questions){
    await page.getByRole('button',{name:`跳到本回合第 ${number} 題`,exact:true}).click();
    await expect(page.getByText(`${year} 年 · 公民與英文 · 第 ${number} 題`,{exact:true})).toBeVisible();
    await expect(page.getByRole('link',{name:/官方原卷 PDF/})).toHaveAttribute('href',new RegExp(`#page=${pdfPage}$`));
    await expect(questionCard.locator('table')).toHaveCount(tableCount);
    for(const table of await questionCard.locator('table').all())await expect(table).toBeVisible();
    if(year===103)await expect(questionCard.getByRole('img',{name:/敘利亞生產可能線/})).toBeVisible();
    if(year===109)await expect(questionCard.locator('.figure-reference')).toHaveCount(0);
    if(year===111&&number>=46){
     const tables=questionCard.locator('.question-passage table');
     await expect(tables.nth(0).locator('tr').nth(0).locator('td').nth(2)).toHaveText('Identification');
     await expect(tables.nth(0).locator('tr').nth(1).locator('td').nth(2)).toHaveText('E-mail');
     await expect(tables.nth(1).locator('th').last()).toHaveText('Seat');
     await expect(tables.nth(1).locator('td').last()).toHaveText('Car 9-16A');
     await expect(questionCard.locator('.question-passage')).toContainText('Total Amount TWD 700');
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
    await expect(page.getByRole('dialog')).toHaveCount(0);
   }
  }
 });
}
