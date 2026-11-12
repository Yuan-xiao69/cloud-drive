import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getClientId } from '@/lib/rate-limit';

// 限流客户端身份识别安全回归测试
// 核心：未配置 TRUSTED_PROXIES 时，客户端可控的 IP 头（X-Real-IP /
// CF-Connecting-IP / X-Forwarded-For）一律不可信，防止伪造绕过限流。
describe('getClientId 客户端身份识别', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    delete process.env.TRUSTED_PROXIES;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('未配置 TRUSTED_PROXIES 时忽略 X-Real-IP', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '5.6.7.8' },
    });
    expect(getClientId(req)).toBe('unknown');
  });

  it('未配置 TRUSTED_PROXIES 时忽略 CF-Connecting-IP', () => {
    const req = new Request('http://localhost', {
      headers: { 'cf-connecting-ip': '9.9.9.9' },
    });
    expect(getClientId(req)).toBe('unknown');
  });

  it('未配置 TRUSTED_PROXIES 时忽略 X-Forwarded-For', () => {
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(getClientId(req)).toBe('unknown');
  });

  it('配置 TRUSTED_PROXIES 时信任 X-Real-IP', () => {
    process.env.TRUSTED_PROXIES = '127.0.0.1';
    const req = new Request('http://localhost', {
      headers: { 'x-real-ip': '5.6.7.8' },
    });
    expect(getClientId(req)).toBe('5.6.7.8');
  });

  it('配置 TRUSTED_PROXIES 时从 X-Forwarded-For 取可信代理右侧 IP', () => {
    process.env.TRUSTED_PROXIES = '10.0.0.1';
    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '5.6.7.8, 10.0.0.1' },
    });
    expect(getClientId(req)).toBe('5.6.7.8');
  });
});
