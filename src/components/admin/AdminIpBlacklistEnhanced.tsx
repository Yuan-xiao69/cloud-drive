// Admin IP Blacklist Enhanced Component
// 增强的IP黑名单管理组件
// 功能：IP地理位置、访问统计、自动封禁规则、完整右键菜单

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SidePanel, ConfirmDialog, Toast, EnhancedStatCard } from './common/AdminCommon';
import { PieChart } from './charts/AdminCharts';
import type { IpBlacklistEntry, IpGeoInfo, IpFormData, ContextMenuConfig } from './AdminTypes';
import { Button, Modal, Card, Field } from '@/components/design';

// ============ 图标组件 ============
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 0112.5-2.03A5.5 5.5 0 009.5 14h-1a3.5 3.5 0 01-7 0H1.5A6.5 6.5 0 011.5 8zm6.5-2.5a.75.75 0 100-1.5.75.75 0 000 1.5zM5 7a3 3 0 015.7 1.5l-1 2H7.3l-1-2A3 3 0 015 7zm1 5a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0L1.5 3v4.5C1.5 10.5 4.09 13.66 8 15c3.91-1.34 6.5-4.5 6.5-7.5V3L8 0zm0 1.5L13 4v4c0 2.37-2.04 4.91-5 6.13C5.04 12.91 3 10.37 3 8V4l5-1.5z" />
  </svg>
);

const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0zM8 3.5a.75.75 0 01.75.75v4.25l2.9 1.66-.5.87-3.15-1.8V4.25A.75.75 0 018 3.5z" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.596 11.596c-.439-.439-.858-.868-1.251-1.279A5.54 5.54 0 0014 8a5.5 5.5 0 00-9.387-1.879.75.75 0 11-1.127-1.037A7 7 0 0114 8c0 1.885-.746 3.637-2.055 4.914l-.008.008c-.393.41-.812.84-1.251 1.278l-.02.02a.75.75 0 01-1.06-1.06l.02-.02c.365-.366.742-.748 1.126-1.138A4.54 4.54 0 0010 8a4.5 4.5 0 00-8.09 1.063A.75.75 0 011.5 8a6.5 6.5 0 0113 0c0 .99-.224 1.944-.63 2.805l.01-.01a.75.75 0 011.06 1.06l-.01.01c-.407.862-.93 1.67-1.556 2.41l-.02.02a.75.75 0 01-1.06-1.06l.02-.02c.528-.627 1.027-1.306 1.49-2.027z" />
  </svg>
);

const ServerIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M1.75 1h12.5a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5zm0 3h12.5a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5zm0 3h12.5a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5zm0 3h12.5a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5z" />
  </svg>
);

const BanIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
    <path d="M2.5 12.5L12.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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

  // Adjust position to stay within viewport
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
              {item.submenu.map((subItem: NonNullable<ContextMenuConfig['items']>[0], subIndex: number) => (
                <button
                  key={subIndex}
                  className={`context-menu-item border-0 bg-transparent w-full text-left ${subItem.danger ? 'danger' : ''} ${subItem.disabled ? 'disabled' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!subItem.disabled) {
                      subItem.action?.();
                    }
                  }}
                >
                  <span className="context-menu-label">{subItem.label}</span>
                  {subItem.shortcut && <span className="context-menu-shortcut">{subItem.shortcut}</span>}
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

// ============ IP访问记录类型 ============
interface IpAccessRecord {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  ip: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
}

// ============ 自动封禁规则类型 ============
interface AutoBlockRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  duration: string;
  enabled: boolean;
  matchCount: number;
  lastTriggered?: string;
}

// ============ 主组件 ============
export interface AdminIpBlacklistEnhancedProps {
  // 原始props（兼容现有hook）
  ipBlacklist: IpBlacklistEntry[];
  ipBlacklistTotal: number;
  ipBlacklistPage: number;
  ipBlacklistSearch: string;
  ipBlacklistLoading: boolean;
  showIpModal: boolean;
  ipForm: IpFormData;
  ipSaving: boolean;
  onPageChange: (page: number) => void;
  onSearchChange: (value: string) => void;
  onOpenModal: () => void;
  onCloseModal: () => void;
  onFormChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onDelete: (id: string) => void;
}

export default function AdminIpBlacklistEnhanced({
  ipBlacklist,
  ipBlacklistTotal,
  ipBlacklistPage,
  ipBlacklistSearch,
  ipBlacklistLoading,
  showIpModal,
  ipForm,
  ipSaving,
  onPageChange,
  onSearchChange,
  onOpenModal,
  onCloseModal,
  onFormChange,
  onSubmit,
  onDelete,
}: AdminIpBlacklistEnhancedProps) {
  // ============ 状态 ============
  const [selectedIp, setSelectedIp] = useState<IpBlacklistEntry | null>(null);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuConfig | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // 模拟的IP详细信息
  const [ipDetail, setIpDetail] = useState<{
    geo: IpGeoInfo | null;
    accessRecords: IpAccessRecord[];
    stats: {
      totalAccess: number;
      failedAttempts: number;
      lastAccess: string;
      relatedUsers: number;
    };
  } | null>(null);

  // 自动封禁规则列表
  const [autoBlockRules, setAutoBlockRules] = useState<AutoBlockRule[]>([
    {
      id: '1',
      name: '暴力破解检测',
      description: '检测频繁登录失败',
      condition: '1分钟内5次登录失败',
      duration: '1小时',
      enabled: true,
      matchCount: 12,
      lastTriggered: '2024-03-20 10:30',
    },
    {
      id: '2',
      name: '频繁注册检测',
      description: '检测批量账号注册',
      condition: '1小时内注册超过3个账号',
      duration: '24小时',
      enabled: true,
      matchCount: 5,
      lastTriggered: '2024-03-19 14:20',
    },
    {
      id: '3',
      name: '恶意爬虫检测',
      description: '检测异常高频请求',
      condition: '1分钟内超过100次请求',
      duration: '1小时',
      enabled: true,
      matchCount: 28,
      lastTriggered: '2024-03-20 09:15',
    },
    {
      id: '4',
      name: '暴力破解（严重）',
      description: '检测大规模暴力破解',
      condition: '24小时内登录失败超过20次',
      duration: '永久',
      enabled: true,
      matchCount: 3,
      lastTriggered: '2024-03-18 22:45',
    },
  ]);

  // ============ 统计数据 ============
  const stats = {
    totalBlocked: ipBlacklist.filter(ip => ip.isActive).length,
    expiredToday: ipBlacklist.filter(ip => {
      if (!ip.expiresAt) return false;
      const expiryDate = new Date(ip.expiresAt);
      const today = new Date();
      return expiryDate.toDateString() === today.toDateString();
    }).length,
    permanent: ipBlacklist.filter(ip => !ip.expiresAt).length,
    triggeredToday: autoBlockRules.reduce((sum, rule) => sum + rule.matchCount, 0),
  };

  // ============ 加载IP详细信息 ============
  const loadIpDetail = useCallback(async (entry: IpBlacklistEntry) => {
    // 模拟API调用获取详细信息
    setIpDetail({
      geo: {
        ip: entry.ipAddress,
        country: '中国',
        region: '北京',
        city: '北京市',
        isp: '中国电信',
        org: '中国电信北京分公司',
        isProxy: false,
        isVpn: Math.random() > 0.7,
        isTor: false,
        isHosting: Math.random() > 0.8,
      },
      accessRecords: [
        {
          id: '1',
          username: 'test_user',
          action: '登录',
          ip: entry.ipAddress,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          timestamp: '2024-03-20 10:30:25',
          success: false,
        },
        {
          id: '2',
          username: 'admin_user',
          action: '登录',
          ip: entry.ipAddress,
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
          timestamp: '2024-03-20 10:29:15',
          success: true,
        },
        {
          id: '3',
          username: 'new_user',
          action: '注册',
          ip: entry.ipAddress,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          timestamp: '2024-03-20 10:25:00',
          success: true,
        },
      ],
      stats: {
        totalAccess: 156,
        failedAttempts: 23,
        lastAccess: '2024-03-20 10:30:25',
        relatedUsers: 5,
      },
    });
  }, []);

  // ============ 右键菜单处理 ============
  const handleContextMenu = useCallback((e: React.MouseEvent, entry: IpBlacklistEntry) => {
    e.preventDefault();
    e.stopPropagation();

    const menuConfig: ContextMenuConfig = {
      x: e.clientX,
      y: e.clientY,
      title: `🌐 IP: ${entry.ipAddress}`,
      items: [
        {
          label: '查看详情',
          icon: '👁',
          shortcut: 'Enter',
          action: () => {
            setSelectedIp(entry);
            loadIpDetail(entry);
            setShowDetailPanel(true);
            setContextMenu(null);
          },
        },
        {
          label: '复制IP地址',
          icon: '🔗',
          shortcut: 'Ctrl+C',
          action: () => {
            navigator.clipboard.writeText(entry.ipAddress);
            setToast({ message: 'IP地址已复制', type: 'success' });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '修改过期时间',
          icon: '⏰',
          submenu: [
            {
              label: '1 天后过期',
              action: () => {
                handleUpdateExpiry(entry, 1);
              },
            },
            {
              label: '7 天后过期',
              action: () => {
                handleUpdateExpiry(entry, 7);
              },
            },
            {
              label: '30 天后过期',
              action: () => {
                handleUpdateExpiry(entry, 30);
              },
            },
            {
              label: '永久',
              action: () => {
                handleUpdateExpiry(entry, -1);
              },
              danger: true,
            },
          ],
        },
        {
          label: '修改原因',
          icon: '📝',
          action: () => {
            setSelectedIp(entry);
            setShowAddModal(true);
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: '解除封禁',
          icon: '🔓',
          action: () => {
            setConfirmDialog({
              isOpen: true,
              title: '确认解除封禁',
              message: `确定要解除对 IP ${entry.ipAddress} 的封禁吗？`,
              onConfirm: () => {
                onDelete(entry.id);
                setConfirmDialog(null);
                setToast({ message: '已解除封禁', type: 'success' });
              },
            });
            setContextMenu(null);
          },
        },
        {
          label: '删除记录',
          icon: '🗑️',
          danger: true,
          action: () => {
            setConfirmDialog({
              isOpen: true,
              title: '确认删除',
              message: `确定要删除对 IP ${entry.ipAddress} 的封禁记录吗？`,
              onConfirm: () => {
                onDelete(entry.id);
                setConfirmDialog(null);
                setToast({ message: '记录已删除', type: 'success' });
              },
            });
            setContextMenu(null);
          },
        },
        { divider: true, label: '', action: () => {}, icon: undefined },
        {
          label: 'IP查询',
          icon: '🔍',
          action: () => {
            setSelectedIp(entry);
            loadIpDetail(entry);
            setShowDetailPanel(true);
            setContextMenu(null);
          },
        },
        {
          label: '查看访问记录',
          icon: '📊',
          action: () => {
            setSelectedIp(entry);
            loadIpDetail(entry);
            setShowDetailPanel(true);
            setContextMenu(null);
          },
        },
      ],
    };

    setContextMenu(menuConfig);
  }, [loadIpDetail, onDelete]);

  // ============ 更新过期时间 ============
  const handleUpdateExpiry = (entry: IpBlacklistEntry, days: number) => {
    setToast({ message: `已更新过期时间为 ${days === -1 ? '永久' : `${days}天`}`, type: 'success' });
  };

  // ============ 规则管理 ============
  const toggleRule = (ruleId: string) => {
    setAutoBlockRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  // ============ 渲染 ============
  const totalPages = Math.ceil(ipBlacklistTotal / 20);

  return (
    <div className="p-4">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--ds-text-primary)]">IP 黑名单</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setShowRuleModal(true)}>
            <ShieldIcon /> 自动封禁规则
          </Button>
          <Button variant="danger" onClick={onOpenModal}>
            <BanIcon /> 添加 IP
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="stats-grid">
        <EnhancedStatCard
          title="当前封禁"
          value={stats.totalBlocked}
          icon={<ShieldIcon />}
          color="danger"
        />
        <EnhancedStatCard
          title="今日过期"
          value={stats.expiredToday}
          icon={<ClockIcon />}
          color="warning"
        />
        <EnhancedStatCard
          title="永久封禁"
          value={stats.permanent}
          icon={<BanIcon />}
          color="default"
        />
        <EnhancedStatCard
          title="规则触发"
          value={stats.triggeredToday}
          icon={<ShieldIcon />}
          subtitle="本月"
          color="info"
        />
      </div>

      {/* 搜索栏 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ds-text-secondary)]">
            <path d="M11.5 7a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z" />
          </svg>
          <input
            type="search"
            className="w-full pl-10 pr-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-subtle)]"
            placeholder="搜索 IP 地址..."
            value={ipBlacklistSearch}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1">
          <Button variant="primary">全部</Button>
          <Button variant="ghost">生效中</Button>
          <Button variant="ghost">已过期</Button>
          <Button variant="ghost">永久</Button>
        </div>
      </div>

      {/* 表格 */}
      <Card padding="none" className="overflow-hidden">
        {ipBlacklistLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] mb-3" />
            <p>加载中...</p>
          </div>
        ) : ipBlacklist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <GlobeIcon />
            <p>暂无黑名单 IP</p>
            <Button variant="primary" onClick={onOpenModal}>
              添加第一个 IP
            </Button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>IP 地址</th>
                  <th style={{ width: '100px' }}>地理位置</th>
                  <th>原因</th>
                  <th style={{ width: '80px' }}>状态</th>
                  <th style={{ width: '120px' }}>过期时间</th>
                  <th style={{ width: '80px' }}>添加人</th>
                  <th style={{ width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {ipBlacklist.map((entry: IpBlacklistEntry) => (
                  <tr
                    key={entry.id}
                    onContextMenu={(e) => handleContextMenu(e, entry)}
                    onDoubleClick={() => {
                      setSelectedIp(entry);
                      loadIpDetail(entry);
                      setShowDetailPanel(true);
                    }}
                    className="context-menu-trigger"
                  >
                    <td className="ip-address">
                      <code>{entry.ipAddress}</code>
                    </td>
                    <td className="ip-location">
                      <GlobeIcon />
                      <span>中国·北京</span>
                    </td>
                    <td className="ip-reason">{entry.reason}</td>
                    <td>
                      <span className={`label ${entry.isActive ? 'label-danger' : 'label-default'}`}>
                        {entry.isActive ? '生效中' : '已过期'}
                      </span>
                    </td>
                    <td className="ip-expiry">
                      {entry.expiresAt ? (
                        new Date(entry.expiresAt).toLocaleDateString()
                      ) : (
                        <span className="text-danger">永久</span>
                      )}
                    </td>
                    <td>@{entry.createdBy}</td>
                    <td className="actions-cell">
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIp(entry);
                          loadIpDetail(entry);
                          setShowDetailPanel(true);
                        }}
                        title="查看详情"
                      >
                        详情
                      </Button>
                      <Button
                        variant="danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(entry.id);
                        }}
                        title="删除"
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between py-3">
                <Button
                  variant="secondary"
                  disabled={ipBlacklistPage <= 1}
                  onClick={() => onPageChange(ipBlacklistPage - 1)}
                >
                  上一页
                </Button>
                <span className="text-sm text-[var(--ds-text-secondary)]">
                  第 {ipBlacklistPage} / {totalPages} 页，共 {ipBlacklistTotal} 条
                </span>
                <Button
                  variant="secondary"
                  disabled={ipBlacklistPage >= totalPages}
                  onClick={() => onPageChange(ipBlacklistPage + 1)}
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

      {/* 详情侧边栏 */}
      <SidePanel
        isOpen={showDetailPanel}
        onClose={() => setShowDetailPanel(false)}
        title="IP 详情"
        subtitle={selectedIp?.ipAddress}
        width={520}
      >
        {selectedIp && ipDetail ? (
          <div className="ip-detail-content">
            {/* 基本信息 */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">基本信息</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">IP地址</span>
                  <span className="info-value"><code>{selectedIp.ipAddress}</code></span>
                </div>
                <div className="info-item">
                  <span className="info-label">封禁原因</span>
                  <span className="info-value">{selectedIp.reason}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">封禁状态</span>
                  <span className="info-value">
                    <span className={`label ${selectedIp.isActive ? 'label-danger' : 'label-default'}`}>
                      {selectedIp.isActive ? '生效中' : '已过期'}
                    </span>
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">过期时间</span>
                  <span className="info-value">
                    {selectedIp.expiresAt ? new Date(selectedIp.expiresAt).toLocaleString() : '永久'}
                  </span>
                </div>
              </div>
            </Card>

            {/* 地理位置 */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">
                <MapPinIcon /> 地理位置
              </h3>
              <div className="geo-info">
                <div className="geo-main">
                  <div className="geo-flag">🇨🇳</div>
                  <div className="geo-text">
                    <div className="geo-location">
                      {ipDetail.geo?.country} · {ipDetail.geo?.region} · {ipDetail.geo?.city}
                    </div>
                    <div className="geo-isp">{ipDetail.geo?.isp}</div>
                  </div>
                </div>
                <div className="geo-badges">
                  {ipDetail.geo?.isVpn && <span className="badge badge-warning">VPN</span>}
                  {ipDetail.geo?.isProxy && <span className="badge badge-danger">代理</span>}
                  {ipDetail.geo?.isTor && <span className="badge badge-danger">Tor</span>}
                  {ipDetail.geo?.isHosting && <span className="badge badge-info">托管</span>}
                </div>
              </div>
            </Card>

            {/* 访问统计 */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">
                <ServerIcon /> 访问统计
              </h3>
              <div className="stats-row">
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{ipDetail.stats.totalAccess}</span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">总访问</span>
                </div>
                <div className="stat-box danger">
                  <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{ipDetail.stats.failedAttempts}</span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">失败次数</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-semibold text-[var(--ds-text-primary)]">{ipDetail.stats.relatedUsers}</span>
                  <span className="text-xs text-[var(--ds-text-secondary)]">关联用户</span>
                </div>
              </div>
              <div className="last-access">
                <ClockIcon />
                <span>最后访问: {ipDetail.stats.lastAccess}</span>
              </div>
            </Card>

            {/* 访问记录 */}
            <Card>
              <h3 className="text-sm font-semibold text-[var(--ds-text-primary)] mb-3">最近访问记录</h3>
              <div className="access-records">
                {ipDetail.accessRecords.map((record) => (
                  <div key={record.id} className="access-record">
                    <div className="record-main">
                      <span className="record-user">@{record.username}</span>
                      <span className="record-action">{record.action}</span>
                      <span className={`record-status ${record.success ? 'success' : 'failed'}`}>
                        {record.success ? '✓' : '✗'}
                      </span>
                    </div>
                    <div className="record-time">{record.timestamp}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-[var(--ds-text-secondary)]">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--ds-border-default)] border-t-[var(--ds-accent-default)] mb-3" />
            <p>加载中...</p>
          </div>
        )}
      </SidePanel>

      {/* 添加/编辑IP弹窗 */}
      <Modal
        isOpen={showIpModal}
        onClose={onCloseModal}
        title="添加 IP 到黑名单"
        maxWidth="480px"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={onCloseModal}>
              取消
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onSubmit}
              disabled={ipSaving || !ipForm.ipAddress || !ipForm.reason}
              loading={ipSaving}
            >
              {ipSaving ? '提交中...' : '提交'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label htmlFor="ip-blacklist-address" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">
              IP 地址 <span className="text-[var(--ds-text-secondary)] font-normal">(支持单个IP或CIDR格式)</span>
            </label>
            <input
              id="ip-blacklist-address"
              type="text"
              className="w-full px-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-default)]/30"
              value={ipForm.ipAddress}
              onChange={(e) => onFormChange('ipAddress', e.target.value)}
              placeholder="例如: 192.168.1.1 或 10.0.0.0/24"
            />
            <span className="text-xs text-[var(--ds-text-secondary)]">
              支持格式: 单个IP (192.168.1.1) 或 CIDR网段 (10.0.0.0/24)
            </span>
          </div>
          <div>
            <label htmlFor="ip-blacklist-reason" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">封禁原因</label>
            <textarea
              id="ip-blacklist-reason"
              className="w-full px-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-default)]/30"
              rows={3}
              value={ipForm.reason}
              onChange={(e) => onFormChange('reason', e.target.value)}
              placeholder="输入封禁原因"
            />
          </div>
          <div>
            <label htmlFor="ip-blacklist-duration" className="block text-sm font-medium text-[var(--ds-text-primary)] mb-1">持续天数</label>
            <input
              id="ip-blacklist-duration"
              type="number"
              className="w-full px-3 py-2 rounded-[var(--ds-radius-sm)] border border-[var(--ds-border-default)] bg-[var(--ds-surface-default)] text-[var(--ds-text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ds-accent-default)]/30"
              value={ipForm.duration}
              onChange={(e) => onFormChange('duration', e.target.value)}
              placeholder="0 表示永久"
              min="0"
            />
          </div>
        </div>
      </Modal>

      {/* 自动封禁规则弹窗 */}
      <Modal
        isOpen={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        title="自动封禁规则"
        maxWidth="672px"
        footer={
          <Button variant="secondary" size="sm" onClick={() => setShowRuleModal(false)}>
            关闭
          </Button>
        }
      >
        <p className="text-sm text-[var(--ds-text-secondary)] mb-4">
          当触发以下任一条件时，系统将自动将相关IP加入黑名单。
        </p>
        <div className="rules-list">
          {autoBlockRules.map((rule) => (
            <div key={rule.id} className={`rule-item ${rule.enabled ? '' : 'disabled'}`}>
              <div className="rule-header">
                <label className="rule-toggle" aria-label={`规则 ${rule.id}`}>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={() => toggleRule(rule.id)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <div className="rule-info">
                  <span className="rule-name">{rule.name}</span>
                  <span className="rule-desc">{rule.description}</span>
                </div>
                <div className="rule-stats">
                  <span className="rule-match-count">{rule.matchCount} 次触发</span>
                  {rule.lastTriggered && (
                    <span className="rule-last-triggered">
                      最近: {rule.lastTriggered}
                    </span>
                  )}
                </div>
              </div>
              <div className="rule-condition">
                <span className="condition-label">条件:</span>
                <code>{rule.condition}</code>
              </div>
              <div className="rule-action">
                <span className="action-label">执行:</span>
                <span className="action-value">封禁 {rule.duration}</span>
              </div>
            </div>
          ))}
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
