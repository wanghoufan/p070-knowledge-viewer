# P070 平台与技术选型冻结｜Android APK V1.0

- 决策日期：2026-11-15
- 用户原话：「pwa 要转成 apk，不做小程序」
- 决策级别：已确认的用户产品形态变更（替代此前 PWA 载体）；不代表 APK 构建、真机 QA、生产发布已经完成
- 项目：P070「随身讲解库 / Pocket Presenter」
- 已批准视觉：`docs/design/P070-Design-Freeze-V1.0.md`、`docs/design/prototype/P070-Pocket-Presenter-V0.3-APPROVED.html`
- 研发文档依据：`docs/pm/PRODUCT_PLAN_V1.2.md`；本文件为平台事实与决策记录，不能取代该文件的 FR/AC
- 实际执行模式：沿用 P070 当前 `AGENTS.md` 与 `docs/handoff/HANDOFF.md` 中已确认的**主开发者模式**，不因插件名称含 ORCA 而改成另一套角色链。

## 一、不可变的产品边界

**正式交付 Android APK（仅安卓）**。不做微信小程序，不提供小程序跳转或业务 SDK；不做 iOS；不将 PWA 网站、添加桌面、浏览器安装、HTTPS 公网服务列为 APK V1 交付条件。当前 PWA 业务代码是迁移输入，不再作为正式发布目标；历史代码/测试证据保留，不删除、覆盖或另行推送。

产品名称、绿色品牌、四个底部 Tab（资料库、已缓存、分享清单、设置）、页面密度、详情视频/总结/文稿/双语术语/HTML 讲解与分享流程全部保持。前置视频下载、转写、AI 总结和 HTML PPT 生成继续在应用外完成。朋友只收到原视频平台链接，**不必安装 APK**。

## 二、首选技术路线与放弃路线

| 路线 | 可用性与代价 | 结论 |
| --- | --- | --- |
| **Capacitor + 已有 Web UI + Android 原生文件/媒体能力** | 直接复用当前 `app/` 的 HTML/CSS/JS 和已批准 V0.3 交互；可逐步添加 Kotlin 插件解决大视频读写/seek、原生分享、独立课件容器；必须跑真实 Android System WebView | **首选** |
| Kotlin + Jetpack Compose + Media3 全原生重写 UI | Android 长视频与存储能力成熟，但会重新实现六个用户页面、i18n、筛选、交互、主题与 HTML 原型一致性；当前已完成的 Web UI 利用率低 | **备选**，仅当桥接路线的核心性能/安全验收确实失败 |
| 单纯 WebView/网站套壳、TWA、PWA 安装 | 容易继续依赖浏览器缓存、远程站点或第三方浏览器，不能证明用户所需的独立离线 APK、可靠大文件与课件隔离 | **不采用作为交付方案** |
| 小程序/iOS、Flutter/React Native 多端重写 | 无此需求，增加维护面 | **不做** |

官方约束参考（现时文档，实施时按锁文件版本实测）：
- Capacitor Android：https://capacitorjs.com/docs/android
- Capacitor native 插件：https://capacitorjs.com/docs
- Android Storage Access Framework：https://developer.android.com/reference/android/content/Intent
- Android 专用文件：https://developer.android.com/training/data-storage/app-specific
- Media3 ExoPlayer：https://developer.android.com/media/media3/exoplayer/hello-world
- Android WebView 本地 HTML 安全：https://developer.android.com/develop/ui/views/layout/webapps/load-local-content

**不是「把 PWA 改扩展名」**：正式 APK 中 Web UI/静态应用资源须随包打入，冷启动不请求 `localhost`、Mac mini、临时 Vite、Tailscale、HTTPS 站点；Capacitor 原生插件在 Android 真机逐项验证，不承诺 WebView 与小米浏览器相同。

## 三、安卓数据、媒体与课件实施合同

1. 元数据（标题、中英语言、标签、总结、文稿、双语术语、来源网址）沿用现有清单 schema，可用应用私有 SQLite 或经过真机验证的 WebView IndexedDB；**不重复创造云数据库**。
2. 大 MP4 必须采用 Android 系统文件选择器（ACTION_OPEN_DOCUMENT / SAF）选择；将文件通过 Kotlin 原生流式复制到**持久的应用专用文件目录（非 cacheDir）**，临时文件 → 校验 → 原子完成；不跨 JS 桥传送数百 MB base64/ArrayBuffer；首次导入必须允许用户取消与重试。
3. 视频播放优先验证在 APK WebView 中以安全 URI 流畅播放和拖动；若未通过 500MB/1GB 与后台恢复探针，采用 Media3/ExoPlayer 原生播放模块，维持用户批准的视频区布局与操作。不得以插件构建成功冒充大视频可用。
4. 单文件自包含 HTML 演示稿按原需求导入。对不可信 HTML 应隔离在**独立、无 Capacitor 原生桥的受限 WebView/Activity**，屏蔽非授权外网、外部跳转、危险 file scheme 与访问宿主存储；允许必要 JS/离线图片，宿主提供显式翻页、退出、全屏。不得因为「iframe sandbox」在浏览器通过就断言 APK 原生桥不可被课件访问。
5. 已导入文件、播放进度、主题、语言、分享清单在重启与覆盖安装后保留；不允许以卸载再装作为普通升级路径。浏览器 PWA 的 origin 数据**不会自动转移到 APK 私有存储**，迁移前给「从 Mac 文件重新导入」或用户可控的导入方案，不承诺旧 PWA 缓存自动复制。
6. 安装包资源本身可离线启动；网络仅用于打开原视频网页地址或分享聊天工具，不依赖家中 Mac 或外网服务。用户无网络时可以复制原视频地址，朋友打开链接仍需其所在环境可访问来源平台。
7. 使用 Android Sharesheet 分享真实 HTTP(S) 原视频 URL/文字；无可用分享目标时提供「复制链接」。不分享 app 内私有文件/第三方视频副本。
8. 数据与授权：不要打包下载的 B 站/YouTube 视频到公开 APK，不擅自上传媒体；不请求 `MANAGE_EXTERNAL_STORAGE` 全盘权限；用 SAF + 应用私有目录完成核心操作。APK 卸载通常会删除私有文件，需提示保留 Mac 源件。

