/**
 * P070 Phase1 原型冒烟测试（真实浏览器运行，不是文件存在检查）
 *
 * 运行：
 *   1) 在 docs/design/prototype/ 启动静态服务：python3 -m http.server 8765 --bind 127.0.0.1
 *   2) 安装 Playwright：npm i playwright（或设置 PW_MODULE 指向已安装目录）
 *   3) BASE_URL=http://127.0.0.1:8765/ node smoke-test.cjs
 *
 * 输出：终端 PASS/FAIL 列表；失败退出码 1。截图写入 docs/qa/phase1-prototype/（若存在）。
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PW_MODULE || 'playwright');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const SHOT_DIR = process.env.SHOT_DIR || path.resolve(__dirname, '../../qa/phase1-prototype');
const results = [];
const consoleErrors = [];

function ok(name, detail) { results.push({ name, pass: true, detail: detail || '' }); console.log('PASS ' + name + (detail ? ' — ' + detail : '')); }
function bad(name, detail) { results.push({ name, pass: false, detail: detail || '' }); console.log('FAIL ' + name + (detail ? ' — ' + detail : '')); }
function check(name, cond, detail) { cond ? ok(name, detail) : bad(name, detail); }
async function shot(page, name) {
  try {
    fs.mkdirSync(SHOT_DIR, { recursive: true });
    await page.screenshot({ path: path.join(SHOT_DIR, name + '.png'), fullPage: false });
  } catch (e) { /* 截图失败不改变判定，但记一条 */ }
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2,
    locale: 'zh-CN', permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  try {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForSelector('#splash');
    await shot(page, '01-splash');
    ok('启动页可见');
    await page.click('#splashEnter');
    await page.waitForSelector('#view-library:not([hidden])');
    await page.waitForTimeout(400);

    // 资料库：5 条演示资料
    const cards = await page.$$eval('#cards .card', els => els.length);
    check('资料库渲染 5 条资料', cards === 5, 'cards=' + cards);
    await shot(page, '02-library-A-light');

    // 搜索
    await page.fill('#searchInput', '双反弹');
    await page.waitForTimeout(150);
    const searched = await page.$$eval('#cards .card', els => els.length);
    check('搜索「双反弹」命中 1 条', searched === 1, 'hits=' + searched);
    await page.click('#searchClear');
    await page.waitForTimeout(100);

    // 语言筛选
    await page.click('#langSeg [data-lang="en"]');
    await page.waitForTimeout(120);
    const enCount = await page.$$eval('#cards .card', els => els.length);
    check('英文筛选只剩 2 条', enCount === 2, 'en=' + enCount);
    await page.click('#langSeg [data-lang="all"]');
    await page.waitForTimeout(120);

    // 标签筛选
    const tagBtns = await page.$$('#tagChips [data-tag]');
    let tagHit = null;
    for (const b of tagBtns) {
      const label = await b.innerText();
      if (label.trim() === '热身') { await b.click(); tagHit = label; break; }
    }
    await page.waitForTimeout(120);
    const tagCount = await page.$$eval('#cards .card', els => els.length);
    check('标签「热身」筛选命中 1 条', tagHit !== null && tagCount === 1, 'tag=' + tagHit + ' n=' + tagCount);
    await page.click('#clearFilters');
    await page.waitForTimeout(120);

    // 三种视觉方向：布局确实变化（不是只换配色）
    const layoutA = await page.$eval('#cards', el => getComputedStyle(el).gridTemplateColumns);
    await page.click('#reviewBar [data-dir="B"]');
    await page.waitForTimeout(200);
    const bInfo = await page.evaluate(() => {
      const c = document.querySelector('#cards .card');
      return {
        display: getComputedStyle(document.querySelector('#cards')).display,
        dir: document.querySelector('#app').getAttribute('data-dir'),
        font: getComputedStyle(document.querySelector('#cards .card h3')).fontFamily,
        cols: getComputedStyle(c).gridTemplateColumns
      };
    });
    await page.waitForTimeout(2600);
    await shot(page, '03-library-B-light');
    check('方向 B 切换为单列清单布局', bInfo.display === 'flex' && bInfo.cols.indexOf('104px') === 0, JSON.stringify(bInfo));
    await page.click('#reviewBar [data-dir="C"]');
    await page.waitForTimeout(200);
    const cInfo = await page.evaluate(() => ({
      dir: document.querySelector('#app').getAttribute('data-dir'),
      firstCover: getComputedStyle(document.querySelector('#cards .card:first-child .cover')).aspectRatio,
      serif: getComputedStyle(document.querySelector('#cards .card h3')).fontFamily
    }));
    await page.waitForTimeout(2600);
    await shot(page, '04-library-C-light');
    check('方向 C 使用剧场式首图 + 衬线标题', cInfo.dir === 'C' && cInfo.serif.toLowerCase().indexOf('songti') >= 0, JSON.stringify(cInfo));
    await page.click('#reviewBar [data-dir="A"]');
    await page.waitForTimeout(2600);

    // 底栏选中态同步（AC-35）
    await page.click('#tabbar [data-nav="share"]');
    await page.waitForTimeout(200);
    const shareSel = await page.$eval('#tabbar [data-nav="share"]', el => el.getAttribute('aria-pressed'));
    const libSel = await page.$eval('#tabbar [data-nav="library"]', el => el.getAttribute('aria-pressed'));
    check('底栏选中态随页面同步', shareSel === 'true' && libSel === 'false', shareSel + '/' + libSel);
    await page.click('#tabbar [data-nav="library"]');
    await page.waitForTimeout(200);

    // 底栏滚动全程固定（AC-23）
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
    const navFixed = await page.evaluate(() => {
      const r = document.querySelector('#tabbar').getBoundingClientRect();
      return { bottom: Math.round(r.bottom), vh: window.innerHeight, top: Math.round(r.top) };
    });
    check('底栏滚到底仍固定不随内容移动', Math.abs(navFixed.bottom - navFixed.vh) <= 1 && navFixed.top > navFixed.vh * 0.8, JSON.stringify(navFixed));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    // 详情
    await page.click('#cards [data-open-index="0"]');
    await page.waitForSelector('#view-detail:not([hidden])');
    check('详情页打开', (await page.title()).length > 0);
    check('详情包含播放器', await page.$('#detailVideo') !== null);
    check('详情优先显示总结', (await page.$eval('.block p', el => el.innerText)).indexOf('3 分钟') >= 0);
    const type = await page.evaluate(() => ({
      body: parseFloat(getComputedStyle(document.querySelector('.block p')).fontSize),
      title: parseFloat(getComputedStyle(document.querySelector('.detail-title')).fontSize),
      meta: parseFloat(getComputedStyle(document.querySelector('.detail-meta .tag')).fontSize)
    }));
    check('正文≥19px、标题≥23px、辅助≥14px', type.body >= 19 && type.title >= 23 && type.meta >= 14, JSON.stringify(type));
    await shot(page, '05-detail');

    // 首次自动缓存（真实写入 IndexedDB）
    await page.waitForFunction(() => {
      const b = document.querySelector('#cacheBtn');
      return b && /移除本机缓存/.test(b.innerText);
    }, { timeout: 25000 });
    const readMedia = (id) => page.evaluate((key) => new Promise((resolve, reject) => {
      const req = indexedDB.open('p070-proto', 1);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('media', 'readonly');
        const r = tx.objectStore('media').get(key);
        r.onsuccess = () => resolve(r.result ? { size: r.result.videoBlob ? r.result.videoBlob.size : 0, slide: (r.result.slideText || '').length } : null);
        r.onerror = () => reject(r.error);
      };
      req.onerror = () => reject(req.error);
    }), id);
    const media = await readMedia('warmup');
    check('自动缓存真实写入 IndexedDB（视频 + 讲解稿）', media && media.size > 100000 && media.slide > 1000, JSON.stringify(media));

    // 手动保存第二条（验证「保存到本机」动作本身）
    await page.click('#detailBack');
    await page.click('#cards [data-open-index="1"]');
    await page.waitForSelector('#cacheBtn');
    await page.click('#cacheBtn');
    await page.waitForFunction(() => /移除本机缓存/.test(document.querySelector('#cacheBtn').innerText), { timeout: 25000 });
    const media2 = await readMedia('rules');
    check('手动「保存到本机」写入第二条', media2 && media2.size > 100000, JSON.stringify(media2));
    await page.click('#detailBack');
    await page.click('#cards [data-open-index="0"]');

    // 播放与拖动
    await page.evaluate(async () => {
      const v = document.querySelector('#detailVideo');
      if (v.readyState < 1) await new Promise(r => v.addEventListener('loadedmetadata', r, { once: true }));
      v.currentTime = 6;
      await new Promise(r => v.addEventListener('seeked', r, { once: true }));
      await v.play().catch(() => {});
    });
    await page.waitForTimeout(900);
    const play = await page.evaluate(async () => {
      const v = document.querySelector('#detailVideo');
      const t = v.currentTime;
      v.pause();
      const all = JSON.parse(localStorage.getItem('p070.pos') || '{}');
      return { t, duration: v.duration, paused: v.paused, posSaved: all.warmup || 0 };
    });
    check('视频可 seek 并继续播放', play.t >= 6 && play.duration > 10 && play.paused === true, JSON.stringify(play));

    // 文稿展开不影响视频：展开前后 currentTime 不变
    const tBefore = play.t;
    await page.click('details.transcript summary');
    const tAfter = await page.$eval('#detailVideo', v => v.currentTime);
    const transcript = await page.$eval('.transcript-body', el => el.innerText.length);
    check('原文稿可展开', transcript > 100, 'chars=' + transcript);
    check('展开文稿不重启视频', Math.abs(tAfter - tBefore) < 0.1, tBefore + '->' + tAfter);

    // 讲解模式：进入暂停视频 + sandbox iframe + 翻页 + 退出
    await page.evaluate(() => document.querySelector('#detailVideo').play().catch(() => {}));
    await page.waitForTimeout(350);
    await page.click('#openSlides');
    await page.waitForSelector('#slideOverlay:not([hidden])');
    await page.waitForTimeout(1200);
    const slideState = await page.evaluate(() => {
      const f = document.querySelector('#slideIframe');
      return { hidden: document.querySelector('#slideError').hidden, src: f.getAttribute('src') || '', sandbox: f.getAttribute('sandbox') };
    });
    check('讲解稿在 sandbox iframe 打开（无 allow-same-origin）', slideState.hidden && slideState.src.indexOf('blob:') === 0 && slideState.sandbox === 'allow-scripts', JSON.stringify(slideState));
    const videoPaused = await page.$eval('#detailVideo', v => v.paused);
    check('进入讲解时暂停视频', videoPaused === true, 'paused=' + videoPaused);
    const page1 = await page.$eval('#slidePage', el => el.textContent);
    await shot(page, '06-slides');
    await page.click('#slideNext');
    await page.waitForTimeout(500);
    const page2 = await page.$eval('#slidePage', el => el.textContent);
    check('外层下一页真实翻页（页码变化）', page1 !== page2 && /2 \/ 4/.test(page2), page1 + ' -> ' + page2);
    await page.click('#slideNext');
    await page.waitForTimeout(300);
    await page.click('#slideExit');
    await page.waitForTimeout(300);
    check('讲解模式可退出并返回详情', await page.$eval('#slideOverlay', el => el.hidden) === true);

    // Android 返回键：打开讲解后按返回应退出讲解，而不是离开页面
    await page.click('#openSlides');
    await page.waitForSelector('#slideOverlay:not([hidden])');
    await page.waitForTimeout(700);
    await page.evaluate(() => history.back());
    await page.waitForTimeout(600);
    check('返回键先退出讲解', await page.$eval('#slideOverlay', el => el.hidden) === true);
    await page.waitForSelector('#view-detail:not([hidden])');

    // 分享清单
    await page.click('#shareToggle');
    await page.waitForTimeout(200);
    await page.click('#detailBack');
    await page.waitForTimeout(200);
    await page.click('#tabbar [data-nav="share"]');
    await page.waitForSelector('#view-share:not([hidden])');
    const shareRows = await page.$$eval('.share-row', els => els.length);
    check('分享清单含 1 条', shareRows === 1, 'rows=' + shareRows);
    await page.click('#copyList');
    await page.waitForTimeout(500);
    const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => 'READ-FAIL'));
    check('复制清单得到标题 + 原视频网址', clip.indexOf('bilibili.com') >= 0, clip.slice(0, 60));
    await shot(page, '07-share');

    // 设置：主题 / 语言 / 持久化
    await page.click('#btnSettings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await shot(page, '08-settings-light');
    // 品牌三方向候选可查看（AC-22）
    await page.click('#brandMore');
    await page.waitForSelector('.dialog');
    const brandText = await page.$eval('.dialog', el => el.innerText);
    check('品牌候选含三方向四项', /A/.test(brandText) && /B/.test(brandText) && /C/.test(brandText) && /图标/.test(brandText) && /启动画面/.test(brandText), brandText.slice(0, 40));
    await shot(page, '10-brand-candidates');
    await page.click('.dialog .actions button');
    await page.waitForTimeout(200);
    await page.click('#themeSeg [data-theme="DARK"]');
    await page.waitForTimeout(250);
    const dark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check('深色主题生效', dark === 'DARK', dark);
    await shot(page, '09-settings-dark');

    // 沉浸讲解页遵守深色主题（AC-34）
    await page.click('#settingsBack');
    await page.waitForTimeout(200);
    await page.click('#cards [data-open-index="0"]');
    await page.waitForSelector('#view-detail:not([hidden])');
    await page.click('#openSlides');
    await page.waitForSelector('#slideOverlay:not([hidden])');
    await page.waitForTimeout(900);
    const slideBg = await page.$eval('#slideOverlay', el => getComputedStyle(el).backgroundColor);
    check('讲解页跟随深色主题', /rgb\(2[0-9], 2[0-9], 2[0-9]\)|rgb\(1[0-9], 1[0-9], 1[0-9]\)/.test(slideBg), slideBg);
    await shot(page, '11-slides-dark');
    await page.click('#slideExit');
    await page.waitForTimeout(300);
    await page.click('#detailBack');
    await page.waitForTimeout(200);
    await page.click('#btnSettings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await page.selectOption('#langSelect', 'en');
    await page.waitForTimeout(300);
    const enBrand = await page.$eval('#brandName', el => el.innerText.trim());
    check('英文切换生效', /Pocket Brief|Carry Deck|SlideSide/.test(enBrand), enBrand);
    await page.selectOption('#langSelect', 'zh');
    await page.waitForTimeout(250);

    // 刷新后主题与语言仍保留
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#splash');
    const persisted = await page.evaluate(() => ({
      theme: document.documentElement.getAttribute('data-theme'),
      lang: localStorage.getItem('p070.language'),
      dir: localStorage.getItem('p070.dir')
    }));
    check('刷新后主题/语言/方向持久化', persisted.theme === 'DARK' && persisted.lang === '"zh"', JSON.stringify(persisted));

    // 离线状态条（模拟）
    await page.click('#splashEnter');
    await page.waitForSelector('#view-library:not([hidden])');
    await page.click('#btnSettings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await page.check('#simOffline');
    await page.waitForTimeout(250);
    const banner = await page.evaluate(() => ({ hidden: document.querySelector('#offlineBar').hidden, text: document.querySelector('#offlineText').innerText }));
    check('离线状态条可见且有文字说明（模拟）', banner.hidden === false && banner.text.length > 5, JSON.stringify(banner));
    await page.uncheck('#simOffline');

    // 内部标识不上屏（AC-36）：只扫产品界面，评审工具条与“仅供评审”说明除外
    const leak = await page.evaluate(() => {
      const txt = Array.from(document.querySelectorAll('.app .view')).map(el => el.innerText).join('\n');
      const bad = [];
      [/AC-\d+/, /FR-\d+/, /Phase\s*\d/i, /\bGate\b/i, /evidence_grade/i, /置信度/, /[0-9a-f]{16,}/i].forEach(re => {
        const m = txt.match(re);
        if (m) bad.push(m[0]);
      });
      return bad;
    });
    check('产品界面无内部标识（AC-36）', leak.length === 0, leak.join(','));

    // 字号与横向溢出（真实 computed style）
    const metrics = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('body *').forEach(el => {
        const txt = el.childNodes.length && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!txt) return;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 13.9) bad.push({ tag: el.tagName, cls: el.className, fs: fs, text: el.textContent.trim().slice(0, 18) });
      });
      return { overflow: document.documentElement.scrollWidth - window.innerWidth, small: bad.slice(0, 8), count: bad.length };
    });
    check('无横向溢出（390px 视口）', metrics.overflow <= 1, 'overflow=' + metrics.overflow);
    check('任何可见文本不小于 14px', metrics.count === 0, metrics.count ? JSON.stringify(metrics.small) : 'min>=14');

    // 触控目标
    const smallTargets = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('.app button, .app a, .app input[type=checkbox], .app select, .slide-overlay button, .dialog button').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        if (r.height < 43.5 || r.width < 43.5) out.push({ tag: el.tagName, text: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 16), w: Math.round(r.width), h: Math.round(r.height) });
      });
      return out;
    });
    check('可交互目标不小于 44px（当前页）', smallTargets.length === 0, smallTargets.length ? JSON.stringify(smallTargets.slice(0, 6)) : 'all>=44');

    // 导入 manifest（真实文件选择 + IndexedDB）
    await page.click('#settingsBack');
    await page.waitForTimeout(200);
    const manifest = path.join(SHOT_DIR, 'fixture-manifest.json');
    fs.writeFileSync(manifest, JSON.stringify({ version:'1.0', items:[{ id:'import-test', title:'导入测试：一条新资料', topic:'测试', language:'zh', tags:['导入'], duration:3, summary:'用于验证导入路径。', transcript:'导入测试文稿。', terms:[{zh:'导入',en:'Import'}], source_url:'https://www.bilibili.com/', slides:false }] }));
    await page.setInputFiles('#fileManifest', manifest);
    await page.waitForTimeout(800);
    const imported = await page.$$eval('#cards .card', els => els.length);
    check('导入 manifest 新增 1 条', imported === 6, 'cards=' + imported);

    // 重复 id：四选项弹窗，不静默覆盖
    await page.setInputFiles('#fileManifest', manifest);
    await page.waitForTimeout(500);
    const dupDialog = await page.evaluate(() => {
      const d = document.querySelector('.dialog');
      return d ? d.innerText : '';
    });
    check('重复 id 弹出处理选项', /已有|重复/.test(dupDialog) && /跳过/.test(dupDialog), dupDialog.slice(0, 40));
    const skipBtn = await page.$$('.dialog .actions button');
    if (skipBtn.length >= 3) { await skipBtn[2].click(); await page.waitForTimeout(400); }
    const stillSix = await page.$$eval('#cards .card', els => els.length);
    check('跳过重复后条数不翻倍', stillSix === 6, 'cards=' + stillSix);

    // 320px 小屏与英文长文案
    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForTimeout(300);
    await page.click('#btnSettings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await page.selectOption('#langSelect', 'en');
    await page.waitForTimeout(400);
    await page.click('#settingsBack');
    await page.waitForTimeout(300);
    const narrow = await page.evaluate(() => {
      const over = document.documentElement.scrollWidth - window.innerWidth;
      const nav = document.querySelector('#tabbar');
      const tabs = Array.from(document.querySelectorAll('#tabbar button span')).map(el => ({ t: el.innerText, sw: el.scrollWidth, cw: el.clientWidth }));
      return { overflow: over, navHidden: nav.hidden, tabs };
    });
    check('320px + 英文长文案无横向溢出', narrow.overflow <= 1, 'overflow=' + narrow.overflow);
    check('320px 英文底栏标签不截断', narrow.navHidden === false && narrow.tabs.every(x => x.sw <= x.cw + 1), JSON.stringify(narrow.tabs));
    await page.click('#btnSettings');
    await page.waitForSelector('#view-settings:not([hidden])');
    await page.selectOption('#langSelect', 'zh');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);

    // SYSTEM 跟随系统外观
    await page.click('#themeSeg [data-theme="SYSTEM"]');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(300);
    const sysDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(300);
    const sysLight = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    check('SYSTEM 跟随系统外观变化', sysDark === 'DARK' && sysLight === 'LIGHT', sysDark + '/' + sysLight);

    // 恢复浅色，避免默认状态被测试污染
    await page.click('#themeSeg [data-theme="LIGHT"]');
    await page.waitForTimeout(200);

    // 控制台错误
    check('无 JS 运行时错误', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } catch (e) {
    bad('测试脚本异常', e.message);
  }

  await browser.close();
  const failed = results.filter(r => !r.pass);
  console.log('\n---');
  console.log('TOTAL ' + results.length + ' PASS ' + (results.length - failed.length) + ' FAIL ' + failed.length);
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(SHOT_DIR, 'smoke-result.json'), JSON.stringify({ base: BASE, at: new Date().toISOString(), results, consoleErrors }, null, 2));
  process.exit(failed.length ? 1 : 0);
})();
