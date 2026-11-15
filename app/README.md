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

## 清单格式（manifest.json）

```json
{
  "version": 1,
  "items": [{
    "id": "ntrp-tennis-rating",
    "title": "网球水平评分标准你知道吗？",
    "en": "NTRP Tennis Rating Levels",
    "lang": "zh",
    "topic": "网球",
    "tags": ["等级", "入门"],
    "time": "02:26",
    "cover": "data:image/jpeg;base64,...",
    "summary": ["重点一", "重点二"],
    "transcript": "整理好的全文稿",
    "terms": [["NTRP", "网球水平分级体系"]],
    "source": "https://www.bilibili.com/video/BV13k4y1M7Pn"
  }]
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` / `title` | 是 | `id` 仅保留字母数字、`_`、`-`，重复时弹出四选项 |
| `lang` | 是 | `zh` / `en`，资料库「中文 / 英文」筛选依据 |
| `cover` | 否 | 封面图，`data:image/...;base64,` 或 `https://` 地址；建议 ≤200KB。缺省时使用内置渐变图形 |
| `summary` | 否 | 字符串数组，详情页「重点总结」逐条显示 |
| `transcript` | 否 | 全文稿，详情页折叠展开 |
| `terms` | 否 | `[[英文术语, 中文解释], ...]` |
| `source` | 否 | 原视频网页地址，仅 `http(s)`；分享清单只输出这个链接 |
| `time` | 否 | 卡片右下角时长文案 |

视频文件不放进 JSON：导入清单后到详情页「导入视频」选择本机的 MP4/WebM/MOV，写入 OPFS 后才会显示「已缓存」。

## 存储

- 元数据/文稿/术语：IndexedDB `p070`
- 大视频：OPFS `p070-media/<id>.mp4`（不支持时降级 IndexedDB Blob）
- 设置/分享清单/播放位置：localStorage
- 应用壳：Service Worker `p070-shell-v*`；媒体不进入 Cache Storage

## 发布

静态文件直接部署。`manifest.webmanifest` 名称固定为「随身讲解库」，英文展示名 Pocket Presenter。首次正式发布需用户签收；不要在没有授权时 push 或部署。
