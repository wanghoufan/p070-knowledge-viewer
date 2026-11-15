# T0 证据 · 首个 Debug APK 冷启动（构建冒烟，非指定机型）

> **机型声明**：本目录证据来自 Redmi Note 12T Pro（23054RA19C）。用户指定的目标机型是 **Redmi Note 12 Pro**，
> 当前未连接到本机。因此这里只证明「构建可安装、可冷启动、UI 正确」，**不构成目标机型的 AC 通过**；
> 目标机型到位后整条链路需重跑。误装的调试包与推入的测试文件已按用户指令卸载/删除。

- 设备：Redmi Note 12T Pro（机型代码 23054RA19C），Android 15（SDK 35），System WebView 141.0.7390.122
- 包：`com.p070.pocketpresenter.debug`，versionName `1.0.0-debug`，versionCode 1
- APK：`android/app/build/outputs/apk/debug/app-debug.apk`，4,312,835 字节，SHA-256 `193c39d54d35927d87ddb742f63f2c3510047e9fd3eeca111e3f6f21f3953b79`
- 构建：Capacitor 7.6.10 / AGP 8.7.2 / Gradle 8.11.1 / JDK 21，compileSdk & targetSdk 35，minSdk 23
- 安装与启动：`adb -s <serial> install -r` → Success；`am start -n com.p070.pocketpresenter.debug/com.p070.pocketpresenter.MainActivity` → `mCurrentFocus` 指向本应用

## 截图

- `01-boot.png`：冷启动首屏 = 资料库，品牌「随身讲解库 / Pocket Presenter」、搜索、语言分段、标签行、专题头图、单列资料卡、四 Tab 底栏均在首屏；
- `02-boot-settled.png`：该张截图实际拍到的是另一应用前台（用户当时在另一 App 中操作），**不作为本应用证据**，仅保留说明当时发生了应用切换。

## 机器可读事实（WebView DevTools 读取）

```json
{
  "title": "随身讲解库 · Pocket Presenter",
  "tabs": ["资料库", "已缓存", "分享清单", "设置"],
  "seedCards": 6,
  "navigator.onLine": true,
  "theme": "light",
  "isNativePlatform": true,
  "appInfo": {"version":"1.0.0-debug","versionCode":1,"android":"15","sdkInt":35,"model":"23054RA19C","webView":"141.0.7390.122"},
  "storage": {"appBytes":0,"freeBytes":23984267264,"totalBytes":498205687480}
}
```

## 关键判据

- 应用未声明 `android.permission.INTERNET`（`dumpsys package` 中无该权限记录），APK 仍可冷启动并渲染完整界面 → 「不依赖任何网络即可启动」在权限层与运行层同时成立。
- WebView 版本、Android 版本、包名/版本号取自运行时 `PackageManager`，不是文档抄写。

## 仍未覆盖（不得当作已通过）

- 前台播放与 seek（后台测试出现 `PIPELINE_ERROR_DECODE`，判为后台媒体管线限制，须前台复测）
- SAF 真实导入、HTML 课件、分享、主题三态、升级、双品牌
