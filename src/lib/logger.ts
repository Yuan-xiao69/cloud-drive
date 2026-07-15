/**
 * 统一日志系统
 * 所有 API 操作、数据库错误、异常都会记录
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  details?: unknown;
  requestId?: string;
  duration?: number;
}

const LOG_LEVELS: Record<LogLevel, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const CURRENT_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';

function formatLog(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.padEnd(5)}]`,
    `[${entry.module}]`,
    entry.message,
  ];
  if (entry.requestId) parts.push(`(req:${entry.requestId})`);
  if (entry.duration !== undefined) parts.push(`(${entry.duration}ms)`);
  if (entry.details) {
    const detailStr = typeof entry.details === 'string'
      ? entry.details
      : JSON.stringify(entry.details, null, 0);
    parts.push(`| ${detailStr}`);
  }
  return parts.join(' ');
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[CURRENT_LEVEL];
}

function log(level: LogLevel, module: string, message: string, details?: unknown, requestId?: string, duration?: number) {
  if (!shouldLog(level)) return;
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level, module, message, details, requestId, duration,
  };
  const line = formatLog(entry);
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (module: string, message: string, details?: unknown, requestId?: string) =>
    log('DEBUG', module, message, details, requestId),
  info: (module: string, message: string, details?: unknown, requestId?: string) =>
    log('INFO', module, message, details, requestId),
  warn: (module: string, message: string, details?: unknown, requestId?: string) =>
    log('WARN', module, message, details, requestId),
  error: (module: string, message: string, details?: unknown, requestId?: string) =>
    log('ERROR', module, message, details, requestId),

  /** 记录 API 请求（带耗时） */
  api: (module: string, method: string, path: string, status: number, duration: number, requestId?: string) =>
    log(status >= 400 ? 'WARN' : 'INFO', module, `${method} ${path} → ${status}`, undefined, requestId, duration),

  /** 记录数据库操作 */
  db: (operation: string, model: string, duration: number, error?: unknown) => {
    if (error) log('ERROR', 'prisma', `${operation} ${model} FAILED`, error);
    else if (shouldLog('DEBUG')) log('DEBUG', 'prisma', `${operation} ${model}`, undefined, undefined, duration);
  },
};
