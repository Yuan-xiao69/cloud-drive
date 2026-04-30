// Admin Notifications Enhanced Component
// 增强的通知管理组件
// 功能：群发功能增强、通知模板管理、发送统计

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SidePanel, ConfirmDialog, Toast } from './common/AdminCommon';
import type { AdminNotificationConfig, NotifyUser, ContextMenuConfig } from './AdminTypes';
import { apiRequest } from '@/lib/api-client';

// ============ 图标组件 ============
const BellIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16zM3 5a5 5 0 0110 0v3.785c0 .434.304.806.727.95.077.026.16.044.273.044.112 0 .196-.018.273-.044.423-.144.727-.516.727-.95V5a5 5 0 00-10 0V5zm3.5 7.735c.036-.206.226-.345.435-.345h3.25c.209 0 .399.139.435.345a.531.531 0 01-.07.919c-.047.02-.101.038-.157.038h-2.736a.53.53 0 01-.157-.038.53.53 0 01-.07-.919z" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2.05 2.05a.75.75 0 011.061 0l6.5 6.5a.75.75 0 11-1.06 1.06L4.97 6.03 11.47 12.53a.75.75 0 01-1.06 1.06l-7-7a.75.75 0 010-1.06l7-7a.75.75 0 011.06 1.06L6.03 4.97 2.05 8.95a.75.75 0 010-1.06zM12.44.76a.75.75 0 00-1.06 1.06l2.22 2.22-2.22 2.22a.75.75 0 101.06 1.06l2.94-2.94a.75.75 0 000-1.06l-2.94-2.94z" />
  </svg>
);

const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 5.5a3.5 3.5 0 115.898 2.549 5.507 5.507 0 011.725 3.902 3.5 3.5 0 11-6.135-4.502A3.5 3.5 0 012 5.5zm7 0a3.5 3.5 0 115.898 2.549 5.507 5.507 0 011.725 3.902 3.5 3.5 0 11-6.135-4.502A3.5 3.5 0 019 5.5z" />
    <path d="M5.5 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm0 1a3.5 3.5 0 110-7 3.5 3.5 0 010 7z" />
  </svg>
);

const TemplateIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M0 2.75C0 2.034.744 1.5 1.5 1.5h13c.756 0 1.5.534 1.5 1.25v10.5a.25.25 0 01-.25.25h-15a.25.25 0 01-.25-.25V2.75zm1.75-.75a.25.25 0 00-.25.25v1.5c0 .069.056.125.125.125h1.5a.25.25 0 00.25-.25v-1.5a.25.25 0 00-.25-.25h-1zm6.75.5v.25h3a.25.25 0 01.25.25v.25h-3.5v-.25c0-.069.056-.125.125-.125h3a.125.125 0 01.125.125zm3 0v.25h3a.25.25 0 01.25.25v.25h-3.5v-.25c0-.069.056-.125.125-.125h3a.125.125 0 01.125.125zM4 5.25a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5H4.75a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75zm0 3a.75.75 0 01.75-.75h6.5a.75.75 0 010 1.5h-6.5a.75.75 0 01-.75-.75z" />
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M4 11H2v3h2v-3zm5-4H7v7h2V7zm5-5h-2v12h2V2zm-2-1a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V2a1 1 0 00-1-1h-2zM6 7a1 1 0 011-1h2a1 1 0 011 1v7a1 1 0 01-1 1H7a1 1 0 01-1-1V7zm-5 4a1 1 0 011-1h2a1 1 0 011 1v3a1 1 0 01-1 1H2a1 1 0 01-1-1v-3z" />
  </svg>
);

// ============ 类型定义 ============

// 统计数据
interface NotificationStats {
  totalSent: number;
  successRate: number;
  avgOpenRate: number;
  avgClickRate: number;
  todaySent: number;
  weekSent?: number;
  unreadCount?: number;
  templatesCount: number;
}

// 通知模板类型
interface NotificationTemplate {
  id: string;
  name: string;
  type: 'system' | 'warning' | 'activity' | 'custom';
  title: string;
  content: string;
  variables: string[];
  usageCount: number;
  lastUsed?: string | null;
}

