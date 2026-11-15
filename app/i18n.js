/* P070 UI copy. Add a language by adding one object; no business branching. */

const ZH = {
  navHome:'资料库', navOffline:'已缓存', navShare:'分享清单', navSettings:'设置',
  search:'搜索视频、知识点或英语术语', all:'全部', zh:'中文', en:'英文',
  heroEyebrow:'LEARNING COLLECTION', heroTitle:'匹克球入门', heroSub:'Pickleball Basics',
  heroBottom:'{n} 条资料 · 视频 / 总结 / 课件', sectionTitle:'学习资料', found:'找到 {n} 条',
  savedVideo:'✓ 已保存视频', demoClip:'内置演示片段', needVideo:'○ 待导入视频',
  lostVideo:'⚠ 本地副本已丢失', addShare:'加入分享清单', removeShare:'从分享清单移除',
  emptyTitle:'没有找到资料', emptyText:'试着切换语言或标签。', clearFilter:'清除筛选',
  demoNote:'演示资料为界面样例，不是真实教学视频。原片、总结和 HTML 课件在电脑上准备好后导入。',
  back:'返回资料库', importVideo:'导入视频', addToShare:'加入分享', addedShare:'已加入分享',
  cachedPlayable:'✓ 已缓存，可本地播放', demoPlayable:'内置模拟片段（不计入离线）', notImported:'未导入本地视频',
  videoHint:'导入视频后才可能真正离线播放。', keyPoints:'重点总结', english:'英文', chinese:'中文',
  transcript:'原始文稿 · Transcript', expand:'展开 ＋', collapse:'收起 −',
  terms:'讲解时可用的英语术语', termsCount:'{n} 个', slides:'HTML 讲解课件',
  slidesReady:'HTML 幻灯片', demoSlides:'示例 HTML 课件', slidesNot:'尚未导入课件', slidesReadySub:'现场全屏展示 · 支持翻页',
  slidesNotSub:'可导入 AI 生成的单文件 HTML', openSlides:'打开课件', importSlides:'导入课件',
  replaceSlides:'导入 / 替换 HTML 课件', source:'原视频来源', sourceEmpty:'尚未填写真实视频链接',
  edit:'编辑', openSource:'打开原视频', sourceNote:'只保存链接，不上传视频副本。请填写真实 B 站 / YouTube 网页地址。',
  sourceTitle:'设置原视频链接', sourceLabel:'完整网页地址', save:'保存链接', cancel:'取消',
  detailNote:'导入后视频与课件都保存在这台手机上，飞行模式也能播放。',
  offlineTitle:'已缓存的内容', offlineSub:'不用网络也能打开已保存的文件。示例视频不计入已缓存。',
  localFiles:'手机本地资料', savedCount:'已保存 {n} 条资料相关文件', items:'{n} 项',
  offlineEmpty:'暂无保存的视频', offlineEmptyText:'先到资料详情导入 MP4 或 HTML 课件，导入成功后会在这里显示。',
  browse:'浏览资料', offlineNote:'提示：卸载应用会删除手机内的视频与课件；重要原件请留在电脑上。',
  video:'视频', slidesShort:'HTML 课件', open:'打开', remove:'删除', removeCacheQ:'删除这条资料在这台手机保存的视频和 HTML 课件吗？', clearAllCache:'清理全部缓存', clearAllBody:'会删除所有已保存的视频和 HTML 课件，资料清单与链接保留。', allCleared:'已清理全部缓存',
  removeCacheBody:'原始资料记录不删除，之后可以重新导入。', removed:'已清理本地媒体文件', removeFail:'清理失败，请重试',
  shareTitle:'分享清单', shareSub:'勾选学习资料，把原视频网页链接发给外国朋友。',
  selectedN:'已选 {n} 项', linksN:'{n} 条有真实来源链接', clear:'清空',
  shareEmpty:'还没有分享项目', shareEmptyText:'在资料列表点击每条视频旁边的「＋」，即可加入分享清单。',
  goPick:'去选视频', preview:'分享预览', previewSub:'仅包含有效原视频网址', noLinks:'没有可分享的网址。请进入视频详情，先填写真实来源链接。',
  copyList:'复制链接清单', systemShare:'系统分享', shareNote:'朋友收到的是 B 站 / YouTube 等来源平台的公开视频网址，不是你手机缓存的 MP4 文件。来源是否可用取决于对方的网络与平台访问条件。',
  notSet:'未设置来源链接', clearShareQ:'清空分享清单吗？', clearShareBody:'不会删除资料库中的视频。',
  copied:'链接清单已复制', copiedSkip:'已复制 {n} 条，跳过 {m} 条缺链接', copyFail:'复制失败，请手动选择文本', copyManual:'复制失败，请长按选择文本',
  themeLight:'浅色', themeDark:'深色', themeSystem:'跟随系统',
  settingsTitle:'设置', offlineMgmt:'离线资料管理', offlineMgmtSub:'查看已导入视频及 HTML 幻灯片',
  importRow:'导入学习资料', importRowSub:'JSON 文字清单 / 单条媒体文件', darkMode:'深色模式', darkModeSub:'首次默认浅色，可随时切换',
  language:'语言显示', languageSub:'{name} · 保留英语标题与术语', appearance:'外观', languageTitle:'界面语言',
  followSystem:'跟随系统', simplifiedChinese:'简体中文', englishUI:'English',
  version:'随身讲解库 / Pocket Presenter\n版本 {v} · 安卓离线版\n不包含视频下载、AI 总结或 HTML PPT 制作。',
  installHint:'升级请用新安装包覆盖安装，资料会保留；卸载会删除手机内的视频和课件。',
  footer:'先把内容准备好，再随身展示给朋友。',
  importTitle:'导入学习资料', importBody:'视频下载、转写、AI 整理和 HTML PPT 制作已在外部完成。这里仅导入整理好的资料。',
  pickJson:'选择 JSON 知识清单', downloadJson:'下载 JSON 示例格式',
  importNote:'请确认你拥有这些视频的使用权。本应用不上传你的视频，也不提供下载或绕过平台限制的功能。导入后视频只保存在这台手机上。',
  shareHeading:'随身讲解库 · 视频清单',
  importBad:'导入失败：{msg}', importOk:'已导入 {n} 条资料', importNone:'清单中没有有效资料',
  dupTitle:'资料已存在', dupBody:'有 {n} 条资料的 id 与现有资料重复，请选择处理方式。',
  dupKeep:'保留原素材，只更新文字', dupReplace:'替换视频与讲解稿', dupSkip:'跳过重复项', dupCancel:'取消本次导入',
  importSummary:'新增 {a} 条，更新 {b} 条，跳过 {c} 条',
  pickVideo:'导入视频', pickHtml:'导入 / 替换 HTML 课件', importPdf:'导入课件',
  saving:'正在保存…', savingHint:'请保持屏幕常亮，不要切换应用。', verify:'正在校验离线播放…',
  saveOk:'视频已保存，可离线播放', saveBad:'保存失败：{msg}', quota:'手机存储空间不足。请先清理旧缓存，或换一个更小的视频。',
  quotaTitle:'存储空间不足', quotaBody:'需要 {need}，当前可用约 {free}。可以先清理旧缓存，或取消后换一个更小的文件。',
  manageCache:'去清理缓存', continueCancel:'取消', retry:'重试', chooseOther:'换一个文件',
  slidesOk:'课件已保存', slidesBad:'课件保存失败：{msg}', slidesSelf:'单文件自包含，可离线打开', slidesRemote:'检测到外部链接，断网时可能无法打开',
  slidesMissing:'课件文件已失效，请重新导入', slidesError:'课件打不开', slidesErrorBody:'文件可能缺失，或不是单文件离线版本。回到详情重新导入即可。',
  slideBack:'‹ 返回资料', slideFull:'全屏', slideExitFull:'退出全屏', backShort:'返回',
  slideHint:'点两侧按钮翻页，也可在课件内左右滑动', page:'{i} / {n}',
  verifyFailBody:'保存后的副本在这台手机上无法正常播放或拖动，已删除这份副本。可以重试，或换一个 MP4 文件。',
  sourceOpenFail:'没有可以打开链接的应用',
  offline:'当前离线，已缓存的内容仍可打开', online:'已恢复联网', netOffline:'离线',
  updateReady:'有新版本可用，更新后资料不会丢', update:'更新', updateLater:'稍后',
  localLost:'有 {n} 条本地副本已丢失，请重新导入', resumed:'已从上次位置继续', saved:'已保存', deleted:'已删除',
  fileBad:'文件格式不支持', tooBig:'文件超过 {n} MB，请拆分或压缩后再导入',
  dbFail:'本地资料库暂时不可用，请重新打开应用再试。',
  confirm:'确认', close:'关闭', done:'完成', ok:'好'
};

