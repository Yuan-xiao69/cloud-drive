/**
 * URL 安全校验器
 *
 * 统一拦截用户提交的外部 URL，防止 SSRF 和内网探测。
 * 有 URL 输入的地方都应该调用 validateExternalUrl()。
 */

// ── 被阻断的主机名（精确匹配） ─────────────────

const BLOCKED_HOSTS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
  '0',
];

// ── 被阻断的 IP 前缀（CIDR 简化版） ────────────

const BLOCKED_IP_PREFIXES = [
  '10.',        // RFC 1918
  '172.16.', '172.17.', '172.18.', '172.19.', '172.20.',
  '172.21.', '172.22.', '172.23.', '172.24.', '172.25.',
  '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.',
  '192.168.',   // RFC 1918
  '169.254.',   // 链路本地 (含云元数据 169.254.169.254)
  'fc00:',      // IPv6 私有
  'fd00:',      // IPv6 私有
  'fe80:',      // IPv6 链路本地
];

// ── 允许的协议 ────────────────────────────────

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// ── 主函数 ───────────────────────────────────

export interface UrlValidationResult {
  safe: boolean;
  reason?: string;
  /** 消毒后的 URL（移除认证信息后的） */
  sanitized?: string;
}

export function validateExternalUrl(rawUrl: string): UrlValidationResult {
  // 1. 解析 URL
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { safe: false, reason: '无效的 URL 格式' };
  }

  // 2. 协议白名单
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return { safe: false, reason: '仅支持 HTTP/HTTPS 协议' };
  }

  // 3. 不允许 user:pass@host 形式（防钓鱼 + 绕过）
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'URL 不得包含认证信息' };
  }

  // 4. Hostname 不能为空
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname) {
    return { safe: false, reason: 'URL 缺少主机名' };
  }

  // 5. 精确阻断
  if (BLOCKED_HOSTS.includes(hostname)) {
    return { safe: false, reason: '不允许使用内部地址' };
  }

  // 6. IPv4 地址直接判断（如 http://2130706433/ 十进制 IP 绕过）
  if (/^\d+$/.test(hostname)) {
    const ipInt = parseInt(hostname, 10);
    if (
      (ipInt >= 0x0A000000 && ipInt <= 0x0AFFFFFF) ||          // 10.x
      (ipInt >= 0xAC100000 && ipInt <= 0xAC1FFFFF) ||          // 172.16.x - 172.31.x
      (ipInt >= 0xC0A80000 && ipInt <= 0xC0A8FFFF) ||          // 192.168.x
      (ipInt & 0xFFFF0000) === 0xA9FE0000                       // 169.254.x
    ) {
      return { safe: false, reason: '不允许使用内部地址' };
    }
  }

  // 7. IP 前缀阻断（IPv4 和 IPv6）
  if (BLOCKED_IP_PREFIXES.some(prefix => hostname.startsWith(prefix))) {
    return { safe: false, reason: '不允许使用内网地址' };
  }

  // 8. 返回消毒后的 URL
  parsed.username = '';
  parsed.password = '';
  return { safe: true, sanitized: parsed.toString() };
}
