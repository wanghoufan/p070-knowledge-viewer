# 随身讲解库 · Pocket Presenter

一个**完全离线**的安卓随身讲解 App：把已经在电脑上准备好的视频、总结、文稿、双语术语和单文件 HTML 讲解稿导入手机，在现场断网的情况下筛选、播放、阅读、全屏讲解，并把**原视频网页链接**分享给朋友。

> 电脑负责内容生产与长期保存；手机只负责播放已导入的视频、查看文稿/术语、打开 HTML 课件。视频下载、转写、AI 总结、PPT 制作都不在本项目内。

## 仓库

- GitHub：<https://github.com/wanghoufan/p070-knowledge-viewer>（public）
- 默认分支：`main`

## 当前状态

- 形态：**Android APK**（Capacitor 承载已批准的 Web UI + 安卓原生能力）。PWA 不再是交付目标，历史 PWA 代码保留在 `app/` 作为 UI 源。
- 平台：`compileSdk`/`targetSdk` 35，`minSdk` 23；Capacitor 7.6.10 / AGP 8.7.2 / Gradle 8.11.1 / JDK 21。
- 已实现：四 Tab（资料库/已缓存/分享清单/设置）、搜索与中英/专题/标签筛选、视频详情、总结/文稿/术语、SAF 流式导入到应用私有目录、视频离线播放与字节范围 seek、独立受限 WebView 播放 HTML 课件、分享清单与系统分享/复制、主题三态、中英 UI、JSON 清单导入与重复项处理、覆盖升级保留数据。
- **不联网是设计**：APK 不声明 `INTERNET` 权限，页面与依赖全部随包，导入的文件只存在手机私有目录。
- 真机验证状态、逐条 AC 与证据见 `docs/qa/产品验收追踪矩阵.md` 与 `docs/qa/p070-android/`。

## 构建与安装（本机）

```bash
# 环境（本机共享工具链）
export JAVA_HOME="$HOME/android-toolchain/jdk-21.0.12.1+1/Contents/Home"
export ANDROID_HOME="$HOME/android-toolchain/sdk"

npm install                     # 只用于 Capacitor CLI/运行时
npm run build:www              # app/ → www/（剔除 Service Worker 与 web manifest）
npx cap sync android           # 同步 www/ 与原生工程
cd android && ./gradlew :app:assembleDebug
```

- 产物：`android/app/build/outputs/apk/debug/app-debug.apk`
- 安装：`adb -s <serial> install -r android/app/build/outputs/apk/debug/app-debug.apk`
- 启动：`adb -s <serial> shell am start -n com.p070.pocketpresenter.debug/com.p070.pocketpresenter.MainActivity`
- 版本号唯一真源：`android/version.properties`（`VERSION_CODE` / `VERSION_NAME`）

## 电脑上准备内容

1. 准备视频（MP4/WebM/MOV）与单文件自包含 HTML 课件（不得引用外部资源）。
2. 准备 `manifest.json`（字段示例见 `app/README.md`，或在应用内导入页查看示例格式）。
3. 把文件放到手机能选到的位置（如「下载」目录），在应用内用系统文件选择器导入清单、视频与课件。
4. 视频原件保留在电脑；**不要把视频、真实笔记或私密截图提交到本仓库**。

## 目录

| 路径 | 内容 |
|---|---|
| `app/` | 已批准的 Web UI 与业务代码（APK 的界面来源；PWA 入口保留但不作为交付） |
| `native` 相关 | `android/`（Capacitor 原生工程、`P070NativePlugin`、`SlideActivity`、字节范围媒体服务） |
| `tools/build-www.mjs` | `app/` → `www/` 的构建（剔除 SW/Manifest，保留 UI 资产） |
| `docs/pm/PRODUCT_PLAN_V1.2.md` | 唯一需求真源（FR-01~14 / AC-01~36） |
| `docs/plan/P070-Android-APK-Execution-V1.2.md` | T0–T5 执行计划 |
| `docs/design/` | 设计冻结单、平台决定、已批准 HTML V0.3 原型 |
| `docs/qa/产品验收追踪矩阵.md` | 36 条 AC 的真机验收状态与证据指针 |
| `docs/qa/p070-android/` | 测试素材说明与逐任务证据 |
| `probe/` | 真机探针与测试片生成脚本 |

## 已知限制

- 旧的 PWA 站点存储（浏览器 OPFS/IndexedDB）**不会**自动搬进 APK；换形态后请从电脑原件重新导入。
- 卸载 APK 会删除手机私有目录里的视频与课件；升级请用同一签名覆盖安装。
- 原视频外链能否打开取决于对方网络与平台；无网络时仍可复制链接。
- 演示视频/课件为自制样本，不是真实课程内容。

## 版本与许可

版本以构建产物为准（`aapt2 dump badging` 可读），项目内以 `android/version.properties` 为唯一真源。仓库目前未附加开源许可证；如需公开复用，请先确认授权。
