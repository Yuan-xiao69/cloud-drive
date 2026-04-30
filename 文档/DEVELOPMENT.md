# 开发规范

> 本文档定义项目的代码规范、开发流程和质量检查清单。

---

## 目录

- [代码规范](#代码规范)
- [命名规范](#命名规范)
- [Git 工作流](#git-工作流)
- [提交规范](#提交规范)
- [质量检查清单](#质量检查清单)
- [安全开发准则](#安全开发准则)

---

## 代码规范

### TypeScript 规范

#### 严格模式

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

#### 类型定义

```typescript
// ✅ 正确：完整的类型定义
interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
  createdAt: Date;
}

// ✅ 正确：使用类型别名
type UserRole = 'user' | 'admin' | 'super_admin';
type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ❌ 错误：使用 any
function processData(data: any) {
  return data.value; // 危险！
}
```

#### 接口与类型

```typescript
// ✅ 优先使用 interface（可扩展）
interface Config {
  apiUrl: string;
  timeout: number;
}

// ✅ 类型用于联合类型和映射类型
type Status = 'pending' | 'approved' | 'rejected';
type PartialConfig = Partial<Config>;
```

### React 规范

#### 组件定义

```typescript
// ✅ 正确：使用函数组件 + TypeScript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  children,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

#### Hooks 规范

```typescript
// ✅ 正确：Hooks 放在组件顶部
function UserProfile({ userId }: { userId: string }) {
  // 1. Hooks
  const { data: user, isLoading } = useSWR(`/api/users/${userId}`);
  const [isEditing, setIsEditing] = useState(false);

  // 2. 条件渲染
  if (isLoading) return <LoadingSkeleton />;
  if (!user) return <NotFound />;

  // 3. JSX
  return (
    <div>
      <h1>{user.username}</h1>
      {isEditing && <EditForm />}
    </div>
  );
}
```

#### 状态管理

```typescript
// ✅ 正确：使用 useReducer 处理复杂状态
interface State {
  users: User[];
  selectedId: string | null;
  filter: UserFilter;
}

type Action =
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SELECT_USER'; payload: string }
  | { type: 'SET_FILTER'; payload: UserFilter };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_USERS':
      return { ...state, users: action.payload };
    case 'SELECT_USER':
      return { ...state, selectedId: action.payload };
    default:
      return state;
  }
}
```

### 代码格式化

```bash
# 使用 Prettier 格式化
npm run format

# 检查格式
npm run format:check
```

#### ESLint 规则

```yaml
# .eslintrc.yml
rules:
  # TypeScript
  '@typescript-eslint/no-explicit-any': error
  '@typescript-eslint/no-unused-vars':
    - error
    - argsIgnorePattern: '^_'
      varsIgnorePattern: '^_'
  '@typescript-eslint/explicit-function-return-type': off

  # React
  'react/react-in-jsx-scope': off
  'react/prop-types': off
  'react-hooks/rules-of-hooks': error

  # 代码质量
  'no-console': warn
  'no-debugger': error
  'prefer-const': error
  'no-var': error
```

---

## 命名规范

### 文件命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 页面组件 | `kebab-case/page-name/page-name.tsx` | `settings/profile/page.tsx` |
| 通用组件 | `PascalCase.tsx` | `UserCard.tsx`, `Modal.tsx` |
| 工具函数 | `kebab-case.ts` | `api-client.ts`, `date-utils.ts` |
| 类型定义 | `kebab-case.ts` | `user-types.ts` |
| 测试文件 | `*.test.ts` 或 `*.spec.ts` | `user.test.ts` |

### 组件命名

```typescript
// ✅ 正确：PascalCase
export function UserProfile() {}
export function RepoFileList() {}

// ❌ 错误：小写或 kebab-case
export function userProfile() {}
export function repo-file-list() {}
```

### 函数命名

```typescript
// ✅ 正确：camelCase，描述性名称
function fetchUserData() {}
function calculateTotalPrice() {}
function handleFormSubmit() {}

// ❌ 错误：缩写或模糊名称
function getU() {}
function calc() {}
function submit() {}
```

### 常量命名

```typescript
// ✅ 正确：UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const API_BASE_URL = '/api';
const ALLOWED_EXTENSIONS = ['.jpg', '.png', '.gif'];

// ❌ 错误：小写或无描述
const maxfilesize = 100 * 1024 * 1024;
const API_URL = '/api';
```

### API 命名

| 类型 | 规范 | 示例 |
|------|------|------|
| API 路由 | `kebab-case` | `/api/user-profile`, `/api/repo-files` |
| API 端点函数 | `camelCase` | `getUserProfile`, `createRepoFile` |
| 请求函数 | `fetch/load/get + 资源名` | `fetchUsers`, `loadUserData` |

---

## Git 工作流

### 分支命名

```
<type>/<issue-number>-<short-description>

# 示例
feat/123-add-user-avatar
fix/456-login-redirect-bug
docs/789-update-readme
refactor/101-improve-api-client
```

### 开发流程

```bash
# 1. 确保 main 分支最新
git checkout main
git pull origin main

# 2. 创建功能分支
git checkout -b feat/123-add-user-avatar

# 3. 开发并提交
git add .
git commit -m "feat(user): 添加用户头像上传功能"

# 4. 保持分支更新
git fetch origin
git rebase origin/main

# 5. 推送分支
git push -u origin feat/123-add-user-avatar

# 6. 创建 Pull Request
# 在 GitHub/Gitea 平台创建 PR

# 7. 代码审查后合并
# 使用 Squash and merge 保持提交历史整洁
```

### 合并策略

```bash
# 合并前确保通过所有检查
git fetch origin
git checkout main
git pull

# 合并分支
git merge --no-ff feat/123-feature

# 解决冲突后提交
git add .
git commit -m "merge: 合并 feat/123-feature"

# 推送
git push origin main
```

---

## 提交规范

### 提交信息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构（不是新功能也不是修复） |
| `test` | 测试相关 |
| `chore` | 构建/工具相关 |
| `perf` | 性能优化 |
| `ci` | CI/CD 相关 |

### Scope 范围

| 范围 | 说明 |
|------|------|
| `auth` | 认证相关 |
| `user` | 用户相关 |
| `repo` | 仓库相关 |
| `api` | API 相关 |
| `ui` | UI 组件 |
| `db` | 数据库相关 |
| `security` | 安全相关 |
| `docs` | 文档相关 |

### 提交示例

```bash
# 功能提交
feat(user): 添加用户头像上传功能

实现用户上传头像功能：
- 支持 JPG/PNG/GIF/WebP 格式
- 最大文件大小 5MB
- 头像尺寸验证 (50x50 - 4096x4096)
- 使用 Magic Bytes 验证文件类型

Closes #123

---

# Bug 修复
fix(auth): 修复登录后 Token 丢失问题

问题：刷新页面后用户登录状态丢失
原因：Token 存储在 localStorage 但读取逻辑有误
修复：修正 Token 读取逻辑，确保 httpOnly cookie 优先级

Fixes #456

---

# 文档更新
docs(readme): 更新项目文档

- 添加功能特性列表
- 添加部署指南链接
- 更新技术栈说明

---

# 重构
refactor(api): 重构 API 错误处理

- 统一错误响应格式
- 添加错误码定义
- 改善错误提示信息
```

---

## 质量检查清单

### 功能开发检查清单

#### 代码规范

- [ ] 遵循 ESLint 规则，无 error
- [ ] 遵循 TypeScript 严格模式，无 `any` 类型
- [ ] 遵循命名规范（文件、组件、函数、变量）
- [ ] 添加必要的 JSDoc 注释
- [ ] 无 console.log（调试代码已清理）
- [ ] 代码格式化通过 (`npm run format:check`)

#### 功能实现

- [ ] 功能完整实现，符合需求
- [ ] 有适当的错误处理
- [ ] 有必要的类型定义
- [ ] 有 loading 状态
- [ ] 有空状态处理
- [ ] 有边界情况处理（空数据、错误状态）

#### API 实现

- [ ] API 响应格式统一
- [ ] HTTP 状态码正确
- [ ] 错误信息清晰
- [ ] 有必要的验证
- [ ] 有速率限制（敏感 API）
- [ ] 有 CSRF 保护（状态变更 API）
- [ ] 有 XSS 防护（用户输入处理）

#### 测试

- [ ] 有必要的单元测试
- [ ] 测试覆盖核心逻辑
- [ ] 测试边界情况
- [ ] 测试通过 (`npm test`)

#### 安全

- [ ] 无敏感信息泄露
- [ ] SQL 注入防护
- [ ] XSS 防护
- [ ] CSRF 防护
- [ ] 文件上传安全验证
- [ ] 权限检查正确

### PR 检查清单

- [ ] PR 标题符合规范
- [ ] PR 描述完整（做了什么、为什么做、怎么做）
- [ ] 所有检查通过
- [ ] 无合并冲突
- [ ] 分支已更新到最新
- [ ] 相关文档已更新

---

## 安全开发准则

> 严格遵守用户编程准则，不得使用下位代替方案

### 用户输入处理

```typescript
// ✅ 正确：使用 DOMPurify 进行 XSS 防护
import DOMPurify from 'isomorphic-dompurify';

function sanitizeUserInput(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href'],
  });
}

// ❌ 错误：简单的字符串替换
function sanitize(html: string) {
  return html.replace(/<script>/g, ''); // 不安全！
}
```

### 文件上传

```typescript
// ✅ 正确：多层验证
async function validateUpload(file: File) {
  // 1. MIME 类型检查
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('不支持的文件类型');
  }

  // 2. 扩展名检查
  if (!validateExtension(file.name)) {
    throw new Error('不支持的文件扩展名');
  }

  // 3. 文件大小检查
  if (file.size > MAX_SIZE) {
    throw new Error('文件过大');
  }

  // 4. Magic Bytes 检查
  const buffer = await file.arrayBuffer();
  const detectedType = await detectMagicBytes(buffer);
  if (detectedType !== file.type) {
    throw new Error('文件类型与声明不符');
  }

  // 5. 内容安全扫描
  await scanForMalware(buffer);

  return true;
}
```

### 敏感操作

```typescript
// ✅ 正确：敏感操作需要二次验证
async function deleteAccount(req: Request, password: string) {
  // 1. 验证密码
  const isValid = await verifyPassword(req.user.id, password);
  if (!isValid) {
    throw new Error('密码验证失败');
  }

  // 2. 确认操作
  if (!req.body.confirmText?.includes('确认删除')) {
    throw new Error('需要明确确认操作');
  }

  // 3. 记录审计日志
  await createAuditLog({
    action: 'DELETE_ACCOUNT',
    userId: req.user.id,
    timestamp: new Date(),
  });

  // 4. 执行删除
  return await deleteUserAccount(req.user.id);
}
```

### 禁止事项

| 禁止 | 原因 | 替代方案 |
|------|------|---------|
| `any` 类型 | 类型安全降级 | 使用具体类型或 `unknown` |
| `eval()` | 安全风险 | 使用 `Function()` 或 AST |
| 拼接 SQL | SQL 注入 | 使用参数化查询 (Prisma) |
| 简单字符串转义 | XSS 风险 | 使用 DOMPurify |
| 硬编码密钥 | 安全风险 | 环境变量 |
| 空 catch 块 | 隐藏错误 | 记录错误或重新抛出 |

---

## 性能优化

### 组件优化

```typescript
// ✅ 正确：使用 React.memo 优化
const UserCard = React.memo(function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>;
});

