'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { FlagIcon } from '@/components/icons/Icons';
import { Button, Card } from '@/components/design';

interface Report {
  id: string;
  targetTypeLabel: string;
  status: 'pending' | 'resolved' | 'dismissed';
  reason: string;
  handlerNote?: string;
  createdAt: string;
}

interface ReportSettingsProps {
  reports: Report[];
  reportsLoading: boolean;
  reportsStatus: string;
  reportsPage: number;
  reportsTotal: number;
  onStatusChange: (status: string) => void;
  onPageChange: (page: number) => void;
}

export default function ReportSettings({
  reports,
  reportsLoading,
  reportsStatus,
  reportsPage,
  reportsTotal,
  onStatusChange,
  onPageChange
}: ReportSettingsProps) {
  const totalPages = Math.ceil(reportsTotal / 10);

  return (
    <SettingsSection 
      title="我的举报" 
      description="查看你提交的举报记录"
    >
      {/* Status Filter */}
      <div className="flex gap-2 border-b border-[var(--ds-border-default)] pb-3 mb-5">
        {['all', 'pending', 'resolved', 'dismissed'].map(status => (
          <Button
            key={status}
            variant="ghost"
            size="sm"
            className={reportsStatus === status ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]' : ''}
            onClick={() => onStatusChange(status)}
          >
            {status === 'all' ? '全部' : status === 'pending' ? '待处理' : status === 'resolved' ? '已处理' : '已驳回'}
          </Button>
        ))}
      </div>

      {reportsLoading ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
          <p>加载中...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
          <FlagIcon />
          <p>暂无举报记录</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            {reports.map(report => (
              <Card key={report.id} variant="subtle">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm text-[var(--ds-text-secondary)]">{report.targetTypeLabel}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-xl ${
                    report.status === 'pending' ? 'bg-[var(--ds-warning-subtle)] text-[var(--ds-warning-default)]' :
                    report.status === 'resolved' ? 'bg-[var(--ds-success-subtle)] text-[var(--ds-success-default)]' :
                    'bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)]'
                  }`}>
                    {report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已驳回'}
                  </span>
                </div>
                <div className="text-[var(--ds-text-primary)] text-sm mb-2">
                  <span>{report.reason}</span>
                </div>
                {report.handlerNote && (
                  <div className="text-[var(--ds-text-secondary)] text-[13px] mb-2 p-2 bg-[var(--ds-surface-subtle)] rounded">
                    <span>处理备注：{report.handlerNote}</span>
                  </div>
                )}
                <div className="text-[var(--ds-text-secondary)] text-xs">
                  {new Date(report.createdAt).toLocaleString('zh-CN')}
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {reportsTotal > 10 && (
            <div className="flex items-center gap-3 mt-4">
              <Button variant="secondary" size="sm" disabled={reportsPage === 1} onClick={() => onPageChange(Math.max(1, reportsPage - 1))}>上一页</Button>
              <span className="text-sm text-[var(--ds-text-secondary)]">第 {reportsPage} 页，共 {totalPages} 页</span>
              <Button variant="secondary" size="sm" disabled={reportsPage >= totalPages} onClick={() => onPageChange(reportsPage + 1)}>下一页</Button>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}