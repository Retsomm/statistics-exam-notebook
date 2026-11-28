import {openPersonalSection} from './personal-navigation';
import {test,expect} from '@playwright/test';

test('history-paper progress resumes after wrong-question practice and a reload',async({page})=>{
 const overview=page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'學習總覽'});
 const hero=page.getByRole('region',{name:'歷屆試題進度'});
 const paper=page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'統計學大意',exact:true})});
 await page.goto('/demo/');
 await paper.getByRole('button',{name:'開始練習'}).click();
 await page.locator('.answer-list .option').first().click();
 await page.getByRole('button',{name:'確認答案'}).click();
 await expect(page.locator('.feedback')).toContainText('錯題本');
 await page.getByRole('button',{name:'下一題'}).click();
 await page.locator('.answer-list .option').nth(1).click();
 await overview.click();
 await page.getByRole('button',{name:'開始錯題複習'}).click();
 await expect(page.getByRole('heading',{name:'錯題重練'})).toBeVisible();
 await page.reload();
 await expect(hero).toContainText('115 年 · 統計學大意');
 await expect(hero).toContainText('已作答 1 / 40 題');
 await expect(page.getByRole('button',{name:'繼續錯題重練'})).toBeVisible();
 await hero.getByRole('button',{name:'接續歷屆試題'}).click();
 await expect(page.getByText('115 年 · 統計學大意 · 第 2 題',{exact:true})).toBeVisible();
 await expect(page.locator('.answer-list .option').nth(1)).toHaveAttribute('aria-pressed','true');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'上一題'}).click();
 await expect(page.locator('.feedback')).toContainText('錯題本');
 await page.getByRole('button',{name:'查看解析'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
});

test('an overwritten legacy round can resume from the historical paper card',async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('yueri:next:v1:guest',JSON.stringify({
   version:1,bookmarks:[],history:[],notes:{},wrong:{},
   records:{'115-2s-1':{answer:'D',correct:true,attempts:1,time:'2026-11-27T08:00:00.000Z'}},
   session:{ids:['115-0-1'],index:0,title:'錯題重練',choices:{},checked:{}},
  }));
 });
 await page.goto('/demo/');
 await expect(page.getByRole('region',{name:'歷屆試題進度'})).toContainText('依已提交紀錄接續');
 const paper=page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'統計學大意',exact:true})});
 await paper.getByRole('button',{name:'接續作答'}).click();
 await expect(page.getByText('115 年 · 統計學大意 · 第 2 題',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'本回合進度 1 / 40'})).toBeVisible();
});

