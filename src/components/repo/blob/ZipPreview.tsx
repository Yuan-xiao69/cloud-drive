'use client';

import React from 'react';

interface ZipTreeNode {
  name: string;
  size: number;
  isDir: boolean;
  children: ZipTreeNode[];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderZipTree(nodes: ZipTreeNode[], depth: number): React.ReactNode {
  return nodes.map((node, i) => (
    <React.Fragment key={`zip-${depth}-${i}`}>
      <div className="zip-file-item" style={{ paddingLeft: 12 + depth * 20 }}>
        {node.isDir ? '📁' : '📄'} <span className="zip-file-name">{node.name}</span>
        {!node.isDir && <span className="zip-file-size">{formatSize(node.size)}</span>}
        {node.isDir && <span className="zip-file-size">目录</span>}
      </div>
      {node.children.length > 0 && renderZipTree(node.children, depth + 1)}
    </React.Fragment>
  ));
}

interface ZipPreviewProps {
  fileName: string;
  zipFiles: ZipTreeNode[];
}

export default function ZipPreview({ fileName, zipFiles }: ZipPreviewProps) {
  if (zipFiles.length === 0) return <div className="zip-preview-empty">ZIP 文件为空</div>;

  return (
    <div className="zip-preview-container">
      <div className="zip-header">
        📦 <span>{fileName}</span>
        <span className="zip-count">共 {zipFiles.reduce((c, n) => c + 1 + n.children.length, 0)} 个条目</span>
      </div>
      <div className="zip-file-list">
        {renderZipTree(zipFiles, 0)}
      </div>
    </div>
  );
}

export type { ZipTreeNode };
