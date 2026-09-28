import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results/visual', {recursive:true});
const browser=await chromium.launch();
const errors=[];
for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4174/portfolio/ru/manager/');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.screen-stage')?.dataset.intro==='false');
  for(const id of ['about','experience','services','projects','recommendations','contacts']){
    await page.evaluate(id=>{location.hash=id;},id);
    await page.waitForFunction(id=>document.getElementById(id)?.closest('.screen-page')?.dataset.active==='true'&&document.querySelector('.screen-stage')?.dataset.transitioning==='false',id);
    await page.screenshot({path:`test-results/visual/${name}-${id}.png`});
  }
  console.log(`${name}: width=${await page.evaluate(()=>document.documentElement.scrollWidth)}, Nunito=${await page.evaluate(()=>document.fonts.check('16px "Nunito Variable"'))}`);
  await page.close();
}
await browser.close();
console.log(JSON.stringify({errors}));
if(errors.length)process.exitCode=1;
