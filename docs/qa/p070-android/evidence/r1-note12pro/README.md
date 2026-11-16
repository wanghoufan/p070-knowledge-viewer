# R1 回归证据 · Redmi Note 12 Pro · APK 1.0.18

- 日期：2026-11-16
- 设备：Redmi Note 12 Pro（22101316C）· Android 14（SDK 34）· System WebView 156.0.8078.47
- 包：`com.p070.pocketpresenter.debug` · versionName `1.0.18-debug` · versionCode 19
- APK：4,273,359 字节 · SHA-256 `BFFBC89395C360F1E30FD0DAABD014B4FB2B5F468564390FBA9F183F6928B75F`
- 装机校验：`pm path` 拉回 base.apk 的 SHA-256 与构建产物一致（同上），即手机跑的就是本目录证据对应的包。
- 源码：`3532391`（含本轮两处修复）；APK 由此工作树构建。
- 安装方式：`adb install -r`（覆盖安装，未卸载、未清数据）；升级路径 `1.0.16(17) → 1.0.17(18) → 1.0.18(19)` 数据全保留。
- 抓取方式：WebView DevTools（`adb forward` + CDP `Runtime.evaluate`）读取真实 DOM，截图用 `adb shell screencap`；改动状态的原值均已记录并复原。

## 本轮查出并修掉的两个缺陷

| # | 现象 | 根因 | 修复 | 复验 |
|---|---|---|---|---|
| D1 | 暂停后连续 seek，强杀重开只恢复到前一个 seek 点（实测停 475s，重开回到 5s） | 进度只在 `pause` 与节流 2.5s 的 `timeupdate` 落盘；暂停状态下 seek 没有 `pause` 事件，第二次 seek 被节流吞掉 | `loadVideo` 增加 `seeked` 立即落盘 | 1.0.17 起：seek 475s → 强杀 → 重开 → 475s，偏差 0 |
| D2 | 主题设为「跟随系统」后，系统切深色/浅色页面不跟着变，必须重启 | Android WebView 在 uiMode 变化时不派发 `prefers-color-scheme` change（实测 `matchMedia().matches` 已变、事件不触发） | `MainActivity.onConfigurationChanged` 回调 `window.__p070ThemeRefresh`，前端用它重算主题 | 1.0.18 起：开/关系统深色，页面实时切换，无需重启 |

## 截图

| 文件 | 内容 |
|---|---|
| `01-library-dark.png` | 资料库首屏（深色）：搜索、语言分段、标签行、4 张紧凑卡片（均「✓ 已保存视频」）、四 Tab |
| `02-detail-auto-sub.png` | 详情页：标题、播放器、8 条重点总结（默认展开）、字幕自动模式（英文单语） |
| `03-subtitles-both-xl.png` | 字幕双语 + 最大字号（英文 23.2px / 中文 24.36px），拖动后位置上移 |
| `04-fullscreen-landscape.png` | 自绘全屏：横屏铺满、双语字幕完整可读、右下退出按钮 |
| `05-474MB-detail.png` | 474MB（496,972,057 字节）素材详情：已缓存可播、时长 1129.19s、1920×1080 |
| `06-system-follow-dark.png` | 主题「跟随系统」+ 系统深色：设置页整体转深色，无需重启 |
| `07-library-light.png` | 浅色主题下的资料库 |
| `08-settings-en.png` | 英文界面设置页：四 Tab 全英文、无横向溢出、版本行 1.0.18 |
| `09-share-list-en.png` | 分享清单：1 条已选、1 个真实来源链接、预览只含 http(s) |
| `10-android-sharesheet.png` | 系统分享面板（`com.android.intentresolver/ChooserActivity`）实际拉起 |
| `11-rotated-landscape.png` | 系统横屏（838×358）：页面随方向重排，字幕仍在画面内 |

## 机器可读结果

```json
{
  "device": {"model": "22101316C", "android": "14", "sdkInt": 34, "webView": "156.0.8078.47"},
  "apk": {"versionName": "1.0.18-debug", "versionCode": 19, "bytes": 4273359, "sha256": "BFFBC89395C360F1E30FD0DAABD014B4FB2B5F468564390FBA9F183F6928B75F", "installedShaMatches": true},
  "permissions": {"internet": false},
  "library": {"cards": 4, "allCached": true, "subBadgeCount": 2, "cachedBytes": [18010415, 35103360, 167699180, 496972057]},
  "tabs": {"count": 4, "labelsZh": ["资料库","已缓存","分享清单","设置"], "activeCount": 1},
  "playback": {"item": "pickleball-ultimate-guide", "duration": 593.78, "played": true, "pauseHeld": true, "seek5": 5, "seek80": 475.02, "delta5": 0, "delta80": 0, "error": null},
  "resume": {"beforeKill": 475, "afterColdStart": 475, "toast": "已从上次位置继续"},
  "largeFile": {"item": "tennis-beginner-forehand-backhand-serve", "bytes": 496972057, "duration": 1129.19, "seek5": 5, "seek80": 903.35, "delta5": 0, "delta80": 0, "error": null},
  "transcript": {"expanded": true, "chars": 11054, "currentTimeBefore": 475.02, "currentTimeAfter": 475.02, "restarted": false},
  "subtitles": {"autoOnEnglish": "en only", "bothLines": 2, "sizeM": [15.08, 16.24], "sizeXL": [23.2, 24.36], "drag": {"bottomBefore": "17px", "bottomAfter": "107px", "deltaPx": 90}, "fullscreenFont": [33.64, 35.96]},
  "fullscreen": {"layer": true, "viewport": [838, 392], "bodyOverflow": "hidden", "exitRestoredViewport": [392, 838], "videoReturned": true},
  "theme": {"states": ["light", "dark", "system"], "systemFollow": {"nightOn": "dark", "nightOff": "light", "live": true}, "restartKeeps": true, "detailToggleKeepsPosition": true},
  "i18n": {"navEn": ["Library", "Cached", "Share list", "Settings"], "horizontalOverflowPx": 0},
  "navigation": {"activeStatesOk": true, "backAtTabReturns": false, "backInDetailReturns": true, "filterKeptAfterBack": 2, "scrollKept": [64, 64], "tagKept": "规则"},
  "rotation": {"landscapeViewport": [838, 358], "subtitlesVisible": true, "systemRotationRestored": [1, 0]},
  "share": {"selected": 1, "links": 1, "onlyHttp": true, "sharesheet": "ChooserActivity"},
  "upgrade": {"path": "1.0.16(17)->1.0.17(18)->1.0.18(19)", "itemsKept": 4, "mediaBytesKept": true, "settingsKept": true, "progressKept": true}
}
```

## 不能判（继续 NOT_RUN，别把本轮当全量验收）

- SAF 真实导入的取消/断电/容量不足异常路径，以及重复 ID 四选项：本轮未重跑。
- 分享「实际发送到聊天工具」与「无可用目标时仍能复制」：只验证到拉起系统分享面板。
- 系统语言不受支持时回落 `zh-CN`：本机系统语言为中文，未构造不支持语言场景。
- HTML 课件（`SlideActivity` 隔离、异常课件拦截）与封面/术语等页面级 AC：未复跑。
- OPPO 第二品牌、飞行模式/5G 冷启动、release 签名包与正式分发：未做。
- 进度恢复口径：允许 seek 后立即强杀，恢复到最后 seek 点（本轮修复项）；不承诺恢复到最后 1 秒内的播放位置。
