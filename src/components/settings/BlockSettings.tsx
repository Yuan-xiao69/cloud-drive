'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { BlockIcon } from '@/components/icons/Icons';
import { BlockUserModal } from './modals';

interface BlockedUser {
  id: string;
  username: string;
  avatarUrl?: string;
  bio?: string;
}

interface Block {
  id: string;
  blockedUser: BlockedUser;
  reason?: string;
  createdAt: string;
}

interface BlockSettingsProps {
  blocks: Block[];
  blocksLoading: boolean;
  blocksPage: number;
  blocksTotal: number;
  showBlockModal: boolean;
  blockUserId: string;
  blockReason: string;
  onPageChange: (page: number) => void;
  onShowBlockModal: () => void;
  onHideBlockModal: () => void;
  onBlockUserIdChange: (id: string) => void;
  onBlockReasonChange: (reason: string) => void;
  onConfirmBlock: () => void;
  onUnblockUser: (userId: string) => void;
  isBlocking: boolean;
}

export default function BlockSettings({
  blocks,
  blocksLoading,
  blocksPage,
  blocksTotal,
  showBlockModal,
  blockUserId,
  blockReason,
  onPageChange,
  onShowBlockModal,
  onHideBlockModal,
  onBlockUserIdChange,
  onBlockReasonChange,
  onConfirmBlock,
  onUnblockUser,
  isBlocking
}: BlockSettingsProps) {
  const totalPages = Math.ceil(blocksTotal / 10);

  return (
    <SettingsSection 
      title="屏蔽列表" 
      description="管理你屏蔽的用户"
    >
      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={onShowBlockModal}>
          添加屏蔽
        </button>
      </div>

      {blocksLoading ? (
        <div className="empty-state">
          <p>加载中...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="empty-state">
          <BlockIcon />
          <p>暂无屏蔽用户</p>
        </div>
      ) : (
        <>
          <div className="block-list">
            {blocks.map(block => (
              <div key={block.id} className="block-item">
                <div className="block-user">
                  <img
                    src={block.blockedUser.avatarUrl || '/default-avatar.png'}
                    alt={block.blockedUser.username}
                    className="block-avatar"
                  />
                  <div className="block-user-info">
                    <Link href={`/${block.blockedUser.username}`} className="block-username">
                      {block.blockedUser.username}
                    </Link>
                    {block.blockedUser.bio && (
                      <p className="block-user-bio">{block.blockedUser.bio}</p>
                    )}
                  </div>
                </div>
                {block.reason && (
                  <div className="block-reason">
                    <span>屏蔽原因：{block.reason}</span>
                  </div>
                )}
                <div className="block-time">
                  屏蔽于 {new Date(block.createdAt).toLocaleString('zh-CN')}
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onUnblockUser(block.blockedUser.id)}
                >
                  取消屏蔽
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {blocksTotal > 10 && (
            <div className="pagination">
              <button
                className="btn btn-secondary btn-sm"
                disabled={blocksPage === 1}
                onClick={() => onPageChange(Math.max(1, blocksPage - 1))}
              >
                上一页
              </button>
              <span className="pagination-info">
                第 {blocksPage} 页，共 {totalPages} 页
              </span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={blocksPage >= totalPages}
                onClick={() => onPageChange(blocksPage + 1)}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

      {/* Block User Modal */}
      <BlockUserModal
        isOpen={showBlockModal}
        userId={blockUserId}
        reason={blockReason}
        isBlocking={isBlocking}
        onUserIdChange={onBlockUserIdChange}
        onReasonChange={onBlockReasonChange}
        onCancel={onHideBlockModal}
        onConfirm={onConfirmBlock}
      />
    </SettingsSection>
  );
}