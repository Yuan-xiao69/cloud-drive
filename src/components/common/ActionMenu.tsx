'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReportModal from '@/components/common/ReportModal';

interface ActionMenuProps {
  type: 'discussion' | 'issue' | 'pullrequest' | 'comment' | 'repository';
  targetId: string;
  targetTitle?: string;
  children?: React.ReactNode;
  align?: 'left' | 'right';
}

export default function ActionMenu({ type, targetId, targetTitle, children, align = 'right' }: ActionMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="action-menu-container" ref={dropdownRef}>
        <button
          className="action-menu-trigger btn btn-link"
          onClick={() => setShowDropdown(!showDropdown)}
          title="更多操作"
          style={{ padding: '4px 8px', color: 'var(--color-fg-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {showDropdown && (
          <div className={`action-menu-dropdown ${align === 'right' ? 'dropdown-right' : 'dropdown-left'}`}>
            <button
              className="action-menu-item"
              onClick={() => {
                setShowDropdown(false);
                setShowReportModal(true);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
              举报内容
            </button>
          </div>
        )}
      </div>

      {showReportModal && (
        <ReportModal
          targetType={type}
          targetId={targetId}
          targetTitle={targetTitle}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}
