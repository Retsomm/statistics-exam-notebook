import {test,expect} from '@playwright/test';
for(const width of [390,1440])test(`report queue separates resolved items without an Issue step at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});
 await page.addInitScript(()=>{const snapshotJSON=JSON.stringify({year:114,subject:'資料處理大意',number:20,stem:'正規式測試',options:[],accepted:['C']});localStorage.setItem('yueri:reports:v1:guest',JSON.stringify([{id:'pending-report',questionId:'114-3d-20',kind:'explanation',detail:'需要解題步驟',createdAt:'2026-11-07T01:00:00Z',snapshotJSON},{id:'resolved-report',questionId:'114-3d-17',kind:'explanation',detail:'需要走訪圖',status:'resolved',resolution:'已補圖且部署完成',createdAt:'2026-11-06T01:00:00Z',snapshotJSON},{id:'retired-report',questionId:'111-2-6',kind:'scan',detail:'舊科目已下架',status:'resolved',resolution:'原科目已退役，未改動統計題目',createdAt:'2026-10-25T01:00:00Z',snapshotJSON}]));});
 await page.goto('/demo/');await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'備份與資料',exact:true}).click();
 await page.getByRole('button',{name:'查看待處理回報 · 1 筆',exact:true}).click();
 await expect(page.getByText('需要解題步驟',{exact:true})).toBeVisible();await expect(page.getByText('需要走訪圖',{exact:true})).toHaveCount(0);
 await expect(page.locator('a[href*="issues/new"]')).toHaveCount(0);
 await page.getByRole('button',{name:'已處理 · 2',exact:true}).click();await expect(page.getByText('需要走訪圖',{exact:true})).toBeVisible();await expect(page.getByText('查核結果：已補圖且部署完成',{exact:true})).toBeVisible();
 await expect(page.getByRole('button',{name:'此題已不在現行題庫',exact:true})).toBeDisabled();await expect(page.getByText('需要解題步驟',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.getByRole('button',{name:'待處理 · 1',exact:true}).click();await page.getByRole('button',{name:'查看這一題',exact:true}).click();await page.getByRole('button',{name:'回報題目問題',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('問題說明').fill('缺少會員與交易的例子');await dialog.getByRole('button',{name:'儲存回報',exact:true}).click();await expect(dialog.getByRole('heading',{name:'回報已保存，等待查核'})).toBeVisible();await expect(dialog.locator('a[href*="issues/new"]')).toHaveCount(0);
});