// 发送历史类型
interface NotificationHistory {
  id: string;
  title: string;
  content: string;
  type: 'all' | 'role' | 'user';
  targetCount: number;
  sentCount: number;
  failedCount: number;
  sentAt: string;
  sentBy: string;
}

// 历史记录分页响应
interface HistoryResponse {
  history: NotificationHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ 主组件 ============
interface AdminNotificationsEnhancedProps {
  notifications: AdminNotificationConfig[];
  notificationsTotal: number;
  notificationsPage: number;
  notificationsLoading: boolean;
  onPageChange: (page: number) => void;
  onSendNotification: (data: { title: string; content: string; type: string; targetRoles?: string[]; targetUserIds?: string[] }) => void;
  onDelete: (id: string) => void;
  onCreateTemplate?: (template: { name: string; title: string; content: string; type: string; variables: string[] }) => Promise<void>;
  onUpdateTemplate?: (id: string, template: { name?: string; title?: string; content?: string; type?: string; variables?: string[] }) => Promise<void>;
  onDeleteTemplate?: (id: string) => Promise<void>;
}

export default function AdminNotificationsEnhanced({
  notifications,
  notificationsTotal,
  notificationsPage,
  notificationsLoading,
  onPageChange,
  onSendNotification,
  onDelete,
  onCreateTemplate,
  onUpdateTemplate,
  onDeleteTemplate,
}: AdminNotificationsEnhancedProps) {
  // ============ 状态 ============
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'templates'>('send');
  const [showSendModal, setShowSendModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 发送表单状态
  const [sendForm, setSendForm] = useState({
    title: '',
    content: '',
    type: 'all' as 'all' | 'role' | 'user',
    targetRole: 'user',
    targetUsers: [] as string[],
    scheduledTime: '',
  });

  // 模板表单状态
  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    content: '',
    type: 'custom',
    variables: [] as string[],
  });

