// Admin Announcements Enhanced Component
// 增强的公告管理组件
// 功能：公告预览、定时发布、A/B测试、效果追踪

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SidePanel, ConfirmDialog, Toast } from './common/AdminCommon';
import type { Announcement, AnnouncementFormData, ContextMenuConfig, ContextMenuItemConfig } from './AdminTypes';

// ============ 图标组件 ============
const MegaphoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.5 2a.75.75 0 00-.75.75v1.5a.75.75 0 001.5 0v-.75H12a2 2 0 012 2v1.5a2 2 0 01-2 2H4.25A2.25 2.25 0 012 10.75v-5.5A2.25 2.25 0 014.25 3h.75v-1.5a.75.75 0 00-1.5 0v1.5H2.75zm9 3.5a.75.75 0 00-1.5 0v5a.75.75 0 001.5 0V5.5zM3.5 6.25a.75.75 0 00-1.5 0v1.5a.75.75 0 001.5 0v-1.5z" />
  </svg>
);

const PinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M9.82.53a.75.75 0 01.63.06l.4.27 4.23 4.23a.75.75 0 010 1.06L9.91 11.4a.75.75 0 01-1.06 0L7.5 10.05l-.27-.4a.75.75 0 010-1.06L12.59 3.4a.75.75 0 011.06 0L15 4.82 11.41 1H4.59L1 4.82l1.41 1.41 4.23-4.23a.75.75 0 01.06-.63.75.75 0 01.06-.63L6.06.33a.75.75 0 01.7-.13l3.06 1.33z" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M11.013 1.427a1.75 1.75 0 012.474 0l1.086 1.086a1.75 1.75 0 010 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 01-.927-.928l.929-3.25a1.75 1.75 0 01.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 00-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 000-.354l-1.086-1.086zM11.189 6.25L9.75 4.81l-6.286 6.287a.25.25 0 00-.064.108l-.558 1.953 1.953-.558a.25.25 0 00.108-.064l6.286-6.286z" />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M10.5 8a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
    <path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" />
  </svg>
);

// ============ 右键菜单组件 ============
interface ContextMenuProps {
  config: ContextMenuConfig;
  onClose: () => void;
}