test('mobile practice, wrong answers, bookmarks and readable text',async({page})=>{
  await page.goto('/demo');
  await page.getByRole('button',{name:'前往歷屆題庫'}).click();
  await page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'國文',exact:true})}).first().getByRole('button',{name:/開始練習/}).click();
  await expect(page.locator('.question-stem')).toBeVisible();
  expect(await page.locator('.question-stem').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.getByRole('button',{name:'收藏題目',exact:true}).click();
  await page.locator('.answer-list .option').first().click();
  await page.getByRole('button',{name:'確認答案',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('錯題本');
  await openPersonalSection(page,'收藏與錯題');
  await page.getByRole('tab',{name:/錯題本/}).click();
  await expect(page.locator('.question-row')).toHaveCount(1);
  await openPersonalSection(page,'收藏與錯題');
  await page.getByRole('tab',{name:/收藏題目/}).click();
  await expect(page.locator('.question-row')).toHaveCount(1);
});
test('Firebase setup failure is explicit and guest practice remains available',async({page})=>{
  await page.route('**/__/firebase/init.json',route=>route.fulfill({status:404,body:'Not configured'}));
  await page.goto('/sign-in/');
  await expect(page.locator('.login-card').getByRole('alert')).toContainText('Firebase 設定');
  await expect(page.getByRole('button',{name:'以 Google 帳戶登入'})).toBeDisabled();
  await page.getByRole('link',{name:'先以訪客模式練習'}).click();
  await expect(page.getByRole('heading',{name:'歡迎回到你的考試練習。'})).toBeVisible();
});
test('explanation popup is opt-in, saves independently, and next question closes it',async({page})=>{
 await page.goto('/demo/');
 await page.locator('.exam-card').filter({has:page.getByRole('heading',{name:'國文',exact:true})}).getByRole('button',{name:'開始練習',exact:false}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.locator('.answer-list .option').first().click();
 await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查看解析',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 await expect(dialog.getByRole('heading',{name:'題目解析',exact:true})).toBeVisible();
 await expect(dialog.getByRole('button',{name:'收藏解析',exact:true})).toBeEnabled();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 await dialog.getByRole('button',{name:'收藏解析',exact:true}).click();
 await expect(dialog.getByRole('button',{name:'取消收藏解析',exact:true})).toHaveAttribute('aria-pressed','true');
 await dialog.getByRole('button',{name:'下一題',exact:false}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(page.getByText('115 年 · 國文 · 第 2 題',{exact:false})).toBeVisible();
 await openPersonalSection(page,'收藏與錯題');
 await page.getByRole('tab',{name:/收藏解析/}).click();
 await expect(page.locator('.question-row')).toHaveCount(1);
 await page.getByRole('button',{name:'查看解析 →',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.reload();
 await openPersonalSection(page,'收藏與錯題');
 await page.getByRole('tab',{name:/收藏解析/}).click();
 await expect(page.locator('.question-row')).toHaveCount(1);
 await page.getByRole('button',{name:/取消收藏第/}).click();
 await expect(page.locator('.question-row')).toHaveCount(0);
});

test('English word cards can be saved, reviewed, searched and removed in unified favorites',async({page})=>{
 await page.goto('/demo/');
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'歷屆題庫',exact:true}).click();
 await page.getByRole('searchbox',{name:'搜尋題目'}).fill('talent');
 await page.locator('.question-row').first().getByRole('button',{name:'練習 →',exact:true}).click();
 await page.locator('.answer-list .option').first().click();await page.getByRole('button',{name:'確認答案',exact:true}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'查看解析',exact:true}).click();
 const save=page.getByRole('dialog').getByRole('button',{name:/^收藏單字 /}).first();
 const word=(await save.getAttribute('aria-label'))!.replace('收藏單字 ','');await save.click();
 await expect(page.getByRole('dialog').getByRole('button',{name:`取消收藏單字 ${word}`,exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'關閉解析',exact:true}).click();
 await openPersonalSection(page,'收藏與錯題');
 await page.getByRole('tab',{name:/收藏單字/}).click();
 const card=page.locator('.saved-vocabulary .vocabulary-card');await expect(card).toHaveCount(1);
 await expect(card.getByRole('button',{name:'顯示中文與例句'})).toHaveAttribute('aria-expanded','false');
 await card.getByRole('button',{name:'顯示中文與例句'}).click();
 await expect(card.getByRole('button',{name:'隱藏中文與例句'})).toHaveAttribute('aria-expanded','true');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.reload();await openPersonalSection(page,'收藏與錯題');await page.getByRole('tab',{name:/收藏單字/}).click();
 await expect(page.locator('.saved-vocabulary .vocabulary-card')).toHaveCount(1);
 await page.getByRole('searchbox',{name:'搜尋收藏單字'}).fill('zzzz_no_match');await expect(page.getByRole('heading',{name:'沒有符合的收藏單字'})).toBeVisible();
 await page.getByRole('searchbox',{name:'搜尋收藏單字'}).fill(word);
 await page.getByRole('button',{name:`取消收藏單字 ${word}`,exact:true}).click();
 await expect(page.getByRole('heading',{name:'還沒有收藏單字'})).toBeVisible();
});
