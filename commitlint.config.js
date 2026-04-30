/**
 * commitlint 配置文件
 * 遵循 Conventional Commits 规范
 * 
 * 格式: <type>(<scope>): <subject>
 * 
 * Type 类型:
 *   feat     - 新功能
 *   fix      - Bug 修复
 *   docs     - 文档更新
 *   style    - 代码格式（不影响功能）
 *   refactor - 重构
 *   perf     - 性能优化
 *   test     - 测试相关
 *   build    - 构建相关
 *   ci       - CI/CD 相关
 *   chore    - 其他更改
 *   revert   - 回滚
 * 
 * Scope 可选:
 *   api, auth, user, repo, discussion, notification, admin, db, docker, i18n, ui, utils
 */

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 提交类型必须存在
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    // 类型大小写
    'type-case': [2, 'always', 'lower-case'],
    // 提交信息不能为空
    'subject-empty': [2, 'never'],
    // 提交信息结尾不能是句号
    'subject-full-stop': [2, 'never', '.'],
    // Header 最大长度
    'header-max-length': [2, 'always', 100]
  },
  // 忽略以某些关键字开头的提交
  ignores: [(commit) => commit === '']
};
