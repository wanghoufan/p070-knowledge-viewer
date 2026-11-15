#!/usr/bin/env node
/**
 * P070 · UI 基线一致性机器校验（只报红，不自动改文件）
 *
 * 为什么存在：2026-11-15 紧凑卡片版只落在代码里，需求真源与冻结单仍写「V0.3 冻结」，
 * 下一个开发者只读文档就会把界面对着旧文档改回去。文档互指容易漏，所以做成机器校验。
 *
 * 判定：四处权威落点必须同时指向 A2 变更记录，且变更记录文件存在。
 * 任一缺失 → 退出码 1（可接进构建/提交前检查）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const A2 = 'docs/design/P070-Design-Change-A2-2026-11-15.md';

const checks = [
  {
    name: '变更记录存在',
    file: A2,
    test: s => s.length > 200
  },
  {
    name: '需求真源 §5 指向 A2 且禁止改回',
    file: 'docs/pm/PRODUCT_PLAN_V1.2.md',
    test: s => /## 5\. 设计冻结不可碰[\s\S]{0,800}P070-Design-Change-A2-2026-11-15\.md/.test(s)
  },
  {
    name: '需求真源 §5 写明不得按 V0.3 改回',
    file: 'docs/pm/PRODUCT_PLAN_V1.2.md',
    test: s => /不得按 V0\.3 把资料库改回/.test(s)
  },
  {
    name: '设计冻结单 §3 已标注被 A2 取代',
    file: 'docs/design/P070-Design-Freeze-V1.0.md',
    test: s => /### 资料库首页（⚠ 本小节已被 A2 取代/.test(s)
  },
  {
    name: '冻结单 §4.5 变更指针存在',
    file: 'docs/design/P070-Design-Freeze-V1.0.md',
    test: s => /## 4\.5 后续变更[\s\S]{0,400}A2/.test(s)
  },
  {
    name: 'HANDOFF §0 常驻指针指向 A2',
    file: 'docs/handoff/HANDOFF.md',
    test: s => /A2 紧凑卡片版/.test(s) && /别再按 V0\.3 改回/.test(s)
  },
  {
    name: 'QA 矩阵头部声明 A2 基线',
    file: 'docs/qa/产品验收追踪矩阵.md',
    test: s => /A2）\*\*：已改为紧凑卡片版/.test(s)
  },
  {
    name: '踩坑表记录了文档漂移',
    file: 'agent.md',
    test: s => /UI 改完却只落在代码/.test(s)
  }
];

let bad = 0;
for (const c of checks) {
  const p = path.join(root, c.file);
  let ok = false;
  let why = '';
  if (!fs.existsSync(p)) {
    why = '文件不存在';
  } else {
    const s = fs.readFileSync(p, 'utf8');
    ok = c.test(s);
    if (!ok) why = '内容不符合判据';
  }
  if (!ok) bad++;
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${c.name}  (${c.file})${why ? ' — ' + why : ''}`);
}

if (bad) {
  console.error(`\nUI-BASELINE: FAIL（${bad} 项不一致）— 先对齐文档再动 UI，别对着旧文档改回去`);
  process.exit(1);
}
console.log('\nUI-BASELINE: OK');
