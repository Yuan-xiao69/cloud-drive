#!/usr/bin/env bash
# Stop hook: 交付验收检查
# 规则：如果本轮改了代码/配置/文档，但未验证，则阻止结束

set -e

# 检查未提交的变更（工作区 + 暂存区）
CHANGES=$(git diff --name-only 2>/dev/null || true)
STAGED=$(git diff --cached --name-only 2>/dev/null || true)

if [ -z "$CHANGES" ] && [ -z "$STAGED" ]; then
  # 无变更，允许结束
  echo '{"continue":true}'
  exit 0
fi

SENTINEL=".claude/.verification-done"

if [ -f "$SENTINEL" ]; then
  # 验证标记存在，允许结束并清除标记
  rm -f "$SENTINEL"
  echo '{"continue":true,"systemMessage":"✅ 验证标记已清除，允许结束"}'
  exit 0
fi

# 有变更但未验证 → 阻止结束
cat << 'JSON'
{
  "continue": false,
  "stopReason": "🚫 交付验收未完成 — 检测到未提交的变更但未经验证。\n\n📋 请完成以下验收后再结束:\n  1. 类型检查: npm run type-check\n  2. Lint检查: npm run lint\n  3. 功能验证: 确认改动的功能正常运行\n  4. TODO检查: 确认所有计划项已完成\n  5. 方案监督: 调用 /project-supervisor 对照方案检查实施情况\n\n✅ 全部通过后，运行以下命令以允许结束:\n  mkdir -p .claude && touch .claude/.verification-done",
  "systemMessage": "🚫 交付验收未完成 — 已阻止结束"
}
JSON
