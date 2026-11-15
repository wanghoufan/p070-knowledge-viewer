import { db, QuotaError } from './db.js';
import { decodeHtml, scanSelfContained, hardenHtml } from './slides.js';
import { makeT, resolveLang, LANGUAGE_LABELS } from './i18n.js';
import { platform, isNative } from './platform.js';

const VERSION = '1.0.0';
/* Real build facts read from the installed APK (never a dev hash on screen). */
let ENV = { version: '', webView: '', android: '' };
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const icon = (name, size = 20) => `<span class="icon" style="width:${size}px;height:${size}px"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.info}</svg></span>`;

const ICONS = {
  home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-8H9v8H4a1 1 0 0 1-1-1z"/>',
  download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.8 6.6-4.1M8.7 13.2l6.6 4.1"/>',
  settings:'<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.86 1.86-.06-.06A1.7 1.7 0 0 0 16 18.4l-.08.04V21h-2.64v-.08A1.7 1.7 0 0 0 12 20.5c-.47 0-.9.19-1.21.5H8.16v-2.56a1.7 1.7 0 0 0-2.07-.7l-.06.06-1.86-1.86.06-.06A1.7 1.7 0 0 0 4.6 15V9a1.7 1.7 0 0 0-.34-1.88L4.2 7.06 6.06 5.2l.06.06A1.7 1.7 0 0 0 8.16 4.6V3h2.63A1.7 1.7 0 0 0 12 3.5c.47 0 .9-.19 1.21-.5h2.63v1.6a1.7 1.7 0 0 0 2.04.66l.06-.06L19.8 7.06l-.06.06A1.7 1.7 0 0 0 19.4 9z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32 1.41-1.41"/>',
  moon:'<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/>',
  arrow:'<path d="m15 18-6-6 6-6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  presentation:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="M12 17v4m-5 0h10M9 8l6 2-6 2z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  check:'<path d="m5 12 5 5L20 7"/>',
  film:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4"/>',
  folder:'<path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10H3z"/>',
  trash:'<path d="M4 7h16M10 4h4m-8 3 1 14h10l1-14M10 11v6m4-6v6"/>',
  edit:'<path d="M12 20h9M16 4l4 4-11 11H5v-4z"/>',
  external:'<path d="M14 3h7v7m0-7-9 9M20 14v6H4V4h6"/>',
  info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>',
  play:'<path d="M8 5v14l11-7z"/>'
};

const SEED = [
  {id:'pk1',order:1,title:'匹克球基础规则',en:'Pickleball Basic Rules',lang:'zh',topic:'匹克球',tags:['规则','入门'],time:'08:32',art:'court',demoVideo:true,demoSlides:true,summary:['比赛可以是单打，也可以是双打。','发球通常采用对角线方向，发球必须越过非截击区。','非截击区（俗称厨房区）内不得凌空截击。','熟悉计分和轮换方式，再开始正式比赛。'],transcript:'这是模拟转写文本，仅用于展示原始文稿如何展开。\n\n大家好，今天来介绍匹克球的基础规则。首先认识球场结构，球网两边都设有非截击区。发球时站在底线后方，通常沿对角线发向对面。双打时双方要配合移动，并注意换发球时机。',terms:[['Non-volley zone','非截击区 / 厨房区'],['Serve','发球'],['Doubles','双打'],['Baseline','底线']],source:''},
  {id:'pk2',order:2,title:'双打配合要点',en:'Doubles Strategy',lang:'en',topic:'匹克球',tags:['双打','技巧'],time:'10:15',art:'court',summary:['Communicate early and move with your partner.','Try to reach the non-volley zone line together.','Avoid leaving large gaps between you and your partner.'],transcript:'This is a sample transcript for UI demonstration. In doubles, teamwork and court positioning matter. Watch the ball, communicate clearly, and move as a pair.',terms:[['Partner','搭档'],['Court positioning','场上站位'],['Rally','多拍回合']],source:''},
  {id:'pk3',order:3,title:'热身与拉伸',en:'Warm-up & Stretching',lang:'zh',topic:'匹克球',tags:['热身','训练'],time:'06:20',art:'warm',summary:['先进行轻快步行或慢跑，再做动态关节活动。','重点活动肩膀、髋部、脚踝等部位。','热身应循序渐进，避免一开始就进行高强度对抗。'],transcript:'模拟文稿：热身建议从简单的低强度活动开始，然后逐渐增加移动速度，并结合实际身体状况调整动作。',terms:[['Warm-up','热身'],['Dynamic stretching','动态拉伸'],['Shoulder rotation','肩部环绕']],source:''},
  {id:'pk4',order:4,title:'正确发球入门',en:'How to Serve',lang:'en',topic:'匹克球',tags:['规则','技巧'],time:'07:48',art:'serve',summary:['Start behind the baseline.','Aim diagonally into the correct service court.','Focus on consistency before speed.'],transcript:'Sample transcript: Before serving, stand behind the baseline and check the score. Aim at the opposite service court and follow the applicable serving rules.',terms:[['Service court','发球区'],['Underhand serve','下手发球'],['Diagonal','对角线']],source:''},
  {id:'pk5',order:5,title:'球员水平与等级',en:'Player Skill Levels',lang:'zh',topic:'匹克球',tags:['等级','入门'],time:'05:35',art:'level',summary:['不同平台或赛事可能采用不同的水平评定标准。','入门阶段优先掌握稳定发球、回球和基本位置感。','评估水平时应区分自我描述与官方评级。'],transcript:'模拟文稿：匹克球水平没有唯一通用的描述方法。建议参考实际赛事、俱乐部或评级体系，而不是依赖模糊的宣传。',terms:[['Beginner','初学者'],['Skill rating','技能评级'],['Consistency','稳定性']],source:''},
  {id:'pk6',order:6,title:'常用英语术语',en:'Pickleball Vocabulary',lang:'en',topic:'匹克球',tags:['术语','入门'],time:'04:18',art:'terms',summary:['Learn the terms you will say most often on court.','Practice explaining rules in simple English.','Use short phrases rather than memorizing long paragraphs.'],transcript:'Sample transcript: The most useful words include serve, rally, court, net, baseline and kitchen. Speak clearly and demonstrate the movement.',terms:[['Kitchen','厨房区 / 非截击区'],['Net','球网'],['Rally','回合'],['Paddle','球拍']],source:''}
];

const state = {
  tab: 'home', detail: null, expanded: false, lang: 'all', tag: '全部', q: '',
  selected: [], items: [], media: {}, theme: 'light', language: 'system',
  scroll: { home:0, offline:0, share:0, settings:0 },
  videoUrl: null, slideUrl: null, slideHistory: false, slideId: null,
  dbOK: true, resumeNotified: new Set(), lastPosSaved: 0, wakeLock: null,
  installPrompt: null
};

const T = makeT(() => resolveLang(state.language));

function loadLocal(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}
function saveLocal(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

function currentLang() { return resolveLang(state.language); }
function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', dark ? '#101713' : '#f7f9f7');
  if (isNative) platform.setSystemBars(dark).catch(() => {});
}
function setTheme(mode) {
  state.theme = mode;
  saveLocal('p070_theme', mode);
  applyTheme();
  closeOverlay();
  render();
  if (mode === 'system') notice(T('themeSystem'));
}
function changeTheme() {
  setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
}
function setLanguage(mode) {
  state.language = mode;
  saveLocal('p070_language', mode);
  closeOverlay();
  render();
}
function languageName(mode) {
  const lang = currentLang();
  return LANGUAGE_LABELS[lang][mode] || mode;
}

function all() { return state.items; }
function find(id) { return state.items.find(x => x.id === id); }
function liveSrc(x) { return (x && x.source) || ''; }
function filtered() {
  return all().filter(x => (state.lang === 'all' || x.lang === state.lang)
    && (state.tag === '全部' || x.tags.includes(state.tag) || x.topic === state.tag)
    && (!state.q || [x.title, x.en, (x.summary || []).join(' '), x.transcript, (x.tags || []).join(' '), (x.terms || []).flat().join(' ')].join(' ').toLowerCase().includes(state.q.toLowerCase())));
}
function mediaOf(id) { return state.media[id] || {}; }
function isCached(x) { return !!(x && mediaOf(x.id).video); }