## 四、平台专属变化（取代旧 PWA 条款）

| 原 PWA 验收 | Android APK 的正式验收 |
| --- | --- |
| 手机 OEM 浏览器打开 HTTPS/添加桌面 | 指定红米/小米/OPPO 机器上**安装、首次启动、关闭重开、覆盖升级 APK** |
| Service Worker 壳缓存/OPFS 持久化 | **包内应用壳 + 安卓持久文件存储**（非临时缓存），实际字节回读 |
| 依赖网址访问与 CDN | 本机离线可冷启动与播放；外部网络只负责打开/分享来源链接 |
| 浏览器页面/刷新更新 | APK versionCode/versionName + 签名与覆盖升级；旧数据保留 |
| WebView/PWA 使用权限 | Android 系统文件选择器、拒绝授权、返回键、前后台/锁屏、横竖屏/Insets |
| Chrome/浏览器桌面端 32/32 | **Android 新 APK 独立回归**；历史 PWA 证据留档但不计 APK PASS |

## 五、现状与依赖快照

截至 2026-11-15 当前只读检查：
- P070 已有 `app/` 目录的正式静态 PWA 业务代码和相关 Phase2 测试；Git `main...origin/main` 工作树未见未提交更改。此前 HANDOFF 记录过桌面 32/32、MIUI 浏览器安装/断网启动，**这些不等于 APK 已测试**。
- 尚未发现已构建的 Android 工程/最终 APK 证据；Android 工具链、Gradle/JDK 版本、ADB 在线设备和真实 Android WebView 版本**必须由本机开发者实测**，云端只读不能代替。
- 前置分类：
  - A（开发开工需用户不可代办）：**当前无**，先用本机现有设备/自制样本构建 Debug APK。
  - B（开发者负责）：检查 SDK/JDK/Gradle/Capacitor 兼容、初始化 Android 工程、原生文件与播放、签名 debug 包、测试、备份和版本台账。
  - C（可替代）：没有第二台手机时先用已授权 Redmi 设备 + 模拟器，不能冒充 OPPO 终验；没有真实素材时用原创示例；不需正式域名和在线服务。
  - D（最后验收/首次发行才需用户）：真实合法视频/HTML 课件、指定 OPPO 真机可用时间、Android 安装授权、首次 release 签名安全保存与实际分发方式、最终用户签收。
- 不读取密钥明文，不自动推 Git、正式发布、删 PWA 历史、卸载有数据的旧 App、不动其他项目/设备。

## 六、可拒绝发布的负向案例

- APK 启动必须连 `http://localhost`、家庭 Wi-Fi、Docker/Tailscale 或 HTTPS 才能显示主界面 ⇒ **FAIL**。
- 500MB 视频用 JS base64 传输导致卡死/崩溃，或不能在 5 秒、80% 位置 seek ⇒ **FAIL**。
- HTML 幻灯片能调用 Android 原生桥、读取主应用数据、导航离开宿主 ⇒ **FAIL**。
- 断网时已保存视频/课件不可打开，重启或覆盖安装丢记录 ⇒ **FAIL**。
- 复用旧 PWA 32/32、浏览器安装截图冒充 APK 真机结果 ⇒ **FAIL**。
- 安装 APK 却出现第二套 UI、换了品牌/导航、加了小程序功能 ⇒ **FAIL**。
- 发布包使用 debug 签名、未记录包名/versionCode/commit/sha256，或正式发布未获用户签收 ⇒ **BLOCKED/FAIL**。

## 七、完成标准

先产可调试的 Debug APK → 实机导入/播放/HTML PPT/分享与离线完整闭环 → 跨设备与权限/升级回归 → 生成正式签名 Release APK 并交用户最终验收。交付报告记录 Android 包名、versionCode/Name、源码提交与工作树、APK 路径/大小/SHA256、签名类型、设备/系统/WebView 版本、安装启动和实际录像/日志。首发和远端写入仍守原项目权限，不因本方案自动获授权。

**本次写入只做方案与需求冻结，不改业务代码、不构建/安装 APK，也不宣称已转换成功。**
