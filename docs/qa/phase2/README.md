# P070 Phase2 执行证据与验收说明

- 产品基线：`docs/pm/PRODUCT_PLAN_V1.1.md`（UI 用户批准版）
- 设计真源：`docs/design/P070-Design-Freeze-V1.0.md` + `docs/design/prototype/P070-Pocket-Presenter-V0.3-APPROVED.html`
- 应用代码：`app/`（静态 PWA，无构建链）
- 应用版本：`1.0.0`（`app/version.json`）
- 执行方式：主开发者模式（自审，不伪造独立审查）
- 日期：2026-11-14

## 1. 已实现

| 模块 | 状态 | 说明 |
|---|---|---|
| 四 Tab：资料库/已缓存/分享清单/设置 | ✅ | 严格按 V0.3 顺序与布局；底栏固定、选中态 |
| 资料库搜索/中英筛选/专题/标签 | ✅ | 组合筛选、结果数、空结果 |
| 详情：播放器/总结/文稿/术语/来源 | ✅ | 原生控件、位置记忆、展开文稿不重启 |
| 视频导入与离线 | ✅ | 文件选择 → OPFS 流式写入 → 5s/80% seek 校验 → 已离线 |
| HTML 课件导入/隔离/翻页/全屏 | ✅ | sandbox=allow-scripts、CSP、bridge、返回键 |
| 已缓存页 | ✅ | 条目、字节数、打开、删除 |
| 分享清单 | ✅ | 多选、缺链接提示、去重、复制、系统分享降级 |
| 主题三态 + 持久化 | ✅ | 默认浅色；深浅/跟随系统；无闪 |
| 中英 UI | ✅ | 跟随系统/中文/English；不支持语言回退中文 |
| PWA Manifest / Service Worker | ✅ | 壳缓存版本化；媒体不进 SW 缓存 |
| 更新提示 | ✅ 代码路径 | 不自动刷新；本轮未做新旧版本实测 |
| 导入 JSON / 重复 id 四选项 | ✅ | 保留/替换/跳过/取消 |
| 数据自检 | ✅ | 启动只读检查；缺失标「本地副本已丢失」 |

## 2. 自动化测试

### 2.1 生产 PWA 桌面回归

```bash
cd app
python3 -m http.server 8766 --bind 127.0.0.1
PW_MODULE=<playwright> BASE_URL=http://127.0.0.1:8766/ node tests/smoke.cjs
```

结果：**32/32 PASS**，无 JS 错误。覆盖：SW 接管、四 Tab、筛选、详情、OPFS 保存与 seek、HTML 导入/隔离/翻页、来源链接、分享复制、已缓存、深色、英文、持久化、JSON 导入/重复项、断网壳启动、断网播放已缓存视频、清理全部缓存。

证据：`docs/qa/phase2/smoke-result.json`、`01-home.png`～`10-offline-video.png`、`approved/`（V0.3 对照）。

### 2.2 大文件（500MB 级）

先生成测试片（不随 PWA 交付）：`bash probe/generate-test-videos.sh`。

```bash
TEST_VIDEO=$PWD/probe/test-500.mp4 PW_MODULE=<playwright> BASE_URL=http://127.0.0.1:8766/ node app/tests/large-file.cjs
```

结果：**510,520,147 B（约 487MB）** 写入 OPFS 用时 1,175ms；`seek 5s→5.0`、`seek 80%（272s）→272.0`；`seekable=[0,340]`。证据：`docs/qa/phase2/large-file-result.json`、`10-large-video.png`。

### 2.3 MIUI 真机（Redmi Note 12T Pro / Android 15 / MIUI Browser 20.30）

