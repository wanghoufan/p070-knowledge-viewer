/**
 * P070 production PWA smoke test (desktop Chromium).
 * Run:
 *   cd app && python3 -m http.server 8766 --bind 127.0.0.1
 *   PW_MODULE=<path>/playwright BASE_URL=http://127.0.0.1:8766/ node tests/smoke.cjs
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PW_MODULE || 'playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8766/';
const SHOT = process.env.SHOT_DIR || path.resolve(__dirname, '../../docs/qa/phase2');
const ROOT = path.resolve(__dirname, '../..');
const results = [];
const errors = [];
function ok(n, d) { results.push({ name:n, pass:true, detail:d || '' }); console.log('PASS ' + n + (d ? ' — ' + d : '')); }
function bad(n, d) { results.push({ name:n, pass:false, detail:d || '' }); console.log('FAIL ' + n + (d ? ' — ' + d : '')); }
function check(n, c, d) { c ? ok(n, d) : bad(n, d); }
async function shot(p, n) { try { fs.mkdirSync(SHOT, { recursive:true }); await p.screenshot({ path:path.join(SHOT, n + '.png'), fullPage:false }); } catch {} }

(async () => {
  const browser = await chromium.launch({ channel:'chrome', headless:true });
  const context = await browser.newContext({
    viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true, deviceScaleFactor:2,
    locale:'zh-CN', permissions:['clipboard-read','clipboard-write']
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  try {
    await page.goto(BASE, { waitUntil:'networkidle' });
    await page.waitForSelector('#app .appbar');
    await page.waitForTimeout(1200);
    // first load registers SW; reload once to be controlled
    await page.evaluate(async () => { if ('serviceWorker' in navigator) await navigator.serviceWorker.ready; });
    await page.reload({ waitUntil:'networkidle' });
    await page.waitForSelector('#app .appbar');
    await page.waitForTimeout(800);

    const sw = await page.evaluate(() => ({
      secure:isSecureContext,
      controller:!!navigator.serviceWorker.controller,
      regs:!!navigator.serviceWorker
    }));
    check('PWA 安全上下文与 Service Worker 接管', sw.secure && sw.controller && sw.regs, JSON.stringify(sw));

    const count = await page.$$eval('.item', els => els.length);
    check('首个版本 6 条资料', count === 6, 'items=' + count);
    check('品牌名正确', (await page.$eval('.brand-name', el => el.innerText)) === '随身讲解库');
    check('四 Tab 导航', (await page.$$eval('.navbutton', els => els.length)) === 4);
    await shot(page, '01-home');

    // typography/overflow
    const metrics = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('body *').forEach(el => {
        const txt = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!txt) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 13.9) bad.push({ tag:el.tagName, cls:el.className, fs, text:el.textContent.trim().slice(0, 16) });
      });
      return { overflow:document.documentElement.scrollWidth - innerWidth, bad:bad.slice(0, 6), n:bad.length };
    });
    check('390px 无横向溢出', metrics.overflow <= 1, 'overflow=' + metrics.overflow);
    check('可见文字 ≥14px', metrics.n === 0, metrics.n ? JSON.stringify(metrics.bad) : 'min>=14');

    // search + language + tag
    await page.fill('#search-input', '厨房');
    await page.waitForTimeout(200);
    const searchN = await page.$$eval('.item', els => els.length);
    check('搜索命中', searchN >= 1, 'hits=' + searchN);
    await page.fill('#search-input', '');
    await page.waitForTimeout(150);
    await page.click('.seg [data-val="en"]');
    await page.waitForTimeout(200);
    const enN = await page.$$eval('.item', els => els.length);
    check('英文筛选', enN === 3, 'en=' + enN);
    await page.click('.seg [data-val="all"]');
    await page.waitForTimeout(150);
    await page.click('.tagbtn[data-val="热身"]');
    await page.waitForTimeout(200);
    const tagN = await page.$$eval('.item', els => els.length);
    check('标签筛选', tagN === 1, 'tag=' + tagN);
    await page.click('.tagbtn[data-val="全部"]');
    await page.waitForTimeout(150);
    await page.click('.seg [data-val="all"]');
    await page.waitForTimeout(200);

    // 四 Tab 选中态与滚动恢复
    await page.click('[data-action="tab"][data-val="offline"]');
    await page.waitForTimeout(200);
    const selOffline = await page.$eval('[data-action="tab"][data-val="offline"]', el => el.className);
    check('已缓存 Tab 选中态同步', /active/.test(selOffline), selOffline);
    await page.click('[data-action="tab"][data-val="home"]');
    await page.waitForTimeout(200);
    const scrollBefore = await page.evaluate(() => { window.scrollTo(0, 420); return window.scrollY; });
    await page.waitForTimeout(200);
    await page.click('.item-hit');
    await page.waitForTimeout(400);
    await page.click('[data-action="close-detail"]');
    await page.waitForTimeout(400);
    const scrollAfter = await page.evaluate(() => window.scrollY);
    check('从详情返回恢复滚动位置', Math.abs(scrollAfter - scrollBefore) < 40, scrollBefore + '->' + scrollAfter);

    // detail + demo video
    await page.click('.item-hit');
    await page.waitForSelector('#video-host video');
    await page.waitForTimeout(1500);
    const detail = await page.evaluate(() => ({
      title:document.querySelector('.detail-title')?.innerText,
      summary:document.querySelector('.summary-list')?.innerText.length,
      video:!!document.querySelector('#video-host video'),
      terms:document.querySelectorAll('.term-card').length,
      nav:!!document.querySelector('.bottom')
    }));
    check('详情首屏含标题/总结/播放器/术语', detail.title && detail.summary > 20 && detail.video && detail.terms >= 3, JSON.stringify(detail));
    await shot(page, '02-detail');

    // transcript does not restart video
    await page.evaluate(() => { const v=document.querySelector('#video-host video'); v.currentTime=2; return new Promise(r=>{v.addEventListener('seeked',()=>{v.play().catch(()=>{});setTimeout(r,300)},{once:true})}); });
    const before = await page.$eval('#video-host video', v => { v.pause(); return v.currentTime; });
    await page.click('[data-action="transcript"]');
    await page.waitForTimeout(300);
    const after = await page.$eval('#video-host video', v => v.currentTime);
    check('展开文稿不重启视频', Math.abs(after - before) < 0.3 && (await page.$eval('.acc-body', el => el.innerText.length)) > 50, before + '->' + after);

    // import video -> real OPFS + seek verify
    await page.setInputFiles('#video-file', path.join(ROOT, 'app/assets/demo.mp4'));
    await page.waitForFunction(() => /已缓存|本地副本|保存失败/.test(document.querySelector('#video-status')?.innerText || ''), { timeout:45000 });
    const status = await page.$eval('#video-status', el => el.innerText);
    check('导入视频后标记已缓存', /已缓存/.test(status), status);
    const media = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('p070', 1);
      req.onsuccess = () => {
        const tx = req.result.transaction('media');
        const q = tx.objectStore('media').get('pk1');
        q.onsuccess = () => resolve(q.result || null);
      };
      req.onerror = () => resolve(null);
    }));
    check('媒体记录真实写入并带字节数', media && media.video && media.bytes > 10000, JSON.stringify(media));
    await shot(page, '03-detail-cached');

    // slides (built-in demo deck)
    await page.click('[data-action="slides-open"]');
    await page.waitForSelector('#slide-modal');
    await page.waitForTimeout(1200);
    const s1 = await page.$eval('#slide-count', el => el.innerText);
    await page.click('[data-action="slide-next"]');
    await page.waitForTimeout(500);
    const s2 = await page.$eval('#slide-count', el => el.innerText);
    check('讲解稿 sandbox 打开且翻页', s1 === '1 / 4' && s2 === '2 / 4', s1 + ' -> ' + s2);
    const sandbox = await page.$eval('#slide-frame', el => el.getAttribute('sandbox'));
    check('iframe 无 allow-same-origin', sandbox === 'allow-scripts', sandbox);
    await shot(page, '04-slides');
    await page.click('[data-action="slide-close"]');
    await page.waitForTimeout(300);

    // imported HTML deck on pk2
    await page.click('[data-action="close-detail"]');
    await page.waitForTimeout(300);
    const hits = await page.$$('.item-hit');
    for (const h of hits) if (await h.getAttribute('data-id') === 'pk2') { await h.click(); break; }
    await page.waitForTimeout(400);
    await page.setInputFiles('#html-file', path.join(ROOT, 'app/assets/demo-slide.html'));
    await page.waitForFunction(() => /已保存|HTML/.test(document.querySelector('.slides-entry strong')?.innerText || ''), { timeout:15000 });
    const slideMedia = await page.evaluate(() => new Promise(resolve => {
      const req = indexedDB.open('p070', 1);
      req.onsuccess = () => { const q = req.result.transaction('media').objectStore('media').get('pk2'); q.onsuccess = () => resolve(q.result || null); };
    }));
    check('导入单文件 HTML 并真实写入', slideMedia && slideMedia.slides, JSON.stringify(slideMedia));
    await page.click('[data-action="slides-open"]');
    await page.waitForSelector('#slide-modal');
    await page.waitForTimeout(1200);
    check('导入课件可打开且 iframe 隔离', (await page.$eval('#slide-count', el => el.innerText)) === '1 / 4' && (await page.$eval('#slide-frame', el => el.getAttribute('sandbox'))) === 'allow-scripts');
    await page.click('[data-action="slide-close"]');
    await page.waitForTimeout(200);
    await page.click('[data-action="close-detail"]');
    await page.waitForTimeout(300);
    const hits2 = await page.$$('.item-hit');
    for (const h of hits2) if (await h.getAttribute('data-id') === 'pk1') { await h.click(); break; }
    await page.waitForTimeout(300);

    // source link
    await page.click('[data-action="source-edit"]');
    await page.fill('#source-url', 'https://www.bilibili.com/video/BV1xx411c7mD');
    await page.click('[data-action="save-source"]');
    await page.waitForTimeout(400);
    check('原视频链接保存', (await page.$eval('.detail-meta', el => el.innerText)).length > 0 && (await page.$eval('[data-action="source-open"]', el => !!el)));

    // share
    await page.click('[data-action="share-toggle"]');
    await page.waitForTimeout(300);
    await page.click('[data-action="tab"][data-val="share"]');
    await page.waitForSelector('.share-item');
    await page.click('[data-action="copy-share"]');
    await page.waitForTimeout(400);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
    check('分享链接复制且不含本机地址', clip.includes('bilibili.com') && !/blob:|file:/.test(clip), clip.slice(0, 80));
    await shot(page, '05-share');

    // offline tab
    await page.click('[data-action="tab"][data-val="offline"]');
    await page.waitForTimeout(300);
    const offlineRows = await page.$$eval('.offline-item', els => els.length);
    check('已缓存页显示缓存条目', offlineRows >= 1, 'rows=' + offlineRows);
    await shot(page, '06-offline');

    // settings theme + language
    await page.click('[data-action="tab"][data-val="settings"]');
    await page.waitForTimeout(300);
    await page.click('[data-action="theme-open"]');
    await page.waitForSelector('#sheet-overlay');
    await page.click('[data-action="set-theme"][data-val="dark"]');
    await page.waitForTimeout(300);
    check('深色主题生效', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
    await shot(page, '07-settings-dark');
    await page.click('[data-action="theme-open"]');
    await page.click('[data-action="set-theme"][data-val="system"]');
    await page.waitForTimeout(200);
    await page.click('[data-action="language-open"]');
    await page.click('[data-action="set-language"][data-val="en"]');
    await page.waitForTimeout(300);
    check('英文界面生效', (await page.$$eval('.navbutton > span:not(.icon)', els => els.map(e => e.innerText).join(' '))).indexOf('Library') >= 0);
    await shot(page, '08-settings-en');

    // reload persists theme/language
    await page.reload({ waitUntil:'networkidle' });
    await page.waitForSelector('.appbar');
    const persisted = await page.evaluate(() => ({
      theme:document.documentElement.dataset.theme,
      lang:localStorage.getItem('p070_language')
    }));
    check('刷新后主题/语言保留', persisted.lang === '"en"', JSON.stringify(persisted));
    // back to zh/light for remaining checks
    await page.evaluate(() => { localStorage.setItem('p070_language','"zh"'); localStorage.setItem('p070_theme','"light"'); });
    await page.reload({ waitUntil:'networkidle' });
    await page.waitForSelector('.appbar');

    // import manifest + duplicate handling
    const fixture = path.join(SHOT, 'fixture-manifest.json');
    fs.mkdirSync(SHOT, { recursive:true });
    fs.writeFileSync(fixture, JSON.stringify({ version:1, items:[
      { id:'pk1', title:'匹克球基础规则（更新文字）', en:'Rules updated', lang:'zh', topic:'匹克球', tags:['规则'], summary:['更新后的重点'], transcript:'更新后的文稿', terms:[['Serve','发球']], source:'' },
      { id:'test-01', title:'测试分享条目', en:'Share test', lang:'en', topic:'测试', tags:['测试'], summary:['用于分享测试'], transcript:'test', terms:[['Test','测试']], source:'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }
    ]}));
    await page.setInputFiles('#json-file', fixture);
    await page.waitForSelector('#dialog-mask', { timeout:5000 });
    const dupText = await page.$eval('#dialog-mask', el => el.innerText);
    check('重复 id 弹出四选项', /保留原素材/.test(dupText) && /跳过/.test(dupText), dupText.slice(0, 40));
    const dupBtns = await page.$$('#dialog-mask .choices button');
    await dupBtns[2].click(); // skip duplicates
    await page.waitForTimeout(1200);
    const afterImport = await page.$$eval('.item', els => els.length);
    check('导入新增 1 条、跳过重复', afterImport === 7, 'items=' + afterImport);

    // share new item
    await page.click('.item-hit[data-id="test-01"]').catch(async () => {
      const cards = await page.$$('.item-hit');
      for (const c of cards) if (await c.getAttribute('data-id') === 'test-01') { await c.click(); break; }
    });
    await page.waitForTimeout(300);
    await page.click('[data-action="share-toggle"]');
    await page.waitForTimeout(200);
    await page.click('[data-action="tab"][data-val="share"]');
    await page.waitForTimeout(300);
    const rows = await page.$$eval('.share-item', els => els.length);
    check('分享清单含两条', rows >= 2, 'rows=' + rows);

    // offline reload with SW (true shell cache)
    await page.evaluate(() => navigator.serviceWorker.ready);
    await context.setOffline(true);
    await page.reload({ waitUntil:'domcontentloaded' });
    await page.waitForSelector('.appbar', { timeout:10000 });
    const offlineHome = await page.$$eval('.item', els => els.length);
    check('断网刷新仍可从壳缓存启动', offlineHome >= 6, 'items=' + offlineHome);
    await shot(page, '09-offline-reload');
    const oh = await page.$$('.item-hit');
    for (const h of oh) if (await h.getAttribute('data-id') === 'pk1') { await h.click(); break; }
    await page.waitForSelector('#video-host video');
    await page.waitForTimeout(700);
    const offlineSeek = await page.evaluate(async () => {
      const v = document.querySelector('#video-host video');
      if (v.readyState < 1) await new Promise(r => v.addEventListener('loadedmetadata', r, { once:true }));
      const s = t => new Promise(r => { const h = () => { v.removeEventListener('seeked', h); setTimeout(() => r(v.currentTime), 100); }; v.addEventListener('seeked', h); v.currentTime = t; });
      const a = await s(2); const b = await s(v.duration * 0.8);
      return { dur:v.duration, a, b, src:v.currentSrc };
    });
    check('离线状态可播放并 seek 已缓存视频', offlineSeek.a >= 1 && Math.abs(offlineSeek.b - offlineSeek.dur * 0.8) < 1 && /^blob:/.test(offlineSeek.src), JSON.stringify(offlineSeek));
    await shot(page, '10-offline-video');
    await context.setOffline(false);
    await page.click('[data-action="close-detail"]');
    await page.waitForTimeout(300);
    await page.click('[data-action="tab"][data-val="offline"]');
    await page.waitForTimeout(300);
    const beforeClear = await page.$$eval('.offline-item', els => els.length);
    await page.click('[data-action="clear-cache"]');
    await page.waitForSelector('#dialog-mask');
    const clearBtns = await page.$$('#dialog-mask .choices button');
    await clearBtns[0].click();
    await page.waitForTimeout(600);
    const afterClear = await page.$$eval('.offline-item', els => els.length);
    check('清理全部缓存需确认且清空列表', beforeClear >= 1 && afterClear === 0, beforeClear + '->' + afterClear);

    check('无 JS 运行时错误', errors.length === 0, errors.slice(0, 3).join(' | '));
  } catch (e) {
    bad('测试脚本异常', e.message);
    try { await shot(page, '99-fail'); } catch {}
  }

  const failed = results.filter(r => !r.pass);
  console.log('\n---');
  console.log('TOTAL ' + results.length + ' PASS ' + (results.length - failed.length) + ' FAIL ' + failed.length);
  fs.mkdirSync(SHOT, { recursive:true });
  fs.writeFileSync(path.join(SHOT, 'smoke-result.json'), JSON.stringify({ base:BASE, at:new Date().toISOString(), results, errors }, null, 2));
  await browser.close();
  process.exit(failed.length ? 1 : 0);
})();
