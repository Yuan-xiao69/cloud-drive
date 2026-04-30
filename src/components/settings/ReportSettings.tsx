'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { FlagIcon } from '@/components/icons/Icons';

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
      <div className="filter-tabs" style={{ marginBottom: '20px' }}>
        {['all', 'pending', 'resolved', 'dismissed'].map(status => (
          <button
            key={status}
            className={`filter-tab ${reportsStatus === status ? 'active' : ''}`}
            onClick={() => onStatusChange(status)}
          >
            {status === 'all' ? '全部' : status === 'pending' ? '待处理' : status === 'resolved' ? '已处理' : '已驳回'}
          </button>
        ))}
      </div>

      {reportsLoading ? (
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="empty-state">
          <FlagIcon />
          <p>暂无举报记录</p>
        </div>
      ) : (
        <>
          <div className="report-list">
            {reports.map(report => (
              <div key={report.id} className="report-item">
                <div className="report-info">
                  <span className="report-type label">{report.targetTypeLabel}</span>
                  <span className={`report-status label ${report.status}`}>
                    {report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已驳回'}
                  </span>
                </div>
                <div className="report-reason">
                  <span className="report-reason-text">{report.reason}</span>
                </div>
                {report.handlerNote && (
                  <div className="report-handler-note">
                    <span>处理备注：{report.handlerNote}</span>
                  </div>
                )}
                <div className="report-time">
                  {new Date(report.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {reportsTotal > 10 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={reportsPage === 1}
                onClick={() => onPageChange(Math.max(1, reportsPage - 1))}
              >
                上一页
              </button>
              <span className="pagination-info">
                第 {reportsPage} 页，共 {totalPages} 页
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={reportsPage >= totalPages}
                onClick={() => onPageChange(reportsPage + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </SettingsSection>
  );
}