function notice(s) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = s;
  el.classList.add('show');
  clearTimeout(notice._t);
  notice._t = setTimeout(() => el.classList.remove('show'), 2900);
}

function brandHeader() {
  return `<header class="appbar"><div class="brand-icon">${icon('presentation',24)}</div><div><div class="brand-name">随身讲解库</div><div class="brand-en">Pocket Presenter</div></div>${navigator.onLine ? '' : `<span class="netbadge">${esc(T('netOffline'))}</span>`}<div class="appbar-spacer"></div><button class="head-btn" data-action="theme" title="${esc(T('darkMode'))}" aria-label="${esc(T('darkMode'))}">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon',21)}</button><button class="head-btn" data-action="import" title="${esc(T('importRow'))}" aria-label="${esc(T('importRow'))}">${icon('plus',24)}</button></header>`;
}

function art(x) {
  return `<div class="art ${esc(x.art || 'court')}"><div class="courtlines"></div><span class="artball"></span><span class="artflag">${x.lang === 'en' ? 'EN' : T('chinese')}</span><span class="duration">${esc(x.time || T('video'))}</span></div>`;
}

function statusOf(x) {
  const m = mediaOf(x.id);
  if (m.invalidVideo) return { cls:'bad', text:T('lostVideo') };
  if (m.video) return { cls:'good', text:T('savedVideo') };
  if (x.demoVideo) return { cls:'good', text:T('demoClip') };
  return { cls:'', text:T('needVideo') };
}

function card(x) {
  const st = statusOf(x);
  return `<article class="item">${art(x)}<div class="item-main"><div class="item-title">${esc(x.title)}</div><div class="item-en">${esc(x.en || '')}</div><div class="item-badges">${(x.tags || []).slice(0,2).map(t => `<span class="tag">${esc(t)}</span>`).join('')}<span class="tag">${x.lang === 'en' ? T('english') : T('chinese')}</span></div><div class="item-foot"><span class="online ${st.cls}">${esc(st.text)}</span><button class="add-inline" data-action="share-toggle" data-id="${esc(x.id)}" aria-label="${esc(state.selected.includes(x.id) ? T('removeShare') : T('addShare'))}">${state.selected.includes(x.id) ? icon('check',18) : icon('plus',18)}</button></div></div><button class="item-hit" data-action="open" data-id="${esc(x.id)}" aria-label="${esc(x.title)}"></button></article>`;
}

function library() {
  const list = filtered();
  return `${brandHeader()}<main class="content screen"><label class="search">${icon('search',20)}<input id="search-input" placeholder="${esc(T('search'))}" value="${esc(state.q)}" autocomplete="off" aria-label="${esc(T('search'))}"></label><div class="seg">${[['all',T('all')],['zh',T('zh')],['en',T('en')]].map(([key,text]) => `<button class="${state.lang === key ? 'active' : ''}" data-action="language" data-val="${key}">${text}</button>`).join('')}</div><div class="tagrow">${tagList().map(tag => `<button class="tagbtn ${state.tag === tag ? 'active' : ''}" data-action="tag" data-val="${esc(tag)}">${esc(tag)}</button>`).join('')}</div><div id="result-area">${libraryResults(list)}</div></main>`;
}
function tagList() {
  const base = ['全部','匹克球','入门','规则','热身','等级','术语','双打','技巧'];
  const extra = Array.from(new Set(all().map(x => x.topic).filter(t => t && !base.includes(t))));
  return base.concat(extra);
}
function libraryResults(list) {
  return `<section class="topic-hero"><div class="hero-eyebrow">${esc(T('heroEyebrow'))}</div><div class="hero-title">${esc(T('heroTitle'))}</div><div class="hero-sub">${esc(T('heroSub'))}</div><div class="hero-bottom">${esc(T('heroBottom',{n:all().length}))}</div><div class="hero-graphic"><div class="paddle two"></div><div class="paddle"></div><div class="ball-img"></div></div></section><div class="sectionbar"><strong>${esc(T('sectionTitle'))}</strong><small>${esc(T('found',{n:list.length}))}</small></div>${list.length ? `<div class="items">${list.map(card).join('')}</div>` : `<div class="empty">${icon('search',28)}<h3>${esc(T('emptyTitle'))}</h3>${esc(T('emptyText'))}<p><button class="pillbtn" data-action="reset">${esc(T('clearFilter'))}</button></p></div>`}<p class="muted-note" style="margin:14px 3px">${esc(T('demoNote'))}</p>`;
}

function bottom() {
  return `<nav class="bottom" aria-label="${esc(T('navHome'))}">${[['home','home',T('navHome')],['offline','download',T('navOffline')],['share','share',T('navShare')],['settings','settings',T('navSettings')]].map(([id,ic,label]) => `<button data-action="tab" data-val="${id}" class="navbutton ${state.tab === id && !state.detail ? 'active' : ''}">${icon(ic,22)}<span>${label}${id === 'share' && state.selected.length ? ` <span class="navcount">${state.selected.length}</span>` : ''}</span></button>`).join('')}</nav>`;
}

function detail() {
  const x = find(state.detail);
  if (!x) return library();
  const m = mediaOf(x.id);
  const saved = !!m.video;
  const hasSlides = !!m.slides || !!x.demoSlides;
  const status = m.invalidVideo ? T('lostVideo') : saved ? T('cachedPlayable') : x.demoVideo ? T('demoPlayable') : T('notImported');
  const summary = x.summary || [];
  const slideSub = m.slides ? (m.slidesRemote ? T('slidesRemote') : T('slidesSelf')) : x.demoSlides ? T('demoSlides') : T('slidesNotSub');
  return `<div class="screen"><div class="backhead"><button class="back" data-action="close-detail" aria-label="${esc(T('back'))}">${icon('arrow',21)}</button><span class="title">${esc(x.title)}</span><span style="flex:1"></span><button class="head-btn" data-action="theme" aria-label="${esc(T('darkMode'))}">${icon(document.documentElement.dataset.theme === 'dark' ? 'sun' : 'moon',18)}</button></div><main class="content"><div class="detail-title">${esc(x.title)}</div><div class="detail-meta">${esc(x.en || '')} · ${x.lang === 'en' ? T('english') : T('chinese')} · ${(x.tags || []).join(' / ')}</div><div id="video-host" class="detail-video"><div class="video-empty"><span class="big">▷</span><strong>${x.demoVideo ? T('demoClip') : T('notImported')}</strong><small>${x.demoVideo ? T('demoNote') : T('videoHint')}</small></div></div><div class="quick-actions"><button class="pillbtn" style="flex:1" data-action="pick-video">${icon('download',16)}${esc(T('importVideo'))}</button><button class="pillbtn" style="flex:1" data-action="share-toggle" data-id="${esc(x.id)}">${icon(state.selected.includes(x.id) ? 'check' : 'plus',16)}${esc(state.selected.includes(x.id) ? T('addedShare') : T('addToShare'))}</button></div><p class="muted-note" id="video-status">${esc(status)}。${esc(T('videoHint'))}</p><div class="content-card"><div class="card-head"><h3>${x.lang === 'en' ? 'Key Points · Summary' : T('keyPoints')}</h3><span style="font-size:14px;color:var(--green-deep)">${x.lang === 'en' ? T('english') : T('chinese')}</span></div><div class="card-body"><ul class="summary-list">${summary.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div></div><div class="content-card"><button class="accordion" data-action="transcript"><span>${esc(T('transcript'))}</span><span class="hint" id="transcript-indicator">${state.expanded ? T('collapse') : T('expand')}</span></button><div id="transcript-container">${state.expanded ? `<div class="acc-body">${esc(x.transcript)}</div>` : ''}</div></div><div class="content-card"><div class="card-head"><h3>${esc(T('terms'))}</h3><span style="font-size:14px;color:var(--muted)">${esc(T('termsCount',{n:(x.terms || []).length}))}</span></div><div class="card-body"><div class="term-grid">${(x.terms || []).map(a => `<div class="term-card"><strong>${esc(a[0])}</strong><small>${esc(a[1])}</small></div>`).join('')}</div></div></div><div class="content-card"><div class="card-head"><h3>${esc(T('slides'))}</h3></div><div class="card-body"><div class="slides-entry"><div class="iconbox">${icon('presentation',26)}</div><div style="flex:1;min-width:0"><strong>${esc(hasSlides ? (x.demoSlides && !m.slides ? T('demoSlides') : T('slidesReady')) : T('slidesNot'))}</strong><small>${esc(slideSub)}</small></div><button data-action="slides-open">${esc(hasSlides ? T('openSlides') : T('importSlides'))}</button></div><button class="pillbtn full" style="margin-top:8px;min-height:44px" data-action="pick-html">${icon('plus',15)}${esc(T('replaceSlides'))}</button></div></div><div class="content-card"><div class="card-head"><h3>${esc(T('source'))}</h3></div><div class="card-body"><div class="row" style="gap:8px"><span style="font-size:14px;color:var(--muted);word-break:break-all">${esc(liveSrc(x) || T('sourceEmpty'))}</span><button class="pillbtn" style="flex-shrink:0" data-action="source-edit">${icon('edit',15)}${esc(T('edit'))}</button></div>${liveSrc(x) ? `<button class="pillbtn full" style="margin-top:8px" data-action="source-open">${icon('external',15)}${esc(T('openSource'))}</button>` : ''}</div></div><p class="muted-note" style="margin:13px 3px">${esc(T('detailNote'))}</p></main></div>`;
}

