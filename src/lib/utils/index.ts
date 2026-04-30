// ============================================================
// 公共工具函数
// ============================================================

// --- 语言颜色映射（全项目唯一来源）---
export const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Scala: '#c22d40',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Vue: '#41b883',
  React: '#61dafb',
  Markdown: '#083fa1',
  JSON: '#292929',
  YAML: '#cb171e',
  SQL: '#e38c00',
  R: '#198CE7',
  MATLAB: '#e16737',
  Jupyter: '#DA5B0B',
  Dockerfile: '#384d54',
  Makefile: '#427819',
};

/**
 * 根据语言名称获取对应的颜色
 */
export function getLanguageColor(language: string | undefined | null): string {
  if (!language) return '#8b949e';
  return languageColors[language] ?? '#8b949e';
}

// --- 时间格式化 ---

/**
 * 将时间字符串格式化为"多久前"
 */
export function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 30) return `${days} 天前`;
  if (months < 12) return `${months} 个月前`;
  return `${years} 年前`;
}

/**
 * 将时间字符串格式化为标准日期时间
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).replace(/\//g, '-');
}

/**
 * 将时间字符串格式化为仅日期
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '-');
}

// --- 数字格式化 ---

/**
 * 格式化数字（超过 1000 用 k 表示）
 */
export function formatNumber(num: number): string {
  if (num >= 10000) return `${(num / 1000).toFixed(1)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// --- 讨论区分类 ---

export const categoryLabels: Record<string, string> = {
  question: '提问',
  idea: '奇思妙想',
  request: '资源求助',
  team: '项目组队',
  share: '经验分享',
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] ?? category;
}

// --- 仓库可见性 ---

export const visibilityLabels: Record<number, string> = {
  0: '私有',
  1: '公开',
  2: '隐藏共享',
};

export function getVisibilityLabel(visibility: number): string {
  return visibilityLabels[visibility] ?? '未知';
}

// --- 字符串工具 ---

/**
 * 截断字符串，超长加省略号
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/**
 * 校验用户名格式（字母/数字/连字符，3-39位）
 */
export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9-]{1,37}[a-zA-Z0-9]$|^[a-zA-Z0-9]{1,39}$/.test(username);
}

/**
 * 校验邮箱格式
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
