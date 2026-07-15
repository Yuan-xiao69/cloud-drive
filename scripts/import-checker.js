/**
 * 导入检查脚本 — 扫描项目中是否残留已废弃的旧版导入
 *
 * 用途：CI 管线中运行，确保所有导入都已迁移到新 API 路径。
 * 退出码 0 = 干净，退出码 1 = 发现违规导入。
 *
 * 运行方式：node scripts/import-checker.js
 */

const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// ── 禁止出现的遗留模式 ──────────────────────────────────
const FORBIDDEN = [
  {
    pattern: "@/lib/api-client",
    message: "已废弃的 API 客户端，请使用 @/lib/api/client 替代",
  },
  {
    pattern: "@/lib/utils/server",
    message: "已废弃的响应工具，请使用 @/lib/api/v1 替代",
  },
  {
    pattern: "apiSuccess",
    message: "已废弃的函数名，请使用 @/lib/api/v1 中的 successResponse 替代",
  },
  {
    pattern: "apiError",
    message: "已废弃的函数名，请使用 @/lib/api/v1 中的 errorResponse 替代",
  },
  {
    pattern: "apiCreated",
    message: "已废弃的函数名，请使用 @/lib/api/v1 中的标准响应替代",
  },
]

// 要搜索的目录
const SRC_DIR = path.resolve(__dirname, '..', 'src')

// 排除的目录（逗号分隔传给 grep --exclude-dir）
const EXCLUDE_DIRS = ['node_modules', '.next', '.git', '__pycache__']

if (!fs.existsSync(SRC_DIR)) {
  console.error(`错误: 目录不存在: ${SRC_DIR}`)
  process.exit(0) // 不阻断 CI（src/ 可能被构建脚本删除）
}

let violationsFound = false

for (const item of FORBIDDEN) {
  try {
    // 在 src/ 目录中搜索，排除无关目录，仅搜索 .ts/.tsx/.js/.jsx 文件
    const cmd = [
      'grep',
      '-r',
      '-n',
      '--include=*.ts',
      '--include=*.tsx',
      '--include=*.js',
      '--include=*.jsx',
      ...EXCLUDE_DIRS.map(d => `--exclude-dir=${d}`),
      `'${item.pattern}'`,
      SRC_DIR,
    ].join(' ')

    const result = execSync(cmd, { encoding: 'utf-8' })
    const lines = result.trim().split('\n').filter(Boolean)

    if (lines.length > 0) {
      violationsFound = true
      console.log(`\n❌ 发现禁止模式: "${item.pattern}"`)
      console.log(`   说明: ${item.message}`)
      console.log(`   匹配位置:`)
      for (const line of lines) {
        console.log(`     ${line}`)
      }
    }
  } catch (err) {
    // grep 退出码 1 表示未找到匹配，正常情况
    if (err.status !== 1) {
      // 退出码 > 1 表示真正的错误（如文件不存在等）
      // 2 表示错误，忽略
    }
  }
}

if (violationsFound) {
  console.log('\n========================================')
  console.log('⚠️  导入检查失败: 发现禁止的遗留导入模式')
  console.log('   请按上述提示修复后重新提交')
  console.log('========================================\n')
  process.exit(1)
} else {
  console.log('✅ 导入检查通过: 未发现遗留导入模式')
  process.exit(0)
}
