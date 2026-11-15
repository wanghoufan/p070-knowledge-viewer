# A2 紧凑版 APK · 真机冒烟证据（Redmi Note 11 5G）

- 日期：2026-11-15
- 设备：Redmi Note 11 5G（21091116AC）· Android 11（SDK 30）· System WebView 94.0.4606.85
- 包：`com.p070.pocketpresenter.debug` · versionName `1.0.0-debug` · versionCode 1
- APK：`android/app/build/outputs/apk/debug/app-debug.apk` · 4,350,282 字节 · SHA-256 `b0c6ff6b89ab…`
- **装机校验**：`pm path` 拉回的 base.apk SHA-256 前 12 位与构建产物一致（`b0c6ff6b89ab`），即手机跑的就是本次提交的构建。
- 源码：`13b208c`（A2 紧凑版）+ 装机前最后一个代码提交；Web 资源哈希与 APK 内 `assets/public/app.js` 一致。
- 安装方式：`adb install -r`（覆盖安装，未卸载、未清数据）

## 截图

| 文件 | 内容 |
|---|---|
| `01-library.png` | 资料库首屏：无专题头图、紧凑卡片、封面状态符号、顶栏只有品牌 |
| `02-dark.png` | 深色主题：卡片/底栏/图标全部跟随，状态栏图标自动反色 |
| `03-detail.png` | 详情页：返回、标题、内置演示视频（原生控件可播）、导入视频/加入分享、重点总结 |
| `04-import-sheet.png` | 设置 → 导入学习资料：版权与隐私告知 + 选择 JSON/下载示例；点按钮可拉起系统文件选择器（DocumentsUI），已核实 |

## 机器可读状态（WebView DevTools 读取，非人工抄写）

```json
{
  "appInfo": {"version":"1.0.0-debug","versionCode":1,"android":"11","sdkInt":30,"webView":"94.0.4606.85","model":"21091116AC"},
  "library": {"cards":6,"hero":false,"headerButtons":0,"statusIcons":6,"firstCard":"st st-demo"},
  "tabs": [
    {"v":"home","active":"资料库","heading":"学习资料"},
    {"v":"offline","active":"已缓存","heading":"已缓存的内容"},
    {"v":"share","active":"分享清单","heading":"分享清单"},
    {"v":"settings","active":"设置","heading":"设置"}
  ],
  "theme": {"before":"light","dark":"dark","stored":"dark","back":"light"},
  "english": {"nav":["Library","Cached","Share list","Settings"],"horizontalOverflowPx":0},
  "detail": {"title":"匹克球基础规则","summaryItems":4,"hasPlayer":true,"slidesButton":"打开课件"},
  "back": {"activeTab":"资料库","detailGone":true},
  "emptySearch": {"title":"没有找到资料","hasReset":true,"afterResetCards":6},
  "shareList": {"badge":"1","items":1,"selectedLabel":"已选 1 项","emptyPreview":"没有可分享的网址…","clearDialog":["清空","取消"],"afterClearItems":0},
  "cachedTab": {"empty":true,"emptyTitle":"暂无保存的视频"},
  "safEntry": "设置→导入学习资料→选择 JSON 知识清单 拉起 com.google.android.documentsui"
}
```

## 本轮能判与不能判

**可以判（已落到验收矩阵）**

- 资料库首屏形态、四 Tab、搜索与筛选在卡片之前、空态有下一步、设置里的导入入口可达且能拉起系统选择器。

**不能判（继续 NOT_RUN，别把冒烟当验收）**

- 真实 SAF 导入：系统文件选择器（DocumentsUI）文件卡不吃 adb 注入点击（tap 的 DOWN/UP 已投递仍不响应），需键盘 `TAB×3+DPAD_DOWN+ENTER` 或人工点一次；本轮未选文件，导入链路仍未跑通。
- 64MB / 500MB 视频导入与 seek：媒体 URL 方案已在同一台机上实测（610MB → 5s=305ms、80%=294ms），但**没有经过 App 自己的导入闸门**，属方案级证据，不计 AC。
- HTML 课件（`SlideActivity`）未打开过；分享系统面板未实际发送；覆盖升级未做（需 versionCode+1 同签名的第二个包）；OPPO 第二品牌未测。
- 本轮设备是 Redmi Note 11 5G；用户指定的目标机型 Redmi Note 12 Pro 未连接，故 AC 的设备归属仍需在目标机型复跑（风险 R11）。
