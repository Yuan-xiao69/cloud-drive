'use client';

import React from 'react';
import Image from 'next/image';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallback?: string;
  className?: string;
}

const sizeMap: Record<string, number> = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 64,
};

const textSizeMap: Record<string, string> = {
  xs: 'text-xs',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
}

export function Avatar({ src, alt = '', size = 'md', fallback, className = '' }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initials = fallback ? getInitials(fallback) : '?';
  const px = sizeMap[size];

  if (src && !imgError) {
    return (
      <Image
        src={src}
        alt={alt}
        width={px}
        height={px}
        onError={() => setImgError(true)}
        unoptimized={src.startsWith('data:')}
        className={`rounded-full object-cover border border-[var(--ds-border-default)] ${className}`}
        style={{ width: px, height: px }}
      />
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold bg-[var(--ds-surface-subtle)] text-[var(--ds-text-secondary)] ${textSizeMap[size]} ${className}`}
      style={{ width: px, height: px }}
    >
      {initials}
    </div>
  );
}
