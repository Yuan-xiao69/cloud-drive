import { BreadcrumbItem } from '@/components/layout/Breadcrumb';

// Re-export BreadcrumbItem type
export type { BreadcrumbItem };

/**
 * 路由配置类型
 */
interface RouteConfig {
  /** 路由模式: 'exact' 精确匹配, 'prefix' 前缀匹配, 'pattern' URL参数模式 */
  mode?: 'exact' | 'prefix' | 'pattern';
  /** 路径模式，如 '/discussions/:id' */
  path: string;
  /** 生成面包屑的函数 */
  generateBreadcrumbs: (params: Record<string, string>, searchParams?: Record<string, string>) => BreadcrumbItem[];
}

/**
 * 预定义的路由配置
 */
const ROUTE_CONFIGS: RouteConfig[] = [
  // 首页
  {
    mode: 'exact',
    path: '/',
    generateBreadcrumbs: () => [],
  },
  
  // 探索页
  {
    mode: 'exact',
    path: '/explore',
    generateBreadcrumbs: () => [
      { label: '探索' },
    ],
  },
  
  // 讨论区
  {
    mode: 'exact',
    path: '/discussions',
    generateBreadcrumbs: () => [
      { label: '讨论' },
    ],
  },
  
  // 创建讨论
  {
    mode: 'exact',
    path: '/discussions/new',
    generateBreadcrumbs: () => [
      { label: '讨论', href: '/discussions' },
      { label: '创建讨论' },
    ],
  },
  
  // 讨论详情
  {
    mode: 'pattern',
    path: '/discussions/:id',
    generateBreadcrumbs: (params, searchParams) => {
      const items: BreadcrumbItem[] = [
        { label: '讨论', href: '/discussions' },
      ];
      // 如果有 category 参数，显示分类
      if (searchParams?.category) {
        items.push({ label: searchParams.category });
      }
      items.push({ label: `讨论详情 #${params.id}` });
      return items;
    },
  },
  
  // 搜索页
  {
    mode: 'pattern',
    path: '/search',
    generateBreadcrumbs: (params, searchParams) => {
      const items: BreadcrumbItem[] = [
        { label: '探索', href: '/explore' },
      ];
      if (searchParams?.q) {
        items.push({ label: `搜索: ${searchParams.q}` });
      } else {
        items.push({ label: '搜索' });
      }
      return items;
    },
  },
  
  // 用户主页
  {
    mode: 'pattern',
    path: '/:username',
    generateBreadcrumbs: (params) => [
      { label: params.username },
    ],
  },
  
  // 仓库页面（概览）
  {
    mode: 'pattern',
    path: '/:username/:repoName',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName },
    ],
  },
  
  // 仓库代码浏览
  {
    mode: 'pattern',
    path: '/:username/:repoName/tree/:branch',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: params.branch },
    ],
  },
  
  // 仓库文件浏览（深层路径）
  {
    mode: 'pattern',
    path: '/:username/:repoName/tree/:branch/:path',
    generateBreadcrumbs: (params) => {
      const pathSegments = params.path?.split('/').filter(Boolean) || [];
      const items: BreadcrumbItem[] = [
        { label: params.username, href: `/${params.username}` },
        { label: params.repoName, href: `/${params.username}/${params.repoName}` },
        { label: params.branch, href: `/${params.username}/${params.repoName}/tree/${params.branch}` },
      ];
      
      // 添加路径面包屑（最多显示 3 层）
      let currentPath = '';
      const maxDisplay = 3;
      pathSegments.slice(0, maxDisplay).forEach((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === Math.min(pathSegments.length - 1, maxDisplay - 1);
        items.push({
          label: segment,
          href: isLast ? undefined : `/${params.username}/${params.repoName}/tree/${params.branch}${currentPath}`,
        });
      });
      
      // 如果路径过长，添加截断提示
      if (pathSegments.length > maxDisplay) {
        items.push({ label: '...' });
      }
      
      return items;
    },
  },
  
  // 仓库文件预览
  {
    mode: 'pattern',
    path: '/:username/:repoName/blob/:branch/:path',
    generateBreadcrumbs: (params) => {
      const pathSegments = params.path?.split('/').filter(Boolean) || [];
      const items: BreadcrumbItem[] = [
        { label: params.username, href: `/${params.username}` },
        { label: params.repoName, href: `/${params.username}/${params.repoName}` },
        { label: '代码', href: `/${params.username}/${params.repoName}/tree/${params.branch}` },
      ];
      
      // 添加路径面包屑
      let currentPath = '';
      const maxDisplay = 3;
      const displaySegments = pathSegments.slice(0, -1); // 不显示文件名
      displaySegments.slice(0, maxDisplay).forEach((segment, index) => {
        currentPath += `/${segment}`;
        items.push({
          label: segment,
          href: `/${params.username}/${params.repoName}/tree/${params.branch}${currentPath}`,
        });
      });
      
      // 添加文件名
      const fileName = pathSegments[pathSegments.length - 1];
      if (fileName) {
        items.push({ label: fileName });
      }
      
      return items;
    },
  },
  
  // Issues 列表
  {
    mode: 'pattern',
    path: '/:username/:repoName/issues',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: 'Issues' },
    ],
  },
  
  // Issue 详情
  {
    mode: 'pattern',
    path: '/:username/:repoName/issues/:issueNumber',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: 'Issues', href: `/${params.username}/${params.repoName}/issues` },
      { label: `#${params.issueNumber}` },
    ],
  },
  
  // 合并请求列表
  {
    mode: 'pattern',
    path: '/:username/:repoName/pulls',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: '合并请求' },
    ],
  },
  
  // 合并请求详情
  {
    mode: 'pattern',
    path: '/:username/:repoName/pulls/:prId',
    generateBreadcrumbs: (params) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: '合并请求', href: `/${params.username}/${params.repoName}/pulls` },
      { label: `#${params.prId}` },
    ],
  },
  
  // 仓库设置
  {
    mode: 'pattern',
    path: '/:username/:repoName/settings',
    generateBreadcrumbs: (params, searchParams) => [
      { label: params.username, href: `/${params.username}` },
      { label: params.repoName, href: `/${params.username}/${params.repoName}` },
      { label: searchParams?.tab || '设置' },
    ],
  },
  
  // 设置页面
  {
    mode: 'pattern',
    path: '/settings',
    generateBreadcrumbs: (params, searchParams) => {
      const items: BreadcrumbItem[] = [
        { label: '设置' },
      ];
      if (searchParams?.tab) {
        items.push({ label: searchParams.tab });
      }
      return items;
    },
  },
  
  // 创建仓库
  {
    mode: 'exact',
    path: '/new',
    generateBreadcrumbs: () => [
      { label: '创建仓库' },
    ],
  },
  
  // 通知页面
  {
    mode: 'exact',
    path: '/notifications',
    generateBreadcrumbs: () => [
      { label: '通知' },
    ],
  },
  
  // 管理面板
  {
    mode: 'pattern',
    path: '/admin',
    generateBreadcrumbs: (params, searchParams) => {
      const items: BreadcrumbItem[] = [
        { label: '首页', href: '/' },
        { label: '管理面板' },
      ];
      if (searchParams?.tab) {
        const tabNames: Record<string, string> = {
          dashboard: '仪表盘',
          users: '用户管理',
          repos: '仓库管理',
          discussions: '讨论区',
          reports: '举报处理',
          audit: '审计日志',
          penalties: '处罚管理',
          appeals: '申诉中心',
          announcements: '系统公告',
          security: '安全中心',
          ipblacklist: 'IP黑名单',
          email: '邮件设置',
          database: '数据库',
          notifications: '通知管理',
          stats: '数据统计',
          settings: '系统配置',
          hidden: '隐藏内容',
          activity: '活动日志',
        };
        const tabName = tabNames[searchParams.tab] || searchParams.tab;
        items.push({ label: tabName });
      }
      return items;
    },
  },
];

