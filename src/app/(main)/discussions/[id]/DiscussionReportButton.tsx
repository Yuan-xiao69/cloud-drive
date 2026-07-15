'use client';

import { useState } from 'react';
import ReportModal from '@/components/common/ReportModal';
import { Button } from '@/components/design';

// 内联旗帜图标 SVG（不引入新依赖）
function FlagIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      className="shrink-0"
    >
      <path d="M8 1a.5.5 0 0 1 .5.5v.5h5a.5.5 0 0 1 0 1h-5v.5A1.5 1.5 0 0 1 7 4.5v1A1.5 1.5 0 0 1 8.5 7h2a.5.5 0 0 1 0 1h-2A2.5 2.5 0 0 1 6 5.5v-1A2.5 2.5 0 0 1 7.5 2H8V1.5A.5.5 0 0 1 8 1z" />
    </svg>
  );
}

export default function DiscussionReportButton({
  targetType,
  targetId,
  targetTitle,
}: {
  targetType: string;
  targetId: string;
  targetTitle?: string;
}) {
  const [showReportModal, setShowReportModal] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowReportModal(true)}
        title="举报"
        className="text-[var(--ds-text-tertiary)] hover:text-[var(--ds-danger-default)]"
      >
        <FlagIcon size={16} />
      </Button>
      {showReportModal && (
        <ReportModal
          targetType={targetType as 'discussion'}
          targetId={targetId}
          targetTitle={targetTitle}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
}
