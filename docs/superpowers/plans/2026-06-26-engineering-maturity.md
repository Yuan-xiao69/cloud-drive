# 工程化成熟度提升方案

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Cloud Drive 从功能完整的原型提升为生产级网站，覆盖测试、无障碍、SEO、图片优化、错误监控、CSP、PWA、日志、邮件模板九个维度。

**Architecture:** 分三阶段推进。第一阶段（4 项）改配置和基础设施，每个不到 30 分钟，收益覆盖全站。第二阶段（3 项）改 design/ 组件和核心链路，一次改全站自动受益。第三阶段（2 项）按页面渐进覆盖。所有改动遵循"design/ 优先、一次改全局受益"原则，不引入新模式。

**Tech Stack:** Vitest + @testing-library/react、eslint-plugin-jsx-a11y、@sentry/nextjs、react-email、pino、next/image

---

## 文件结构

```
新建:
  src/lib/logger.ts                      结构化日志
  src/lib/email-templates/
    ├── layout.tsx                       邮件基础布局（Header/Footer）
    └── notification.tsx                 通知邮件模板
  src/test/
    ├── setup.ts                         测试 setup
    ├── integration/
    │   ├── auth.test.ts                 登录/注册链路
    │   └── repo.test.ts                 仓库创建/权限
    └── unit/
        └── api/
            └── response.test.ts         V1 响应工具
  sentry.client.config.ts                Sentry 客户端配置
  sentry.server.config.ts                Sentry 服务端配置
  sentry.edge.config.ts                  Sentry Edge 配置
  public/
    ├── robots.txt
    ├── sitemap.xml
    └── manifest.json

修改:
  next.config.js                         CSP 头 + sentry 配置 + PWA headers
  package.json                           依赖
  .eslintrc.json                         jsx-a11y 插件
  src/app/layout.tsx                     全站 metadata + PWA meta
  src/lib/framework/define-route.ts:178  Sentry 捕获
  src/lib/email-service.ts               改用 react-email 渲染
  src/components/design/
    ├── Modal.tsx                        焦点陷阱 + aria-modal
    ├── Button.tsx                       aria 属性继承
    ├── Input.tsx                        label 关联增强
    ├── Select.tsx                       aria-expanded + 键盘
    └── Avatar.tsx                       next/image 替换 <img>
```

---

## 第一阶段：基础设施（本周，每项 10-30 分钟）

### Task 1: Sentry 错误监控

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Modify: `next.config.js:1-3`（顶部加 withSentryConfig import）
- Modify: `next.config.js:74`（导出改为 withSentryConfig 包裹）
- Modify: `src/lib/framework/define-route.ts:178-181`
- Modify: `package.json`

- [ ] **Step 1: 安装 Sentry**

```bash
npm install @sentry/nextjs
```

- [ ] **Step 2: 创建 Sentry 客户端配置**

文件：`sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
});
```

- [ ] **Step 3: 创建 Sentry 服务端配置**

文件：`sentry.server.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  environment: process.env.NODE_ENV || 'development',
});
```

- [ ] **Step 4: 创建 Sentry Edge 配置**

文件：`sentry.edge.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  tracesSampleRate: 0.05,
});
```

- [ ] **Step 5: 修改 next.config.js**

```javascript
// next.config.js 顶部加：
const { withSentryConfig } = require('@sentry/nextjs');

// 底部 module.exports 改为：
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

- [ ] **Step 6: 在 define-route 管道中捕获未处理异常**

文件：`src/lib/framework/define-route.ts:178-181`

```typescript
    } catch (error) {
      // 7. 统一错误处理（Sentry 只上报 500 类错误，业务错误不上报）
      if (error instanceof Error && !(error instanceof BusinessError)) {
        import('@sentry/nextjs').then(Sentry =>
          Sentry.captureException(error, {
            tags: { route: defineRoute.name || 'unknown' },
            extra: { url: req.url, method: req.method },
          })
        );
      }
      return ErrorHandler.handle(error);
    }
```

- [ ] **Step 7: 环境变量模板补 Sentry DSN**

文件：`.env.example`

```
# Sentry（可选，不配也能运行）
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

- [ ] **Step 8: 验证**