/**
 * 从 URL 路径中提取参数
 */
function extractParams(pathname: string, pattern: string): Record<string, string> | null {
  const pathSegments = pathname.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);
  
  if (pathSegments.length !== patternSegments.length) {
    return null;
  }
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternSegments.length; i++) {
    const patternSeg = patternSegments[i];
    const pathSeg = pathSegments[i];
    
    if (patternSeg.startsWith(':')) {
      // URL 参数
      params[patternSeg.slice(1)] = pathSeg;
    } else if (patternSeg !== pathSeg) {
      // 不匹配
      return null;
    }
  }
  
  return params;
}

/**
 * 从 URL 路径中提取路径通配符参数（用于 /tree/branch/path/to/file）
 */
function extractPathParams(pathname: string, basePattern: string): Record<string, string> | null {
  const pathSegments = pathname.split('/').filter(Boolean);
  const baseSegments = basePattern.split('/').filter(Boolean);
  
  if (pathSegments.length < baseSegments.length) {
    return null;
  }
  
  const params: Record<string, string> = {};
  
  // 匹配基础部分
  for (let i = 0; i < baseSegments.length; i++) {
    const patternSeg = baseSegments[i];
    const pathSeg = pathSegments[i];
    
    if (patternSeg.startsWith(':')) {
      params[patternSeg.slice(1)] = pathSeg;
    } else if (patternSeg !== pathSeg) {
      return null;
    }
  }
  
  // 提取剩余路径
  const remainingPath = pathSegments.slice(baseSegments.length).join('/');
  if (remainingPath) {
    params.path = remainingPath;
  }
  
  return params;
}