function offline() {
  const cached = all().filter(x => mediaOf(x.id).video || mediaOf(x.id).slides);
  const bytes = cached.reduce((n,x) => n + (mediaOf(x.id).bytes || 0), 0);
  return `${brandHeader()}<main class="content screen"><h1 class="sectiontitle">${esc(T('offlineTitle'))}</h1><p class="subline">${esc(T('offlineSub'))}</p><div class="settings"><div class="setting"><span class="lefticon">${icon('download',24)}</span><div><strong>${esc(T('localFiles'))}</strong><small>${esc(T('savedCount',{n:cached.length}))}</small></div><span class="trailing">${formatBytes(bytes)}</span></div></div>${cached.length ? cached.map(x => { const m = mediaOf(x.id); return `<div class="offline-item"><div class="small-square">${icon('film',23)}</div><div style="min-width:0;flex:1"><strong>${esc(x.title)}</strong><small>${m.video ? T('video') : ''}${m.video && m.slides ? ' · ' : ''}${m.slides ? T('slidesShort') : ''}${m.invalidVideo ? ' · ' + T('lostVideo') : ''}</small></div><button class="pillbtn" data-action="open" data-id="${esc(x.id)}">${esc(T('open'))}</button><button class="pillbtn" data-action="remove-cache" data-id="${esc(x.id)}" aria-label="${esc(T('remove'))}">${icon('trash',15)}</button></div>`; }).join('') : `<div class="empty">${icon('download',30)}<h3>${esc(T('offlineEmpty'))}</h3>${esc(T('offlineEmptyText'))}<p><button class="pillbtn green" data-action="tab" data-val="home">${esc(T('browse'))}</button></p></div>`}${cached.length ? `<button class="pillbtn full" style="margin-top:10px" data-action="clear-cache">${esc(T('clearAllCache'))}</button>` : ''}<div class="note-box">${esc(T('offlineNote'))}</div></main>`;
}

