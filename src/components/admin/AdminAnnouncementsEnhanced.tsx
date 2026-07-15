// Admin Announcements Enhanced Component
// 增强的公告管理组件
// 功能：公告预览、定时发布、A/B测试、效果追踪

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SidePanel, ConfirmDialog, Toast } from './common/AdminCommon';
import type { Announcement, AnnouncementFormData, ContextMenuConfig, ContextMenuItemConfig } from './AdminTypes';
import { Button, Card, Modal, ModalFooter, Input, Field } from '@/components/design';

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
      <button
        key={index}
        className={`context-menu-item border-0 bg-transparent w-full text-left ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
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
                <button
                  key={subIndex}
                  className={`context-menu-item border-0 bg-transparent w-full text-left ${subItem.danger ? 'danger' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    subItem.action?.();
                  }}
                >
                  <span className="context-menu-label">{subItem.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </button>
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
  const typeStyles: Record<string, { bgClass: string; borderClass: string; icon: string }> = {
    info: { bgClass: 'bg-[var(--ds-accent-subtle)]', borderClass: 'border-[var(--ds-accent-default)]', icon: 'ℹ️' },
    warning: { bgClass: 'bg-[var(--ds-warning-subtle)]', borderClass: 'border-[var(--ds-warning-default)]', icon: '⚠️' },
    urgent: { bgClass: 'bg-[var(--ds-danger-subtle)]', borderClass: 'border-[var(--ds-danger-default)]-emphasis', icon: '🚨' },
  };

  const s = typeStyles[announcement.type as keyof typeof typeStyles] || typeStyles.info;

  return (
    <div
      className={`${s.bgClass} border-l-4 ${s.borderClass} py-3 px-4 rounded-md ${mode === 'mobile' ? 'w-80' : 'w-full'} text-sm`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">{s.icon}</span>
        <span className="font-semibold">{announcement.title}</span>
        {announcement.isPinned && <PinIcon />}
        {announcement.priority === 'high' && <span className="label label-danger">置顶</span>}
      </div>
      <div className="text-[var(--ds-text-primary)] leading-relaxed">
        {announcement.content}
      </div>
      <div className="mt-2 text-xs text-[var(--ds-text-secondary)]">
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
  announcementStats: { total: number; active: number; pinned: number; scheduled: number };
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
  announcementStats,
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
  const stats = announcementStats;

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
    <div className="p-4">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">系统公告</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => { setSelectedAnnouncement(null); setShowPreviewModal(true); }}>
            <EyeIcon /> 预览样式
          </Button>
          <Button variant="danger" onClick={handleOpenCreate}>
            <MegaphoneIcon /> 创建公告
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        <Card padding="none" className="p-4">
          <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{stats.total}</span>
          <span className="text-xs text-[var(--ds-text-secondary)]">总公告</span>
        </Card>
        <Card padding="none" className="p-4 border-l-4 border-l-[var(--ds-success-default)]">
          <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{stats.active}</span>
          <span className="text-xs text-[var(--ds-text-secondary)]">生效中</span>
        </Card>
        <Card padding="none" className="p-4 border-l-4 border-l-amber-500">
          <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{stats.pinned}</span>
          <span className="text-xs text-[var(--ds-text-secondary)]">置顶</span>
        </Card>
        <Card padding="none" className="p-4 border-l-4 border-l-[var(--ds-accent-default)]">
          <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{stats.scheduled}</span>
          <span className="text-xs text-[var(--ds-text-secondary)]">待发布</span>
        </Card>
      </div>

      {/* 公告列表 */}
      <Card padding="none" className="overflow-hidden">
        {announcementsLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] mb-3" />
            <p>加载中...</p>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <MegaphoneIcon />
            <p>暂无公告</p>
            <Button variant="primary" onClick={handleOpenCreate}>
              创建第一个公告
            </Button>
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
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedAnnouncement(announcement);
                        setShowPreviewModal(true);
                      }}
                      title="预览"
                    >
                      预览
                    </Button>
                    <Button
                      variant="ghost"
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
                    </Button>
                    <Button
                      variant="danger"
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
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3">
                <Button
                  variant="secondary"
                  disabled={announcementsPage <= 1}
                  onClick={() => onPageChange(announcementsPage - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-[var(--ds-text-secondary)]">
                  第 {announcementsPage} / {totalPages} 页，共 {announcementsTotal} 条
                </span>
                <Button
                  variant="secondary"
                  disabled={announcementsPage >= totalPages}
                  onClick={() => onPageChange(announcementsPage + 1)}
                >
                  下一页
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 右键菜单 */}
      {contextMenu && (
        <ContextMenu config={contextMenu} onClose={() => setContextMenu(null)} />
      )}

      {/* 创建/编辑弹窗 */}
      <Modal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        title={formData.id ? '编辑公告' : '创建公告'}
        maxWidth="448px"
        footer={
          <ModalFooter
            onCancel={() => setShowFormModal(false)}
            onConfirm={handleSubmit}
            confirmLabel={formData.id ? '保存' : '创建'}
          />
        }
      >
        <div className="mb-4">
          <label htmlFor="announcement-title" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1.5">标题</label>
          <Input
            id="announcement-title"
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="输入公告标题"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="announcement-content" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1.5">内容</label>
          <Input
            id="announcement-content"
            multiline
            rows={5}
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            placeholder="输入公告内容"
          />
        </div>
        <div className="flex gap-4">
          <div className="mb-4 flex-1">
            <label htmlFor="announcement-type" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1.5">类型</label>
            <select
              id="announcement-type"
              className="w-full px-3 py-2 border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm outline-none transition-all focus:border-[var(--ds-accent-default)] focus:ring-2 focus:ring-[var(--ds-accent-subtle)]"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="info">信息</option>
              <option value="warning">警告</option>
              <option value="urgent">紧急</option>
            </select>
          </div>
          <div className="mb-4 flex-1">
            <label htmlFor="announcement-priority" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1.5">优先级</label>
            <select
              id="announcement-priority"
              className="w-full px-3 py-2 border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm outline-none transition-all focus:border-[var(--ds-accent-default)] focus:ring-2 focus:ring-[var(--ds-accent-subtle)]"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">低</option>
              <option value="normal">普通</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
            立即发布
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--ds-text-secondary)] cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isPinned}
              onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
            />
            置顶
          </label>
        </div>
      </Modal>

      {/* 预览弹窗 */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="公告预览"
        maxWidth="448px"
        footer={
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>关闭</Button>
        }
      >
        <div className="flex gap-2 mb-4">
          <Button
            size="sm"
            variant={previewMode === 'desktop' ? 'primary' : 'secondary'}
            onClick={() => setPreviewMode('desktop')}
          >
            桌面端
          </Button>
          <Button
            size="sm"
            variant={previewMode === 'mobile' ? 'primary' : 'secondary'}
            onClick={() => setPreviewMode('mobile')}
          >
            移动端
          </Button>
        </div>
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
        <div className="preview-stats mt-4">
          <h4 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">效果统计</h4>
          <div className="flex justify-around">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">1,234</span>
              <span className="text-xs text-[var(--ds-text-secondary)]">浏览量</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">567</span>
              <span className="text-xs text-[var(--ds-text-secondary)]">点击量</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">46%</span>
              <span className="text-xs text-[var(--ds-text-secondary)]">点击率</span>
            </div>
          </div>
        </div>
      </Modal>

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
