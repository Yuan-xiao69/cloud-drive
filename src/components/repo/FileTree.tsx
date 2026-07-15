'use client';

import React, { useState, useEffect, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/design';

interface FileTreeItem { name: string; type: 'file' | 'dir'; path: string; children?: FileTreeItem[] }
export interface FileTreeRef { invalidateCache: () => void }

const FolderIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>;
const FileIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
const ChevronIcon = ({ expanded }: { expanded: boolean }) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${expanded ? 'rotate-90' : ''}`}><polyline points="9 18 15 12 9 6" /></svg>;

interface FileTreeProps { username: string; repoName: string; currentPath?: string; onFileSelect?: (path: string) => void; branch?: string }

function FileTreeComp({ username, repoName, currentPath = '', onFileSelect, branch = 'main' }: FileTreeProps, ref: React.Ref<FileTreeRef>) {
  const router = useRouter();
  const [treeData, setTreeData] = useState<FileTreeItem[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [cacheKey, setCacheKey] = useState(0);

  useImperativeHandle(ref, () => ({ invalidateCache: () => setCacheKey(k => k + 1) }));

  const loadChildren = useCallback(async (path: string): Promise<FileTreeItem[]> => {
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`);
      const data = await res.json();
      return (data.code === 200 ? data.data : []) || [];
    } catch { return []; }
  }, [username, repoName, branch]);

  const fetchChildren = useCallback(async (path: string, items: FileTreeItem[]): Promise<FileTreeItem[]> => {
    return Promise.all(items.map(async item => {
      if (item.type === 'dir') {
        const children = await loadChildren(item.path);
        return { ...item, children };
      }
      return item;
    }));
  }, [loadChildren]);

  useEffect(() => {
    setIsLoading(true);
    loadChildren('').then(async data => {
      const withChildren = await fetchChildren('', data);
      setTreeData(withChildren);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, [loadChildren, fetchChildren, cacheKey]);

  const toggleExpand = (path: string) => {
    setExpandedPaths(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  };

  const expandAll = useCallback(() => {
    const allPaths = new Set<string>();
    const walk = (items: FileTreeItem[]) => { for (const i of items) { if (i.type === 'dir') { allPaths.add(i.path); if (i.children) walk(i.children); } } };
    walk(treeData); setExpandedPaths(allPaths);
  }, [treeData]);

  const collapseAll = () => setExpandedPaths(new Set());
  const hasExpanded = expandedPaths.size > 0;

  const handleFileClick = (item: FileTreeItem) => {
    if (item.type === 'file') { onFileSelect?.(item.path); router.push(`/${username}/${repoName}/blob/${branch}/${item.path}`); }
    else toggleExpand(item.path);
  };

  const getItemIcon = (item: FileTreeItem) => item.type === 'dir' ? <FolderIcon /> : <FileIcon />;

  const renderTree = (items: FileTreeItem[], level: number = 0): React.ReactNode => items
    .sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'dir' ? -1 : 1)
    .map(item => {
      const isExpanded = expandedPaths.has(item.path);
      const isActive = currentPath === item.path;
      const isAncestor = item.type === 'dir' && currentPath.startsWith(item.path + '/');
      return (
        <div key={item.path}>
          <button className={`group flex items-center gap-1 px-2 py-1 cursor-pointer rounded transition-colors w-full text-left border-none bg-transparent ${isActive ? 'bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)]' : isAncestor ? 'bg-[var(--ds-surface-inset)]' : 'hover:bg-[var(--ds-surface-subtle)]'}`} style={{ paddingLeft: `${8 + level * 16}px` }} onClick={() => handleFileClick(item)}>
            <span className="w-4 h-4 flex items-center justify-center">{item.type === 'dir' ? <ChevronIcon expanded={isExpanded} /> : <span className="w-3" />}</span>
            <span className="text-sm text-[var(--ds-text-secondary)]">{getItemIcon(item)}</span>
            <span className="text-sm text-[var(--ds-text-primary)] truncate">{item.name}</span>
          </button>
          {item.type === 'dir' && isExpanded && item.children && (
            <div>{renderTree(item.children, level + 1)}</div>
          )}
        </div>
      );
    });

  return (
    <Card variant="surface" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--ds-surface-subtle)] border-b border-[var(--ds-border-default)]">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ds-text-primary)]"><FolderIcon /><span>文件</span></div>
        <button className="text-xs text-[var(--ds-accent-default)] bg-transparent border-none cursor-pointer hover:underline" onClick={hasExpanded ? collapseAll : expandAll}>{hasExpanded ? '折叠全部' : '展开全部'}</button>
      </div>
      {isLoading ? (
        <div className="p-4 text-sm text-[var(--ds-text-secondary)]">
          <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="h-4 bg-[var(--ds-surface-subtle)] rounded w-3/4" />)}</div>
        </div>
      ) : treeData.length === 0 ? (
        <div className="p-8 text-center text-sm text-[var(--ds-text-secondary)]">此目录为空</div>
      ) : (
        <div className="py-1">{renderTree(treeData)}</div>
      )}
    </Card>
  );
}

const FileTree = forwardRef(FileTreeComp);
export default FileTree;
