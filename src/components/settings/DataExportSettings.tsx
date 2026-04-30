'use client';

import React from 'react';
import SettingsSection from './SettingsSection';

interface DataExportSettingsProps {
  exporting: string | null;
  onExport: (type: 'all' | 'repos') => void;
}

export default function DataExportSettings({
  exporting,
  onExport
}: DataExportSettingsProps) {
  return (
    <SettingsSection 
      title="数据导出" 
      description="导出你的个人数据"
    >
      <div className="export-options">
        <div className="export-item">
          <div className="export-info">
            <h3 className="export-title">导出所有数据</h3>
            <p className="export-desc">
              包含你的个人资料、仓库、讨论等所有数据的压缩包
            </p>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => onExport('all')}
            disabled={exporting !== null}
          >
            {exporting === 'all' ? '导出中...' : '申请导出'}
          </button>
        </div>

        <div className="export-item">
          <div className="export-info">
            <h3 className="export-title">导出仓库列表</h3>
            <p className="export-desc">只导出你的仓库元数据（不含代码）</p>
          </div>
          <button 
            className="btn btn-secondary" 
            onClick={() => onExport('repos')}
            disabled={exporting !== null}
          >
            {exporting === 'repos' ? '导出中...' : '申请导出'}
          </button>
        </div>
      </div>

      <p className="export-note">
        导出申请提交后，需要 24-48 小时处理。完成后我们会发送邮件通知你。
      </p>
    </SettingsSection>
  );
}