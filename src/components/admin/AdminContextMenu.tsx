// 统一右键菜单设计规范
// Unified Context Menu Design Specification
// 参考 GitHub Admin 设计

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  EyeIcon, 
  EditIcon, 
  TrashIcon, 
  BanIcon,
  MuteIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MailIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldIcon,
  LockIcon,
  UnlockIcon,
  PinIcon,
  StarIcon,
  ArchiveIcon,
  EyeOffIcon,
  SendIcon,
  BellIcon,
  FlagIcon,
  HistoryIcon,
  SettingsIcon,
  RefreshCwIcon,
  XIcon,
  ChevronRightIcon,
  DatabaseIcon,
  ServerIcon,
  GlobeIcon
} from './AdminIcons';

// ============================================================
// 类型定义（从 AdminTypes.ts 统一导入）
// ============================================================
import type { ContextMenuConfig, ContextMenuSection, ContextMenuItemConfig } from './AdminTypes';

export type { ContextMenuConfig, ContextMenuSection, ContextMenuItemConfig };

// ============================================================
// 通用右键菜单组件
// ============================================================

export function AdminContextMenu({
  x,
  y,
  sections,
  onClose,
  maxHeight = 400
}: ContextMenuConfig) {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [submenuPosition, setSubmenuPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 计算菜单位置，确保不超出屏幕
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    left: x,
    top: y,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const menuWidth = 220;
    const menuHeight = Math.min(maxHeight, (sections || []).reduce((acc, s) => 
      acc + s.items.length * 36 + 8, 0));
    
    let left = x;
    let top = y;
    
    // 水平方向检查
    if (x + menuWidth > window.innerWidth - 10) {
      left = window.innerWidth - menuWidth - 10;
    }
    
    // 垂直方向检查
    if (y + menuHeight > window.innerHeight - 10) {
      top = window.innerHeight - menuHeight - 10;
    }
    
    // 确保不超出顶部
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    
    setMenuStyle({ left, top });
  }, [x, y, sections, maxHeight]);

  // 点击其他地方关闭
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.context-menu')) return;
      onClose?.();
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleItemClick = useCallback((item: ContextMenuItemConfig) => {
    if (item.disabled || item.divider) return;
    if (item.children && item.children.length > 0) return;
    item.onClick?.();
    onClose?.();
  }, [onClose]);

  const handleSubmenuHover = useCallback((item: ContextMenuItemConfig, rect: DOMRect) => {
    if (!item.children || item.children.length === 0) return;
    setActiveSubmenu(item.id || null);
    setSubmenuPosition({
      x: rect.right + 4,
      y: rect.top,
    });
  }, []);

  const renderMenuItem = (item: ContextMenuItemConfig, index: number, parentId?: string) => {
    if (item.divider) {
      return <div key={`divider-${index}`} className="context-menu-divider" />;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeSubmenu === item.id;

    return (
      <div
        key={item.id}
        className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''} ${hasChildren ? 'has-children' : ''}`}
        onClick={() => handleItemClick(item)}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleSubmenuHover(item, rect);
        }}
        onMouseLeave={() => {
          // 延迟隐藏子菜单，允许鼠标移动到子菜单
          setTimeout(() => {
            setActiveSubmenu((current) => current === item.id ? null : current);
          }, 100);
        }}
      >
        {item.icon && <span className="context-menu-icon">{item.icon}</span>}
        <span className="context-menu-label">{item.label}</span>
        {item.shortcut && <span className="context-menu-shortcut">{item.shortcut}</span>}
        {hasChildren && (
          <span className="context-menu-arrow">
            <ChevronRightIcon size={14} />
          </span>
        )}
        
        {/* 子菜单 */}
        {hasChildren && isActive && (
          <div
            className="context-menu-submenu"
            style={{
              position: 'fixed',
              left: submenuPosition.x,
              top: submenuPosition.y,
            }}
          >
            {item.children!.map((child, childIndex) => 
              renderMenuItem(child, childIndex, item.id)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="context-menu" style={menuStyle}>
        {(sections || []).map((section, sectionIndex) => (
          <div key={section.id} className="context-menu-section">
            {section.items.map((item, itemIndex) => 
              renderMenuItem(item, itemIndex)
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ============================================================
// 预定义右键菜单模板
// ============================================================

// 用户管理右键菜单
export function createUserContextMenu(
  userId: string,
  username: string,
  isBanned: boolean,
  actions: {
    onViewDetail: () => void;
    onEditUser: () => void;
    onSendNotification: () => void;
    onCopyEmail: () => void;
    onMuteUser: () => void;
    onLimitRepo: () => void;
    onLimitStorage: () => void;
    onBanUser: () => void;
    onDeleteUser: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-detail',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetail,
        },
        {
          id: 'edit-user',
          label: '编辑资料',
          icon: <EditIcon size={16} />,
          shortcut: 'E',
          onClick: actions.onEditUser,
        },
      ],
    },
    {
      id: 'communication',
      items: [
        {
          id: 'send-notification',
          label: '发送通知',
          icon: <BellIcon size={16} />,
          shortcut: 'N',
          onClick: actions.onSendNotification,
        },
        {
          id: 'copy-email',
          label: '复制邮箱',
          icon: <MailIcon size={16} />,
          onClick: actions.onCopyEmail,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'mute-user',
          label: '禁言用户',
          icon: <MuteIcon size={16} />,
          onClick: actions.onMuteUser,
        },
        {
          id: 'repo-limit',
          label: '限制仓库创建',
          icon: <DatabaseIcon size={16} />,
          onClick: actions.onLimitRepo,
        },
        {
          id: 'storage-limit',
          label: '限制存储空间',
          icon: <ServerIcon size={16} />,
          onClick: actions.onLimitStorage,
        },
        {
          id: 'ban-user',
          label: isBanned ? '解除封禁' : '封禁账号',
          icon: isBanned ? <UnlockIcon size={16} /> : <BanIcon size={16} />,
          onClick: actions.onBanUser,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'delete-user',
          label: '删除账号',
          icon: <TrashIcon size={16} />,
          shortcut: 'Del',
          danger: true,
          onClick: actions.onDeleteUser,
        },
      ],
    },
  ];
}

// 仓库管理右键菜单
export function createRepoContextMenu(
  repoId: string,
  visibility: 'public' | 'private',
  isArchived: boolean,
  actions: {
    onViewDetail: () => void;
    onBrowseFiles: () => void;
    onChangeVisibility: () => void;
    onArchive: () => void;
    onDelete: () => void;
  }
): ContextMenuSection[] {
  const isPrivate = visibility === 'private';
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-detail',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetail,
        },
        {
          id: 'browse-files',
          label: '浏览文件',
          icon: <DatabaseIcon size={16} />,
          onClick: actions.onBrowseFiles,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'change-visibility',
          label: isPrivate ? '设为公开' : '设为私有',
          icon: isPrivate ? <GlobeIcon size={16} /> : <LockIcon size={16} />,
          onClick: actions.onChangeVisibility,
        },
        {
          id: 'archive-repo',
          label: isArchived ? '取消归档' : '归档仓库',
          icon: isArchived ? <ArchiveIcon size={16} /> : <ArchiveIcon size={16} />,
          onClick: actions.onArchive,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'delete-repo',
          label: '删除仓库',
          icon: <TrashIcon size={16} />,
          shortcut: 'Del',
          danger: true,
          onClick: actions.onDelete,
        },
      ],
    },
  ];
}

// 讨论管理右键菜单
export function createDiscussionContextMenu(
  discussionId: string,
  isResolved: boolean,
  isPinned: boolean,
  isLocked: boolean,
  actions: {
    onViewDetail: () => void;
    onMarkResolved: () => void;
    onSetFeatured: () => void;
    onPin: () => void;
    onLock: () => void;
    onMoveCategory: () => void;
    onDelete: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-detail',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetail,
        },
      ],
    },
    {
      id: 'status',
      items: [
        {
          id: 'mark-resolved',
          label: isResolved ? '取消已解决' : '标记为已解决',
          icon: isResolved ? <XCircleIcon size={16} /> : <CheckCircleIcon size={16} />,
          onClick: actions.onMarkResolved,
        },
        {
          id: 'set-featured',
          label: '设为精选',
          icon: <StarIcon size={16} />,
          onClick: actions.onSetFeatured,
        },
        {
          id: 'pin-discussion',
          label: isPinned ? '取消置顶' : '置顶讨论',
          icon: <PinIcon size={16} />,
          onClick: actions.onPin,
        },
        {
          id: 'lock-discussion',
          label: isLocked ? '解锁讨论' : '锁定讨论',
          icon: isLocked ? <UnlockIcon size={16} /> : <LockIcon size={16} />,
          onClick: actions.onLock,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'move-category',
          label: '移动分类',
          icon: <ChevronRightIcon size={16} />,
          onClick: actions.onMoveCategory,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'delete-discussion',
          label: '删除讨论',
          icon: <TrashIcon size={16} />,
          shortcut: 'Del',
          danger: true,
          onClick: actions.onDelete,
        },
      ],
    },
  ];
}

// 举报管理右键菜单
export function createReportContextMenu(
  reportId: string,
  reportType: string,
  actions: {
    onViewDetail: () => void;
    onMarkHandled: () => void;
    onDismiss: () => void;
    onSendWarning: () => void;
    onMuteUser: () => void;
    onBanUser: () => void;
    onDeleteContent: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-detail',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetail,
        },
      ],
    },
    {
      id: 'handle',
      items: [
        {
          id: 'mark-handled',
          label: '标记已处理',
          icon: <CheckCircleIcon size={16} />,
          onClick: actions.onMarkHandled,
        },
        {
          id: 'dismiss-report',
          label: '忽略举报',
          icon: <XCircleIcon size={16} />,
          onClick: actions.onDismiss,
        },
      ],
    },
    {
      id: 'punishment',
      items: [
        {
          id: 'send-warning',
          label: '发送警告',
          icon: <AlertTriangleIcon size={16} />,
          onClick: actions.onSendWarning,
        },
        {
          id: 'mute-from-report',
          label: '禁言用户',
          icon: <MuteIcon size={16} />,
          onClick: actions.onMuteUser,
        },
        {
          id: 'ban-from-report',
          label: '封禁账号',
          icon: <BanIcon size={16} />,
          onClick: actions.onBanUser,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'delete-content',
          label: '删除内容',
          icon: <TrashIcon size={16} />,
          shortcut: 'Del',
          danger: true,
          onClick: actions.onDeleteContent,
        },
      ],
    },
  ];
}

// 处罚管理右键菜单
export function createPenaltyContextMenu(
  penaltyId: string,
  isActive: boolean,
  actions: {
    onViewDetail: () => void;
    onModifyPenalty: () => void;
    onExtendPenalty: () => void;
    onRemovePenalty: () => void;
    onRevokePenalty: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-detail',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetail,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'modify-penalty',
          label: '修改处罚',
          icon: <EditIcon size={16} />,
          onClick: actions.onModifyPenalty,
        },
        {
          id: 'extend-penalty',
          label: '延长处罚',
          icon: <ClockIcon size={16} />,
          onClick: actions.onExtendPenalty,
        },
        {
          id: 'remove-penalty',
          label: '解除处罚',
          icon: <UnlockIcon size={16} />,
          onClick: actions.onRemovePenalty,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'revoke-penalty',
          label: '撤销处罚',
          icon: <XCircleIcon size={16} />,
          danger: true,
          onClick: actions.onRevokePenalty,
        },
      ],
    },
  ];
}

// IP黑名单右键菜单
export function createIpBlacklistContextMenu(
  ipId: string,
  isPermanent: boolean,
  actions: {
    onViewDetails: () => void;
    onExtendBlock: () => void;
    onRemoveFromBlacklist: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-details',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetails,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'extend-block',
          label: isPermanent ? '设置过期时间' : '延长封禁',
          icon: <ClockIcon size={16} />,
          onClick: actions.onExtendBlock,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'remove-blacklist',
          label: '移出黑名单',
          icon: <TrashIcon size={16} />,
          danger: true,
          onClick: actions.onRemoveFromBlacklist,
        },
      ],
    },
  ];
}

// 安全事件右键菜单
export function createSecurityEventContextMenu(
  eventId: string,
  severity: string,
  actions: {
    onViewDetails: () => void;
    onResolve: () => void;
    onBlockIp: () => void;
    onBanUser: () => void;
    onCreateRule: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-details',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetails,
        },
      ],
    },
    {
      id: 'handle',
      items: [
        {
          id: 'resolve-event',
          label: '标记已处理',
          icon: <CheckCircleIcon size={16} />,
          onClick: actions.onResolve,
        },
      ],
    },
    {
      id: 'protection',
      items: [
        {
          id: 'block-ip',
          label: '封禁IP',
          icon: <BanIcon size={16} />,
          onClick: actions.onBlockIp,
        },
        {
          id: 'ban-user',
          label: '封禁用户',
          icon: <BanIcon size={16} />,
          onClick: actions.onBanUser,
        },
        {
          id: 'create-rule',
          label: '创建防护规则',
          icon: <ShieldIcon size={16} />,
          onClick: actions.onCreateRule,
        },
      ],
    },
  ];
}

// 申诉管理右键菜单
export function createAppealContextMenu(
  appealId: string,
  status: string,
  actions: {
    onViewDetails: () => void;
    onApprove: () => void;
    onReject: () => void;
  }
): ContextMenuSection[] {
  const isPending = status === 'pending';
  
  return [
    {
      id: 'view',
      items: [
        {
          id: 'view-details',
          label: '查看详情',
          icon: <EyeIcon size={16} />,
          shortcut: 'Enter',
          onClick: actions.onViewDetails,
        },
      ],
    },
    ...(isPending ? [{
      id: 'actions',
      items: [
        {
          id: 'approve-appeal',
          label: '通过申诉',
          icon: <CheckCircleIcon size={16} />,
          onClick: actions.onApprove,
        },
        {
          id: 'reject-appeal',
          label: '拒绝申诉',
          icon: <XCircleIcon size={16} />,
          danger: true,
          onClick: actions.onReject,
        },
      ],
    }] : []),
  ];
}

// 公告管理右键菜单
export function createAnnouncementContextMenu(
  announcementId: string,
  isActive: boolean,
  actions: {
    onEdit: () => void;
    onToggleActive: () => void;
    onPin: () => void;
    onDelete: () => void;
  }
): ContextMenuSection[] {
  return [
    {
      id: 'view',
      items: [
        {
          id: 'edit-announcement',
          label: '编辑公告',
          icon: <EditIcon size={16} />,
          shortcut: 'E',
          onClick: actions.onEdit,
        },
      ],
    },
    {
      id: 'management',
      items: [
        {
          id: 'toggle-active',
          label: isActive ? '暂停公告' : '激活公告',
          icon: isActive ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />,
          onClick: actions.onToggleActive,
        },
        {
          id: 'pin-announcement',
          label: '置顶公告',
          icon: <PinIcon size={16} />,
          onClick: actions.onPin,
        },
      ],
    },
    {
      id: 'danger',
      items: [
        {
          id: 'delete-announcement',
          label: '删除公告',
          icon: <TrashIcon size={16} />,
          shortcut: 'Del',
          danger: true,
          onClick: actions.onDelete,
        },
      ],
    },
  ];
}
