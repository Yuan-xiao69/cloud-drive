'use client';

import React, { useState, useEffect } from 'react';
import { ThumbsUp } from '@/components/design/icons';
import { useAuth } from '@/lib/providers';
import { api } from '@/lib/api/client';
import { Button } from '@/components/design';

interface LikeButtonProps {
  discussionId: string;
  authorId: string;
  initialLiked?: boolean;
  initialLikeCount?: number;
}

export default function LikeButton({
  discussionId,
  authorId,
  initialLiked = false,
  initialLikeCount = 0,
}: LikeButtonProps) {
  const { user: currentUser } = useAuth();
  const isOwnDiscussion = currentUser?.id === authorId;

  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);

  // 检查点赞状态
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get<{ isLiked: boolean; likeCount: number }>(
          `/api/v1/discussions/${discussionId}/like`
        );
        if ((res.code === 200 || res.code === 0) && res.data) {
          setIsLiked(res.data.isLiked);
          setLikeCount(res.data.likeCount);
        }
      } catch (error) {
        // 未登录或其他错误，忽略
      }
    };
    checkStatus();
  }, [discussionId]);

  const handleLike = async () => {
    if (isOwnDiscussion) {
      return;
    }

    setLoading(true);
    try {
      if (isLiked) {
        const res = await api.delete<{ isLiked: boolean; likeCount: number }>(
          `/api/v1/discussions/${discussionId}/like`
        );
        if ((res.code === 200 || res.code === 0) && res.data) {
          setIsLiked(false);
          setLikeCount(res.data.likeCount);
        }
      } else {
        const res = await api.post<{ isLiked: boolean; likeCount: number }>(
          `/api/v1/discussions/${discussionId}/like`
        );
        if ((res.code === 200 || res.code === 0) && res.data) {
          setIsLiked(true);
          setLikeCount(res.data.likeCount);
        }
      }
    } catch (error) {
      console.error('点赞操作失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      onClick={handleLike}
      disabled={loading || isOwnDiscussion}
      title={isOwnDiscussion ? '不能点赞自己的讨论' : isLiked ? '取消点赞' : '点赞'}
    >
      <ThumbsUp
        size={16}
        fill={isLiked ? 'currentColor' : 'none'}
        style={{
          color: isLiked ? 'var(--ds-accent-default)' : 'inherit',
        }}
      />
      <span>{isLiked ? '已赞' : '点赞'}</span>
      {likeCount > 0 && <span className="ml-1">({likeCount})</span>}
    </Button>
  );
}