```bash
npm run build   # 确认 withSentryConfig 不报错
```

---

### Task 2: CSP 安全头

**Files:**
- Modify: `next.config.js:41-61`

- [ ] **Step 1: 在 headers() 函数中追加 CSP**

文件：`next.config.js`，在现有 headers 数组的返回对象中追加：

```javascript
// 在现有 X-Frame-Options / X-Content-Type-Options / Referrer-Policy 后面追加：
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://*.sentry.io ws: wss:",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
},
```

- [ ] **Step 2: 生产环境收紧 unsafe-inline（可选，上线评估后执行）**

```javascript
// 等全线稳定后，用 nonce 替代 unsafe-inline：
// "script-src 'self' 'nonce-{NONCE}'",
// "style-src 'self' 'nonce-{NONCE}'",
```

- [ ] **Step 3: 验证**

```bash
npm run build && npm run start
# 打开浏览器 DevTools → Security 标签，确认无 CSP 阻止
```

---

### Task 3: SEO 基础建设

**Files:**
- Modify: `src/app/layout.tsx:14`（metadata 补全）
- Create: `public/robots.txt`
- Create: `public/sitemap.xml`

- [ ] **Step 1: 补全全局 metadata**

文件：`src/app/layout.tsx`

```typescript
export const metadata: Metadata = {
  title: {
    template: '%s - 知识托管平台',
    default: '知识托管平台 — 类 GitHub 文件托管与协作',
  },
  description: '类 GitHub 风格的个人/团队文件托管与协作平台。支持仓库管理、文件上传预览、Issue/PR、讨论区、权限控制、SSE 实时通知。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: '知识托管平台',
    locale: 'zh_CN',
  },
  robots: {
    index: true,
    follow: true,
  },
};
```

- [ ] **Step 2: 补 5 个核心页面的独立 metadata**

文件：`src/app/(main)/[username]/[repoName]/page.tsx`（仓库页，SSR 页面）

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const repo = await prisma.repository.findFirst({ /* 查仓库名和描述 */ });
  return {
    title: `${params.username}/${params.repoName}`,
    description: repo?.description || `查看 ${params.username}/${params.repoName} 仓库`,
  };
}
```

同样补到 `discussions/[id]/page.tsx`、`search/page.tsx`、`explore/page.tsx`、`[username]/page.tsx`。每个页面一行 `title` 一行 `description`。

- [ ] **Step 3: 创建 robots.txt**

文件：`public/robots.txt`

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /settings
Disallow: /notifications
Sitemap: https://你的域名.com/sitemap.xml
```

- [ ] **Step 4: 创建静态 sitemap.xml**

文件：`public/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://你的域名.com/</loc><priority>1.0</priority></url>
  <url><loc>https://你的域名.com/explore</loc><priority>0.8</priority></url>
  <url><loc>https://你的域名.com/discussions</loc><priority>0.7</priority></url>
  <url><loc>https://你的域名.com/search</loc><priority>0.5</priority></url>
</urlset>
```

- [ ] **Step 5: 验证**

```bash
npm run build     # generateMetadata 不报编译错误
curl http://localhost:3000/robots.txt    # 返回内容
```

---

### Task 4: 结构化日志

**Files:**
- Create: `src/lib/logger.ts`

- [ ] **Step 1: 安装 pino**

```bash
npm install pino
```

- [ ] **Step 2: 创建 logger 模块**

文件：`src/lib/logger.ts`

```typescript
import pino from 'pino';

export const logger = pino({
  name: 'cloud-drive',
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // 开发环境 human-readable，生产环境 JSON
  ...(process.env.NODE_ENV !== 'production' && {
    transport: { target: 'pino-pretty', options: { colorize: true } },
  }),
});

// 类型安全的日志方法别名
export const log = {
  info: (msg: string, data?: Record<string, unknown>) =>
    logger.info(data || {}, msg),
  warn: (msg: string, data?: Record<string, unknown>) =>
    logger.warn(data || {}, msg),
  error: (msg: string, error?: Error, data?: Record<string, unknown>) =>
    logger.error({ ...data, error: error?.message, stack: error?.stack }, msg),
  debug: (msg: string, data?: Record<string, unknown>) =>
    logger.debug(data || {}, msg),
};
```

