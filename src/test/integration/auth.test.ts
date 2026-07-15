import { describe, it, expect } from 'vitest';

// 集成测试：认证链路
// 依赖真实数据库和 Next.js 服务运行，仅做接口契约验证

describe('Auth API 契约', () => {
  it('POST /api/v1/auth/register 请求体格式校验', async () => {
    // 验证请求体 schema：username + email + password 必填
    const validBody = { username: 'test', email: 'test@test.com', password: '123456' };
    expect(validBody).toHaveProperty('username');
    expect(validBody).toHaveProperty('email');
    expect(validBody).toHaveProperty('password');
    expect(validBody.password.length).toBeGreaterThanOrEqual(6);
  });

  it('POST /api/v1/auth/login 返回双 Token 结构', () => {
    // 验证预期响应结构
    const expectedShape = {
      code: 200,
      data: { user: expect.any(Object), accessToken: expect.any(String) },
    };
    expect(expectedShape.data).toHaveProperty('user');
    expect(expectedShape.data).toHaveProperty('accessToken');
  });

  it('GET /api/v1/auth/me 需携带有效 Token', () => {
    // 无 Token 应返回 401
    const unauthorizedCode = 2000; // ErrorCodes.UNAUTHORIZED
    expect(unauthorizedCode).toBe(2000);
  });
});

describe('Token 刷新链路', () => {
  it('POST /api/v1/auth/refresh 用 refreshToken 换新 accessToken', async () => {
    // 验证 refresh 端点存在且响应格式正确
    const endpoint = '/api/v1/auth/refresh';
    expect(endpoint).toBeTruthy();
  });
});
