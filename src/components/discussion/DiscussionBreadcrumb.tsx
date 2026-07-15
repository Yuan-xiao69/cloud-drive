'use client';

import React from 'react';
import Breadcrumb from '@/components/layout/Breadcrumb';
import { createBreadcrumbs } from '@/lib/hooks/use-breadcrumbs';

interface DiscussionBreadcrumbProps {
  discussionId: string;
  discussionTitle: string;
  category?: string;
}

/**
 * 讨论详情页面包屑
 */
export default function DiscussionBreadcrumb({ 
  discussionId, 
  discussionTitle,
  category 
}: DiscussionBreadcrumbProps) {
  const breadcrumbs = createBreadcrumbs([
    { label: '讨论', href: '/discussions' },
    ...(category ? [{ label: category }] : []),
    { label: discussionTitle || `讨论 #${discussionId.slice(0, 8)}` },
  ]);

  return (
    <div className="py-2">
      <Breadcrumb items={breadcrumbs} maxLength={40} />
    </div>
  );
}
