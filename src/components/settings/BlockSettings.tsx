'use client';

import React from 'react';
import Link from 'next/link';
import SettingsSection from './SettingsSection';
import { BlockIcon } from '@/components/icons/Icons';
import { BlockUserModal } from './modals';
import { Button, Card } from '@/components/design';

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
      description="被屏蔽的用户无法关注你、评论你的讨论或查看你的私有仓库"
      actions={
        <Button variant="secondary" size="sm" onClick={onShowBlockModal}>+ 屏蔽用户</Button>
      }
    >

      {blocksLoading ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
          <p>加载中...</p>
        </div>
      ) : blocks.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-[var(--ds-text-secondary)]">
          <BlockIcon />
          <p>暂无屏蔽用户</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {blocks.map(block => (
              <Card key={block.id} variant="subtle" className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <img
                    src={block.blockedUser.avatarUrl || '/default-avatar.png'}
                    alt={block.blockedUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex flex-col">
                    <Link href={`/${block.blockedUser.username}`} className="font-medium text-[var(--ds-text-primary)] no-underline hover:underline">
                      {block.blockedUser.username}
                    </Link>
                    {block.blockedUser.bio && (
                      <p className="text-[13px] text-[var(--ds-text-secondary)] m-0">{block.blockedUser.bio}</p>
                    )}
                  </div>
                </div>
                {block.reason && (
                  <div className="text-[var(--ds-text-secondary)] text-[13px]">
                    <span>屏蔽原因：{block.reason}</span>
                  </div>
                )}
                <div className="text-[var(--ds-text-secondary)] text-xs">
                  屏蔽于 {new Date(block.createdAt).toLocaleString('zh-CN')}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onUnblockUser(block.blockedUser.id)}
                >
                  解除屏蔽
                </Button>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {blocksTotal > 10 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button
                variant="secondary"
                size="sm"
                disabled={blocksPage === 1}
                onClick={() => onPageChange(Math.max(1, blocksPage - 1))}
              >
                上一页
              </Button>
              <span className="text-sm text-[var(--ds-text-secondary)]">
                第 {blocksPage} 页，共 {totalPages} 页
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={blocksPage >= totalPages}
                onClick={() => onPageChange(blocksPage + 1)}
              >
                下一页
              </Button>
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