# 真机导入两条真实资料（2026-11-14）

- 设备：Redmi Note 12T Pro（`22101316C`，Android 15 / MIUI，1080×2400，440dpi）
- 浏览器：Kiwi Browser（Chromium，已开 WebView 调试），地址 `http://localhost:8766/`（`adb reverse` 映射电脑本地服务）
- 应用版本：1.1.0（含清单内嵌封面）
- 执行方式：主开发者；页面操作通过 CDP（`adb forward tcp:9222`）驱动真实 DOM 与真实 `<input type=file>`，未绕过应用代码

## 导入内容

| id | 标题 | 语言 | 封面 | 视频 | 来源 |
|---|---|---|---|---|---|
| `ntrp-tennis-rating` | 网球水平评分标准你知道吗？ | zh | B 站封面（内嵌 data URL） | 15.2MB / 480×720 / 2:26，已写入 OPFS | BV13k4y1M7Pn |
| `pickleball-rating` | How To Know Your Pickleball Rating | en | YouTube 封面（内嵌 data URL） | **未导入**（YouTube 本地下载被 bot 校验拦住） | EWxwt-lz_-M |

两条都带：标题、中英标题、语言、标签、封面、5–6 条重点总结、全文稿、术语表、原视频链接。

## 实测结果

| 项 | 结果 | 证据 |
|---|---|---|
| 清单导入 | 新增 2 条（6→8），封面渲染 2 个 | `01-library-with-cover.png` |
| 视频写入 OPFS | 15,224,847 B，状态「✓ 已缓存，可本地播放」 | `02-detail-cached.png` |
| seek 校验 | duration 146.42s；seek 5s → 5.0；seek 80%（117.1s）→ 117.14；seekable [0, 146.42] | CDP 回读 |
| 播放 | `currentTime` 从 60.0 推进到 60.99，画面为视频第 60s「Level 3.0」 | `03-playing-60s.png` |
| 中英文筛选依据 | `lang` 分别为 zh / en，可在资料库「中文 / 英文」分段过滤 | `01`、`04` |
| PWA 更新 | 更新提示出现 → 点更新 → 重载后 8 条资料、2 个封面、已缓存视频全部保留 | 现场验证 |
| 断网前提 | 未做；本轮仍走 `adb reverse` + 本地服务 | — |

## 竖屏视频被裁切（已修，1.1.1）

- 现象：`ntrp-tennis-rating` 是 480×720 竖屏，`.detail-video` 固定 `aspect-ratio:16/9` + `overflow:hidden`，网格行被视频固有高度撑开（304×456），上下被切掉，只能看到中段画面。
- 修法：视频 `loadedmetadata` 后把容器 `aspect-ratio` 设成 `videoWidth / videoHeight`，并给容器与 video 加 `max-height:70dvh`。横屏视频仍是 16/9，视觉不变。
- 复测：容器与视频实测同为 294×440，`aspect-ratio:480 / 720`，整幅画面（含 "Level 7.0" 字幕与底部字幕）完整可见。证据 `05-portrait-player-fixed.png`。


## 未完成

1. `pickleball-rating` 缺本地视频文件。本地 `yt-dlp` 对该 YouTube 地址只返回 storyboard（无流），换 android / ios / tv / web 客户端与系统代理 `127.0.0.1:7897` 后结果相同；BibiGPT 自带 cookies 也不足以拿到视频流（需要 PO token）。需要用户提供 MP4 或另找可下载来源。
2. MIUI 自带浏览器点击「选择 JSON 知识清单」后系统文件选择器未弹出（只出现一次「文件」toast），因此本轮改用 Kiwi + CDP 完成导入。该现象对 AC-12「手机端导入」是真实风险，需复测或改由电脑端导入。
3. 磁盘路径 `/sdcard/Download/P070/*` 已 push 到手机；`DOM.setFileInputFiles` 指向该路径时 Kiwi 读不到（返回 files 长度 0），故改由页面 `fetch` 同源文件再构造成 `File` 交给 input。
