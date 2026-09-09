import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
mkdirSync('qa-results',{recursive:true});
const report=[];
for(const [service,port] of [['finance',4183]]) {
 for(const width of [390,850,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  try {
   await page.goto(`http://127.0.0.1:${port}/${service}`);
   await page.locator('[data-poppy-services="dashboard"]').waitFor();
   if(width<=900) {
    if(service==='office'||service==='market') await page.getByRole('button',{name:'メニューを開く',exact:true}).click();
    if(service==='finance') await page.locator('.mobile-menu-button').click();
    if(service==='color') await page.locator('.hc-mobile-nav button').last().click();
   }
   const sidebar=page.locator('[data-poppy-services="sidebar"]:visible').last();
   await sidebar.waitFor({state:'visible',timeout:5000});
   assert.equal(await sidebar.locator('a').count(),4);
   assert.equal(await sidebar.locator('[aria-current="page"]').count(),1);
   for(const link of await sidebar.locator('a').all()) {
    await link.scrollIntoViewIfNeeded();
    const box=await link.boundingBox();assert.ok(box&&box.width>=44&&box.height>=44);
    assert.ok(box.x>=-1&&box.x+box.width<=width+1,'link must fit viewport');
   }
   await page.screenshot({path:`qa-results/${service}-${width}-sidebar.png`});
   assert.doesNotMatch(await sidebar.innerText(),/準備中|トライアル/);
   if(service==='market') assert.doesNotMatch(await page.locator('aside').innerText(),/無料プラン|トライアル|スタンダード|プロプラン/);
   report.push({service,width,check:'sidebar links, current service, touch targets',passed:true});
  } catch(e) {report.push({service,width,passed:false,error:e.message});await page.screenshot({path:`qa-results/${service}-${width}-sidebar-fail.png`});}
  await page.close();
 }
 // Each link must issue a document request to the canonical app, escaping its local router.
 for(const variant of ['sidebar','dashboard']) {
  for(const target of ['office','market','finance','color']) {
   const page=await browser.newPage({viewport:{width:1440,height:1000}});
   try {
    await page.route('https://app.hoikupoppy.ai/**',async route=>{
     assert.equal(route.request().resourceType(),'document');
     await route.fulfill({contentType:'text/html',body:'<h1>Canonical destination reached</h1>'});
    });
    await page.goto(`http://127.0.0.1:${port}/${service}`);
    await page.locator(`[data-poppy-services="${variant}"] a[href="https://app.hoikupoppy.ai/${target}"]`).click();
    await page.getByRole('heading',{name:'Canonical destination reached'}).waitFor();
    assert.equal(page.url(),`https://app.hoikupoppy.ai/${target}`);
    report.push({service,variant,target,check:'canonical document transfer (destination stub)',passed:true});
   } catch(e) {report.push({service,variant,target,passed:false,error:e.message});}
   await page.close();
  }
 }
}
writeFileSync('qa-results/navigation-tests.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({passed:report.filter(r=>r.passed).length,failed:report.filter(r=>!r.passed)},null,2));
await browser.close();
process.exitCode=report.some(r=>!r.passed)?1:0;
