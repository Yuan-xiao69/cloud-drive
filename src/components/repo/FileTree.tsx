'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface FileTreeItem {
  name: string;
  type: 'file' | 'dir';
  path: string;
  children?: FileTreeItem[];
}

interface FileTreeProps {
  username: string;
  repoName: string;
  currentPath: string[];
  branch?: string;  // 当前分支
  rootItems: FileTreeItem[];
  onNavigate: (path: string[]) => void;
}

// 图标组件
const ChevronIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const FolderIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
  </svg>
);

const FolderOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    <path d="M2 10h20" />
  </svg>
);

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);

// 递归渲染单个文件树项
function FileTreeItem({
  item,
  depth,
  currentPath,
  currentPathStr,
  expandedFolders,
  folderContents,
  onToggleExpand,
  onNavigate,
  onLoadChildren,
  username,
  repoName,
}: {
  item: FileTreeItem;
  depth: number;
  currentPath: string[];
  currentPathStr: string;
  expandedFolders: Set<string>;
  folderContents: Record<string, FileTreeItem[]>;
  onToggleExpand: (path: string) => void;
  onNavigate: (path: string[]) => void;
  onLoadChildren: (path: string) => void;
  username: string;
  repoName: string;
}) {
  const isExpanded = expandedFolders.has(currentPathStr);
  const isActive = currentPath.join('/') === currentPathStr.replace(/^\//, '');
  const children = folderContents[currentPathStr] || [];
  const paddingLeft = 12 + depth * 16;

  // 判断是否为当前路径的祖先（需要展开）
  const isAncestor = useMemo(() => {
    const itemPathParts = currentPathStr.split('/').filter(Boolean);
    const currentParts = currentPath;
    if (itemPathParts.length > currentParts.length) return false;
    return itemPathParts.every((part, i) => part === currentParts[i]);
  }, [currentPathStr, currentPath]);

  const handleClick = () => {
    if (item.type === 'dir') {
      onToggleExpand(currentPathStr);
      // 如果尚未加载子目录，先加载
      if (!folderContents[currentPathStr]) {
        onLoadChildren(currentPathStr);
      }
      // 如果是祖先路径，点击应该导航到该目录
      if (isAncestor && currentPath.join('/') !== currentPathStr.replace(/^\//, '')) {
        onNavigate(currentPathStr.split('/').filter(Boolean));
      }
    } else {
      // 文件直接导航
      onNavigate(currentPathStr.split('/').filter(Boolean));
    }
  };

  return (
    <div className="file-tree-item-wrapper">
      <div
        className={`file-tree-item ${isActive ? 'active' : ''} ${isAncestor && item.type === 'dir' ? 'ancestor' : ''}`}
        style={{ paddingLeft: `${paddingLeft}px` }}
        onClick={handleClick}
        title={item.name}
      >
        {item.type === 'dir' && (
          <span className={`tree-expand-icon ${isExpanded ? 'expanded' : ''}`}>
            <ChevronIcon />
          </span>
        )}
        <span className="tree-item-icon">
          {item.type === 'dir' ? (
            isExpanded ? <FolderOpenIcon /> : <FolderIcon />
          ) : (
            <FileIcon />
          )}
        </span>
        <span className="tree-item-name">{item.name}</span>
      </div>
      
      {/* 递归渲染子项 */}
      {item.type === 'dir' && isExpanded && children.length > 0 && (
        <div className="file-tree-children">
          {children.map((child) => (
            <FileTreeItem
              key={`${currentPathStr}/${child.name}`}
              item={child}
              depth={depth + 1}
              currentPath={currentPath}
              currentPathStr={`${currentPathStr}/${child.name}`}
              expandedFolders={expandedFolders}
              folderContents={folderContents}
              onToggleExpand={onToggleExpand}
              onNavigate={onNavigate}
              onLoadChildren={onLoadChildren}
              username={username}
              repoName={repoName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({
  username,
  repoName,
  currentPath,
  branch = 'main',
  rootItems,
  onNavigate,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderContents, setFolderContents] = useState<Record<string, FileTreeItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);

  // 加载子目录内容
  const loadChildren = useCallback(async (folderPath: string) => {
    if (folderContents[folderPath]) return; // 已有缓存
    
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree?path=${encodeURIComponent(folderPath)}&branch=${encodeURIComponent(branch)}`);
      const data = await res.json();
      if (data.code === 200) {
        setFolderContents(prev => ({
          ...prev,
          [folderPath]: data.data?.files || data.data || [],
        }));
      }
    } catch (err) {
      console.error('Failed to load folder contents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [username, repoName, branch, folderContents]);

  // 切换展开/折叠
  const toggleExpand = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
        // 懒加载子目录
        if (!folderContents[path]) {
          loadChildren(path);
        }
      }
      return newSet;
    });
  }, [loadChildren, folderContents]);

  // 当 currentPath 变化时，自动展开相关目录
  useEffect(() => {
    if (currentPath.length > 0) {
      // 展开所有祖先路径
      const pathsToExpand: string[] = [];
      for (let i = 1; i <= currentPath.length; i++) {
        const path = currentPath.slice(0, i).join('/');
        pathsToExpand.push(path);
      }
      
      setExpandedFolders(prev => {
        const newSet = new Set(prev);
        let hasNew = false;
        pathsToExpand.forEach(path => {
          if (!newSet.has(path)) {
            newSet.add(path);
            hasNew = true;
          }
        });
        return hasNew ? newSet : prev;
      });

      // 懒加载未加载的目录
      pathsToExpand.forEach(path => {
        if (!folderContents[path]) {
          loadChildren(path);
        }
      });
    }
  }, [currentPath, folderContents, loadChildren]);

  // 展开/折叠全部
  const expandAll = async () => {
    // 加载所有目录（递归）
    const loadAllDirs = async (items: FileTreeItem[], parentPath: string = '') => {
      const dirs = items.filter(item => item.type === 'dir');
      const newExpanded = new Set<string>();
      
      const loadRecursive = async (items: FileTreeItem[], path: string) => {
        for (const item of items) {
          if (item.type === 'dir') {
            const itemPath = path ? `${path}/${item.name}` : item.name;
            newExpanded.add(itemPath);
            
            // 加载内容
            try {
              const res = await fetch(`/api/v1/repos/${username}/${repoName}/tree?path=${encodeURIComponent(itemPath)}&branch=${encodeURIComponent(branch)}`);
              const data = await res.json();
              if (data.code === 200) {
                setFolderContents(prev => ({
                  ...prev,
                  [itemPath]: data.data?.files || data.data || [],
                }));
                // 递归加载子目录
                await loadRecursive(data.data?.files || data.data || [], itemPath);
              }
            } catch (err) {
              console.error('Failed to load:', itemPath, err);
            }
          }
        }
      };
      
      await loadRecursive(items, parentPath);
      return newExpanded;
    };

    const allDirs = await loadAllDirs(rootItems);
    setExpandedFolders(allDirs);
  };

  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  const hasExpanded = expandedFolders.size > 0;

  return (
    <div className="file-tree-section">
      <div className="file-tree-header">
        <FolderIcon />
        <span>文件</span>
        <div className="file-tree-header-actions">
          <button
            className="tree-expand-all-btn"
            onClick={hasExpanded ? collapseAll : expandAll}
            title={hasExpanded ? '折叠所有' : '展开所有'}
          >
            {hasExpanded ? '折叠' : '展开'}
          </button>
        </div>
      </div>
      <div className="file-tree">
        {isLoading && (
          <div className="file-tree-loading">
            <span>加载中...</span>
          </div>
        )}
        
        {/* 渲染根目录项目 */}
        {rootItems.map((item) => (
          <FileTreeItem
            key={item.name}
            item={item}
            depth={0}
            currentPath={currentPath}
            currentPathStr={item.name}
            expandedFolders={expandedFolders}
            folderContents={folderContents}
            onToggleExpand={toggleExpand}
            onNavigate={onNavigate}
            onLoadChildren={loadChildren}
            username={username}
            repoName={repoName}
          />
        ))}

        {rootItems.length === 0 && !isLoading && (
          <div className="file-tree-empty">
            <FileIcon />
            <span>暂无文件</span>
          </div>
        )}
      </div>
    </div>
  );
}