- [ ] **Step 3: 在 define-route 管道中使用**

文件：`src/lib/framework/define-route.ts`

```typescript
import { log } from '@/lib/logger';

// 在 handler 执行前加（line 176 之前）：
const start = Date.now();

// 在 catch 块（line 178-181）中加：
log.error('API 路由异常', error instanceof Error ? error : new Error(String(error)), {
  url: req.url,
  method: req.method,
  duration: Date.now() - start,
});
```

- [ ] **Step 4: 安装 pino-pretty（开发依赖）**

```bash
npm install -D pino-pretty
```

- [ ] **Step 5: 验证**

```bash
npm run dev
# 访问任意 API，终端应看到结构化日志输出
```

---

## 第二阶段：组件与链路（下周，每项 1-2 小时）

### Task 5: 核心集成测试

**Files:**
- Create: `src/test/setup.ts`
- Create: `src/test/unit/api/response.test.ts`
- Create: `src/test/integration/auth.test.ts`
- Create: `src/test/integration/repo.test.ts`
- Modify: `package.json`
- Modify: `src/lib/api/v1/response.ts`（需导出一个 mockable 的 response 构建函数）

- [ ] **Step 1: 安装依赖**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: 配置 Vitest**

文件：`package.json`，在 `"scripts"` 中加：

```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

文件：`vitest.config.ts`（项目根目录）

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

- [ ] **Step 3: 创建测试 setup**

文件：`src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
```

- [ ] **Step 4: 编写 V1 响应工具单元测试（3 个用例）**

文件：`src/test/unit/api/response.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { success, error, errors, paginated, ErrorCodes } from '@/lib/api/v1';

describe('V1 响应工具', () => {
  describe('success()', () => {
    it('返回标准成功结构 { code, message, data, meta }', () => {
      const res = success({ id: '1', name: 'test' }, '创建成功');
      const body = res.json ? res : null;
      expect(res.status).toBe(200);
    });

    it('meta 包含 version / timestamp / requestId', () => {
      const res = success({ name: 'repo' });
      const body: any = null; // NextResponse.json 需实际解析
      // 验证 status 200 和 header X-API-Version 存在
      expect(res.status).toBe(200);
      expect(res.headers.get('X-API-Version')).toBe('1.0.0');
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
  });

  describe('paginated()', () => {
    it('分页响应包含 pagination 嵌套结构', async () => {
      const res = paginated([{ id: '1' }], { page: 1, size: 20, total: 100, totalPages: 5 });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.items).toHaveLength(1);
      expect(body.data.pagination.total).toBe(100);
      expect(body.data.pagination.totalPages).toBe(5);
    });
  });
});
```

- [ ] **Step 5: 运行单元测试验证**

```bash
npx vitest run src/test/unit/api/response.test.ts
# 预期：3 个 describe 块，6 个 it 全部通过
```

---

### Task 6: 无障碍 a11y（design/ 组件级改动）

**Files:**
- Modify: `src/components/design/Modal.tsx`（焦点陷阱 + aria-modal）
- Modify: `src/components/design/Button.tsx`（无改动——已有关键交互）
- Modify: `src/components/design/Input.tsx`（label 关联增强）
- Modify: `src/components/design/Select.tsx`（aria-expanded + 键盘）
- Modify: `.eslintrc.json`（加 jsx-a11y 插件）

- [ ] **Step 1: 安装 ESLint a11y 插件**

```bash
npm install -D eslint-plugin-jsx-a11y
```

- [ ] **Step 2: 配置 ESLint**

文件：`.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals", "prettier", "plugin:jsx-a11y/recommended"],
  "rules": {
    "react/no-unknown-property": ["error", { "ignore": ["jsx", "global"] }],
    "no-restricted-syntax": [
      "error",
      {
        "selector": "JSXAttribute[name.name='className'][value.value=/rounded-(md|lg|xl|2xl)/]",
        "message": "请使用 <Card> 组件控制圆角，不要直接写 rounded-* 类名"
      }
    ]
  }
}
```

- [ ] **Step 3: Modal 补焦点陷阱 + aria-modal**

文件：`src/components/design/Modal.tsx`

```typescript
// 1. 在 overlay div 上加：
role="dialog"
aria-modal="true"
aria-label={title || '对话框'}