/**
 * 根据当前路径生成面包屑
 * 
 * @param pathname - 当前路径（如 '/discussions/123'）
 * @param searchParams - URL 搜索参数对象
 * @returns 面包屑项目数组
 * 
 * @example
 * ```ts
 * const breadcrumbs = generateBreadcrumbs('/discussions/123', {});
 * // [{ label: '讨论', href: '/discussions' }, { label: '讨论详情 #123' }]
 * ```
 */
export function generateBreadcrumbs(
  pathname: string,
  searchParams: Record<string, string> = {}
): BreadcrumbItem[] {
  if (!pathname) return [];

  // 清理路径
  pathname = pathname.startsWith('/') ? pathname : `/${pathname}`;

  // 1. 优先尝试精确匹配
  const exactMatch = ROUTE_CONFIGS.find(
    config => config.mode === 'exact' && config.path === pathname
  );
  if (exactMatch) {
    return exactMatch.generateBreadcrumbs({}, searchParams);
  }

  // 2. 尝试前缀匹配
  const prefixMatch = ROUTE_CONFIGS.find(
    config => config.mode === 'prefix' && pathname.startsWith(config.path)
  );
  if (prefixMatch) {
    return prefixMatch.generateBreadcrumbs({}, searchParams);
  }

  // 3. 尝试 URL 参数模式匹配（按长度倒序排列，优先匹配更具体的路由）
  const patternConfigs = ROUTE_CONFIGS
    .filter(config => config.mode === 'pattern')
    .sort((a, b) => {
      // 按路径段数降序排列
      const aSegments = a.path.split('/').filter(Boolean).length;
      const bSegments = b.path.split('/').filter(Boolean).length;
      return bSegments - aSegments;
    });

  for (const config of patternConfigs) {
    // 检查是否是路径通配符模式（如 /tree/branch/:path）
    if (config.path.includes('/:path') || config.path.includes('/:path*')) {
      const basePath = config.path.replace(/(:\w+(\?)?|\/:path\*?)$/, '');
      if (pathname.startsWith(basePath)) {
        const params = extractPathParams(pathname, config.path.replace(/:path\*?/, ':path'));
        if (params) {
          return config.generateBreadcrumbs(params, searchParams);
        }
      }
    } else {
      const params = extractParams(pathname, config.path);
      if (params) {
        return config.generateBreadcrumbs(params, searchParams);
      }
    }
  }

  // 4. 兜底：解析路径作为面包屑
  const segments = pathname.split('/').filter(Boolean);
  const fallback: BreadcrumbItem[] = [];
  
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    fallback.push({
      label: segment,
      href: isLast ? undefined : '/' + segments.slice(0, index + 1).join('/'),
    });
  });
  
  return fallback;
}

/**
 * 创建自定义面包屑的帮助函数
 * 
 * @example
 * ```tsx
 * // 在讨论详情页
 * const breadcrumbs = useBreadcrumbs([
 *   { label: '讨论', href: '/discussions' },
 *   { label: discussion.title, href: `/discussions/${id}` },
 * ]);
 * 
 * // 在仓库文件页
 * const breadcrumbs = useBreadcrumbs([
 *   { label: owner, href: `/${owner}` },
 *   { label: repo, href: `/${owner}/${repo}` },
 *   { label: 'src', href: `/${owner}/${repo}/tree/main/src` },
 *   { label: fileName },
 * ]);
 * ```
 */
export function createBreadcrumbs(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return items;
}

// 导出类型
export type { RouteConfig };
