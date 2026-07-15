// ============================================================
// 公共工具函数
// ============================================================

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
  general: '综合',
  question: '提问',
  idea: '奇思妙想',
  share: '经验分享',
  help: '求助',
  announcement: '公告',
  request: '资源求助',
  team: '项目组队',
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] ?? category;
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

/**
 * 根据当前路径和文件名构建完整文件路径
 */
export function buildFilePath(currentPath: string[], fileName: string): string {
  const prefix = currentPath.length > 0 ? '/' + currentPath.join('/') : ''
  return prefix + '/' + fileName
}

// ── 编程语言颜色 ──

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3572A5',
  Java: '#B07219', Go: '#00ADD8', Rust: '#DEA584', C: '#555555',
  'C++': '#F34B7D', 'C#': '#178600', Ruby: '#701516', PHP: '#4F5D95',
  Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Scala: '#DC322F',
  HTML: '#E34F26', CSS: '#563D7C', Shell: '#89E051', Lua: '#000080',
  Markdown: '#083FA1', JSON: '#292929', YAML: '#CB171E', Dockerfile: '#384D54',
};

export function getLanguageColor(lang: string): string {
  return LANGUAGE_COLORS[lang] || '#8B8B8B';
}
