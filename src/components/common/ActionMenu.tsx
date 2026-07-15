'use client';

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import ReportModal from '@/components/common/ReportModal';
import { Button } from '@/components/design';

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
      <div className="relative" ref={dropdownRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDropdown(!showDropdown)}
          title="更多操作"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>}
        />
        {showDropdown && (
          <div className={clsx(
            'absolute top-full mt-1 min-w-[140px] bg-[var(--ds-surface-default)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)] shadow z-50 py-1',
            align === 'right' ? 'right-0' : 'left-0'
          )}>
            <Button
              variant="ghost"
              size="md"
              className="w-full justify-start"
              onClick={() => {
                setShowDropdown(false);
                setShowReportModal(true);
              }}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>}
            >
              举报内容
            </Button>
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

