/**
 * OpenAPI 3.0 规范自动生成
 * 根据 API 路由和 JSDoc 注释生成 Swagger 文档
 */

import { NextRequest } from 'next/server';

// API 元信息定义
interface APIMeta {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description?: string;
  tags?: string[];
  auth?: boolean;
  admin?: boolean;
  requestBody?: {
    contentType?: string;
    schema?: Record<string, unknown>;
    example?: Record<string, unknown>;
  };
  responses?: Record<string, {
    description: string;
    schema?: Record<string, unknown>;
    example?: Record<string, unknown>;
  }>;
  parameters?: Array<{
    name: string;
    in: 'query' | 'path' | 'header';
    description?: string;
    required?: boolean;
    schema?: Record<string, unknown>;
  }>;
}

// API 元信息注册表
export const apiRegistry: APIMeta[] = [
  // 认证
  {
    path: '/api/auth/register',
    method: 'POST',
    summary: '用户注册',
    tags: ['认证'],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 3, maxLength: 39 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 6 },
        },
      },
      example: { username: 'testuser', email: 'test@example.com', password: 'password123' },
    },
    responses: {
      '201': { description: '注册成功', example: { success: true, data: { userId: 'xxx' } } },
      '400': { description: '参数错误' },
      '409': { description: '用户名或邮箱已存在' },
    },
  },
  {
    path: '/api/auth/login',
    method: 'POST',
    summary: '用户登录',
    tags: ['认证'],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string' },
          password: { type: 'string' },
        },
      },
      example: { email: 'test@example.com', password: 'password123' },
    },
    responses: {
      '200': { description: '登录成功', example: { success: true, data: { token: 'xxx' } } },
      '401': { description: '认证失败' },
    },
  },
  {
    path: '/api/auth/me',
    method: 'GET',
    summary: '获取当前用户信息',
    tags: ['认证'],
    auth: true,
    responses: {
      '200': { description: '成功' },
      '401': { description: '未登录' },
    },
  },

  // 仓库
  {
    path: '/api/repos',
    method: 'POST',
    summary: '创建仓库',
    tags: ['仓库'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          visibility: { type: 'number', enum: [0, 1] },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '409': { description: '仓库名已存在' },
    },
  },
  {
    path: '/api/repos/{username}/{repoName}/tree',
    method: 'GET',
    summary: '获取文件列表',
    tags: ['仓库'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'path', in: 'query', description: '目录路径' },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库不存在' },
    },
  },
  {
    path: '/api/repos/{username}/{repoName}/tree',
    method: 'DELETE',
    summary: '删除文件或目录',
    tags: ['仓库'],
    auth: true,
    admin: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string' },
          recursive: { type: 'boolean', description: '递归删除目录' },
        },
      },
    },
    responses: {
      '200': { description: '删除成功' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/repos/{username}/{repoName}/tree',
    method: 'PATCH',
    summary: '移动或重命名文件/目录',
    tags: ['仓库'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string', description: '源路径' },
          targetPath: { type: 'string', description: '目标路径（移动时）' },
          targetName: { type: 'string', description: '新名称（重命名时）' },
        },
      },
    },
    responses: {
      '200': { description: '操作成功' },
      '409': { description: '目标已存在' },
    },
  },
  {
    path: '/api/repos/{username}/{repoName}/batch',
    method: 'DELETE',
    summary: '批量删除文件',
    tags: ['仓库'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['items'],
        properties: {
          items: { type: 'array', items: { type: 'object' } },
          recursive: { type: 'boolean' },
        },
      },
    },
    responses: {
      '200': { description: '批量操作完成' },
    },
  },
  {
    path: '/api/repos/{username}/{repoName}/upload',
    method: 'POST',
    summary: '上传文件',
    tags: ['仓库'],
    auth: true,
    requestBody: {
      contentType: 'multipart/form-data',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          file: { type: 'string', format: 'binary' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      '201': { description: '上传成功' },
    },
  },

  // 通知
  {
    path: '/api/notifications',
    method: 'GET',
    summary: '获取通知列表',
    tags: ['通知'],
    auth: true,
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'number' } },
      { name: 'limit', in: 'query', schema: { type: 'number' } },
      { name: 'isRead', in: 'query', schema: { type: 'boolean' } },
    ],
    responses: {
      '200': { description: '成功' },
    },
  },
  {
    path: '/api/notifications',
    method: 'PATCH',
    summary: '标记通知已读',
    tags: ['通知'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
          markAllRead: { type: 'boolean' },
        },
      },
    },
    responses: {
      '200': { description: '操作成功' },
    },
  },
  {
    path: '/api/notifications/stream',
    method: 'GET',
    summary: 'SSE 实时通知流',
    tags: ['通知'],
    description: '通过 Server-Sent Events 接收实时通知',
    auth: true,
    responses: {
      '200': {
        description: 'SSE 流',
        schema: { type: 'string', format: 'text/event-stream' },
      },
    },
  },

  // 管理面板
  {
    path: '/api/admin/backup',
    method: 'GET',
    summary: '获取备份列表',
    tags: ['管理'],
    admin: true,
    responses: {
      '200': { description: '成功' },
    },
  },
  {
    path: '/api/admin/backup',
    method: 'POST',
    summary: '创建数据库备份',
    tags: ['管理'],
    admin: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          tables: { type: 'array', items: { type: 'string' } },
          compress: { type: 'boolean' },
          retainDays: { type: 'number' },
        },
      },
    },
    responses: {
      '200': { description: '备份创建成功' },
    },
  },

  // 搜索
  {
    path: '/api/search',
    method: 'GET',
    summary: '搜索',
    tags: ['搜索'],
    parameters: [
      { name: 'q', in: 'query', required: true, description: '搜索关键词' },
      { name: 'type', in: 'query', description: '搜索类型: repos/users/discussions' },
    ],
    responses: {
      '200': { description: '成功' },
    },
  },

  // ============ API v1 版本 ============
  // 认证 (v1)
  {
    path: '/api/v1/auth/login',
    method: 'POST',
    summary: '用户登录 (v1)',
    tags: ['认证-v1'],
    description: '使用统一错误码体系的登录接口',
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['account', 'password'],
        properties: {
          account: { type: 'string', description: '用户名或邮箱' },
          password: { type: 'string' },
        },
      },
      example: { account: 'testuser', password: 'password123' },
    },
    responses: {
      '200': { description: '登录成功' },
      '401': { description: '认证失败' },
      '403': { description: '账号已被封禁' },
    },
  },
  {
    path: '/api/v1/auth/register',
    method: 'POST',
    summary: '用户注册 (v1)',
    tags: ['认证-v1'],
    description: '使用统一错误码体系的注册接口',
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['username', 'email', 'password'],
        properties: {
          username: { type: 'string', minLength: 1, maxLength: 39 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      example: { username: 'testuser', email: 'test@example.com', password: 'password123' },
    },
    responses: {
      '201': { description: '注册成功' },
      '400': { description: '参数错误/验证失败' },
      '409': { description: '用户名或邮箱已存在' },
    },
  },
  {
    path: '/api/v1/auth/me',
    method: 'GET',
    summary: '获取当前用户 (v1)',
    tags: ['认证-v1'],
    auth: true,
    responses: {
      '200': { description: '成功' },
      '401': { description: '未登录' },
    },
  },
  {
    path: '/api/v1/auth/refresh',
    method: 'POST',
    summary: '刷新 Token (v1)',
    tags: ['认证-v1'],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string', description: '刷新令牌（可选，默认从 Cookie 读取）' },
        },
      },
    },
    responses: {
      '200': { description: '刷新成功' },
      '401': { description: 'Token 无效或已过期' },
    },
  },

  // 仓库 (v1)
  {
    path: '/api/v1/repos/{username}/{repoName}',
    method: 'GET',
    summary: '获取仓库详情 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库不存在' },
      '403': { description: '无权访问私有仓库' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}',
    method: 'PUT',
    summary: '更新仓库 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          visibility: { type: 'number', enum: [0, 1] },
          defaultBranch: { type: 'string' },
        },
      },
    },
    responses: {
      '200': { description: '更新成功' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/issues',
    method: 'GET',
    summary: '获取问题列表 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'status', in: 'query', description: '筛选状态: open/closed/all' },
      { name: 'page', in: 'query', schema: { type: 'number' } },
      { name: 'size', in: 'query', schema: { type: 'number' } },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库不存在' },
    },
  },

  // 讨论 (v1)
  {
    path: '/api/v1/discussions',
    method: 'GET',
    summary: '获取讨论列表 (v1)',
    tags: ['讨论-v1'],
    parameters: [
      { name: 'category', in: 'query', description: '分类: question/idea/request/team/share' },
      { name: 'sort', in: 'query', description: '排序: latest/hot' },
      { name: 'keyword', in: 'query', description: '搜索关键词' },
    ],
    responses: {
      '200': { description: '成功' },
    },
  },
  {
    path: '/api/v1/discussions',
    method: 'POST',
    summary: '创建讨论 (v1)',
    tags: ['讨论-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['title', 'category'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          category: { type: 'string', enum: ['question', 'idea', 'request', 'team', 'share'] },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '400': { description: '参数错误' },
      '401': { description: '未登录' },
    },
  },

  // 通知 (v1)
  {
    path: '/api/v1/notifications',
    method: 'GET',
    summary: '获取通知列表 (v1)',
    tags: ['通知-v1'],
    auth: true,
    parameters: [
      { name: 'page', in: 'query', schema: { type: 'number' } },
      { name: 'size', in: 'query', schema: { type: 'number' } },
      { name: 'isRead', in: 'query', schema: { type: 'boolean' } },
      { name: 'type', in: 'query', description: '通知类型' },
      { name: 'priority', in: 'query', description: '优先级: urgent/high/normal/low' },
    ],
    responses: {
      '200': { description: '成功' },
      '401': { description: '未登录' },
    },
  },
  {
    path: '/api/v1/notifications',
    method: 'PATCH',
    summary: '标记通知已读 (v1)',
    tags: ['通知-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' } },
          all: { type: 'boolean', description: '标记所有通知已读' },
        },
      },
    },
    responses: {
      '200': { description: '操作成功' },
      '400': { description: '参数错误' },
    },
  },
  {
    path: '/api/v1/notifications',
    method: 'DELETE',
    summary: '删除通知 (v1)',
    tags: ['通知-v1'],
    auth: true,
    parameters: [
      { name: 'ids', in: 'query', description: '要删除的通知ID，逗号分隔' },
    ],
    responses: {
      '200': { description: '删除成功' },
      '400': { description: '参数错误' },
    },
  },

  // ============ 仓库操作 (v1) ============
  {
    path: '/api/v1/repos/{username}/{repoName}/star',
    method: 'PUT',
    summary: '切换 Star 状态 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '操作成功' },
      '401': { description: '未登录' },
      '404': { description: '仓库不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/watch',
    method: 'PUT',
    summary: '切换 Watch 状态 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '操作成功' },
      '401': { description: '未登录' },
      '404': { description: '仓库不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/stats',
    method: 'GET',
    summary: '获取仓库统计 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/branches',
    method: 'GET',
    summary: '获取分支列表 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/branches',
    method: 'POST',
    summary: '创建分支 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', description: '分支名称' },
          sourceBranch: { type: 'string', description: '源分支（可选）' },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '400': { description: '参数错误' },
      '403': { description: '无权限' },
      '409': { description: '分支已存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/branches',
    method: 'DELETE',
    summary: '删除分支 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'name', in: 'query', required: true, description: '分支名称' },
    ],
    responses: {
      '200': { description: '删除成功' },
      '400': { description: '不能删除默认分支' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/tree',
    method: 'GET',
    summary: '获取文件列表 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'path', in: 'query', description: '目录路径' },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '仓库或目录不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/tree',
    method: 'DELETE',
    summary: '删除文件或目录 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['path'],
        properties: {
          path: { type: 'string', description: '文件路径' },
          recursive: { type: 'boolean', description: '递归删除' },
        },
      },
    },
    responses: {
      '200': { description: '删除成功' },
      '400': { description: '目录非空' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/tree',
    method: 'PATCH',
    summary: '移动或重命名 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          sourcePath: { type: 'string' },
          targetPath: { type: 'string' },
          targetName: { type: 'string' },
        },
      },
    },
    responses: {
      '200': { description: '操作成功' },
      '409': { description: '目标已存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/upload',
    method: 'POST',
    summary: '上传文件 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'multipart/form-data',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          file: { type: 'string', format: 'binary' },
          message: { type: 'string' },
        },
      },
    },
    responses: {
      '201': { description: '上传成功' },
      '403': { description: '存储受限' },
      '409': { description: '文件名已存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/fork',
    method: 'POST',
    summary: 'Fork 仓库 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    responses: {
      '200': { description: 'Fork 成功' },
      '400': { description: '不能 fork 自己的仓库' },
      '403': { description: '仓库操作受限' },
      '409': { description: '已经 fork 过' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/share',
    method: 'GET',
    summary: '获取分享链接列表 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    responses: {
      '200': { description: '成功' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/share',
    method: 'POST',
    summary: '创建分享链接 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          permission: { type: 'string', enum: ['read', 'download'] },
          password: { type: 'string' },
          expiresIn: { type: 'number', description: '过期时间（秒）' },
          maxViews: { type: 'number' },
        },
      },
    },
    responses: {
      '200': { description: '创建成功' },
      '400': { description: '参数错误' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/issues',
    method: 'POST',
    summary: '创建 Issue (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['title'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          labels: { type: 'array', items: { type: 'string' } },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '400': { description: '参数错误' },
      '401': { description: '未登录' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/pulls',
    method: 'POST',
    summary: '创建 Pull Request (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['title', 'sourceBranch', 'targetBranch'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          sourceBranch: { type: 'string' },
          targetBranch: { type: 'string' },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '400': { description: '参数错误' },
      '401': { description: '未登录' },
    },
  },

  // ============ Fork Requests (v1) ============
  {
    path: '/api/v1/repos/{username}/{repoName}/fork-request',
    method: 'POST',
    summary: '申请 Fork 仓库 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: '申请说明' },
        },
      },
    },
    responses: {
      '200': { description: '申请成功' },
      '400': { description: '不能 fork 自己的仓库/已经 fork 过/已有待处理申请' },
      '403': { description: '被禁言/仓库操作受限' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/fork-requests',
    method: 'GET',
    summary: '获取 Fork 申请列表 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'status', in: 'query', description: '筛选状态: pending/approved/rejected/expired/all' },
      { name: 'page', in: 'query', schema: { type: 'number' } },
      { name: 'size', in: 'query', schema: { type: 'number' } },
    ],
    responses: {
      '200': { description: '成功' },
      '403': { description: '只有仓库所有者可以查看' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/fork-requests/{id}',
    method: 'GET',
    summary: '获取 Fork 申请详情 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'id', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '成功' },
      '403': { description: '无权查看' },
      '404': { description: '申请不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/fork-requests/{id}',
    method: 'PATCH',
    summary: '审批 Fork 申请 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'id', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['action'],
        properties: {
          action: { type: 'string', enum: ['approve', 'reject'] },
          note: { type: 'string', description: '备注/拒绝原因' },
        },
      },
    },
    responses: {
      '200': { description: '审批成功' },
      '400': { description: '申请已处理/已过期' },
      '403': { description: '只有仓库所有者可以审批' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/fork-requests/{id}',
    method: 'DELETE',
    summary: '删除 Fork 申请 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'id', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '删除成功' },
      '400': { description: '只能取消待处理的申请' },
      '403': { description: '无权删除' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/batch',
    method: 'POST',
    summary: '批量文件操作 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['operations'],
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['delete', 'rename', 'move'] },
                path: { type: 'string' },
                targetPath: { type: 'string' },
                newName: { type: 'string' },
                recursive: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    responses: {
      '200': { description: '批量操作完成' },
      '400': { description: '参数错误' },
      '403': { description: '无权限' },
    },
  },

  // ============ 分片上传 (v1) ============
  {
    path: '/api/v1/repos/{username}/{repoName}/upload-chunked',
    method: 'GET',
    summary: '获取分片上传状态 (v1)',
    tags: ['仓库-v1'],
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'action', in: 'query', required: true, description: '操作类型: status' },
      { name: 'uploadId', in: 'query', required: true, description: '上传会话ID' },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '上传不存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/upload-chunked',
    method: 'POST',
    summary: '分片上传操作 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    description: '支持 init/chunk/complete/cancel 四种操作',
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'action', in: 'query', required: true, description: '操作: init/chunk/complete/cancel' },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          fileName: { type: 'string', description: '文件名（init时必填）' },
          fileSize: { type: 'number', description: '文件大小（init时必填）' },
          parentPath: { type: 'string', description: '父目录路径' },
          totalChunks: { type: 'number', description: '总分片数' },
          fileHash: { type: 'string', description: '文件哈希（用于秒传）' },
          uploadId: { type: 'string', description: '上传会话ID（chunk/complete/cancel时必填）' },
          chunkIndex: { type: 'number', description: '分片索引（chunk时必填）' },
          chunk: { type: 'string', description: '分片数据base64（chunk时必填）' },
          mimeType: { type: 'string', description: '文件MIME类型' },
        },
      },
    },
    responses: {
      '200': { description: '操作成功' },
      '400': { description: '参数错误' },
      '401': { description: '未登录' },
      '403': { description: '存储受限' },
      '409': { description: '文件名已存在' },
    },
  },
  {
    path: '/api/v1/repos/{username}/{repoName}/upload-chunked',
    method: 'DELETE',
    summary: '取消分片上传 (v1)',
    tags: ['仓库-v1'],
    auth: true,
    parameters: [
      { name: 'username', in: 'path', required: true },
      { name: 'repoName', in: 'path', required: true },
      { name: 'uploadId', in: 'query', required: true, description: '上传会话ID' },
    ],
    responses: {
      '200': { description: '取消成功' },
      '401': { description: '未登录' },
    },
  },

  // ============ 分享链接访问 (v1) ============
  {
    path: '/api/v1/share/{token}',
    method: 'GET',
    summary: '获取分享内容 (v1)',
    tags: ['分享-v1'],
    description: '无需登录即可访问公开分享',
    parameters: [
      { name: 'token', in: 'path', required: true },
      { name: 'path', in: 'query', description: '子路径' },
      { name: 'password', in: 'query', description: '访问密码' },
    ],
    responses: {
      '200': { description: '成功' },
      '401': { description: '需要密码' },
      '403': { description: '链接已禁用/过期' },
      '404': { description: '链接不存在' },
    },
  },
  {
    path: '/api/v1/share/{token}',
    method: 'POST',
    summary: '验证分享密码 (v1)',
    tags: ['分享-v1'],
    parameters: [
      { name: 'token', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string' },
        },
      },
    },
    responses: {
      '200': { description: '验证成功' },
      '400': { description: '此链接不需要密码' },
      '401': { description: '密码错误' },
    },
  },
  {
    path: '/api/v1/share/{token}',
    method: 'PATCH',
    summary: '更新分享链接 (v1)',
    tags: ['分享-v1'],
    auth: true,
    parameters: [
      { name: 'token', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          expiresAt: { type: 'string', format: 'date-time' },
          maxViews: { type: 'number' },
          isActive: { type: 'boolean' },
        },
      },
    },
    responses: {
      '200': { description: '更新成功' },
      '403': { description: '无权限' },
    },
  },
  {
    path: '/api/v1/share/{token}',
    method: 'DELETE',
    summary: '删除分享链接 (v1)',
    tags: ['分享-v1'],
    auth: true,
    parameters: [
      { name: 'token', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '删除成功' },
      '403': { description: '无权限' },
    },
  },

  // ============ 公告 (v1) ============
  {
    path: '/api/v1/announcements',
    method: 'GET',
    summary: '获取公告列表 (v1)',
    tags: ['公告-v1'],
    responses: {
      '200': { description: '成功' },
    },
  },
  {
    path: '/api/v1/announcements',
    method: 'POST',
    summary: '创建公告 (v1)',
    tags: ['公告-v1'],
    admin: true,
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string', enum: ['info', 'warning', 'error', 'success'] },
          priority: { type: 'number' },
          isPinned: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      '201': { description: '创建成功' },
      '400': { description: '参数错误' },
      '403': { description: '需要管理员权限' },
    },
  },
  {
    path: '/api/v1/announcements/{id}',
    method: 'GET',
    summary: '获取公告详情 (v1)',
    tags: ['公告-v1'],
    parameters: [
      { name: 'id', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '成功' },
      '404': { description: '公告不存在' },
    },
  },
  {
    path: '/api/v1/announcements/{id}',
    method: 'PATCH',
    summary: '更新公告 (v1)',
    tags: ['公告-v1'],
    admin: true,
    parameters: [
      { name: 'id', in: 'path', required: true },
    ],
    requestBody: {
      contentType: 'application/json',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          type: { type: 'string' },
          priority: { type: 'number' },
          isPinned: { type: 'boolean' },
          isActive: { type: 'boolean' },
          publishedAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    responses: {
      '200': { description: '更新成功' },
      '403': { description: '需要管理员权限' },
      '404': { description: '公告不存在' },
    },
  },
  {
    path: '/api/v1/announcements/{id}',
    method: 'DELETE',
    summary: '删除公告 (v1)',
    tags: ['公告-v1'],
    admin: true,
    parameters: [
      { name: 'id', in: 'path', required: true },
    ],
    responses: {
      '200': { description: '删除成功' },
      '403': { description: '需要管理员权限' },
      '404': { description: '公告不存在' },
    },
  },

  // ============ 搜索 (v1) ============
  {
    path: '/api/v1/search',
    method: 'GET',
    summary: '综合搜索 (v1)',
    tags: ['搜索-v1'],
    parameters: [
      { name: 'q', in: 'query', description: '搜索关键词' },
      { name: 'type', in: 'query', description: '搜索类型: repos/users/discussions' },
      { name: 'page', in: 'query', schema: { type: 'number' } },
      { name: 'size', in: 'query', schema: { type: 'number' } },
    ],
    responses: {
      '200': { description: '成功' },
      '400': { description: '无效的搜索类型' },
    },
  },
];