// 2. 在 existing useEffect 中加焦点管理：
useEffect(() => {
  if (isOpen) {
    // 限制焦点在 Modal 内
    const modal = document.querySelector('[role="dialog"]') as HTMLElement;
    const focusable = modal?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];
    first?.focus();

    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    modal?.addEventListener('keydown', trap);
    return () => modal?.removeEventListener('keydown', trap);
  }
}, [isOpen]);
```

- [ ] **Step 4: Input 增强——补 id 自动生成**

文件：`src/components/design/Input.tsx`

```typescript
// 顶部加：
import { useId } from 'react';

// 组件内：
const autoId = useId();
const inputId = props.id || autoId;

// 如果没有 id 自动生成，保证 label htmlFor 可关联
// 返回值不变，只是内部保证 input 总有 id
```

- [ ] **Step 5: Select 补 aria-expanded + 键盘**

文件：`src/components/design/Select.tsx`

```typescript
// 下拉触发按钮加：
aria-expanded={isOpen}
aria-haspopup="listbox"
// 选项容器加：
role="listbox"
// 每个 option 加：
role="option"
aria-selected={selected}
// 方向键切换选项：
onKeyDown={(e) => {
  if (e.key === 'ArrowDown') { /* 选中下一个 */ }
  if (e.key === 'ArrowUp')   { /* 选中上一个 */ }
  if (e.key === 'Enter')     { /* 确认选择并关闭 */ }
}}
```

- [ ] **Step 6: 验证**

```bash
npm run lint    # 确认 jsx-a11y 规则生效，无新错误
npm run build   # 确认编译通过
```

---

### Task 7: 邮件模板

**Files:**
- Create: `src/lib/email-templates/layout.tsx`
- Create: `src/lib/email-templates/notification.tsx`
- Modify: `src/lib/email-service.ts`

- [ ] **Step 1: 安装 react-email**

```bash
npm install @react-email/components react-email
npm install -D @react-email/tailwind-config
```

- [ ] **Step 2: 创建邮件基础布局**

文件：`src/lib/email-templates/layout.tsx`

```typescript
import { Html, Body, Container, Head, Preview, Section, Text, Link, Img, Row, Column, Heading } from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  title: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* Header */}
          <Section style={headerStyle}>
            <Text style={headerTextStyle}>{title}</Text>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            {children}
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>
              此邮件由知识托管平台自动发送。如有疑问，请勿直接回复。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// 内联样式（邮件兼容性要求）
const bodyStyle = { backgroundColor: '#FAF9F5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', padding: '20px 0' };
const containerStyle = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#FFFFFF', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E8E3DA' };
const headerStyle = { padding: '24px', borderBottom: '1px solid #E8E3DA' };
const headerTextStyle = { margin: 0, fontSize: '18px', fontWeight: 700, color: '#3B3228' };
const contentStyle = { padding: '24px' };
const footerStyle = { padding: '16px 24px', borderTop: '1px solid #E8E3DA', backgroundColor: '#F5F2EC' };
const footerTextStyle = { margin: 0, fontSize: '12px', color: '#8B8680', textAlign: 'center' as const };
```

- [ ] **Step 3: 创建通知邮件模板**

文件：`src/lib/email-templates/notification.tsx`

```typescript
import { Section, Text, Link } from '@react-email/components';
import { EmailLayout } from './layout';

