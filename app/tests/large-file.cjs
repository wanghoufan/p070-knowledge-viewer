/** 64 MB local video save + seek regression. */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PW_MODULE || 'playwright');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766/';
const FILE = process.env.TEST_VIDEO || path.resolve(__dirname, '../../probe/test.mp4');
const SHOT = path.resolve(__dirname, '../../docs/qa/phase2');

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  const context = await browser.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, deviceScaleFactor:2, locale:'zh-CN' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const result = { file:FILE, size:fs.statSync(FILE).size, at:new Date().toISOString(), checks:[] };
  const add = (name, pass, detail) => { result.checks.push({ name, pass, detail }); console.log((pass?'PASS ':'FAIL ') + name + (detail?' — '+detail:'')); };

  try {
    await page.goto(BASE, { waitUntil:'networkidle' });
    await page.evaluate(async () => { if ('serviceWorker' in navigator) await navigator.serviceWorker.ready; });
    await page.reload({ waitUntil:'networkidle' });
    await page.waitForSelector('.item');
    // open pk2 (no demo clip)
    const cards = await page.$$('.item-hit');
    for (const c of cards) if (await c.getAttribute('data-id') === 'pk2') { await c.click(); break; }
    await page.waitForSelector('#video-host');
    const t0 = Date.now();
    await page.setInputFiles('#video-file', FILE);
    await page.waitForFunction(() => /已缓存|本地副本|保存失败/.test(document.querySelector('#video-status')?.innerText || ''), { timeout:120000 });
    const elapsed = Date.now() - t0;
    const status = await page.$eval('#video-status', el => el.innerText);
    add('大视频保存后标记已缓存', /已缓存/.test(status), status + ' / ' + elapsed + 'ms');
    const media = await page.evaluate(() => new Promise(resolve => {
      const req = indexedDB.open('p070', 1);
      req.onsuccess = () => {
        const q = req.result.transaction('media').objectStore('media').get('pk2');
        q.onsuccess = () => resolve(q.result || null);
      };
    }));
    add('媒体记录字节一致', !!media && media.bytes === fs.statSync(FILE).size, JSON.stringify(media));
    const seek = await page.evaluate(async () => {
      const v = document.querySelector('#video-host video');
      if (!v) return { err:'no video' };
      if (v.readyState < 1) await new Promise(r => v.addEventListener('loadedmetadata', r, { once:true }));
      const s = t => new Promise(r => { const h = () => { v.removeEventListener('seeked', h); setTimeout(() => r(v.currentTime), 100); }; v.addEventListener('seeked', h); v.currentTime = t; });
      const a = await s(5); const b = await s(v.duration * 0.8);
      return { dur:v.duration, a, b, seekable:v.seekable.length ? [v.seekable.start(0), v.seekable.end(0)] : [] };
    });
    add('大视频 5s 与 80% seek 读回', seek.a && Math.abs(seek.a - 5) < 1 && Math.abs(seek.b - seek.dur * 0.8) < 1, JSON.stringify(seek));
    await page.screenshot({ path:path.join(SHOT, '10-large-video.png') });
    add('无 JS 运行时错误', errors.length === 0, errors.slice(0,3).join(' | '));
  } catch (e) {
    add('测试脚本异常', false, e.message);
  }
  fs.mkdirSync(SHOT, { recursive:true });
  fs.writeFileSync(path.join(SHOT, 'large-file-result.json'), JSON.stringify(result, null, 2));
  await browser.close();
  process.exit(result.checks.every(c => c.pass) ? 0 : 1);
})();
