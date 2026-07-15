// AdminUserDiscipline - 合并 bans + penalties + appeals
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/design';
import AdminBansEnhanced from './AdminBansEnhanced';
import type { AdminBansEnhancedProps } from './AdminBansEnhanced';
import AdminPenaltiesEnhanced from './AdminPenaltiesEnhanced';
import type { AdminPenaltiesEnhancedProps } from './AdminPenaltiesEnhanced';
import AdminAppealsEnhanced from './AdminAppealsEnhanced';
import type { AdminAppealsEnhancedProps } from './AdminAppealsEnhanced';

type SubTab = 'bans' | 'penalties' | 'appeals';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'bans', label: '封禁管理' },
  { key: 'penalties', label: '处罚管理' },
  { key: 'appeals', label: '申诉管理' },
];

type AnyProps = Record<string, unknown>;

interface Props {
  banProps?: AnyProps;
  penaltyProps?: AnyProps;
  appealProps?: AnyProps;
}

export default function AdminUserDiscipline({ banProps = {}, penaltyProps = {}, appealProps = {} }: Props) {
  const [subTab, setSubTab] = useState<SubTab>('bans');

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
      {subTab === 'bans' && <AdminBansEnhanced {...banProps as unknown as AdminBansEnhancedProps} />}
      {subTab === 'penalties' && <AdminPenaltiesEnhanced {...penaltyProps as unknown as AdminPenaltiesEnhancedProps} />}
      {subTab === 'appeals' && <AdminAppealsEnhanced {...appealProps as unknown as AdminAppealsEnhancedProps} />}
    </div>
  );
}