function hostOf(u){try{return new URL(u).hostname}catch{return u}}
function shareString() {
  const chosen = state.selected.map(find).filter(Boolean);
  const seen = new Set();
  const valid = chosen.filter(x => /^https?:\/\//i.test(liveSrc(x)) && !seen.has(liveSrc(x)) && seen.add(liveSrc(x)));
  return `Pickleball · Videos to Watch\n\n` + valid.map((x,i) => `${i+1}. ${x.en || x.title}\n${liveSrc(x)}`).join('\n\n');
}
function share() {
  const chosen = state.selected.map(find).filter(Boolean);
  const valid = chosen.filter(x => /^https?:\/\//i.test(liveSrc(x)));
  return `${brandHeader()}<main class="content screen"><h1 class="sectiontitle">${esc(T('shareTitle'))}</h1><p class="subline">${esc(T('shareSub'))}</p><div class="settings"><div class="setting"><span class="lefticon">${icon('share',23)}</span><div><strong>${esc(T('selectedN',{n:chosen.length}))}</strong><small>${esc(T('linksN',{n:valid.length}))}</small></div><button class="pillbtn" data-action="clear-share" style="margin-left:auto">${esc(T('clear'))}</button></div></div>${chosen.length ? chosen.map(x => `<div class="share-item"><label class="checkwrap"><input type="checkbox" checked data-action="share-check" data-id="${esc(x.id)}" aria-label="${esc(x.title)}"></label><div class="sharebody"><strong>${esc(x.title)}</strong><small>${esc(x.en || '')} · ${liveSrc(x) ? esc(hostOf(liveSrc(x))) : esc(T('notSet'))}</small></div><button class="head-btn" style="width:44px;height:44px" data-action="open" data-id="${esc(x.id)}" title="${esc(T('open'))}">${icon('chevron',18)}</button></div>`).join('') + `<div class="sectionbar"><strong>${esc(T('preview'))}</strong><small>${esc(T('previewSub'))}</small></div><div class="share-preview">${esc(valid.length ? shareString() : T('noLinks'))}</div><div class="share-actions"><button class="pillbtn green" style="flex:1" ${valid.length ? '' : 'disabled'} data-action="copy-share">${icon('copy',16)}${esc(T('copyList'))}</button><button class="pillbtn" style="flex:1" ${valid.length ? '' : 'disabled'} data-action="system-share">${icon('share',16)}${esc(T('systemShare'))}</button></div>` : `<div class="empty">${icon('share',30)}<h3>${esc(T('shareEmpty'))}</h3>${esc(T('shareEmptyText'))}<p><button class="pillbtn green" data-action="tab" data-val="home">${esc(T('goPick'))}</button></p></div>`}<div class="note-box">${esc(T('shareNote'))}</div></main>`;
}

function settings() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const cached = all().filter(x => mediaOf(x.id).video || mediaOf(x.id).slides).length;
  return `${brandHeader()}<main class="content screen"><h1 class="sectiontitle">${esc(T('settingsTitle'))}</h1><div class="settings"><div class="setting" data-action="tab" data-val="offline"><span class="lefticon">${icon('download',22)}</span><div><strong>${esc(T('offlineMgmt'))}</strong><small>${esc(T('offlineMgmtSub'))} · ${cached}</small></div><button class="head-btn right" data-action="tab" data-val="offline" aria-label="${esc(T('open'))}">${icon('chevron',19)}</button></div><div class="setting"><span class="lefticon">${icon('folder',22)}</span><div><strong>${esc(T('importRow'))}</strong><small>${esc(T('importRowSub'))}</small></div><button class="head-btn right" data-action="import" aria-label="${esc(T('importRow'))}">${icon('chevron',19)}</button></div><div class="setting" data-action="theme-open"><span class="lefticon">${icon(dark ? 'moon' : 'sun',22)}</span><div><strong>${esc(T('darkMode'))}</strong><small>${esc(T('darkModeSub'))}</small></div><button class="mini-toggle ${dark ? 'on' : ''} right" data-action="theme-toggle" role="switch" aria-checked="${dark}" aria-label="${esc(T('darkMode'))}"><span></span></button></div><div class="setting" data-action="language-open"><span class="lefticon">${icon('info',22)}</span><div><strong>${esc(T('language'))}</strong><small>${esc(T('languageSub',{name:languageName(state.language)}))}</small></div><button class="head-btn right" data-action="language-open" aria-label="${esc(T('languageTitle'))}">${icon('chevron',19)}</button></div></div><div class="note-box">${esc(T('version',{v:ENV.version || VERSION}))}<br>${esc(T('installHint'))}</div><div style="text-align:center;color:var(--muted);font-size:14px;margin-top:22px">${esc(T('footer'))}</div></main>`;
}

function render(keepScroll = true) {
  const body = state.detail ? detail() : state.tab === 'home' ? library() : state.tab === 'offline' ? offline() : state.tab === 'share' ? share() : settings();
  $('#app').innerHTML = body + bottom();
  updateUpdateBar();
  if (state.detail) {
    loadVideo(state.detail);
    window.scrollTo(0, 0);
  } else if (keepScroll) {
    const y = state.scroll[state.tab] || 0;
    requestAnimationFrame(() => window.scrollTo(0, y));
  }
}

function refreshResults() {
  const r = $('#result-area');
  if (r) r.innerHTML = libraryResults(filtered());
}
function saveScroll() {
  if (!state.detail) state.scroll[state.tab] = window.scrollY || 0;
}
function goTab(tab) {
  saveScroll();
  cleanupVideo();
  state.detail = null;
  state.expanded = false;
  state.tab = tab;
  render();
  // On Android, re-read the real files on disk before showing cache facts.
  if (tab === 'offline' && isNative) refreshNativeMedia().then(() => render());
}
function openItem(id) {
  if (!find(id)) return;
  saveScroll();
  cleanupVideo();
  state.detail = id;
  state.expanded = false;
  render();
}
function backToList() {
  cleanupVideo();
  state.detail = null;
  state.expanded = false;
  render();
}

function formatBytes(n) {
  if (!n) return '0 MB';
  if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(2) + ' GB';
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
  return Math.max(1, Math.round(n / 1024)) + ' KB';
}

function cleanupVideo() {
  const v = document.querySelector('video');
  if (v) {
    try { v.pause(); } catch {}
    v.removeAttribute('src');
    try { v.load(); } catch {}
  }
  if (state.videoUrl) { URL.revokeObjectURL(state.videoUrl); state.videoUrl = null; }
}

let posCache = loadLocal('p070_pos', {});
function savePosition(id, t) {
  if (!id || !t || t < 1) return;
  posCache[id] = t;
  saveLocal('p070_pos', posCache);
}

async function loadVideo(id) {
  const x = find(id);
  if (!x) return;
  const host = $('#video-host');
  if (!host) return;
  const m = mediaOf(id);
  let url = null;
  try {
    if (m.video) url = await db.getVideoURL(id, m);
    else if (x.demoVideo) url = './assets/demo.mp4';
  } catch (e) {
    m.video = false;
    m.invalidVideo = true;
    await db.putMedia(m).catch(() => {});
    state.media[id] = m;
    const st = $('#video-status');
    if (st) st.textContent = T('lostVideo') + '。' + T('videoHint');
    return;
  }
  if (state.detail !== id) { if (url && m.video) URL.revokeObjectURL(url); return; }
  if (!url) return;
  if (m.video) state.videoUrl = url;
  const v = document.createElement('video');
  v.controls = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.src = url;
  v.setAttribute('aria-label', T('video'));
  host.innerHTML = '';
  host.appendChild(v);
  v.addEventListener('loadedmetadata', () => {
    const saved = posCache[id] || 0;
    if (saved > 3 && saved < (v.duration || Infinity) * 0.95) {
      try { v.currentTime = saved; } catch {}
      if (!state.resumeNotified.has(id)) { state.resumeNotified.add(id); notice(T('resumed')); }
    }
  });
  v.addEventListener('timeupdate', () => {
    const now = Date.now();
    if (now - state.lastPosSaved > 2500) { state.lastPosSaved = now; savePosition(id, v.currentTime); }
  });
  v.addEventListener('pause', () => savePosition(id, v.currentTime));
  v.addEventListener('error', () => {
    const st = $('#video-status');
    if (st) st.textContent = T('lostVideo') + '。' + T('videoHint');
  });
}

/* ---------- Android: SAF import into private persistent storage ---------- */

/* Android back: deck/detail -> list -> tab home -> (double press) exit. */
function handleBack() {
  if ($('#slide-modal')) { closeSlides(); return true; }
  if ($('#dialog-mask')) {
    const mask = $('#dialog-mask');
    mask.remove();
    return true;
  }
  if ($('#sheet-overlay')) { closeOverlay(); return true; }
  if (state.detail) { backToList(); return true; }
  if (state.tab !== 'home') { goTab('home'); return true; }
  return false;
}

function startVideoImport() {
  if (!state.detail) return;
  if (isNative) importVideoNative();
  else $('#video-file').click();
}

function startSlidesImport() {
  if (!state.detail) return;
  if (isNative) importSlidesNative();
  else $('#html-file').click();
}

function startManifestImport() {
  if (!isNative) { $('#json-file').click(); return; }
  importManifestNative();
}

function importErrorText(e) {
  if (!e) return '';
  return e.message || String(e);
}

function showImportError(title, message) {
  dialog(title, esc(message), [{ label: T('ok'), cls: 'primary' }]);
}

async function importVideoNative() {
  const id = state.detail;
  if (!id) return;
  const prog = showProgress(T('saving'), T('savingHint'), true);
  try {
    const res = await platform.importVideo(id, (loaded, total) => {
      prog.update(total ? loaded / total : 0, loaded, total);
    });
    if (!res || res.canceled) { prog.close(); return; }
    prog.update(1, res.bytes, res.bytes);

    // Integrity gate: the file only counts as cached once this WebView can load it
    // and land on byte-exact seek targets through the native byte-range handler.
    let okSeek = false;
    try {
      const url = await db.getVideoURL(id, { video: true, bytes: res.bytes });
      okSeek = url ? await verifySeek(url) : false;
    } catch { okSeek = false; }

    if (!okSeek) {
      await platform.deleteMedia(id, 'video').catch(() => {});
      const bad = { id, ...mediaOf(id), video: false, invalidVideo: true, bytes: 0 };
      state.media[id] = bad;
      await db.putMedia(bad);
      prog.close();
      dialog(T('saveBad', { msg: T('verify') }), esc(T('verifyFailBody')), [
        { label: T('retry'), cls: 'primary', fn: () => startVideoImport() },
        { label: T('continueCancel'), cls: 'ghost' }
      ]);
      render();
      return;
    }

    const m = {
      id, ...mediaOf(id), video: true, invalidVideo: false, native: true,
      ext: res.ext, bytes: res.bytes, name: res.name, verifiedAt: Date.now(),
      slides: !!mediaOf(id).slides
    };
    state.media[id] = m;
    await db.putMedia(m);
    prog.close();
    notice(T('saveOk'));
    render();
  } catch (e) {
    prog.close();
    const msg = importErrorText(e);
    if ((e && e.code === 'P070_NO_SPACE') || /空间不足/.test(msg)) {
      dialog(T('quotaTitle'), esc(msg), [
        { label: T('manageCache'), cls: 'primary', fn: () => goTab('offline') },
        { label: T('chooseOther'), fn: () => startVideoImport() },
        { label: T('continueCancel'), cls: 'ghost' }
      ]);
      return;
    }
    if (/cancel/i.test(msg)) return;
    showImportError(T('saveBad', { msg }), msg);
  }
}

async function importSlidesNative() {
  const id = state.detail;
  if (!id) return;
  try {
    const res = await platform.importSlides(id);
    if (!res || res.canceled) return;
    let scan = { selfContained: true, refs: [] };
    if (!res.truncated && res.text) {
      try { scan = scanSelfContained(res.text); } catch {}
    }
    const m = {
      id, ...mediaOf(id), slides: true, native: true,
      slidesBytes: res.bytes, slidesName: res.name,
      slidesRemote: !scan.selfContained, slidesRefs: scan.refs
    };
    state.media[id] = m;
    await db.putMedia(m);
    notice(T('slidesOk'));
    render();
    if (!scan.selfContained) notice(T('slidesRemote'));
  } catch (e) {
    showImportError(T('slidesBad', { msg: importErrorText(e) }), importErrorText(e));
  }
}

async function importManifestNative() {
  let res;
  try {
    res = await platform.importManifest();
  } catch (e) {
    showImportError(T('importBad', { msg: '' }), importErrorText(e));
    return;
  }
  if (!res || res.canceled) return;
  try {
    await importJsonText(res.text);
    closeOverlay();
  } catch (e) {
    showImportError(T('importBad', { msg: '' }), e.message || String(e));
  }
}

async function refreshNativeMedia() {
  if (!isNative) return;
  for (const id of Object.keys(state.media)) {
    const m = state.media[id];
    if (!m) continue;
    try {
      const info = await platform.mediaInfo(id);
      let changed = false;
      if (m.video && (!info.video.exists || (m.bytes && info.video.bytes !== m.bytes))) {
        m.video = false; m.invalidVideo = info.video.exists === false; m.bytes = 0; changed = true;
      }
      if (m.slides && !info.slides.exists) { m.slides = false; changed = true; }
      if (changed) await db.putMedia(m);
    } catch {}
  }
}

/* ---------- overlays ---------- */
function closeOverlay() {
  const el = $('#sheet-overlay');
  if (el) el.remove();
}
function overlay(title, content) {
  const dom = document.createElement('div');
  dom.className = 'overlay';
  dom.id = 'sheet-overlay';
  dom.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-title"><span>${esc(title)}</span><button class="sheet-close" data-action="overlay-close" aria-label="${esc(T('close'))}">×</button></div>${content}</div>`;
  dom.addEventListener('click', ev => { if (ev.target === dom) dom.remove(); });
  $('#portal').appendChild(dom);
}
function dialog(title, body, choices) {
  const dom = document.createElement('div');
  dom.className = 'dialog-mask';
  dom.id = 'dialog-mask';
  dom.innerHTML = `<div class="dialog" role="dialog" aria-modal="true"><h3>${esc(title)}</h3><p>${body}</p><div class="choices"></div></div>`;
  const box = dom.querySelector('.choices');
  choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.textContent = c.label;
    b.className = c.cls || '';
    b.onclick = () => { dom.remove(); if (c.fn) c.fn(); };
    box.appendChild(b);
    if (i === 0) setTimeout(() => b.focus(), 30);
  });
  dom.addEventListener('click', ev => { if (ev.target === dom) dom.remove(); });
  $('#portal').appendChild(dom);
}
function askConfirm(title, body, label, fn) {
  dialog(title, esc(body), [
    { label, cls:'danger', fn },
    { label:T('cancel'), cls:'ghost' }
  ]);
}
function askTheme() {
  const opts = [['light',T('themeLight')],['dark',T('themeDark')],['system',T('themeSystem')]];
  overlay(T('appearance'), `<div class="settings">${opts.map(([v,l]) => `<div class="setting" data-action="set-theme" data-val="${v}"><span class="lefticon">${icon(v === 'dark' ? 'moon' : v === 'system' ? 'settings' : 'sun',22)}</span><div><strong>${esc(l)}</strong><small>${v === state.theme ? '✓' : ''}</small></div></div>`).join('')}</div>`);
}
function askLanguage() {
  const opts = [['system',T('followSystem')],['zh',T('simplifiedChinese')],['en',T('englishUI')]];
  overlay(T('languageTitle'), `<div class="settings">${opts.map(([v,l]) => `<div class="setting" data-action="set-language" data-val="${v}"><span class="lefticon">${icon('info',22)}</span><div><strong>${esc(l)}</strong><small>${v === state.language ? '✓' : ''}</small></div></div>`).join('')}</div>`);
}
function askImport() {
  overlay(T('importTitle'), `<p class="summary-text">${esc(T('importBody'))}</p><button class="pillbtn green full" data-action="pick-json" style="margin-top:12px">${icon('folder',17)}${esc(T('pickJson'))}</button><button class="pillbtn full" data-action="download-json" style="margin-top:9px">${icon('download',17)}${esc(T('downloadJson'))}</button><div class="note-box">${esc(T('importNote'))}</div>`);
}
function askSource() {
  const x = find(state.detail);
  if (!x) return;
  overlay(T('sourceTitle'), `<p class="subline">${esc(x.title)}</p><label for="source-url" class="field-label">${esc(T('sourceLabel'))}</label><input class="text-input" id="source-url" type="url" inputmode="url" placeholder="https://www.youtube.com/watch?..." value="${esc(liveSrc(x))}"><p class="muted-note">${esc(T('sourceNote'))}</p><button class="pillbtn green full" style="margin-top:12px" data-action="save-source">${esc(T('save'))}</button>`);
}
function saveSource() {
  const input = $('#source-url');
  const value = (input ? input.value.trim() : '');
  if (value && !/^https?:\/\//i.test(value)) { notice(T('importBad',{msg:'http:// 或 https://'})); return; }
  const x = find(state.detail);
  if (!x) return;
  x.source = value;
  db.putItem(x).then(() => { state.items = state.items.map(i => i.id === x.id ? x : i); closeOverlay(); render(); notice(T('saved')); });
}

function showProgress(title, hint, onCancel) {
  const dom = document.createElement('div');
  dom.className = 'progressmask';
  dom.id = 'progress-mask';
  dom.innerHTML = `<div class="progresssheet"><h3>${esc(title)}</h3><p>${esc(hint)}</p><div class="progressbar"><i></i></div><div class="progressmeta"><span id="prog-text">0%</span><span id="prog-bytes"></span></div>${onCancel ? `<button class="pillbtn full" style="margin-top:14px" data-action="cancel-progress">${esc(T('continueCancel'))}</button>` : ''}</div>`;
  $('#portal').appendChild(dom);
  return {
    update(p, loaded, total) {
      const bar = dom.querySelector('.progressbar i');
      if (bar) bar.style.width = Math.max(2, Math.min(100, p * 100)).toFixed(1) + '%';
      const t = dom.querySelector('#prog-text'); if (t) t.textContent = Math.round(p * 100) + '%';
      const b = dom.querySelector('#prog-bytes'); if (b && total) b.textContent = formatBytes(loaded) + ' / ' + formatBytes(total);
    },
    close() { dom.remove(); }
  };
}

function quotaDialog(err) {
  const free = err.detail && err.detail.quota ? Math.max(0, err.detail.quota - (err.detail.usage || 0)) : 0;
  dialog(T('quotaTitle'), esc(T('quotaBody',{ need: formatBytes(err.detail?.need || 0), free: formatBytes(free) })), [
    { label:T('manageCache'), cls:'primary', fn:() => goTab('offline') },
    { label:T('chooseOther'), fn:() => $('#video-file').click() },
    { label:T('continueCancel'), cls:'ghost' }
  ]);
}

async function withWakeLock(fn) {
  try {
    if ('wakeLock' in navigator) state.wakeLock = await navigator.wakeLock.request('screen');
  } catch {}
  try { return await fn(); }
  finally {
    try { if (state.wakeLock) await state.wakeLock.release(); } catch {}
    state.wakeLock = null;
  }
}

async function verifySeek(url) {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'metadata'; v.src = url;
  v.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px';
  document.body.appendChild(v);
  const cleanup = () => { try { v.pause(); } catch {}; v.remove(); };
  return new Promise(resolve => {
    const timer = setTimeout(() => { cleanup(); resolve(false); }, 25000);
    v.addEventListener('loadedmetadata', async () => {
      const dur = v.duration;
      if (!isFinite(dur) || dur < 1) { clearTimeout(timer); cleanup(); resolve(false); return; }
      const pts = dur > 8 ? [5, dur * 0.8] : [Math.min(1, dur * 0.3), dur * 0.7];
      const seek = t => new Promise(res => {
        const done = () => { v.removeEventListener('seeked', done); setTimeout(() => res(v.currentTime), 80); };
        v.addEventListener('seeked', done);
        v.currentTime = t;
        setTimeout(() => res(v.currentTime), 6000);
      });
      try {
        const a = await seek(pts[0]); const b = await seek(pts[1]);
        clearTimeout(timer); cleanup();
        resolve(Math.abs(a - pts[0]) < 1 && Math.abs(b - pts[1]) < 1);
      } catch { clearTimeout(timer); cleanup(); resolve(false); }
    });
    v.addEventListener('error', () => { clearTimeout(timer); cleanup(); resolve(false); });
    v.load();
  });
}

async function onVideoFile(file) {
  const id = state.detail;
  if (!file || !id) return;
  const prog = showProgress(T('saving'), T('savingHint'));
  try {
    const saved = await withWakeLock(() => db.saveVideo(id, file, (loaded, total) => prog.update(loaded / total, loaded, total)));
    prog.update(1, saved.bytes, saved.bytes);
    const probe = await db.getVideoURL(id, { ...mediaOf(id), video:true, mode:saved.mode, opfsName:saved.opfsName, bytes:saved.bytes });
    const okSeek = probe ? await verifySeek(probe) : false;
    if (probe) URL.revokeObjectURL(probe);
    if (!okSeek) {
      await db.removeVideo(id);
      const m = { id, ...mediaOf(id), video:false, invalidVideo:true, bytes:0 };
      delete m.opfsName; delete m.mode;
      state.media[id] = m; await db.putMedia(m);
      prog.close();
      dialog(T('saveBad',{msg:T('verify')}), esc(T('saveBad',{msg:T('quota')})), [
        { label:T('retry'), cls:'primary', fn:() => $('#video-file').click() },
        { label:T('chooseOther'), fn:() => $('#video-file').click() },
        { label:T('continueCancel'), cls:'ghost' }
      ]);
      return;
    }
    const m = { id, ...mediaOf(id), video:true, invalidVideo:false, mode:saved.mode, opfsName:saved.opfsName, bytes:saved.bytes, name:saved.name, verifiedAt:Date.now(), slides:!!mediaOf(id).slides };
    state.media[id] = m;
    await db.putMedia(m);
    prog.close();
    notice(T('saveOk'));
    render();
  } catch (e) {
    prog.close();
    if (e instanceof QuotaError) quotaDialog(e);
    else dialog(T('saveBad',{msg:e.message || ''}), esc(e.message || ''), [{ label:T('ok'), cls:'primary' }]);
  } finally {
    $('#video-file').value = '';
  }
}

async function onHtmlFile(file) {
  const id = state.detail;
  if (!file || !id) return;
  try {
    if (!/\.html?$/i.test(file.name)) throw new Error(T('fileBad'));
    if (file.size > 40 * 1024 * 1024) throw new Error(T('tooBig',{n:40}));
    const buffer = await file.arrayBuffer();
    const text = decodeHtml(buffer);
    const scan = scanSelfContained(text);
    const saved = await db.saveSlides(id, text, file.type);
    const m = { id, ...mediaOf(id), slides:true, slidesBytes:saved.bytes, slidesName:file.name, slidesRemote:!scan.selfContained, slidesRefs:scan.refs };
    state.media[id] = m;
    await db.putMedia(m);
    notice(T('slidesOk'));
    render();
    if (!scan.selfContained) notice(T('slidesRemote'));
  } catch (e) {
    dialog(T('slidesBad',{msg:e.message || ''}), esc(e.message || ''), [{ label:T('ok'), cls:'primary' }]);
  } finally {
    $('#html-file').value = '';
  }
}

/* ---------- slides ---------- */
let slideHistory = false;
function openSlides() {
  const x = find(state.detail);
  if (!x) return;
  const m = mediaOf(x.id);
  const has = m.slides || x.demoSlides;
  if (!has) { startSlidesImport(); return; }
  const v = document.querySelector('video'); if (v && !v.paused) { v.pause(); savePosition(x.id, v.currentTime); }
  if (isNative && m.slides) {
    const dark = document.documentElement.dataset.theme === 'dark';
    platform.openSlides(x.id, x.title, dark ? 'dark' : 'light', {
      back: T('slideBack'), full: T('slideFull'), exitFull: T('slideExitFull'),
      error: T('slidesError'), errorBody: T('slidesErrorBody'), backShort: T('backShort')
    }).catch(() => notice(T('slidesMissing')));
    return;
  }
  (async () => {
    let text = null;
    if (m.slides) text = await db.getSlides(x.id);
    else if (x.demoSlides) text = await (await fetch('./assets/demo-slide.html')).text();
    if (!text) { notice(T('slidesMissing')); return; }
    if (state.slideUrl) URL.revokeObjectURL(state.slideUrl);
    state.slideUrl = URL.createObjectURL(new Blob([hardenHtml(text)], { type:'text/html' }));
    const el = document.createElement('div');
    el.className = 'slide-modal';
    el.id = 'slide-modal';
    el.innerHTML = `<div class="slide-top"><button data-action="slide-close">${esc(T('slideBack'))}</button><span>${esc(x.title)} · HTML</span><button data-action="slide-fullscreen">${esc(T('slideFull'))}</button></div><div class="slide-center"><iframe id="slide-frame" sandbox="allow-scripts" allowfullscreen referrerpolicy="no-referrer" title="${esc(T('slides'))}" src="${state.slideUrl}"></iframe><div id="slide-error" class="slide-empty" hidden><h3>${esc(T('slidesError'))}</h3><p>${esc(T('slidesErrorBody'))}</p><button class="pillbtn green" data-action="slide-close">${esc(T('back'))}</button></div></div><div class="slide-controls"><button data-action="slide-prev" aria-label="${esc(T('slideBack'))}">‹</button><span id="slide-count">— / —</span><button data-action="slide-next" aria-label="${esc(T('slideFull'))}">›</button></div>`;
    $('#portal').appendChild(el);
    const frame = $('#slide-frame');
    const failTimer = setTimeout(() => {
      const err = $('#slide-error'); const f = $('#slide-frame');
      if (err && f) { f.hidden = true; err.hidden = false; }
    }, 8000);
    frame.addEventListener('load', () => { clearTimeout(failTimer); setTimeout(pushSlideHistory, 80); });
  })().catch(() => {
    notice(T('slidesError'));
  });
}
function pushSlideHistory() {
  if (slideHistory) return;
  try { history.pushState({ p070Slide:1 }, ''); slideHistory = true; } catch {}
}
function closeSlides(fromPop) {
  const el = $('#slide-modal');
  if (!el) return;
  el.remove();
  if (state.slideUrl) { URL.revokeObjectURL(state.slideUrl); state.slideUrl = null; }
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  if (slideHistory && !fromPop) { slideHistory = false; try { history.replaceState(null, ''); } catch {} }
  else if (fromPop) slideHistory = false;
}
function stepSlide(dir) {
  const f = $('#slide-frame');
  if (f) { try { f.contentWindow.postMessage({ type:'p070:nav', dir }, '*'); } catch {} }
}
function fullSlides() {
  const el = $('#slide-modal');
  if (!el) return;
  if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => notice(T('slideFull')));
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/* ---------- import ---------- */
function normalizeItem(x, i) {
  if (!x || typeof x !== 'object' || !String(x.title || '').trim()) return null;
  const tags = Array.isArray(x.tags) ? x.tags.slice(0, 8).map(s => String(s).slice(0, 15)) : [];
  const summary = Array.isArray(x.summary) ? x.summary.map(String).slice(0, 15) : String(x.summary || '').split(/\n+/).filter(Boolean).slice(0, 15);
  const terms = (Array.isArray(x.terms) ? x.terms : []).slice(0, 30).map(t => {
    if (Array.isArray(t)) return [String(t[0] || ''), String(t[1] || '')];
    if (t && typeof t === 'object') return [String(t.en || t[0] || ''), String(t.zh || t[1] || '')];
    return null;
  }).filter(t => t && t[0]);
  const rawId = String(x.id || `custom-${Date.now()}-${i}`).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100);
  return {
    id: rawId, order: 100 + i, title: String(x.title).slice(0, 90), en: String(x.en || '').slice(0, 100),
    lang: (x.lang || x.language) === 'en' ? 'en' : 'zh', topic: String(x.topic || '未分类').slice(0, 30), tags,
    time: String(x.time || ''), art: x.art || 'court', summary, transcript: String(x.transcript || ''),
    terms, source: String(x.source || x.source_url || '').trim(), demoVideo: false, demoSlides: false
  };
}
async function applyImport(list, mode) {
  let added = 0, updated = 0, skipped = 0;
  const items = [];
  for (const raw of list) {
    const it = normalizeItem(raw, items.length);
    if (!it) continue;
    const old = find(it.id);
    if (old) {
      if (mode === 'skip') { skipped++; continue; }
      if (mode === 'replace') {
        await db.removeVideo(it.id); await db.removeSlides(it.id);
        const m = { id:it.id, ...mediaOf(it.id), video:false, slides:false, invalidVideo:false, bytes:0 };
        delete m.opfsName; delete m.mode; delete m.slidesBytes;
        state.media[it.id] = m; await db.putMedia(m);
      }
      const merged = mode === 'replace' ? it : { ...old, ...it, source: it.source || old.source, order: old.order, demoVideo: old.demoVideo, demoSlides: old.demoSlides };
      await db.putItem(merged); items.push(merged); updated++;
    } else {
      await db.putItem(it); items.push(it); added++;
    }
  }
  state.items = await db.allItems();
  state.items.sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
  state.tab = 'home'; state.detail = null; state.lang = 'all'; state.tag = '全部'; state.q = '';
  render(); notice(T('importOk',{n:added + updated}));
  if (added + updated) notice(T('importSummary',{a:added,b:updated,c:skipped}));
}
function askDuplicate(count) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (!done) { done = true; resolve(v); } };
    dialog(T('dupTitle'), esc(T('dupBody',{n:count})), [
      { label:T('dupKeep'), cls:'primary', fn:() => finish('keep') },
      { label:T('dupReplace'), fn:() => finish('replace') },
      { label:T('dupSkip'), fn:() => finish('skip') },
      { label:T('dupCancel'), cls:'ghost', fn:() => finish('cancel') }
    ]);
    const mask = $('#dialog-mask');
    if (mask) {
      const obs = new MutationObserver(() => { if (!document.body.contains(mask)) { obs.disconnect(); finish('cancel'); } });
      obs.observe(document.body, { childList:true, subtree:true });
    }
  });
}
async function importJson(file) {
  try {
    await importJsonText(await file.text());
  } catch (e) {
    dialog(T('importBad',{msg:''}), esc(e.message || String(e)), [{ label:T('ok'), cls:'primary' }]);
  } finally {
    $('#json-file').value = '';
  }
}

