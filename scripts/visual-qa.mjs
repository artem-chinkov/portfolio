import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results/visual', {recursive:true});
const browser=await chromium.launch();
const errors=[];
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/portfolio/ru/manager/');
  await page.evaluate(()=>document.fonts.ready);
  for(const id of ['experience','services','projects','recommendations','contacts'])await page.locator('#'+id).scrollIntoViewIfNeeded();
  await page.locator('#about').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/visual/${name}.png`,fullPage:true});
  await page.locator('#projects').scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/visual/${name}-projects.png`});
  console.log(`${name}: width=${await page.evaluate(()=>document.documentElement.scrollWidth)}, Nunito=${await page.evaluate(()=>document.fonts.check('16px "Nunito Variable"'))}`);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({errors}));
if(errors.length)process.exitCode=1;
