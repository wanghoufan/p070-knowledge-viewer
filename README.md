# 随身讲解库 · Pocket Presenter

一个离线优先的轻量 PWA：把已经在电脑上准备好的视频、总结、文稿和单文件 HTML 讲解稿导入/关联，在手机上筛选、播放、阅读和现场讲解，并把原视频链接分享给朋友。

> 电脑负责内容生产与长期保存；手机只负责播放已缓存视频、查看文稿/术语、打开 HTML 课件。视频下载、转写、AI 总结、PPT 制作都不在本项目内。

## 仓库

- GitHub：<https://github.com/wanghoufan/p070-knowledge-viewer>（public）
- 默认分支：`main`

## 当前状态

- 版本：`1.0.0`
- 形态：静态 PWA（无框架、无构建链、无后端）
- 已实现：四 Tab（资料库/已缓存/分享清单/设置）、搜索与中英/专题/标签筛选、视频详情、总结/文稿/术语、视频离线缓存与 seek 校验、HTML 课件沙箱播放、分享清单、主题三态、中英 UI、JSON 清单导入、重复项处理、PWA 安装/更新。
- 已验证：桌面 Chromium 32/32 回归；500MB 级视频 OPFS 保存与 seek；Redmi/MIUI 浏览器安装、飞行模式离线冷启动、更新提示。
- 未完成：OPPO 真机、正式 HTTPS 部署、授权真实素材、首次发布签收。

## 本地运行

```bash
cd app
python3 -m http.server 8766 --bind 127.0.0.1
# 打开 http://127.0.0.1:8766/
```

PWA 需要安全上下文：桌面 `localhost` 可用；手机真机需要 HTTPS。开发期可用 `adb reverse` 把 localhost 映射到手机，这不是正式部署。

## 电脑上准备内容

1. 在任意目录准备视频（MP4/WebM/MOV）和单文件自包含 HTML 课件。
2. 准备 `manifest.json`（字段示例见 `app/README.md` 或应用内“下载 JSON 示例格式”）。
3. 在电脑浏览器打开应用，导入清单，再到详情关联对应的视频/课件。
4. 视频文件保留在电脑本地；**不要把视频、真实笔记或私密截图提交到本仓库**。

手机端只播放已准备好的内容；如目标浏览器支持，可通过文件选择/系统分享把已准备文件交给手机应用缓存。

## 测试

```bash
# 桌面功能 + PWA + 断网回归
PW_MODULE=<playwright目录> BASE_URL=http://127.0.0.1:8766/ node app/tests/smoke.cjs

# 大文件（先生成测试片）
bash probe/generate-test-videos.sh
TEST_VIDEO=$PWD/probe/test-500.mp4 PW_MODULE=<playwright目录> \
  BASE_URL=http://127.0.0.1:8766/ node app/tests/large-file.cjs
```

结果写入 `docs/qa/phase2/`。

## 目录

| 路径 | 内容 |
|---|---|
| `app/` | 正式 PWA：HTML/CSS/ES Modules、SW、manifest、图标、演示资源、测试 |
| `app/README.md` | 运行、存储、测试与部署说明 |
| `docs/pm/PRODUCT_PLAN_V1.1.md` | 产品范围、User Flow、FR/AC |
| `docs/design/P070-Design-Freeze-V1.0.md` | 已批准的名称、导航、品牌与布局 |
| `docs/design/prototype/P070-Pocket-Presenter-V0.3-APPROVED.html` | 用户批准的交互原型 |
| `docs/qa/phase2/` | 测试结果与截图 |
| `probe/` | T0 真机探针与测试片生成脚本（不随 PWA 发布） |

## 已知限制

- 手机端大文件导入/处理不作为本项目验收项；大文件处理与保存在电脑端。手机端需补“已缓存视频播放/seek”的真机录屏。
- OPPO 自带浏览器未测；目前只有 Redmi/MIUI 真机证据。
- 无大陆 5G 可直连的 HTTPS 正式地址；已 commit/push，但未部署，不构成正式发布。
- 演示视频/课件为自制样本，不是真实课程内容。
- 浏览器可能清理站点存储；应用会提示本地副本丢失，原片请保留在电脑。

## 版本与许可

版本信息见 `app/version.json`。仓库目前未附加开源许可证；如需公开复用，请先确认授权。
