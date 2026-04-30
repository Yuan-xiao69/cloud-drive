'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { generateBreadcrumbs, createBreadcrumbs, BreadcrumbItem } from '@/lib/utils/breadcrumb';

/**
 * 全局面包屑 Hook
 * 
 * 根据当前路由自动生成面包屑
 * 
 * @example
 * ```tsx
 * function MyPage() {
 *   const breadcrumbs = useBreadcrumbs();
 *   
 *   return (
 *     <Breadcrumb items={breadcrumbs} />
 *   );
 * }
 * ```
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // 将 URLSearchParams 转换为普通对象
  const searchParamsObj = useMemo(() => {
    const params: Record<string, string> = {};
    if (searchParams) {
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    return params;
  }, [searchParams]);
  
  const breadcrumbs = useMemo(() => {
    return generateBreadcrumbs(pathname, searchParamsObj);
  }, [pathname, searchParamsObj]);
  
  return breadcrumbs;
}

/**
 * 自定义面包屑 Hook
 * 
 * 用于在特定页面创建自定义面包屑
 * 
 * @param customItems - 自定义面包屑项目
 * @param options - 可选配置
 * 
 * @example
 * ```tsx
 * function DiscussionDetailPage({ params }) {
 *   const breadcrumbs = useCustomBreadcrumbs([
 *     { label: '讨论', href: '/discussions' },
 *     { label: discussion.title, href: `/discussions/${params.id}` },
 *   ]);
 *   
 *   return (
 *     <Breadcrumb items={breadcrumbs} />
 *   );
 * }
 * ```
 */
export function useCustomBreadcrumbs(
  customItems: BreadcrumbItem[],
  options?: {
    prependHome?: boolean;
    homeLabel?: string;
    homeHref?: string;
  }
): BreadcrumbItem[] {
  const { prependHome = true, homeLabel = '首页', homeHref = '/' } = options || {};
  
  return useMemo(() => {
    const items: BreadcrumbItem[] = [];
    
    if (prependHome) {
      items.push({ label: homeLabel, href: homeHref });
    }
    
    items.push(...customItems);
    
    return items;
  }, [customItems, prependHome, homeLabel, homeHref]);
}

// 重新导出 createBreadcrumbs 以方便使用
export { createBreadcrumbs };