async function importJsonText(txt) {
  const json = JSON.parse(txt);
  const arr = Array.isArray(json) ? json : json.items;
  if (!Array.isArray(arr) || !arr.length) throw new Error(T('importNone'));
  const norm = arr.map(normalizeItem).filter(Boolean);
  if (!norm.length) throw new Error(T('importNone'));
  const dups = norm.filter(x => !!find(x.id));
  let mode = 'keep';
  if (dups.length) {
    mode = await askDuplicate(dups.length);
    if (mode === 'cancel') { notice(T('cancel')); return; }
  }
  await applyImport(norm, mode);
}
function downloadExample() {
  const example = { version:1, items:[{ id:'my-pickleball-video-01', title:'我的匹克球教学视频', en:'My Pickleball Tutorial', lang:'zh', topic:'匹克球', tags:['规则','入门'], time:'05:20', summary:['第一条重点','第二条重点'], transcript:'这里放已经转写整理好的原文稿', terms:[['Non-volley zone','非截击区']], source:'', slides:false }] };
  const blob = new Blob([JSON.stringify(example, null, 2)], { type:'application/json' });
  const a = document.createElement('a');
  const url = URL.createObjectURL(blob);
  a.href = url; a.download = 'P070-knowledge-pack-example.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

/* ---------- sharing ---------- */
async function copyText(txt) {
  if (!txt) return false;
  if (isNative) {
    try { await platform.copyText(txt); return true; } catch {}
  }
  try { await navigator.clipboard.writeText(txt); return true; }
  catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = txt; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    } catch { return false; }
  }
}
async function copyShare() {
  const text = shareString();
  if (!text) { notice(T('noLinks')); return; }
  const ok = await copyText(text);
  if (ok) {
    const valid = state.selected.map(find).filter(x => x && /^https?:\/\//i.test(liveSrc(x))).length;
    const missing = state.selected.length - valid;
    notice(missing ? T('copiedSkip',{n:valid,m:missing}) : T('copied'));
  } else {
    overlay(T('copyManual'), `<p class="summary-text">${esc(T('copyFail'))}</p><textarea class="text-input" style="min-height:160px;margin-top:10px">${esc(text)}</textarea>`);
  }
}
async function nativeShare() {
  const text = shareString();
  if (!text) { notice(T('noLinks')); return; }
  if (isNative) {
    try { await platform.shareText(text, T('shareTitle')); }
    catch { copyShare(); }
    return;
  }
  if (navigator.share) {
    try { await navigator.share({ title:'Pickleball · Videos to Watch', text }); }
    catch (e) { if (e.name !== 'AbortError') copyShare(); }
  } else copyShare();
}

/* ---------- cache management ---------- */
function clearShareConfirm() {
  if (!state.selected.length) return;
  askConfirm(T('clearShareQ'), T('clearShareBody'), T('clear'), () => {
    state.selected = []; saveLocal('p070_selected', state.selected); render();
  });
}
function clearAllCache() {
  const ids = all().filter(x => mediaOf(x.id).video || mediaOf(x.id).slides).map(x => x.id);
  if (!ids.length) return;
  askConfirm(T('clearAllCache'), T('clearAllBody'), T('confirm') + ' · ' + T('clearAllCache'), async () => {
    try {
      for (const id of ids) {
        await db.removeVideo(id); await db.removeSlides(id);
        const m = { id, ...mediaOf(id), video:false, slides:false, invalidVideo:false, bytes:0 };
        delete m.opfsName; delete m.mode; delete m.slidesBytes; delete m.slidesRemote;
        state.media[id] = m; await db.putMedia(m);
      }
      render(); notice(T('allCleared'));
    } catch { notice(T('removeFail')); }
  });
}
function removeCache(id) {
  const x = find(id);
  if (!x) return;
  askConfirm(T('removeCacheQ'), T('removeCacheBody'), T('remove'), async () => {
    try {
      await db.removeVideo(id); await db.removeSlides(id);
      const m = { id, ...mediaOf(id), video:false, slides:false, invalidVideo:false, bytes:0 };
      delete m.opfsName; delete m.mode; delete m.slidesBytes; delete m.slidesRemote;
      state.media[id] = m; await db.putMedia(m);
      render(); notice(T('removed'));
    } catch { notice(T('removeFail')); }
  });
}

/* ---------- boot & self-check ---------- */
async function selfCheck() {
  let lost = 0;
  for (const id of Object.keys(state.media)) {
    const m = state.media[id];
    if (!m) continue;
    if (m.video) {
      const ok = await db.checkVideo(id, m);
      if (!ok) { m.video = false; m.invalidVideo = true; delete m.opfsName; delete m.mode; await db.putMedia(m); lost++; }
    }
    if (m.slides) {
      const okSlides = await db.hasSlides(id);
      if (!okSlides) { m.slides = false; await db.putMedia(m); lost++; }
    }
  }
  if (lost) setTimeout(() => notice(T('localLost',{n:lost})), 900);
}

async function boot() {
  state.theme = loadLocal('p070_theme', 'light');
  if (!['light','dark','system'].includes(state.theme)) state.theme = 'light';
  state.language = loadLocal('p070_language', 'system');
  state.selected = loadLocal('p070_selected', []);
  if (!Array.isArray(state.selected)) state.selected = [];
  applyTheme();

  try {
    state.items = await db.allItems();
    if (!state.items.length) {
      await db.putItems(SEED);
      state.items = SEED.slice();
    }
    state.items.sort((a,b) => (a.order ?? 999) - (b.order ?? 999));
    state.media = await db.allMedia();
    await selfCheck();
  } catch (e) {
    state.dbOK = false;
    state.items = SEED.slice();
    setTimeout(() => notice(T('dbFail')), 500);
  }
  render(false);
  if (isNative) {
    try { ENV = await platform.info(); } catch {}
    platform.onBack(handleBack);
    window.__p070Back = handleBack;
    document.documentElement.classList.add('native');
  } else {
    registerSW();
  }
  bindEnvironment();
  // Test-only seeding hook, limited to localhost; never visible in the UI.
  const seedParams = new URLSearchParams(location.search);
  if (!isNative && seedParams.get('p070seed') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) {
    seedTestVideo(seedParams.get('p070seed'), seedParams.get('src') || './assets/demo.mp4');
  }
}

async function seedTestVideo(id, src) {
  try {
    notice('test seed: downloading');
    const res = await fetch(src, { cache:'no-store' });
    if (!res.ok) throw new Error('fetch ' + res.status);
    const blob = await res.blob();
    const file = new File([blob], 'seed.mp4', { type:'video/mp4' });
    const saved = await db.saveVideo(id, file, () => {});
    const probe = await db.getVideoURL(id, { id, video:true, mode:saved.mode, opfsName:saved.opfsName, bytes:saved.bytes });
    const ok = probe ? await verifySeek(probe) : false;
    if (probe) URL.revokeObjectURL(probe);
    if (!ok) { await db.removeVideo(id); throw new Error('seek verify failed'); }
    const m = { id, ...mediaOf(id), video:true, invalidVideo:false, mode:saved.mode, opfsName:saved.opfsName, bytes:saved.bytes, name:'seed.mp4', verifiedAt:Date.now() };
    state.media[id] = m; await db.putMedia(m);
    render(); notice('test seed OK: ' + formatBytes(saved.bytes));
  } catch (e) {
    notice('test seed failed: ' + (e.message || e));
  }
}

function bindEnvironment() {
  window.addEventListener('online', () => { notice(T('online')); render(); });
  window.addEventListener('offline', () => { notice(T('offline')); render(); });
  const mq = matchMedia('(prefers-color-scheme: dark)');
  if (mq.addEventListener) mq.addEventListener('change', () => { if (state.theme === 'system') applyTheme(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const v = document.querySelector('video');
      if (v && state.detail) savePosition(state.detail, v.currentTime);
    } else {
      checkUpdate();
    }
  });
  window.addEventListener('popstate', () => {
    if ($('#slide-modal')) closeSlides(true);
  });
  window.addEventListener('beforeunload', () => {
    const v = document.querySelector('video');
    if (v && state.detail) savePosition(state.detail, v.currentTime);
  });
  setInterval(checkUpdate, 30 * 60 * 1000);
}

/* ---------- service worker ---------- */
let swReg = null;
let waitingWorker = null;
function updateUpdateBar() {
  const bar = $('#updatebar');
  if (!bar) return;
  const show = !!waitingWorker;
  bar.hidden = !show;
  if (show) {
    $('#updatetext').textContent = T('updateReady');
    $('#updatebtn').textContent = T('update');
    $('#updatelater').textContent = T('updateLater');
  }
}
async function registerSW() {
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
  try {
    swReg = await navigator.serviceWorker.register('./sw.js', { scope:'./', updateViaCache:'none' });
    if (swReg.waiting) { waitingWorker = swReg.waiting; updateUpdateBar(); }
    swReg.addEventListener('updatefound', () => {
      const nw = swReg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          waitingWorker = nw; updateUpdateBar();
        }
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (waitingWorker) location.reload();
    });
    checkUpdate();
  } catch (e) { /* PWA shell is optional for local file debugging */ }
}
function checkUpdate() { if (swReg) swReg.update().catch(() => {}); }

