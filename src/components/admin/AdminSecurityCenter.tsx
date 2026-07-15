// AdminSecurityCenter - 合并 security + ipblacklist
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/design';
import AdminSecurityEnhanced from './AdminSecurityEnhanced';
import type { AdminSecurityEnhancedProps } from './AdminSecurityEnhanced';
import AdminIpBlacklistEnhanced from './AdminIpBlacklistEnhanced';
import type { AdminIpBlacklistEnhancedProps } from './AdminIpBlacklistEnhanced';

type SubTab = 'events' | 'blacklist';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'events', label: '安全事件' },
  { key: 'blacklist', label: 'IP 黑名单' },
];

type AnyProps = Record<string, unknown>;

interface Props {
  eventsProps?: AnyProps;
  blacklistProps?: AnyProps;
}

export default function AdminSecurityCenter({ eventsProps = {}, blacklistProps = {} }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('events');

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
      {subTab === 'events' && <AdminSecurityEnhanced {...eventsProps as unknown as AdminSecurityEnhancedProps} />}
      {subTab === 'blacklist' && <AdminIpBlacklistEnhanced {...blacklistProps as unknown as AdminIpBlacklistEnhancedProps} />}
    </div>
  );
}
