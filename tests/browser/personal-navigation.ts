import type {Page} from '@playwright/test';
export async function openPersonalSection(page:Page,section:string){
 await page.getByRole('navigation',{name:'主要導覽'}).getByRole('button',{name:'個人中心',exact:true}).click();
 await page.getByRole('tablist',{name:'個人中心功能'}).getByRole('tab',{name:section,exact:true}).click();
}