/* ---------- event wiring ---------- */
function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const a = btn.dataset.action, id = btn.dataset.id, val = btn.dataset.val;
  if (a === 'tab') goTab(val);
  else if (a === 'theme') changeTheme();
  else if (a === 'theme-toggle') changeTheme();
  else if (a === 'theme-open') askTheme();
  else if (a === 'language-open') askLanguage();
  else if (a === 'set-theme') setTheme(val);
  else if (a === 'set-language') setLanguage(val);
  else if (a === 'language') { state.lang = val; render(); }
  else if (a === 'tag') { state.tag = val; render(); }
  else if (a === 'reset') { state.lang = 'all'; state.tag = '全部'; state.q = ''; render(); }
  else if (a === 'open') openItem(id);
  else if (a === 'close-detail') backToList();
  else if (a === 'share-toggle') updateShare(id || state.detail);
  else if (a === 'share-check') updateShare(id);
  else if (a === 'transcript') {
    state.expanded = !state.expanded;
    const ind = $('#transcript-indicator');
    if (ind) ind.textContent = state.expanded ? T('collapse') : T('expand');
    const c = $('#transcript-container');
    if (c) c.innerHTML = state.expanded ? `<div class="acc-body">${esc(find(state.detail)?.transcript || '')}</div>` : '';
  }
  else if (a === 'import') askImport();
  else if (a === 'overlay-close') closeOverlay();
  else if (a === 'pick-json') startManifestImport();
  else if (a === 'download-json') downloadExample();
  else if (a === 'pick-video') startVideoImport();
  else if (a === 'pick-html') startSlidesImport();
  else if (a === 'slides-open') openSlides();
  else if (a === 'source-edit') askSource();
  else if (a === 'save-source') saveSource();
  else if (a === 'source-open') {
    const u = liveSrc(find(state.detail));
    if (!/^https?:\/\//.test(u)) { notice(T('sourceEmpty')); return; }
    if (isNative) platform.openExternal(u).catch(() => notice(T('sourceOpenFail')));
    else window.open(u, '_blank', 'noopener,noreferrer');
  }
  else if (a === 'remove-cache') removeCache(id);
  else if (a === 'clear-cache') clearAllCache();
  else if (a === 'clear-share') clearShareConfirm();
  else if (a === 'copy-share') copyShare();
  else if (a === 'system-share') nativeShare();
  else if (a === 'slide-close') closeSlides();
  else if (a === 'slide-prev') stepSlide('prev');
  else if (a === 'slide-next') stepSlide('next');
  else if (a === 'slide-fullscreen') fullSlides();
  else if (a === 'cancel-progress') {
    if (isNative) platform.cancelImport().catch(() => {});
    const el = $('#progress-mask');
    if (el) el.remove();
  }
}
function updateShare(id) {
  if (!id) return;
  state.selected = state.selected.includes(id) ? state.selected.filter(x => x !== id) : [...state.selected, id];
  saveLocal('p070_selected', state.selected);
  if (state.detail) {
    const b = document.querySelector('[data-action="share-toggle"]');
    if (b) b.innerHTML = icon(state.selected.includes(id) ? 'check' : 'plus', 16) + esc(state.selected.includes(id) ? T('addedShare') : T('addToShare'));
    const nav = document.querySelector('.bottom');
    if (nav) nav.outerHTML = bottom();
  } else render();
  notice(state.selected.includes(id) ? T('addedShare') : T('removeShare'));
  updateUpdateBar();
}