| 项 | 结果 |
|---|---|
| localhost 安全上下文 | PASS |
| SW 注册/接管 | PASS |
| 添加桌面弹窗 | PASS（自动弹出） |
| 安装为 PWA 快捷方式 | PASS（displayMode=3） |
| 飞行模式 + Mac 服务停止后从桌面图标冷启动 | PASS（资料库 6 条、离线标识、底栏正常） |
| 手机端 64MB/500MB 导入 | **N/A（用户口径）**：大文件处理/保存在电脑端；手机只播放已缓存内容 |
| OPPO 真机 | **BLOCKED**（设备清单中 OPPO 已断开） |

证据：`docs/qa/phase2/T0-真机能力探针-2026-11-14.md`、`phone/01-install-prompt.png`、`phone/02-offline-coldstart.png`、`phone/03-cached-empty.png`。

## 3. AC 覆盖（本轮）

- **PASS（有真实证据）**：AC-01、02、03、04、05、06、08、10（桌面）、12、13（复制）、18、19（英文/320px）、21、22、23、25、26、28、30、31、35、36。
  - AC-25：可见文本扫描 0 内部标识；静态 `ui-leak` 对 `app.js` 报 4 条 `data-id` 属性命中，属事件路由属性、不上屏，已人工核验（`ui-leak-app.txt`）。
- **部分**：AC-07（桌面 500MB 与断网 blob 通过；手机播放/seek 未测）、AC-11（桌面 500MB 通过；手机未测）、AC-16（小米通过；OPPO 未测）、AC-17（冷启动通过；手机全链路未测）、AC-24（桌面通过；手机未测）、AC-34（深色桌面通过；浅色/真机未全测）。
- **未测/仍 OPEN**：AC-09（外链课件提示仅代码路径）、AC-14（清站点数据）、AC-15（版本更新）、AC-20（切换状态全量）、AC-27（空库首次使用）、AC-29（旧版升级迁移）、AC-32（未 commit/未部署/未签收）、AC-33（新增语言架构实测）。
- 首次发布签收未完成，矩阵整体保持 `OPEN`。

## 3.1 与已批准 V0.3 的必要偏差（均为可访问性/状态完整性，不改布局结构）

1. 字号按项目全局下限提升（正文 19px、辅助 ≥14px、标题 ≥23px）；仍保留单列卡片、四 Tab、绿色主色、圆角与信息层级。
2. 讲解舞台外框跟随主题（AC-34）；V0.3 原型为固定深绿。课件内容本身仍由导入 HTML 决定。
3. 增加离线状态徽标、保存进度层、容量不足对话框、更新提示、清理全部缓存按钮——这些是 FR-05/11/12/13 要求的状态与恢复入口，V0.3 原型未画。
4. 设置页的“深色模式”开关保留；点整行可打开三态（浅色/深色/跟随系统）与语言选择，满足 SOP 但不改变首页布局。
5. 详情页保留底栏（与 V0.3 一致），讲解页隐藏底栏。
6. 移动端 320px 隐藏首页装饰球拍，避免压住“6 条资料”文字；360px 以上保持原样。

## 4. 已知限制

1. 用户明确：大文件处理与保存在电脑端，手机端不作为大文件导入验收项；桌面 500MB 通过验证存储/seek 引擎，手机端仍需验证已缓存视频播放。
2. OPPO 浏览器未测；当前只有 Redmi 真机证据。
3. 没有大陆 5G 可直连的 HTTPS 正式地址；真机测试使用 `adb reverse` + localhost，不能替代正式部署验收。
4. Service Worker 媒体 Range 在 MIUI 上失败；生产已改用 OPFS/IDB blob，桌面与 T0 探针有记录。
5. 真实 5 条授权素材未到位；当前 6 条内置演示数据。
6. 未 commit、未 push、未部署；首次发布与用户签收未执行。
7. 更新提示、清站点数据恢复、旧库升级迁移只有代码路径，未做真实升级实验。

## 5. 复跑入口

- 桌面回归：`app/tests/smoke.cjs`
- 大文件：`app/tests/large-file.cjs`
- T0 探针源码：`probe/`（仅测试用，不随 PWA 发布）
- 应用说明：`app/README.md`
