'use client';

import { useEffect } from 'react';
import { Empty } from '@/components/design';

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('页面渲染错误:', error);
  }, [error]);

  return <Empty title="出错了" />;
}
