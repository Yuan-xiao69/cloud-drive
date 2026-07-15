/**
 * 文件限制共享常量
 *
 * 全项目所有文件上传/下载相关模块的单一真相源。
 * security.ts、security-config.ts、upload-pipeline.ts 均从此处导入。
 */

// ── 禁止上传的文件扩展名（无前导点）───────────

export const FORBIDDEN_FILE_EXTENSIONS = [
  // 可执行文件
  'exe', 'bat', 'cmd', 'com', 'msi', 'dll', 'vbs', 'vbe', 'wsf', 'wsh',
  // 脚本文件
  'ps1', 'psm1', 'reg', 'sh', 'bash', 'zsh', 'py', 'pyw', 'php', 'phtml',
  'php3', 'php4', 'php5', 'pl', 'pm', 'cgi', 'rb', 'rake', 'asp', 'aspx',
  // 其他危险类型
  'jar', 'war', 'class', 'pif', 'scf', 'lnk', 'inf', 'scr',
];

// ── 禁止上传的 MIME 类型前缀 ─────────────────

export const FORBIDDEN_MIME_PREFIXES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-msi',
  'application/x-bat',
  'application/x-sh',
  'application/x-csh',
  'application/x-php',
  'application/x-java-archive',
  'application/vnd.microsoft.portable-executable',
];