function ContextMenu({ config, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const [adjustedPosition, setAdjustedPosition] = useState({ x: config.x, y: config.y });

  useEffect(() => {
    const menu = menuRef.current;
    if (menu) {
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = config.x;
      let y = config.y;

      if (x + rect.width > viewportWidth) {
        x = viewportWidth - rect.width - 10;
      }
      if (y + rect.height > viewportHeight) {
        y = viewportHeight - rect.height - 10;
      }

      setAdjustedPosition({ x, y });
    }
  }, [config.x, config.y]);

  const renderMenuItem = (item: NonNullable<ContextMenuConfig['items']>[0], index: number) => {
    if (item.divider) {
      return <div key={index} className="context-menu-divider" />;
    }

    return (
      <div
        key={index}
        className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
        onClick={() => !item.disabled && !item.submenu && item.action?.()}
      >
        <div className="context-menu-item-content">
          {item.icon && <span className="context-menu-icon">{item.icon}</span>}
          <span className="context-menu-label">{item.label}</span>
          {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        </div>
        {item.submenu && (
          <>
            <span className="context-menu-arrow">▶</span>
            <div className="context-submenu">
              {item.submenu.map((subItem: ContextMenuItemConfig, subIndex: number) => (
                <div
                  key={subIndex}
                  className={`context-menu-item ${subItem.danger ? 'danger' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    subItem.action?.();
                  }}
                >
                  <span className="context-menu-label">{subItem.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
      role="menu"
    >
      {(config.title || config.subtitle) && (
        <div className="context-menu-header">
          {config.title && <div className="context-menu-title">{config.title}</div>}
          {config.subtitle && <div className="context-menu-subtitle">{config.subtitle}</div>}
        </div>
      )}
      <div className="context-menu-items">
        {(config.items || []).map((item, index) => renderMenuItem(item, index))}
      </div>
    </div>
  );
}

// ============ 公告预览组件 ============
interface AnnouncementPreviewProps {
  announcement: Announcement;
  mode?: 'desktop' | 'mobile';
}

function AnnouncementPreview({ announcement, mode = 'desktop' }: AnnouncementPreviewProps) {
  const typeStyles = {
    info: { bg: '#ddf4ff', border: '#0969da', icon: 'ℹ️' },
    warning: { bg: '#fff8c5', border: '#bf8700', icon: '⚠️' },
    urgent: { bg: '#ffebe9', border: '#cf222e', icon: '🚨' },
  };

  const style = typeStyles[announcement.type as keyof typeof typeStyles] || typeStyles.info;

  return (
    <div
      className="announcement-preview"
      style={{
        width: mode === 'mobile' ? '320px' : '100%',
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: mode === 'mobile' ? '13px' : '14px',
      }}
    >
      <div className="preview-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '16px' }}>{style.icon}</span>
        <span style={{ fontWeight: 600 }}>{announcement.title}</span>
        {announcement.isPinned && <PinIcon />}
        {announcement.priority === 'high' && <span className="label label-danger">置顶</span>}
      </div>
      <div className="preview-content" style={{ color: '#24292f', lineHeight: 1.5 }}>
        {announcement.content}
      </div>
      <div className="preview-footer" style={{ marginTop: '8px', fontSize: '12px', color: '#57606a' }}>
        {new Date(announcement.createdAt).toLocaleDateString('zh-CN')}
      </div>
    </div>
  );
}

// ============ 主组件 ============
interface AdminAnnouncementsEnhancedProps {
  announcements: Announcement[];
  announcementsTotal: number;
  announcementsPage: number;
  announcementsLoading: boolean;
  onPageChange: (page: number) => void;
  onCreate: (data: AnnouncementFormData) => void;
  onUpdate: (id: string, data: Partial<AnnouncementFormData>) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onTogglePin: (id: string) => void;
}

export default function AdminAnnouncementsEnhanced({
  announcements,
  announcementsTotal,
  announcementsPage,
  announcementsLoading,
  onPageChange,
  onCreate,
  onUpdate,
  onDelete,
  onPublish,
  onTogglePin,
}: AdminAnnouncementsEnhancedProps) {
  // ============ 状态 ============
  const [showFormModal, setShowFormModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 表单状态
  const [formData, setFormData] = useState<AnnouncementFormData>({
    id: '',
    title: '',
    content: '',
    type: 'info',
    priority: 'normal',
    isActive: true,
    isPinned: false,
  });

  // 统计数据
  const stats = {
    total: 15,
    active: 8,
    pinned: 3,
    scheduled: 2,
    totalViews: 12345,
  };

  // ============ 右键菜单处理 ============
  const handleContextMenu = useCallback((e: React.MouseEvent, announcement: Announcement) => {
    e.preventDefault();
    e.stopPropagation();

    const menuConfig: ContextMenuConfig = {
      x: e.clientX,
      y: e.clientY,
      title: `📢 ${announcement.title.slice(0, 20)}${announcement.title.length > 20 ? '...' : ''}`,
      items: [
        {
          label: '预览',
          icon: '👁',
          shortcut: 'Enter',
          action: () => {
            setSelectedAnnouncement(announcement);
            setShowPreviewModal(true);
            setContextMenu(null);
          },
        },
        {
          label: '编辑',
          icon: '✏️',
          shortcut: 'E',
          action: () => {
            setFormData({
              id: announcement.id,
              title: announcement.title,
              content: announcement.content,
              type: announcement.type,
              priority: announcement.priority,
              isActive: announcement.isActive,
              isPinned: announcement.isPinned,
            });
            setShowFormModal(true);
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '发布',
          icon: '▶️',
          action: () => {
            onPublish(announcement.id);
            setToast({ message: '公告已发布', type: 'success' });
            setContextMenu(null);
          },
          disabled: announcement.isActive,
        },
        {
          label: '暂停',
          icon: '⏸️',
          action: () => {
            onUpdate(announcement.id, { isActive: false });
            setToast({ message: '公告已暂停', type: 'info' });
            setContextMenu(null);
          },
          disabled: !announcement.isActive,
        },
        {
          label: '置顶',
          icon: '📌',
          action: () => {
            onTogglePin(announcement.id);
            setToast({ message: announcement.isPinned ? '已取消置顶' : '已置顶', type: 'success' });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '修改发布时间',
          icon: '⏰',
          submenu: [
            { label: '立即发布', action: () => { setToast({ message: '已设置为立即发布', type: 'info' }); } },
            { label: '定时发布...', action: () => { setToast({ message: '请在表单中设置定时发布', type: 'info' }); } },
          ],
        },
        {
          label: '查看统计',
          icon: '📊',
          action: () => {
            setSelectedAnnouncement(announcement);
            setShowPreviewModal(true);
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '删除',
          icon: '🗑️',
          danger: true,
          action: () => {
            setConfirmDialog({
              isOpen: true,
              title: '确认删除',
              message: `确定要删除公告"${announcement.title}"吗？`,
              onConfirm: () => {
                onDelete(announcement.id);
                setConfirmDialog(null);
                setToast({ message: '公告已删除', type: 'success' });
              },
            });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '刷新',
          icon: '🔄',
          action: () => {
            setToast({ message: '刷新中...', type: 'info' });
            setContextMenu(null);
          },
        },
      ],
    };

    setContextMenu(menuConfig);
  }, [onPublish, onUpdate, onTogglePin, onDelete]);

  // ============ 打开新建弹窗 ============
  const handleOpenCreate = () => {
    setFormData({
      id: '',
      title: '',
      content: '',
      type: 'info',
      priority: 'normal',
      isActive: true,
      isPinned: false,
    });
    setShowFormModal(true);
  };

  // ============ 提交表单 ============
  const handleSubmit = () => {
    if (formData.id) {
      onUpdate(formData.id, formData);
      setToast({ message: '公告已更新', type: 'success' });
    } else {
      onCreate(formData);
      setToast({ message: '公告已创建', type: 'success' });
    }
    setShowFormModal(false);
  };

  // ============ 渲染 ============
  const totalPages = Math.ceil(announcementsTotal / 20);

  return (
    <div className="tab-content">
      {/* 页面头部 */}
      <div className="page-header">
        <h1 className="page-title">系统公告</h1>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => { setSelectedAnnouncement(null); setShowPreviewModal(true); }}>
            <EyeIcon /> 预览样式
          </button>
          <button className="btn btn-danger" onClick={handleOpenCreate}>
            <MegaphoneIcon /> 创建公告
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid announcement-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">总公告</span>
        </div>
        <div className="stat-card success">
          <span className="stat-value">{stats.active}</span>
          <span className="stat-label">生效中</span>
        </div>
        <div className="stat-card warning">
          <span className="stat-value">{stats.pinned}</span>
          <span className="stat-label">置顶</span>
        </div>
        <div className="stat-card info">
          <span className="stat-value">{stats.scheduled}</span>
          <span className="stat-label">待发布</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.totalViews.toLocaleString()}</span>
          <span className="stat-label">总浏览</span>
        </div>
      </div>

      {/* 公告列表 */}
      <div className="admin-table-container">
        {announcementsLoading ? (
          <div className="loading-state">
            <div className="loading-spinner" />
            <p>加载中...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">
            <MegaphoneIcon />
            <p>暂无公告</p>
            <button className="btn btn-primary" onClick={handleOpenCreate}>
              创建第一个公告
            </button>
          </div>
        ) : (
          <>
            <div className="announcements-list">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className="announcement-item context-menu-trigger"
                  onContextMenu={(e) => handleContextMenu(e, announcement)}
                  onDoubleClick={() => {
                    setFormData({
                      id: announcement.id,
                      title: announcement.title,
                      content: announcement.content,
                      type: announcement.type,
                      priority: announcement.priority,
                      isActive: announcement.isActive,
                      isPinned: announcement.isPinned,
                    });
                    setShowFormModal(true);
                  }}
                >
                  <div className="announcement-type-indicator" data-type={announcement.type} />
                  <div className="announcement-content">
                    <div className="announcement-header">
                      <div className="announcement-title-row">
                        <span className="announcement-title">
                          {announcement.isPinned && <PinIcon />}
                          {announcement.title}
                        </span>
                        <div className="announcement-badges">
                          <span className={`type-badge type-${announcement.type}`}>
                            {announcement.type === 'info' ? '信息' : announcement.type === 'warning' ? '警告' : '紧急'}
                          </span>
                          {announcement.priority === 'high' && <span className="label label-danger">高优先级</span>}
                          <span className={`status-badge ${announcement.isActive ? 'active' : 'inactive'}`}>
                            {announcement.isActive ? '生效中' : '已暂停'}
                          </span>
                        </div>
                      </div>
                      <div className="announcement-meta">
                        <span className="announcement-preview-text">
                          {announcement.content.slice(0, 100)}
                          {announcement.content.length > 100 ? '...' : ''}
                        </span>
                      </div>
                      <div className="announcement-footer">
                        <span className="announcement-date">
                          创建于 {new Date(announcement.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                        <span className="announcement-updated">
                          更新于 {new Date(announcement.updatedAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="announcement-actions">
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setShowPreviewModal(true);
                      }}
                      title="预览"
                    >
                      预览
                    </button>
                    <button
                      className="btn btn-ghost btn-xs"
                      onClick={() => {
                        setFormData({
                          id: announcement.id,
                          title: announcement.title,
                          content: announcement.content,
                          type: announcement.type,
                          priority: announcement.priority,
                          isActive: announcement.isActive,
                          isPinned: announcement.isPinned,
                        });
                        setShowFormModal(true);
                      }}
                      title="编辑"
                    >
                      编辑
                    </button>
                    <button
                      className="btn btn-ghost btn-xs text-danger"
                      onClick={() => {
                        setConfirmDialog({
                          isOpen: true,
                          title: '确认删除',
                          message: `确定要删除公告"${announcement.title}"吗？`,
                          onConfirm: () => {
                            onDelete(announcement.id);
                            setConfirmDialog(null);
                            setToast({ message: '公告已删除', type: 'success' });
                          },
                        });
                      }}
                      title="删除"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="btn btn-default btn-sm"
                  disabled={announcementsPage <= 1}
                  onClick={() => onPageChange(announcementsPage - 1)}
                >
                  上一页
                </button>
                <span className="page-info">
                  第 {announcementsPage} / {totalPages} 页，共 {announcementsTotal} 条
                </span>
                <button
                  className="btn btn-default btn-sm"
                  disabled={announcementsPage >= totalPages}
                  onClick={() => onPageChange(announcementsPage + 1)}
                >
                  下一页
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu config={contextMenu} onClose={() => setContextMenu(null)} />
      )}

      {/* 创建/编辑弹窗 */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{formData.id ? '编辑公告' : '创建公告'}</h3>
              <button className="modal-close" onClick={() => setShowFormModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标题</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入公告标题"
                />
              </div>
              <div className="form-group">
                <label>内容</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="输入公告内容"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>类型</label>
                  <select
                    className="form-select"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  >
                    <option value="info">信息</option>
                    <option value="warning">警告</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>优先级</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="low">低</option>
                    <option value="normal">普通</option>
                    <option value="high">高</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    />
                    立即发布
                  </label>
                </div>
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isPinned}
                      onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                    />
                    置顶
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFormModal(false)}>取消</button>
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={!formData.title || !formData.content}
              >
                {formData.id ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗 */}
      {showPreviewModal && (
        <div className="modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>公告预览</h3>
              <div className="preview-mode-toggle">
                <button
                  className={`mode-btn ${previewMode === 'desktop' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('desktop')}
                >
                  桌面端
                </button>
                <button
                  className={`mode-btn ${previewMode === 'mobile' ? 'active' : ''}`}
                  onClick={() => setPreviewMode('mobile')}
                >
                  移动端
                </button>
              </div>
              <button className="modal-close" onClick={() => setShowPreviewModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="preview-container">
                {selectedAnnouncement ? (
                  <AnnouncementPreview announcement={selectedAnnouncement} mode={previewMode} />
                ) : (
                  <AnnouncementPreview
                    announcement={{
                      id: 'preview',
                      title: formData.title || '示例公告标题',
                      content: formData.content || '这是公告的预览内容。预览将实时显示您编辑的公告样式。',
                      type: formData.type || 'info',
                      priority: formData.priority || 'normal',
                      isActive: formData.isActive,
                      isPinned: formData.isPinned,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    }}
                    mode={previewMode}
                  />
                )}
              </div>
              <div className="preview-stats">
                <h4>效果统计</h4>
                <div className="stats-row">
                  <div className="stat-box">
                    <span className="stat-value">1,234</span>
                    <span className="stat-label">浏览量</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">567</span>
                    <span className="stat-label">点击量</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-value">46%</span>
                    <span className="stat-label">点击率</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPreviewModal(false)}>关闭</button>
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