// ✅ 正确：使用 useMemo 缓存计算
function ExpensiveComponent({ data }: { data: Data[] }) {
  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b.value - a.value);
  }, [data]);

  return <List items={sorted} />;
}

// ✅ 正确：使用 useCallback 稳定引用
function Parent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);

  return <Child onClick={handleClick} />;
}
```

### 数据加载

```typescript
// ✅ 正确：使用 SWR 进行数据获取和缓存
const { data, error, isLoading } = useSWR('/api/users', fetcher, {
  revalidateOnFocus: false,
  dedupingInterval: 5000,
});
```

### 列表渲染

```typescript
// ✅ 正确：虚拟滚动处理大列表
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
  });

  return (
    <div ref={parentRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div key={virtualRow.key} style={{ transform: `translateY(${virtualRow.start}px)` }}>
            <Item item={items[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 测试规范

### 单元测试

```typescript
// user-utils.test.ts
import { describe, it, expect } from 'vitest';
import { validateUsername, validateEmail } from './user-utils';

describe('validateUsername', () => {
  it('应该接受有效的用户名', () => {
    expect(validateUsername('john_doe').valid).toBe(true);
    expect(validateUsername('user123').valid).toBe(true);
  });

  it('应该拒绝以数字开头的用户名', () => {
    const result = validateUsername('123user');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('用户名不能以数字开头');
  });

  it('应该拒绝非法字符', () => {
    const result = validateUsername('user@name');
    expect(result.valid).toBe(false);
  });
});
```

### API 测试

```typescript
// discussions.test.ts
import { describe, it, expect } from 'vitest';

describe('Discussions API', () => {
  it('POST /api/discussions 应该创建讨论', async () => {
    const response = await fetch('/api/discussions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Test Discussion',
        content: 'Test content',
        repoId: 'test-repo-id',
      }),
    });

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Test Discussion');
  });
});
```

---

## 相关文档

- [项目状态](./_项目状态.md)
- [待办清单](./_待办清单.md)
- [详细实施方案](./_详细实施方案.txt)
- [仓库系统重构方案](./_仓库系统重构方案.txt)
- [部署指南](./DEPLOY.md)
