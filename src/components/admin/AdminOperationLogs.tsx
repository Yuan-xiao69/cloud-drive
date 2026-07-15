// AdminOperationLogs - 合并 audit + activity-logs
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/design';
import AdminAuditLogsEnhanced from './AdminAuditLogsEnhanced';
import type { AdminAuditLogsEnhancedProps } from './AdminAuditLogsEnhanced';
import AdminActivityLogsEnhanced from './AdminActivityLogsEnhanced';
import type { AdminActivityLogsEnhancedProps } from './AdminActivityLogsEnhanced';

type SubTab = 'audit' | 'activity';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'audit', label: '审计日志' },
  { key: 'activity', label: '活动日志' },
];

type AnyProps = Record<string, unknown>;

interface Props {
  auditProps?: AnyProps;
  activityProps?: AnyProps;
}

export default function AdminOperationLogs({ auditProps = {}, activityProps = {} }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('audit');

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-[var(--ds-border-default)] pb-3">
        {SUB_TABS.map(tab => (
          <Button
            key={tab.key}
            variant={subTab === tab.key ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setSubTab(tab.key)}
          >
            {tab.label}
          </Button>
        ))}
      </div>
      {subTab === 'audit' && <AdminAuditLogsEnhanced {...auditProps as unknown as AdminAuditLogsEnhancedProps} />}
      {subTab === 'activity' && <AdminActivityLogsEnhanced {...activityProps as unknown as AdminActivityLogsEnhancedProps} />}
    </div>
  );
}
