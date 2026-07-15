import { describe, it, expect } from 'vitest';
import { success, error, errors, paginated, ErrorCodes } from '@/lib/api/v1';

describe('success()', () => {
  it('返回 200 状态码 + V1 版本头', () => {
    const res = success({ id: '1', name: 'test' }, '创建成功');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-API-Version')).toBe('1.0.0');
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('created() 返回 201', () => {
    const res = success({ id: '1' }, '创建成功', 201);
    expect(res.status).toBe(201);
  });
});

describe('error()', () => {
  it('按错误码返回对应 HTTP 状态', () => {
    const res = error(ErrorCodes.UNAUTHORIZED, { message: '未登录' });
    expect(res.status).toBe(401);
  });

  it('支持字符串错误码', () => {
    const res = error('NOT_FOUND');
    expect(res.status).toBe(404);
  });
});

describe('errors 便捷方法', () => {
  it('errors.notFound() 返回 404 + 中文消息', async () => {
    const res = errors.notFound('仓库');
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.message).toContain('仓库');
  });

  it('errors.unauthorized() 返回 401', async () => {
    const res = errors.unauthorized();
    expect(res.status).toBe(401);
  });

  it('errors.forbidden() 返回 403', async () => {
    const res = errors.forbidden('无权操作');
    expect(res.status).toBe(403);
  });
});

describe('paginated()', () => {
  it('分页响应 data 包含 items + pagination 嵌套结构', async () => {
    const res = paginated(
      [{ id: '1' }, { id: '2' }],
      { page: 1, size: 20, total: 100, totalPages: 5 }
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.items).toHaveLength(2);
    expect(body.data.pagination.total).toBe(100);
    expect(body.data.pagination.totalPages).toBe(5);
    expect(body.data.pagination.page).toBe(1);
    expect(body.data.pagination.size).toBe(20);
  });
});
