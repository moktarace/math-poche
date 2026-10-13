import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await fs.mkdir('tmp/qa/readability',{recursive:true});
try{
 await page.goto('http://localhost:4200');await page.locator('.sequence-card').first().waitFor();
 assert.ok(await page.locator('.nav-item').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=16));
 await page.screenshot({path:'tmp/qa/readability/desktop.png'});
 await page.locator('.card-main').first().click();await page.locator('.manual-days button').first().waitFor();
 assert.equal(await page.locator('.manual-days button').count(),4);
 assert.ok(await page.locator('.manual-objectives li').count()>0);
 await page.screenshot({path:'tmp/qa/readability/overview-desktop.png'});
 await page.getByRole('button',{name:'Lire le guide',exact:true}).click();
 await page.getByRole('button',{name:'Atelier dirigé',exact:true}).click();
 await page.locator('.page-text:visible .manual-step').first().waitFor();
 assert.ok(await page.locator('.page-text:visible .manual-bullet').count()>5);
 assert.ok(await page.locator('.page-text:visible .manual-lesson-objective').count()>0);
 await page.getByRole('button',{name:'Texte agrandi',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('dialog[open] .page-text')?.dataset.textSize==='large');
 assert.equal(await page.locator('.page-text:visible').evaluate(e=>getComputedStyle(e).fontSize),'21px');
 await page.screenshot({path:'tmp/qa/readability/reader-desktop.png'});
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.querySelector('dialog[open]').scrollWidth<=innerWidth),`dialog overflow at ${width}`);
  await page.screenshot({path:`tmp/qa/readability/reader-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Vue d’ensemble',exact:true}).first().click();await page.locator('.manual-days button').first().waitFor();
 await page.screenshot({path:'tmp/qa/readability/overview-mobile.png'});
 await page.getByRole('button',{name:'Fermer la séquence'}).click();
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`library overflow at ${width}`);
  await page.screenshot({path:`tmp/qa/readability/library-${width}.png`});
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('.mobile-nav').getByRole('button',{name:'Guides',exact:true}).click();await page.locator('.guide-card').first().waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'tmp/qa/readability/guides-mobile.png'});
 await page.reload();await page.locator('.sequence-card').first().waitFor();await page.locator('.card-main').first().click();await page.getByRole('button',{name:'Lire le guide',exact:true}).click();
 await page.locator('.page-text:visible').waitFor();assert.equal(await page.locator('.page-text:visible').getAttribute('data-text-size'),'large');
 assert.deepEqual(errors,[]);
 console.log('PASS: manual sections, day links, font sizes, persisted reader preference, desktop and mobile layouts at 320/390/768/1440px; no JavaScript errors.');
}catch(error){await page.screenshot({path:'tmp/qa/readability/failure.png'});console.log(errors);throw error;}finally{await browser.close();}