interface NotificationEmailProps {
  username: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationEmail({ username, title, body, actionUrl, actionLabel }: NotificationEmailProps) {
  return (
    <EmailLayout preview={title} title="通知">
      <Text style={{ fontSize: '16px', lineHeight: 1.6, color: '#3B3228', margin: '0 0 16px' }}>
        你好 {username}，
      </Text>
      <Text style={{ fontSize: '14px', lineHeight: 1.7, color: '#3B3228', margin: '0 0 20px' }}>
        {body}
      </Text>
      {actionUrl && actionLabel && (
        <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link
            href={actionUrl}
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              backgroundColor: '#C15F3C',
              color: '#FFFFFF',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 600,
            }}
          >
            {actionLabel}
          </Link>
        </Section>
      )}
    </EmailLayout>
  );
}
```

- [ ] **Step 4: 改造 email-service.ts——sendNotification 方法改用 React Email 渲染**

文件：`src/lib/email-service.ts`，新增 import：

```typescript
import { render } from '@react-email/render';
import { NotificationEmail } from './email-templates/notification';
```

在发送通知的方法中，将纯文本 body 替换为：

```typescript
const html = await render(
  <NotificationEmail
    username={toUsername}
    title="新通知"
    body={content}
    actionUrl={link}
    actionLabel="查看详情"
    />
);
await transporter.sendMail({ to, subject, html });
```

- [ ] **Step 5: 验证**

```bash
npm run build    # 确认 react-email 相关编译通过
```

---

## 第三阶段：渐进覆盖（后续）

### Task 8: 图片优化（Avatar → 全站 img）

**Files:**
- Modify: `src/components/design/Avatar.tsx`
- Modify: `next.config.js:15-39`（images.remotePatterns）

- [ ] **Step 1: Avatar 组件改用 next/image**

文件：`src/components/design/Avatar.tsx`

```typescript
import Image from 'next/image';

export function Avatar({ src, alt = '', size = 32, className = '' }: AvatarProps) {
  if (!src) {
    return (
      <div
        className={`rounded-full bg-[var(--ds-surface-subtle)] flex items-center justify-center text-[var(--ds-text-tertiary)] ${className}`}
        style={{ width: size, height: size }}
      >
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .66.54 1.2 1.2 1.2h16.8c.66 0 1.2-.54 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full object-cover ${className}`}
      unoptimized={src.startsWith('data:')}
    />
  );
}
```

- [ ] **Step 2: next.config.js 补 MinIO 域名**

```javascript
images: {
  remotePatterns: [
    // ... 现有配置 ...
    {
      protocol: process.env.S3_USE_SSL === 'true' ? 'https' : 'http',
      hostname: process.env.S3_ENDPOINT || 'localhost',
      port: process.env.S3_PORT || '9000',
    },
  ],
},
```

- [ ] **Step 3: 验证**

```bash
npm run build   # 确认 next/image 编译通过
# 打开任意有头像的页面，检查 Network 面板图片是否走 next/image 优化
```

---

### Task 9: PWA 基础

**Files:**
- Create: `public/manifest.json`
- Modify: `src/app/layout.tsx`
- Modify: `next.config.js`

- [ ] **Step 1: 创建 Web App Manifest**

文件：`public/manifest.json`

```json
{
  "name": "知识托管平台",
  "short_name": "托管",
  "description": "类 GitHub 文件托管与协作平台",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FAF9F5",
  "theme_color": "#C15F3C",
  "orientation": "any",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: layout.tsx 加 manifest 和 theme-color**

文件：`src/app/layout.tsx`，在现有 metadata 下加：

```typescript
export const metadata: Metadata = {
  // ... 现有配置 ...
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '知识托管平台',
    statusBarStyle: 'default',
  },
};

// viewport 补 themeColor：
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C15F3C',
};
```

- [ ] **Step 3: next.config.js 加 PWA 相关缓存头**

```javascript
// headers() 中追加 service worker 缓存：
{
  source: '/sw.js',
  headers: [{ key: 'Cache-Control', value: 'no-cache' }],
},
```

- [ ] **Step 4: 生成图标**

<!-- 用 canvas-design skill 生成 192×192 + 512×512 PNG 到 public/ -->

```bash
# 临时用纯色占位，后续替换为正式 logo
```

- [ ] **Step 5: 验证**

```bash
npm run build && npm run start
# Chrome DevTools → Application → Manifest，确认可识别
# Lighthouse PWA 评分应 > 70
```

---

## 验证清单

全部阶段完成后，运行：

```bash
npm run type-check          # TypeScript 0 错误
npm run lint                # ESLint ≤ 10 错误（均为功能性误报）
npm test                    # 新增测试通过
npm run build               # 构建成功
```

Lighthouse 评分目标：
- Performance ≥ 85
- Accessibility ≥ 85
- Best Practices ≥ 90
- SEO ≥ 90
