'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import ChunkedUploader from './ChunkedUploader';

interface FolderUploaderProps {
  username: string;
  repoName: string;
  currentPath: string;
  branch?: string;  // 当前分支
  onUploadComplete?: (files: { id: string; name: string; fileSize: number }[]) => void;
  onClose?: () => void;
}

interface FileEntry {
  name: string;
  path: string;
  file?: File;
  type: 'file' | 'folder';
  children?: FileEntry[];
  size?: number;
}

interface UploadResult {
  id: string;
  name: string;
  fileSize: number;
}

export default function FolderUploader({
  username,
  repoName,
  currentPath,
  branch = 'main',
  onUploadComplete,
  onClose
}: FolderUploaderProps) {
  const [showFolderSelect, setShowFolderSelect] = useState(true);
  const [showChunkedUploader, setShowChunkedUploader] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  // 选择文件夹
  const handleFolderSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const items = e.target.files;
    if (!items) return;
    
    const entries: FileEntry[] = [];
    
    const processEntry = async (file: File, path: string) => {
      const name = file.webkitRelativePath.split('/').pop() || file.name;
      const fullPath = path + '/' + name;
      
      const entry: FileEntry = {
        name,
        path: fullPath,
        file,
        type: 'file',
        size: file.size
      };
      
      return entry;
    };
    
    const processFiles = async () => {
      const fileArray: FileEntry[] = [];
      
      for (let i = 0; i < items.length; i++) {
        const file = items[i];
        const entry = await processEntry(file, '');
        fileArray.push(entry);
      }
      
      setSelectedFiles(fileArray);
      setShowChunkedUploader(true);
      setShowFolderSelect(false);
    };
    
    processFiles();
  }, []);
  
  // 拖拽上传文件夹
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;
    
    const entries: FileEntry[] = [];
    
    const processDataTransferItem = async (item: DataTransferItem): Promise<FileEntry | null> => {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.();
        if (entry) {
          if (entry.isFile) {
            const file = item.getAsFile();
            if (file) {
              return {
                name: entry.name,
                path: '/' + entry.name,
                file,
                type: 'file',
                size: file.size
              };
            }
          } else if (entry.isDirectory) {
            return {
              name: entry.name,
              path: '/' + entry.name,
              type: 'folder'
            };
          }
        } else {
          // Fallback for browsers without FileSystem API
          const file = item.getAsFile();
          if (file) {
            return {
              name: file.name,
              path: '/' + file.name,
              file,
              type: 'file',
              size: file.size
            };
          }
        }
      }
      return null;
    };
    
    const processItems = async () => {
      for (let i = 0; i < items.length; i++) {
        const entry = await processDataTransferItem(items[i]);
        if (entry) {
          entries.push(entry);
        }
      }
      
      if (entries.length > 0) {
        setSelectedFiles(entries);
        setShowChunkedUploader(true);
        setShowFolderSelect(false);
      }
    };
    
    processItems();
  }, []);
  
  const handleUploadComplete = useCallback((file: UploadResult) => {
    onUploadComplete?.([file]);
  }, [onUploadComplete]);
  
  const handleBack = useCallback(() => {
    setShowChunkedUploader(false);
    setShowFolderSelect(true);
    setSelectedFiles([]);
  }, []);
  
  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // 计算总大小
  const totalSize = selectedFiles.reduce((sum, f) => sum + (f.size || 0), 0);
  
  return (
    <div className="folder-uploader">
      {showFolderSelect && (
        <>
          <div className="uploader-header">
            <span className="uploader-title">上传文件夹</span>
            {onClose && (
              <button className="close-btn" onClick={onClose}>&times;</button>
            )}
          </div>
          
          <div
            role="button"
            tabIndex={0}
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => folderInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); folderInputRef.current?.click(); } }}
          >
            <p className="drop-zone-text">
              选择文件夹或拖拽到此处
            </p>
            <p className="drop-zone-hint">
              将上传整个文件夹及其所有文件
            </p>
            <input
              ref={folderInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is a non-standard attribute
              webkitdirectory=""
              multiple
              className="file-input"
              onChange={handleFolderSelect}
            />
          </div>
        </>
      )}
      
      {showChunkedUploader && selectedFiles.length > 0 && (
        <>
          <div className="uploader-header">
            <button className="back-btn" onClick={handleBack}>&larr;</button>
            <span className="uploader-title">文件夹上传</span>
            {onClose && (
              <button className="close-btn" onClick={onClose}>&times;</button>
            )}
          </div>
          
          <div className="folder-info">
            <div className="folder-stats">
              <span>📁 {selectedFiles.filter(f => f.type === 'folder').length} 个子文件夹</span>
              <span>📄 {selectedFiles.filter(f => f.type === 'file').length} 个文件</span>
              <span>💾 {formatFileSize(totalSize)}</span>
            </div>
          </div>
          
          <div className="file-preview">
            {selectedFiles.slice(0, 10).map((file, index) => (
              <div key={index} className="file-preview-item">
                <span className="file-icon">{file.type === 'folder' ? '📁' : '📄'}</span>
                <span className="file-name">{file.path}</span>
                {file.size && (
                  <span className="file-size">{formatFileSize(file.size)}</span>
                )}
              </div>
            ))}
            {selectedFiles.length > 10 && (
              <div className="file-preview-more">
                还有 {selectedFiles.length - 10} 个文件...
              </div>
            )}
          </div>
          
          {/* 显示分片上传器 */}
          <div className="chunked-upload-area">
            <ChunkedUploader
              username={username}
              repoName={repoName}
              currentPath={currentPath}
              branch={branch}
              onUploadComplete={handleUploadComplete}
              onClose={onClose}
              maxConcurrent={2}
            />
          </div>
        </>
      )}
      
      <style>{`
        .folder-uploader {
          background: var(--ds-surface-default);
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          padding: 16px;
          max-width: 600px;
        }
        
        .uploader-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .uploader-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--ds-text-primary);
        }
        
        .back-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: var(--ds-text-secondary);
          padding: 4px 8px;
          margin-right: 8px;
        }
        
        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
          color: var(--ds-text-secondary);
          padding: 4px;
        }
        
        .drop-zone {
          border: 2px dashed var(--ds-border-default);
          border-radius: 6px;
          padding: 32px;
          text-align: center;
          transition: all 0.2s;
          cursor: pointer;
        }
        
        .drop-zone:hover,
        .drop-zone.dragging {
          border-color: var(--ds-accent-default);
          background: var(--ds-surface-subtle);
        }
        
        .drop-zone-text {
          color: var(--ds-text-secondary);
          margin-bottom: 8px;
        }
        
        .drop-zone-hint {
          font-size: 12px;
          color: var(--ds-text-tertiary);
        }
        
        .file-input {
          display: none;
        }
        
        .folder-info {
          background: var(--ds-surface-subtle);
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 12px;
        }
        
        .folder-stats {
          display: flex;
          gap: 16px;
          font-size: 14px;
          color: var(--ds-text-secondary);
        }
        
        .file-preview {
          max-height: 200px;
          overflow-y: auto;
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          margin-bottom: 16px;
        }
        
        .file-preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid var(--ds-border-default);
        }
        
        .file-preview-item:last-child {
          border-bottom: none;
        }
        
        .file-icon {
          font-size: 16px;
        }
        
        .file-name {
          flex: 1;
          font-size: 13px;
          color: var(--ds-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-size {
          font-size: 12px;
          color: var(--ds-text-tertiary);
        }
        
        .file-preview-more {
          padding: 8px 12px;
          text-align: center;
          font-size: 12px;
          color: var(--ds-text-tertiary);
        }
        
        .chunked-upload-area {
          margin-top: 16px;
        }
      `}</style>
    </div>
  );
}
