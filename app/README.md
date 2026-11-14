# 随身讲解库 · Pocket Presenter（PWA）

正式实现目录。产品与 UI 真源：`../docs/pm/PRODUCT_PLAN_V1.1.md`、`../docs/design/P070-Design-Freeze-V1.0.md`、`../docs/design/prototype/P070-Pocket-Presenter-V0.3-APPROVED.html`。

## 本地运行

```bash
cd app
python3 -m http.server 8766 --bind 127.0.0.1
# 桌面打开 http://127.0.0.1:8766/
```

PWA 需要安全上下文：`localhost` 可用；手机真机请用 HTTPS，或开发期用 `adb reverse` 把 `127.0.0.1` 映射到手机（仅测试，不是正式部署）。

## 测试

```bash
# 桌面功能 + Service Worker + 断网
PW_MODULE=<playwright目录> BASE_URL=http://127.0.0.1:8766/ node tests/smoke.cjs

# 64MB 本地视频保存 + seek
PW_MODULE=<playwright目录> BASE_URL=http://127.0.0.1:8766/ node tests/large-file.cjs
```

结果与截图写入 `../docs/qa/phase2/`。

## 存储

- 元数据/文稿/术语：IndexedDB `p070`
- 大视频：OPFS `p070-media/<id>.mp4`（不支持时降级 IndexedDB Blob）
- 设置/分享清单/播放位置：localStorage
- 应用壳：Service Worker `p070-shell-v*`；媒体不进入 Cache Storage

## 发布

静态文件直接部署。`manifest.webmanifest` 名称固定为「随身讲解库」，英文展示名 Pocket Presenter。首次正式发布需用户签收；不要在没有授权时 push 或部署。
