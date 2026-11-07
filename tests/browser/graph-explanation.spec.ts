import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`graph explanation shows both traversal orders at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('combobox',{name:'選擇年度'}).selectOption('114');
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill('深度優先');
 await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
 await page.locator('.answer-list .option').first().click();
 await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查看解析',exact:true}).click();
 const dialog=page.getByRole('dialog'),figure=dialog.locator('.explanation-diagram');
 await expect(figure.locator('svg')).toBeVisible();await expect(figure.locator('.tree-node')).toHaveCount(6);
 await expect(figure).toContainText('A，B，D，E，C，F');await expect(figure).toContainText('A，B，C，D，E，F');
 await expect(dialog).toContainText('呼叫堆疊');await expect(dialog).toContainText('Heap');
 expect(await figure.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBeTruthy();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
