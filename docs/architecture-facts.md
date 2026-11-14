# 架构与构建事实｜P070 随身讲解库

> 常驻事实位：只放「改代码前必须知道」的稳定事实。踩坑进根 `agent.md`，风险进 `docs/risks.md`，现势进 `docs/handoff/HANDOFF.md`。
> 上限 150 行 / 10,240 字节。

## 1. 这是什么

- 一句话定位：把已在软件外做好的视频、总结、文稿与 HTML 讲解稿导入手机，离线筛选、播放、讲解并分享原视频链接的 PWA。
- 交付形态：PWA（手机浏览器 + 添加到桌面）；V1 不做 APK。
- 应用目录：`app/`；静态文件直接部署，无构建步骤。
- 部署位置：未定；真机验收需大陆 5G 可直连的 HTTPS 地址。

## 2. 技术栈与目录

| 项 | 值 |
|---|---|
| 语言 / 框架 | 原生 HTML + CSS + ES Modules，无框架 |
| 构建命令 | 无构建链 |
| 启动命令 | `cd app && python3 -m http.server 8766 --bind 127.0.0.1` |
| 测试命令 | `PW_MODULE=<playwright> BASE_URL=http://127.0.0.1:8766/ node tests/smoke.cjs`；`tests/large-file.cjs` |
| 数据库 | IndexedDB `p070`（items/media/blobs）；OPFS `p070-media`；localStorage 设置 |
| PWA | `manifest.webmanifest` + `sw.js`（壳缓存 `p070-shell-v1.0.1`） |

| 路径 | 职责 |
|---|---|
| `app/index.html` | 应用壳 |
| `app/styles.css` | 获批 V0.3 样式 + 可访问性覆盖 |
| `app/app.js` | 视图、事件、导入、播放、分享、更新 |
| `app/db.js` | IndexedDB/OPFS 存储与媒体保存 |
| `app/slides.js` | HTML 编码、外链扫描、CSP/bridge 硬化 |
| `app/i18n.js` | 中英资源字典 |
| `app/sw.js` | 应用壳缓存 + 更新等待 |
| `app/assets/` | 演示视频、演示课件 |
| `app/tests/` | 生产 PWA 回归脚本 |
| `docs/qa/phase2/` | 本轮测试证据 |
| `probe/` | T0 真机探针工装，不随 PWA 发布 |

## 3. 关键约定

- 分支与提交口径：`main`；**尚未 commit/push**，需用户明确授权。
- 环境变量与配置来源：无密钥、无后端、无 API Key。
- 产品名称：中文「随身讲解库」，英文「Pocket Presenter」；UI 与 manifest 已冻结。
- 四 Tab 顺序：资料库/已缓存/分享清单/设置；不得加第五个 Tab。
- 媒体存储：OPFS `p070-media/<id>.mp4` 优先，IndexedDB Blob 降级；**媒体不进 Cache Storage/SW 壳缓存**。
- 保存判据：写入后必须 5s 与 80% 两处 seek 回读；失败不得显示“已离线”。
- 课件安全：`sandbox="allow-scripts"` 无 `allow-same-origin`；移除源 CSP 后注入宿主 CSP + bridge；不叠透明点击区。
- 更新：壳缓存版本化；媒体不删；`skipWaiting` 仅在用户点击更新后。
- 不自动刷新、不自动清用户数据；删除一律页内二次确认。

## 4. 验证与门禁

- 当前结果：桌面 32/32、500MB OPFS+seek、MIUI 安装/离线冷启动通过；手机大文件/OPPO/HTTPS 未测。
- 发布前必须：`docs/qa/产品验收追踪矩阵.md` 关键 AC 全 PASS；首次发布用户签收。
- 治理门禁：`node scripts/model/check-ledger.mjs docs/model` 须 `LEDGER-OK`。
- 已知不稳定项：MIUI 的 SW media Range 失败（已用 OPFS blob 规避）；大文件手机内存/配额未测。