/**
 * 生成 OpenAPI 3.0 规范
 */
export function generateOpenAPISpec(): Record<string, unknown> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const paths: Record<string, Record<string, unknown>> = {};

  for (const api of apiRegistry) {
    if (!paths[api.path]) {
      paths[api.path] = {};
    }

    const operation: Record<string, unknown> = {
      summary: api.summary,
      description: api.description || '',
      tags: api.tags || ['其他'],
      security: api.auth ? [{ bearerAuth: [] }] : [],
      responses: {},
    };

    if (api.parameters) {
      operation.parameters = api.parameters;
    }

    if (api.requestBody) {
      operation.requestBody = {
        required: true,
        content: {
          [api.requestBody.contentType || 'application/json']: {
            schema: api.requestBody.schema,
            example: api.requestBody.example,
          },
        },
      };
    }

    if (api.responses) {
      for (const [code, response] of Object.entries(api.responses)) {
        (operation.responses as Record<string, unknown>)[code] = {
          description: response.description,
          content: response.schema ? {
            'application/json': {
              schema: response.schema,
              example: response.example,
            },
          } : undefined,
        };
      }
    }

    (paths[api.path] as Record<string, unknown>)[api.method.toLowerCase()] = operation;
  }

  return {
    openapi: '3.0.0',
    info: {
      title: 'GitHub Platform API',
      description: 'GitHub 风格的知识托管与交流平台 API 文档',
      version: '1.0.0',
      contact: {
        email: 'support@example.com',
      },
    },
    servers: [
      { url: baseUrl, description: '开发服务器' },
      { url: `${baseUrl}/api`, description: 'API 基础路径' },
    ],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            avatarUrl: { type: 'string' },
            role: { type: 'string' },
          },
        },
      },
    },
  };
}