document.addEventListener('click', handleClick);
document.addEventListener('input', e => {
  if (e.target.id === 'search-input') { state.q = e.target.value; refreshResults(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'video-file') { const f = e.target.files?.[0]; if (f) onVideoFile(f); }
  if (e.target.id === 'html-file') { const f = e.target.files?.[0]; if (f) onHtmlFile(f); }
  if (e.target.id === 'json-file') { const f = e.target.files?.[0]; if (f) importJson(f); }
});
$('#updatebtn')?.addEventListener('click', () => {
  if (waitingWorker) waitingWorker.postMessage({ type:'P070_SKIP_WAITING' });
});
$('#updatelater')?.addEventListener('click', () => { const b = $('#updatebar'); if (b) b.hidden = true; });

window.addEventListener('message', e => {
  const d = e.data || {};
  if (d.type === 'p070:page' && $('#slide-count')) {
    $('#slide-count').textContent = T('page',{i:d.index,n:d.total});
  }
  if (d.type === 'p070:exit') closeSlides();
});
document.addEventListener('keydown', e => {
  if (!$('#slide-modal')) return;
  if (e.key === 'Escape') closeSlides();
  if (e.key === 'ArrowRight') stepSlide('next');
  if (e.key === 'ArrowLeft') stepSlide('prev');
});

boot();
