import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`reported merge-sort explanation teaches each alternative at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('combobox',{name:'選擇年度'}).selectOption('111');
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill('下列何種排序法使用分治法');
 await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
 await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);await page.getByRole('button',{name:'查看解析',exact:true}).click();
 const dialog=page.getByRole('dialog'),figure=dialog.locator('.explanation-diagram');
 await expect(figure.locator('svg')).toBeVisible();await expect(figure.locator('.tree-node')).toHaveCount(5);await expect(figure).toContainText('1，2，3');await expect(figure).toContainText('排序後的合併結果');
 await expect(dialog.locator('.option-explanations>div')).toHaveCount(4);await expect(dialog.locator('.option-explanations>div').nth(0)).toContainText('相鄰');await expect(dialog.locator('.option-explanations>div').nth(1)).toContainText('拆分');await expect(dialog.locator('.option-explanations>div').nth(2)).toContainText('最小值');await expect(dialog.locator('.option-explanations>div').nth(3)).toContainText('逐筆');
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