  // ============ API 数据状态 ============
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ============ 获取统计数据 ============
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await apiRequest<{ data: NotificationStats }>('/api/v1/admin/notifications/stats');
      if (data?.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('获取通知统计失败:', error);
      setToast({ message: '获取统计数据失败', type: 'error' });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ============ 获取模板列表 ============
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const data = await apiRequest<{ data: { templates: NotificationTemplate[] } }>('/api/v1/admin/notifications/templates');
      if (data?.data?.templates) {
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error('获取通知模板失败:', error);
      setToast({ message: '获取模板列表失败', type: 'error' });
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ============ 获取历史记录 ============
  const fetchHistory = useCallback(async (page: number = 1) => {
    setLoadingHistory(true);
    try {
      const data = await apiRequest<{ data: HistoryResponse }>(
        `/api/v1/admin/notifications/history?page=${page}&limit=20`
      );
      if (data?.data) {
        setHistory(data.data.history || []);
        setHistoryTotal(data.data.pagination?.total || 0);
        setHistoryPage(page);
      }
    } catch (error) {
      console.error('获取通知历史失败:', error);
      setToast({ message: '获取历史记录失败', type: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  // ============ 初始加载 ============
  useEffect(() => {
    fetchStats();
    fetchTemplates();
    fetchHistory();
  }, [fetchStats, fetchTemplates, fetchHistory]);

  // ============ Tab 切换时加载对应数据 ============
  useEffect(() => {
    if (activeTab === 'history' && history.length === 0) {
      fetchHistory(1);
    }
  }, [activeTab, history.length, fetchHistory]);

  // ============ 使用模板 ============
  const useTemplate = (template: NotificationTemplate) => {
    setSelectedTemplate(template);
    setSendForm({
      ...sendForm,
      title: template.title.replace(/\$\{(\w+)\}/g, `{${template.variables[0] || 'value'}}`),
      content: template.content,
    });
    setShowSendModal(true);
  };

  // ============ 提交发送 ============
  const handleSend = () => {
    onSendNotification({
      title: sendForm.title,
      content: sendForm.content,
      type: sendForm.type,
      targetRoles: sendForm.type === 'role' ? [sendForm.targetRole] : undefined,
      targetUserIds: sendForm.type === 'user' ? sendForm.targetUsers : undefined,
    });
    setShowSendModal(false);
    setToast({ message: '通知已加入发送队列', type: 'success' });
    // 刷新统计数据
    fetchStats();
    fetchHistory(1);
  };

  // ============ 历史分页 ============
  const handleHistoryPageChange = (page: number) => {
    fetchHistory(page);
  };

  // ============ 渲染 ============
  const historyTotalPages = Math.ceil(historyTotal / 20);

  return (
    <div className="tab-content">
      {/* 页面头部 */}
      <div className="page-header">
        <h1 className="page-title">通知管理</h1>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setShowSendModal(true)}>
            <SendIcon /> 发送通知
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="stats-grid notification-stats">
        <div className="stat-card">
          <span className="stat-value">
            {loadingStats ? '...' : (stats?.totalSent ?? 0).toLocaleString()}
          </span>
          <span className="stat-label">总发送量</span>
        </div>
        <div className="stat-card success">
          <span className="stat-value">
            {loadingStats ? '...' : `${stats?.successRate ?? 0}%`}
          </span>
          <span className="stat-label">成功率</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">
            {loadingStats ? '...' : `${stats?.avgOpenRate ?? 0}%`}
          </span>
          <span className="stat-label">平均打开率</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">
            {loadingStats ? '...' : `${stats?.avgClickRate ?? 0}%`}
          </span>
          <span className="stat-label">平均点击率</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {loadingStats ? '...' : stats?.todaySent ?? 0}
          </span>
          <span className="stat-label">今日发送</span>
        </div>
      </div>

      {/* Tab切换 */}
      <div className="notification-tabs">
        <button
          className={`tab-btn ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          <SendIcon /> 发送通知
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <ChartIcon /> 发送记录
        </button>
        <button
          className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          <TemplateIcon /> 通知模板
        </button>
      </div>

      {/* 发送通知 Tab */}
      {activeTab === 'send' && (
        <div className="send-panel">
          <div className="quick-send">
            <h3>快速发送</h3>
            <p className="text-muted">选择一个模板快速发送通知</p>

            {loadingTemplates ? (
              <div className="loading-placeholder">加载模板中...</div>
            ) : templates.length === 0 ? (
              <div className="empty-placeholder">暂无模板</div>
            ) : (
              <div className="template-grid">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="template-card"
                    onClick={() => useTemplate(template)}
                  >
                    <div className="template-icon">
                      {template.type === 'system' && '⚙️'}
                      {template.type === 'warning' && '⚠️'}
                      {template.type === 'activity' && '🎉'}
                      {template.type === 'custom' && '📝'}
                    </div>
                    <div className="template-info">
                      <span className="template-name">{template.name}</span>
                      <span className="template-usage">已使用 {template.usageCount} 次</span>
                    </div>
                    <button className="btn btn-primary btn-sm">使用</button>
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-secondary" onClick={() => setShowSendModal(true)}>
              <SendIcon /> 自定义发送
            </button>
          </div>
        </div>
      )}

      {/* 发送记录 Tab */}
      {activeTab === 'history' && (
        <div className="history-panel">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>标题</th>
                  <th>类型</th>
                  <th>目标</th>
                  <th>成功/失败</th>
                  <th>发送时间</th>
                  <th>操作人</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan={6} className="text-center">加载中...</td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">暂无发送记录</td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id}>
                      <td className="history-title">{item.title}</td>
                      <td>
                        <span className={`type-badge ${item.type}`}>
                          {item.type === 'all' ? '全体' : item.type === 'role' ? '角色' : '用户'}
                        </span>
                      </td>
                      <td>{item.targetCount.toLocaleString()} 人</td>
                      <td>
                        <span className="text-success">{item.sentCount}</span>
                        {item.failedCount > 0 && (
                          <span className="text-danger"> / {item.failedCount}</span>
                        )}
                      </td>
                      <td>{new Date(item.sentAt).toLocaleString('zh-CN')}</td>
                      <td>@{item.sentBy}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {historyTotalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-ghost"
                disabled={historyPage <= 1 || loadingHistory}
                onClick={() => handleHistoryPageChange(historyPage - 1)}
              >
                上一页
              </button>
              <span className="pagination-info">
                第 {historyPage} / {historyTotalPages} 页，共 {historyTotal} 条
              </span>
              <button
                className="btn btn-ghost"
                disabled={historyPage >= historyTotalPages || loadingHistory}
                onClick={() => handleHistoryPageChange(historyPage + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </div>
      )}

      {/* 通知模板 Tab */}
      {activeTab === 'templates' && (
        <div className="templates-panel">
          <div className="templates-header">
            <h3>通知模板</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowTemplateModal(true)}>
              <TemplateIcon /> 创建模板
            </button>
          </div>

          {loadingTemplates ? (
            <div className="loading-placeholder">加载模板中...</div>
          ) : templates.length === 0 ? (
            <div className="empty-placeholder">暂无模板，请创建第一个模板</div>
          ) : (
            <div className="templates-list">
              {templates.map((template) => (
                <div key={template.id} className="template-item">
                  <div className="template-item-header">
                    <span className={`type-badge ${template.type}`}>
                      {template.type === 'system' && '系统'}
                      {template.type === 'warning' && '警告'}
                      {template.type === 'activity' && '活动'}
                      {template.type === 'custom' && '自定义'}
                    </span>
                    <span className="template-name">{template.name}</span>
                    {template.lastUsed && (
                      <span className="template-last-used">
                        上次使用: {template.lastUsed}
                      </span>
                    )}
                  </div>
                  <div className="template-preview">
                    <div className="preview-title">
                      <strong>标题:</strong> {template.title}
                    </div>
                    <div className="preview-content">
                      <strong>内容:</strong> {template.content.slice(0, 100)}
                      {template.content.length > 100 && '...'}
                    </div>
                    {template.variables.length > 0 && (
                      <div className="preview-variables">
                        <strong>变量:</strong>
                        {template.variables.map((v) => (
                          <code key={v}>{`{${v}}`}</code>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="template-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => useTemplate(template)}
                    >
                      使用
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-ghost btn-sm text-danger"
                      onClick={async () => {
                        if (confirm(`确定要删除模板 "${template.name}" 吗？`)) {
                          if (onDeleteTemplate) {
                            await onDeleteTemplate(template.id);
                          } else {
                            try {
                              const res = await fetch(`/api/v1/admin/notification-templates/${template.id}`, {
                                method: 'DELETE',
                              });
                              if (res.ok) {
                                setToast({ message: '模板已删除', type: 'success' });
                                fetchTemplates();
                              }
                            } catch {
                              setToast({ message: '删除失败', type: 'error' });
                            }
                          }
                        }
                      }}
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 发送通知弹窗 */}
      {showSendModal && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>发送通知</h3>
              <button className="modal-close" onClick={() => setShowSendModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {selectedTemplate && (
                <div className="template-indicator">
                  <span>使用模板: {selectedTemplate.name}</span>
                  <button
                    className="btn btn-ghost btn-xs"
                    onClick={() => setSelectedTemplate(null)}
                  >
                    清除
                  </button>
                </div>
              )}
              <div className="form-group">
                <label>通知标题</label>
                <input
                  type="text"
                  className="form-control"
                  value={sendForm.title}
                  onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
                  placeholder="输入通知标题"
                />
              </div>
              <div className="form-group">
                <label>通知内容</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={sendForm.content}
                  onChange={(e) => setSendForm({ ...sendForm, content: e.target.value })}
                  placeholder="输入通知内容"
                />
              </div>
              <div className="form-group">
                <label>发送对象</label>
                <select
                  className="form-select"
                  value={sendForm.type}
                  onChange={(e) => setSendForm({ ...sendForm, type: e.target.value as any })}
                >
                  <option value="all">全体用户</option>
                  <option value="role">按角色</option>
                  <option value="user">指定用户</option>
                </select>
              </div>
              {sendForm.type === 'role' && (
                <div className="form-group">
                  <label>选择角色</label>
                  <select
                    className="form-select"
                    value={sendForm.targetRole}
                    onChange={(e) => setSendForm({ ...sendForm, targetRole: e.target.value })}
                  >
                    <option value="user">普通用户</option>
                    <option value="developer">开发者</option>
                    <option value="admin">管理员</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={!!sendForm.scheduledTime}
                    onChange={(e) => setSendForm({
                      ...sendForm,
                      scheduledTime: e.target.checked ? new Date(Date.now() + 3600000).toISOString().slice(0, 16) : '',
                    })}
                  />
                  定时发送
                </label>
                {sendForm.scheduledTime && (
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={sendForm.scheduledTime}
                    onChange={(e) => setSendForm({ ...sendForm, scheduledTime: e.target.value })}
                  />
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSendModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={!sendForm.title || !sendForm.content}
              >
                <SendIcon /> {sendForm.scheduledTime ? '定时发送' : '立即发送'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模板创建/编辑弹窗 */}
      {showTemplateModal && (
        <div className="modal-overlay" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); setTemplateForm({ name: '', title: '', content: '', type: 'custom', variables: [] }); }}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTemplate ? '编辑模板' : '创建模板'}</h3>
              <button className="modal-close" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>模板名称</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingTemplate ? editingTemplate.name : templateForm.name}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, name: e.target.value });
                    } else {
                      setTemplateForm({ ...templateForm, name: e.target.value });
                    }
                  }}
                  placeholder="输入模板名称"
                />
              </div>
              <div className="form-group">
                <label>模板类型</label>
                <select
                  className="form-select"
                  value={editingTemplate ? editingTemplate.type : templateForm.type}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, type: e.target.value });
                    } else {
                      setTemplateForm({ ...templateForm, type: e.target.value });
                    }
                  }}
                >
                  <option value="system">系统</option>
                  <option value="warning">警告</option>
                  <option value="activity">活动</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div className="form-group">
                <label>通知标题模板</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingTemplate ? editingTemplate.title : templateForm.title}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, title: e.target.value });
                    } else {
                      setTemplateForm({ ...templateForm, title: e.target.value });
                    }
                  }}
                  placeholder="使用 {变量名} 格式定义变量"
                />
              </div>
              <div className="form-group">
                <label>通知内容模板</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={editingTemplate ? editingTemplate.content : templateForm.content}
                  onChange={(e) => {
                    if (editingTemplate) {
                      setEditingTemplate({ ...editingTemplate, content: e.target.value });
                    } else {
                      setTemplateForm({ ...templateForm, content: e.target.value });
                    }
                  }}
                  placeholder="使用 {变量名} 格式定义变量"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setShowTemplateModal(false); setEditingTemplate(null); }}>取消</button>
              <button
                className="btn btn-primary"
                onClick={async () => {
                  const formData = editingTemplate || templateForm;
                  if (!formData.name || !formData.title || !formData.content) {
                    setToast({ message: '请填写完整信息', type: 'error' });
                    return;
                  }
                  try {
                    if (editingTemplate) {
                      if (onUpdateTemplate) {
                        await onUpdateTemplate(editingTemplate.id, editingTemplate);
                      } else {
                        const res = await fetch(`/api/v1/admin/notification-templates/${editingTemplate.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(editingTemplate),
                        });
                        if (!res.ok) throw new Error('更新失败');
                      }
                      setToast({ message: '模板已更新', type: 'success' });
                    } else {
                      if (onCreateTemplate) {
                        await onCreateTemplate(templateForm);
                      } else {
                        const res = await fetch('/api/v1/admin/notification-templates', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(templateForm),
                        });
                        if (!res.ok) throw new Error('创建失败');
                      }
                      setToast({ message: '模板已创建', type: 'success' });
                    }
                    setShowTemplateModal(false);
                    setEditingTemplate(null);
                    setTemplateForm({ name: '', title: '', content: '', type: 'custom', variables: [] });
                    fetchTemplates();
                  } catch (err) {
                    setToast({ message: '操作失败', type: 'error' });
                  }
                }}
              >
                {editingTemplate ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      {confirmDialog?.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText="确认"
          cancelText="取消"
          variant="danger"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}

      {/* Toast通知 */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
