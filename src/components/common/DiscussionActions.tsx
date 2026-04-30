'use client';

import { useState, useEffect } from 'react';
import { tokenManager } from '@/lib/api/client';

interface DiscussionActionsProps {
  discussionId: string;
  discussionTitle: string;
  discussionAuthorUsername: string;
  children?: React.ReactNode;
}

export default function DiscussionActions({
  discussionId,
  discussionTitle,
  discussionAuthorUsername,
  children,
}: DiscussionActionsProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    const userStr = localStorage.getItem('user');
    setIsLoggedIn(!!token);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUsername(user.username);
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <div className="discussion-post-actions">
      {children}
      {isLoggedIn && currentUsername && currentUsername !== discussionAuthorUsername && (
        <div style={{ marginLeft: 'auto' }}>
          <button
            className="btn btn-link"
            style={{ fontSize: 13, padding: '4px 8px', color: 'var(--color-fg-muted)' }}
            onClick={() => {
              // Dispatch custom event to show report modal
              window.dispatchEvent(new CustomEvent('showReportModal', {
                detail: {
                  targetType: 'discussion',
                  targetId: discussionId,
                  targetTitle: discussionTitle,
                }
              }));
            }}
            title="举报讨论"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