const EN = {
  navHome:'Library', navOffline:'Cached', navShare:'Share list', navSettings:'Settings',
  search:'Search videos, notes or English terms', all:'All', zh:'Chinese', en:'English',
  heroEyebrow:'LEARNING COLLECTION', heroTitle:'Pickleball Basics', heroSub:'匹克球入门',
  heroBottom:'{n} items · video / summary / slides', sectionTitle:'Learning material', found:'{n} found',
  savedVideo:'✓ Video saved', demoClip:'Built-in demo clip', needVideo:'○ Import a video',
  lostVideo:'⚠ Local copy is missing', addShare:'Add to share list', removeShare:'Remove from share list',
  emptyTitle:'No matching material', emptyText:'Try another language or tag.', clearFilter:'Clear filters',
  demoNote:'Demo items are UI samples, not real lessons. Originals, summaries and HTML decks are prepared on a computer and then imported.',
  back:'Back to library', importVideo:'Import video', addToShare:'Add to share', addedShare:'Added to share',
  cachedPlayable:'✓ Cached and playable offline', demoPlayable:'Built-in demo clip (not offline)', notImported:'No local video imported',
  videoHint:'Offline playback is only possible after importing the video.', keyPoints:'Key summary', english:'English', chinese:'Chinese',
  transcript:'Transcript', expand:'Expand ＋', collapse:'Collapse −',
  terms:'English terms for presenting', termsCount:'{n}', slides:'HTML presentation',
  slidesReady:'HTML slides', demoSlides:'Sample HTML deck', slidesNot:'No deck imported', slidesReadySub:'Full-screen with page turning',
  slidesNotSub:'Import a single self-contained HTML file', openSlides:'Open slides', importSlides:'Import slides',
  replaceSlides:'Import / replace HTML deck', source:'Original video source', sourceEmpty:'No real video link yet',
  edit:'Edit', openSource:'Open original video', sourceNote:'Only the link is saved. No video is uploaded. Use a real Bilibili / YouTube page URL.',
  sourceTitle:'Set original video link', sourceLabel:'Full web address', save:'Save link', cancel:'Cancel',
  detailNote:'Once imported, the video and deck live on this phone and play in airplane mode.',
  offlineTitle:'Cached content', offlineSub:'Saved files open without a network. The demo clip is not counted as cached.',
  localFiles:'Files on this phone', savedCount:'{n} items with saved files', items:'{n}',
  offlineEmpty:'Nothing saved yet', offlineEmptyText:'Open an item, import an MP4 or HTML deck, and it will appear here.',
  browse:'Browse library', offlineNote:'Uninstalling the app deletes the videos and decks on this phone. Keep the originals on your computer.',
  video:'Video', slidesShort:'HTML deck', open:'Open', remove:'Remove', removeCacheQ:'Remove the saved video and deck for this item from this phone?', clearAllCache:'Clear all cache', clearAllBody:'Removes all saved videos and HTML decks. Library records and links stay.', allCleared:'All cache cleared',
  removeCacheBody:'The library record stays. You can import the files again later.', removed:'Local files removed', removeFail:'Could not remove files; retry',
  shareTitle:'Share list', shareSub:'Pick items and send the original video links to a friend.',
  selectedN:'{n} selected', linksN:'{n} with a real source link', clear:'Clear',
  shareEmpty:'No items to share', shareEmptyText:'Tap the ＋ next to a video in the library to add it here.',
  goPick:'Pick videos', preview:'Share preview', previewSub:'Only valid original video links', noLinks:'No shareable links. Open an item and add its real source link first.',
  copyList:'Copy link list', systemShare:'Share', shareNote:'Friends receive the public Bilibili / YouTube URL, never the MP4 on your phone. Availability depends on their network and the platform.',
  notSet:'No source link', clearShareQ:'Clear the share list?', clearShareBody:'Videos in the library are not deleted.',
  copied:'Link list copied', copiedSkip:'Copied {n}, skipped {m} without links', copyFail:'Copy failed; select the text manually', copyManual:'Copy failed; long-press to select',
  themeLight:'Light', themeDark:'Dark', themeSystem:'Follow system',
  settingsTitle:'Settings', offlineMgmt:'Offline files', offlineMgmtSub:'Manage imported videos and HTML decks',
  importRow:'Import material', importRowSub:'JSON manifest / one media file', darkMode:'Dark mode', darkModeSub:'Light by default; switch any time',
  language:'Language', languageSub:'{name} · English titles and terms stay', appearance:'Appearance', languageTitle:'Interface language',
  followSystem:'Follow system', simplifiedChinese:'简体中文', englishUI:'English',
  version:'随身讲解库 / Pocket Presenter\nVersion {v} · Android offline edition\nNo video download, AI summary or HTML PPT editor.',
  installHint:'Update by installing the newer package over this one; your material stays. Uninstalling deletes the videos and decks on this phone.',
  footer:'Prepare the content once, present it anywhere.',
  importTitle:'Import material', importBody:'Downloading, transcription, AI summaries and HTML decks happen outside this app. Import the prepared material here.',
  pickJson:'Choose JSON manifest', downloadJson:'Download example JSON',
  importNote:'Please confirm you have the rights to use these videos. The app never uploads your videos, offers no downloader or DRM bypass, and keeps imported files only on this phone.',
  shareHeading:'Pocket Presenter · Videos to Watch',
  importBad:'Import failed: {msg}', importOk:'Imported {n} items', importNone:'No valid items in the manifest',
  dupTitle:'Items already exist', dupBody:'{n} item ids already exist. Choose how to handle them.',
  dupKeep:'Keep media, update text', dupReplace:'Replace video and deck', dupSkip:'Skip duplicates', dupCancel:'Cancel import',
  importSummary:'{a} added, {b} updated, {c} skipped',
  pickVideo:'Import video', pickHtml:'Import / replace HTML deck', importPdf:'Import deck',
  saving:'Saving…', savingHint:'Keep the screen on and stay in this app.', verify:'Checking offline playback…',
  saveOk:'Video saved and playable offline', saveBad:'Save failed: {msg}', quota:'Not enough storage. Clear old cache or choose a smaller video.',
  quotaTitle:'Not enough storage', quotaBody:'Need {need}; about {free} available. Clear old cache, or cancel and choose a smaller file.',
  manageCache:'Manage cache', continueCancel:'Cancel', retry:'Retry', chooseOther:'Choose another file',
  slidesOk:'Deck saved', slidesBad:'Deck save failed: {msg}', slidesSelf:'Single-file, self-contained, opens offline', slidesRemote:'External links found; may fail offline',
  slidesMissing:'Deck file is missing; import it again', slidesError:'Deck will not open', slidesErrorBody:'The file may be missing, or it is not a single-file offline deck. Import it again from the detail page.',
  slideBack:'‹ Back', slideFull:'Full screen', slideExitFull:'Exit full screen', backShort:'Back',
  slideHint:'Use the side buttons, or swipe inside the deck', page:'{i} / {n}',
  verifyFailBody:'The saved copy could not be played or seeked on this phone, so it was removed. Retry, or choose another MP4.',
  sourceOpenFail:'No app can open this link',
  offline:'You are offline. Cached content still opens.', online:'Back online', netOffline:'Offline',
  updateReady:'A new version is ready; your material stays', update:'Update', updateLater:'Later',
  localLost:'{n} local copies are missing; import them again', resumed:'Resumed from where you stopped', saved:'Saved', deleted:'Deleted',
  fileBad:'Unsupported file type', tooBig:'File is over {n} MB; split or compress it first',
  dbFail:'The local library is unavailable. Reopen the app and try again.',
  confirm:'Confirm', close:'Close', done:'Done', ok:'OK'
};

const DICTS = { zh: ZH, en: EN };

export function resolveLang(mode) {
  if (mode === 'en') return 'en';
  if (mode === 'zh') return 'zh';
  const n = String(navigator.language || 'zh-CN').toLowerCase();
  if (n.startsWith('zh')) return 'zh';
  if (n.startsWith('en')) return 'en';
  return 'zh';
}

export function makeT(getLang) {
  return function t(key, vars) {
    const lang = getLang();
    let s = (DICTS[lang] && DICTS[lang][key]) || DICTS.zh[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k])); });
    return s;
  };
}

export const LANGUAGE_LABELS = {
  zh: { system:'跟随系统', zh:'简体中文', en:'English' },
  en: { system:'Follow system', zh:'简体中文', en:'English' }
};
