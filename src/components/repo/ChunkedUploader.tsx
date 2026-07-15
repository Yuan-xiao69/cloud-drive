'use client';

import React, { useState, useRef, useCallback, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useAuth } from '@/lib/providers';
import { tokenManager } from '@/lib/api/client';
import { Button } from '@/components/design';
import toast from 'react-hot-toast';

interface ChunkedUploaderProps {
  username: string;
  repoName: string;
  currentPath: string;
  branch?: string;  // 当前分支
  onUploadComplete?: (file: { id: string; name: string; fileSize: number }) => void;
  onClose?: () => void;
  maxConcurrent?: number;
  onFilesSelected?: (files: File[]) => void;
  showQueueButton?: boolean;
  onGlobalDragEnter?: () => void;
  onGlobalDragLeave?: () => void;
  onGlobalDrop?: (files: File[]) => void;
}

interface UploadFile {
  id: string;
  file: File;
  uploadId?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  uploadedChunks?: number[];
  skipped?: boolean;
  result?: {
    id: string;
    name: string;
    fileSize: number;
    fileHash?: string;
  };
}

interface UploadInitResponse {
  code: number;
  data: {
    uploadId?: string;
    chunkSize?: number;
    totalChunks?: number;
    expiresAt?: string;
    skipped?: boolean;
    fileId?: string;
    message?: string;
    existingFile?: {
      id: string;
      name: string;
      fileSize: number;
      mimeType?: string;
      path?: string;
    };
  };
}

interface UploadChunkResponse {
  code: number;
  data?: {
    received?: boolean;
    chunkIndex?: number;
    uploadedChunks?: number;
    totalChunks?: number;
    skipped?: boolean;
    message?: string;
  };
}

interface UploadCompleteResponse {
  code: number;
  message?: string;
  data?: {
    id: string;
    name: string;
    type: string;
    fileSize: number;
    fileHash?: string;
  };
}

interface UploadStatusResponse {
  code: number;
  data?: {
    uploadId: string;
    uploadedChunks: number[];
    totalChunks: number;
    fileName?: string;
    parentPath?: string;
    totalSize?: number;
    progress?: number;
  };
}

interface PasteOverlayProps {
  isVisible: boolean;
  imageUrl: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  fileName: string;
}

async function calculateFileHash(file: File): Promise<string> {
  const CHUNK_SIZE = 10 * 1024 * 1024;
  const chunks = Math.ceil(file.size / CHUNK_SIZE);
  const hashBuffer: Uint8Array[] = [];
  
  for (let i = 0; i < chunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = await file.slice(start, end).arrayBuffer();
    hashBuffer.push(new Uint8Array(chunk));
  }
  
  const totalLength = hashBuffer.reduce((sum, arr) => sum + arr.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of hashBuffer) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  const cryptoObj = window.crypto || (window as unknown as { crypto: { subtle: { digest: (alg: string, data: BufferSource) => Promise<ArrayBuffer> } } }).crypto;
  const hashBuffer2 = await cryptoObj.subtle.digest('SHA-256', combined);
  const hashArray = Array.from(new Uint8Array(hashBuffer2));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 粘贴预览弹窗组件
function PasteOverlay({ isVisible, imageUrl, onConfirm, onCancel, fileName }: PasteOverlayProps) {
  if (!isVisible || !imageUrl) return null;
  
  return (
    <div className="paste-overlay">
      <div className="paste-modal">
        <div className="paste-modal-header">
          <span>粘贴截图预览</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>&times;</Button>
        </div>
        <div className="paste-modal-body">
          <img src={imageUrl} alt="粘贴的图片" className="paste-preview-image" />
          <div className="paste-file-info">
            <span className="paste-file-name">{fileName}</span>
          </div>
        </div>
        <div className="paste-modal-footer">
          <Button variant="secondary" size="sm" onClick={onCancel}>取消</Button>
          <Button variant="primary" size="sm" onClick={onConfirm}>添加到上传队列</Button>
        </div>
      </div>
      <style>{`
        .paste-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .paste-modal {
          background: var(--ds-surface-default);
          border-radius: 8px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          display: flex;
          flex-direction: column;
        }
        .paste-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--ds-border-default);
          font-weight: 600;
        }
        .paste-modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: var(--ds-text-secondary);
          padding: 4px;
          line-height: 1;
        }
        .paste-modal-body {
          padding: 16px;
          overflow: auto;
          flex: 1;
        }
        .paste-preview-image {
          max-width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 4px;
          background: var(--ds-surface-inset);
        }
        .paste-file-info {
          margin-top: 12px;
          padding: 8px 12px;
          background: var(--ds-surface-subtle);
          border-radius: 4px;
        }
        .paste-file-name {
          font-size: 14px;
          color: var(--ds-text-primary);
          word-break: break-all;
        }
        .paste-modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 12px 16px;
          border-top: 1px solid var(--ds-border-default);
        }
      `}</style>
    </div>
  );
}

// 全局拖拽覆盖层组件
function GlobalDropOverlay({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  
  return (
    <div className="global-drop-overlay">
      <div className="global-drop-content">
        <div className="drop-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span className="drop-text">释放文件以上传</span>
      </div>
      <style>{`
        .global-drop-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(3, 102, 214, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9998;
          pointer-events: none;
        }
        .global-drop-content {
          text-align: center;
          color: #fff;
        }
        .drop-icon {
          margin-bottom: 16px;
        }
        .drop-icon svg {
          stroke: #fff;
        }
        .drop-text {
          font-size: 24px;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

export interface ChunkedUploaderRef {
  triggerFileInput: () => void;
}

const ChunkedUploader = forwardRef<ChunkedUploaderRef, ChunkedUploaderProps>(function ChunkedUploader({
  username,
  repoName,
  currentPath,
  branch = 'main',
  onUploadComplete,
  onClose,
  maxConcurrent = 3,
  onFilesSelected,
  showQueueButton = false,
  onGlobalDragEnter,
  onGlobalDragLeave,
  onGlobalDrop
}, ref) {
  const { user } = useAuth();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGlobalDrop, setShowGlobalDrop] = useState(false);
  const [pasteOverlay, setPasteOverlay] = useState<{ visible: boolean; imageUrl: string | null; file: File | null }>({
    visible: false,
    imageUrl: null,
    file: null
  });
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  
  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    triggerFileInput: () => {
      fileInputRef.current?.click();
    }
  }), []);
  const globalDropRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);
  
  // 前端文件大小限制
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_FILE_SIZE_STR = '100MB';

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    
    const newFiles: UploadFile[] = [];
    const oversizedFiles: string[] = [];
    
    for (const file of Array.from(fileList)) {
      if (file.size > MAX_FILE_SIZE) {
        oversizedFiles.push(`${file.name} (${formatFileSize(file.size)})`);
        continue;
      }
      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        progress: 0,
        status: 'pending' as const,
        skipped: false
      });
    }
    
    if (oversizedFiles.length > 0) {
      toast(`以下文件超过大小限制（${MAX_FILE_SIZE_STR}），已跳过：\n${oversizedFiles.join('\n')}`);
    }
    
    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
    }
    
    // 如果有 onFilesSelected 回调，传递给父组件
    if (onFilesSelected) {
      onFilesSelected(Array.from(fileList));
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);
  
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
    
    const fileList = e.dataTransfer.files;
    if (!fileList || fileList.length === 0) return;
    
    const newFiles: UploadFile[] = Array.from(fileList).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const,
      skipped: false
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    
    // 如果有 onFilesSelected 回调，传递给父组件
    if (onFilesSelected) {
      onFilesSelected(Array.from(fileList));
    }
  }, [onFilesSelected]);
  
  const removeFile = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(id);
    }
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // 添加文件到队列
  const addFilesToQueue = useCallback((newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file,
      progress: 0,
      status: 'pending' as const,
      skipped: false
    }));
    
    setFiles(prev => [...prev, ...uploadFiles]);
    
    if (onFilesSelected) {
      onFilesSelected(newFiles);
    }
  }, [onFilesSelected]);

  // 粘贴上传处理
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          const fileName = `截图_${timestamp}.png`;
          
          // 显示预览弹窗
          const imageUrl = URL.createObjectURL(file);
          setPasteOverlay({
            visible: true,
            imageUrl,
            file: new File([file], fileName, { type: 'image/png' })
          });
        }
        return;
      }
    }
  }, []);

  // 确认粘贴上传
  const confirmPasteUpload = useCallback(() => {
    if (pasteOverlay.file) {
      addFilesToQueue([pasteOverlay.file]);
      setPasteOverlay({ visible: false, imageUrl: null, file: null });
    }
  }, [pasteOverlay.file, addFilesToQueue]);

  // 取消粘贴上传
  const cancelPasteUpload = useCallback(() => {
    if (pasteOverlay.imageUrl) {
      URL.revokeObjectURL(pasteOverlay.imageUrl);
    }
    setPasteOverlay({ visible: false, imageUrl: null, file: null });
  }, [pasteOverlay.imageUrl]);

  // 全局拖拽事件处理
  const handleGlobalDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer?.types.includes('Files')) {
      setShowGlobalDrop(true);
      setIsDragging(true);
      onGlobalDragEnter?.();
    }
  }, [onGlobalDragEnter]);

  const handleGlobalDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
  }, []);

  const handleGlobalDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setShowGlobalDrop(false);
      setIsDragging(false);
      onGlobalDragLeave?.();
    }
  }, [onGlobalDragLeave]);

  const handleGlobalDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setShowGlobalDrop(false);
    setIsDragging(false);
    onGlobalDragLeave?.();

    const fileList = e.dataTransfer?.files;
    if (fileList && fileList.length > 0) {
      const files = Array.from(fileList);
      addFilesToQueue(files);
      onGlobalDrop?.(files);
    }
  }, [addFilesToQueue, onGlobalDragLeave, onGlobalDrop]);

  // 组件挂载时添加全局事件监听
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragenter', handleGlobalDragEnter);
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragenter', handleGlobalDragEnter);
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);
    };
  }, [handlePaste, handleGlobalDragEnter, handleGlobalDragOver, handleGlobalDragLeave, handleGlobalDrop]);

  // 拖拽重排序
  const handleFileDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedFileId(id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleFileDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedFileId && draggedFileId !== id) {
      setDragOverTargetId(id);
    }
  }, [draggedFileId]);

  const handleFileDragLeave = useCallback(() => {
    setDragOverTargetId(null);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDragOverTargetId(null);
    
    if (draggedFileId && draggedFileId !== targetId) {
      setFiles(prev => {
        const newFiles = [...prev];
        const draggedIndex = newFiles.findIndex(f => f.id === draggedFileId);
        const targetIndex = newFiles.findIndex(f => f.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          const [draggedItem] = newFiles.splice(draggedIndex, 1);
          newFiles.splice(targetIndex, 0, draggedItem);
        }
        
        return newFiles;
      });
    }
    setDraggedFileId(null);
  }, [draggedFileId]);

  const handleFileDragEnd = useCallback(() => {
    setDraggedFileId(null);
    setDragOverTargetId(null);
  }, []);
  
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const uploadSingleFile = useCallback(async (uploadItem: UploadFile, chunkSize: number) => {
    const { file, id } = uploadItem;
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    const controller = new AbortController();
    abortControllersRef.current.set(id, controller);
    
    try {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'uploading' as const, progress: 0 } : f
      ));
      
      const fileHash = await calculateFileHash(file);
      
      // 获取认证 token
      const token = tokenManager.getAccessToken();
      const authHeaders: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const initResponse = await fetch(
        `/api/v1/repos/${username}/${repoName}/upload-chunked?action=init`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            // path 为完整文件路径（目录 + 文件名），与后端 path: filePath 字段名一致
            path: currentPath
              ? `${currentPath.replace(/\/$/, '')}/${file.name}`
              : `/${file.name}`,
            totalChunks,
            chunkSize,
            fileHash,
            branch  // 传递当前分支
          }),
          signal: controller.signal
        }
      );
      
      if (!initResponse.ok) {
        const data: UploadInitResponse = await initResponse.json();
        const err: any = new Error(data.data?.message || '初始化上传失败');
        err.status = initResponse.status;
        throw err;
      }
      
      const initData: UploadInitResponse = await initResponse.json();
      
      if (initData.data?.skipped) {
        const existingFile = initData.data?.existingFile;
        setFiles(prev => prev.map(f =>
          f.id === id ? {
            ...f,
            status: 'completed' as const,
            progress: 100,
            skipped: true,
            result: {
              id: existingFile?.id || '',
              name: existingFile?.name || file.name,
              fileSize: existingFile?.fileSize || file.size
            }
          } : f
        ));

        onUploadComplete?.({
          id: existingFile?.id || '',
          name: existingFile?.name || file.name,
          fileSize: existingFile?.fileSize || file.size
        });
        return;
      }
      
      const uploadId = initData.data?.uploadId!;
      const serverChunkSize = initData.data?.chunkSize || chunkSize;
      const serverTotalChunks = initData.data?.totalChunks || totalChunks;
      
      const statusResponse = await fetch(
        `/api/v1/repos/${username}/${repoName}/upload-chunked?uploadId=${uploadId}`,
        { headers: authHeaders, signal: controller.signal }
      );
      
      let uploadedChunks: number[] = [];
      if (statusResponse.ok) {
        const statusData: UploadStatusResponse = await statusResponse.json();
        uploadedChunks = statusData.data?.uploadedChunks || [];
      }
      
      const chunksToUpload: number[] = [];
      for (let i = 0; i < serverTotalChunks; i++) {
        if (!uploadedChunks.includes(i)) {
          chunksToUpload.push(i);
        }
      }
      
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, uploadId, uploadedChunks } : f
      ));
      
      let completedChunks = uploadedChunks.length;
      
      const uploadChunk = async (chunkIndex: number) => {
        const start = chunkIndex * serverChunkSize;
        const end = Math.min(start + serverChunkSize, file.size);
        const chunk = file.slice(start, end);
        const chunkBase64 = await blobToBase64(chunk);
        
        const chunkResponse = await fetch(
          `/api/v1/repos/${username}/${repoName}/upload-chunked?action=chunk`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({
              uploadId,
              chunkIndex,
              chunkData: chunkBase64,
              totalChunks: serverTotalChunks,
              fileName: file.name,
              parentPath: currentPath || '/',
              totalSize: file.size,
              branch  // 传递当前分支
            }),
            signal: controller.signal
          }
        );
        
        if (!chunkResponse.ok) {
          const data: UploadChunkResponse = await chunkResponse.json();
          throw new Error(data.data?.message || '分片上传失败');
        }
        
        completedChunks++;
        const progress = Math.round((completedChunks / serverTotalChunks) * 100);
        setFiles(prev => prev.map(f => 
          f.id === id ? { ...f, progress, uploadedChunks: [...(f.uploadedChunks || []), chunkIndex] } : f
        ));
      };
      
      while (chunksToUpload.length > 0) {
        const batch = chunksToUpload.splice(0, maxConcurrent);
        await Promise.all(batch.map(uploadChunk));
      }
      
      const completeResponse = await fetch(
        `/api/v1/repos/${username}/${repoName}/upload-chunked?action=complete`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ uploadId }),
          signal: controller.signal
        }
      );
      
      if (!completeResponse.ok) {
        const data: UploadCompleteResponse = await completeResponse.json();
        throw new Error(data.message || '完成上传失败');
      }
      
      const completeData: UploadCompleteResponse = await completeResponse.json();
      
      setFiles(prev => prev.map(f => 
        f.id === id ? { 
          ...f, 
          status: 'completed' as const, 
          progress: 100,
          result: completeData.data
        } : f
      ));
      
      onUploadComplete?.(completeData.data!);
      
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'paused' as const } : f
        ));
      } else if ((error as any).status === 409) {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error' as const, error: (error as Error).message } : f
        ));
      } else {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error' as const, error: (error as Error).message } : f
        ));
      }
    } finally {
      abortControllersRef.current.delete(id);
    }
  }, [username, repoName, currentPath, maxConcurrent, onUploadComplete]);
  
  const startUpload = useCallback(async () => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;
    
    setUploading(true);
    const chunkSize = 5 * 1024 * 1024;
    
    for (const file of pendingFiles) {
      await uploadSingleFile(file, chunkSize);
    }
    
    setUploading(false);
  }, [files, uploadSingleFile]);

  // 暂停上传
  const pauseFile = useCallback((id: string) => {
    const controller = abortControllersRef.current.get(id);
    if (controller) {
      controller.abort();
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'paused' as const } : f
      ));
    }
  }, []);

  // 继续上传
  const resumeFile = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    if (file && file.status === 'paused') {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'pending' as const } : f
      ));
    }
  }, [files]);

  // 重试上传
  const retryFile = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    if (file && file.status === 'error') {
      setFiles(prev => prev.map(f => 
        f.id === id ? { ...f, status: 'pending' as const, error: undefined } : f
      ));
    }
  }, [files]);

  // 暂停所有
  const pauseAll = useCallback(() => {
    abortControllersRef.current.forEach((controller, id) => {
      if (!controller.signal.aborted) {
        controller.abort();
        setFiles(prev => prev.map(f => 
          f.id === id && f.status === 'uploading' ? { ...f, status: 'paused' as const } : f
        ));
      }
    });
  }, []);

  // 继续所有暂停的任务
  const resumeAll = useCallback(() => {
    setFiles(prev => prev.map(f => 
      f.status === 'paused' ? { ...f, status: 'pending' as const } : f
    ));
  }, []);

  // 取消所有已完成之外的任务
  const cancelAll = useCallback(() => {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    setFiles([]);
  }, []);

  // 清除已完成
  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'));
  }, []);
  
  useEffect(() => {
    return () => {
      abortControllersRef.current.forEach(controller => controller.abort());
    };
  }, []);
  
  return (
    <div className="chunked-uploader" ref={globalDropRef}>
      {/* 粘贴预览弹窗 */}
      <PasteOverlay
        isVisible={pasteOverlay.visible}
        imageUrl={pasteOverlay.imageUrl}
        fileName={pasteOverlay.file?.name || ''}
        onConfirm={confirmPasteUpload}
        onCancel={cancelPasteUpload}
      />
      
      {/* 全局拖拽覆盖层 */}
      <GlobalDropOverlay isVisible={showGlobalDrop} />
      
      <div className="uploader-header">
        <span className="uploader-title">上传文件</span>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>&times;</Button>
        )}
      </div>
      
      <div
        role="button"
        tabIndex={0}
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
      >
        <p className="drop-zone-text">
          拖拽文件到此处，或点击选择文件
        </p>
        <p className="drop-zone-hint">
          支持任意大小的文件，支持断点续传 | Ctrl+V 粘贴截图
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="file-input"
          onChange={handleFileSelect}
        />
      </div>
      
      {files.length > 0 && (
        <div className="file-list">
          <div className="file-list-header">
            <span>文件名</span>
            <span>大小</span>
            <span>状态</span>
            <span>操作</span>
          </div>
          {files.map(uploadFile => (
            <div
              key={uploadFile.id}
              className={`file-item ${dragOverTargetId === uploadFile.id ? 'drag-over' : ''} ${draggedFileId === uploadFile.id ? 'dragging' : ''}`}
              draggable
              onDragStart={(e) => handleFileDragStart(e, uploadFile.id)}
              onDragOver={(e) => handleFileDragOver(e, uploadFile.id)}
              onDragLeave={handleFileDragLeave}
              onDrop={(e) => handleFileDrop(e, uploadFile.id)}
              onDragEnd={handleFileDragEnd}
            >
              <div className="file-drag-handle" title="拖拽排序">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="1.5" />
                  <circle cx="15" cy="6" r="1.5" />
                  <circle cx="9" cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9" cy="18" r="1.5" />
                  <circle cx="15" cy="18" r="1.5" />
                </svg>
              </div>
              <span className="file-icon">
                {uploadFile.file.type.startsWith('image/') ? '🖼️' :
                 uploadFile.file.type.startsWith('video/') ? '🎬' :
                 uploadFile.file.type.startsWith('audio/') ? '🎵' :
                 uploadFile.file.type.includes('pdf') ? '📕' :
                 uploadFile.file.name.endsWith('.zip') || uploadFile.file.name.endsWith('.rar') ? '📦' : '📄'}
              </span>
              <div className="file-info">
                <div className="file-name" title={uploadFile.file.name}>{uploadFile.file.name}</div>
                <div className="file-size">{formatFileSize(uploadFile.file.size)}</div>
              </div>
              <div className="file-status">
                {uploadFile.status === 'uploading' && (
                  <>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${uploadFile.progress}%` }}></div>
                    </div>
                    <span className="progress-text">{uploadFile.progress}%</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => pauseFile(uploadFile.id)}
                      title="暂停"
                    >
                      ⏸
                    </Button>
                  </>
                )}
                {uploadFile.status === 'completed' && (
                  <span className="status-badge status-completed">
                    {uploadFile.skipped ? '已存在' : '✓ 完成'}
                  </span>
                )}
                {uploadFile.status === 'error' && (
                  <span className="status-badge status-error" title={uploadFile.error}>
                    ✗ 失败
                  </span>
                )}
                {uploadFile.status === 'paused' && (
                  <>
                    <span className="status-badge status-paused">⏸ 已暂停</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resumeFile(uploadFile.id)}
                      title="继续"
                    >
                      ▶
                    </Button>
                  </>
                )}
                {uploadFile.status === 'pending' && (
                  <span className="status-badge status-pending">⏳ 等待</span>
                )}
              </div>
              <div className="file-actions">
                {uploadFile.status === 'error' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryFile(uploadFile.id)}
                    title="重试"
                  >
                    ↻
                  </Button>
                )}
                {(uploadFile.status === 'pending' || uploadFile.status === 'error' || uploadFile.status === 'paused') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadFile.id)}
                    title="移除"
                  >
                    ×
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {files.length > 0 && (
        <div className="action-bar">
          <div className="action-bar-left">
            {showQueueButton && (
              <>
                {uploading && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={pauseAll}
                    title="暂停全部"
                  >
                    ⏸ 暂停
                  </Button>
                )}
                {files.some(f => f.status === 'paused') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={resumeAll}
                    title="继续全部"
                  >
                    ▶ 继续
                  </Button>
                )}
                {files.some(f => f.status === 'completed') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={clearCompleted}
                    title="清除已完成"
                  >
                    🗑 清除完成
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={cancelAll}
                  disabled={uploading}
                  title="取消全部"
                >
                  × 取消全部
                </Button>
              </>
            )}
          </div>
          <div className="action-bar-right">
            <span className="file-count">
              {files.filter(f => f.status === 'completed').length}/{files.length} 已完成
              {files.some(f => f.status === 'error') && (
                <span className="error-count">
                  {' '}| {files.filter(f => f.status === 'error').length} 失败
                </span>
              )}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setFiles([])}
              disabled={uploading}
            >
              清空队列
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={startUpload}
              disabled={uploading || files.filter(f => f.status === 'pending').length === 0}
            >
              {uploading ? '上传中...' : `上传 ${files.filter(f => f.status === 'pending').length} 个文件`}
            </Button>
          </div>
        </div>
      )}
      
      {files.length > 0 && (
        <p className="upload-info">
          分片大小: 5MB | 最大并发: {maxConcurrent} | 支持断点续传
        </p>
      )}
      
      <style>{`
        .chunked-uploader {
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
          margin-bottom: 16px;
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
        
        .file-list {
          margin-bottom: 16px;
        }
        
        .file-list-header {
          display: grid;
          grid-template-columns: 24px 32px 1fr 180px 80px;
          gap: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          color: var(--ds-text-secondary);
          border-bottom: 1px solid var(--ds-border-default);
          margin-bottom: 4px;
        }
        
        .file-item {
          display: grid;
          grid-template-columns: 24px 32px 1fr 180px 80px;
          gap: 8px;
          align-items: center;
          padding: 12px;
          border: 1px solid var(--ds-border-default);
          border-radius: 6px;
          margin-bottom: 8px;
          background: var(--ds-surface-default);
          transition: all 0.2s;
          cursor: grab;
        }
        
        .file-item:hover {
          background: var(--ds-surface-subtle);
        }
        
        .file-item.dragging {
          opacity: 0.5;
          transform: scale(0.98);
        }
        
        .file-item.drag-over {
          border-color: var(--ds-accent-default);
          background: var(--ds-accent-subtle);
        }
        
        .file-drag-handle {
          cursor: grab;
          color: var(--ds-text-tertiary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .file-drag-handle:active {
          cursor: grabbing;
        }
        
        .file-icon {
          font-size: 20px;
          text-align: center;
        }
        
        .file-info {
          min-width: 0;
        }
        
        .file-name {
          font-weight: 500;
          color: var(--ds-text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-size {
          font-size: 12px;
          color: var(--ds-text-secondary);
        }
        
        .file-status {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .progress-bar {
          width: 80px;
          height: 6px;
          background: var(--ds-border-default);
          border-radius: 3px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: var(--ds-accent-default);
          transition: width 0.3s;
        }
        
        .progress-text {
          font-size: 12px;
          color: var(--ds-text-secondary);
          min-width: 36px;
        }
        
        .status-badge {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          white-space: nowrap;
        }
        
        .status-pending {
          background: var(--ds-border-default);
          color: var(--ds-text-secondary);
        }
        
        .status-uploading {
          background: var(--ds-accent-subtle);
          color: var(--ds-accent-default);
        }
        
        .status-completed {
          background: var(--ds-success-subtle);
          color: var(--ds-success-default);
        }
        
        .status-error {
          background: var(--ds-danger-subtle);
          color: var(--ds-danger-default);
        }
        
        .status-paused {
          background: var(--ds-warning-subtle);
          color: var(--ds-warning-default);
        }
        
        .status-skipped {
          background: var(--ds-warning-subtle);
          color: var(--ds-warning-default);
        }
        
        .queue-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 4px;
          font-size: 12px;
          border-radius: 4px;
          transition: background 0.2s;
        }
        
        .pause-btn:hover,
        .resume-btn:hover {
          background: var(--ds-border-default);
        }
        
        .file-actions {
          display: flex;
          gap: 4px;
          justify-content: flex-end;
        }
        
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--ds-text-tertiary);
          font-size: 16px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
          line-height: 1;
        }
        
        .retry-btn:hover {
          color: var(--ds-accent-default);
          background: var(--ds-accent-subtle);
        }
        
        .remove-btn:hover {
          color: var(--ds-danger-default);
          background: var(--ds-danger-subtle);
        }
        
        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        
        .action-bar-left,
        .action-bar-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .file-count {
          font-size: 12px;
          color: var(--ds-text-secondary);
          white-space: nowrap;
        }
        
        .error-count {
          color: var(--ds-danger-default);
        }
        
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .btn-secondary {
          background: var(--ds-surface-subtle);
          border: 1px solid var(--ds-border-default);
          color: var(--ds-text-primary);
        }
        
        .btn-secondary:hover {
          background: var(--ds-border-default);
        }
        
        .btn-primary {
          background: var(--ds-accent-default);
          border: 1px solid var(--ds-accent-default);
          color: #fff;
        }
        
        .btn-primary:hover {
          background: var(--ds-accent-default);
        }
        
        .btn-primary:disabled {
          background: var(--ds-border-default);
          border-color: var(--ds-border-default);
          color: var(--ds-text-tertiary);
          cursor: not-allowed;
        }
        
        .btn-outline {
          background: transparent;
          border: 1px solid var(--ds-border-default);
          color: var(--ds-text-primary);
          padding: 6px 12px;
          font-size: 12px;
        }
        
        .btn-outline:hover {
          background: var(--ds-surface-subtle);
          border-color: var(--ds-text-secondary);
        }
        
        .btn-outline.btn-danger:hover {
          background: var(--ds-danger-subtle);
          border-color: var(--ds-danger-default);
          color: var(--ds-danger-default);
        }
        
        .upload-info {
          font-size: 12px;
          color: var(--ds-text-secondary);
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
});

export default ChunkedUploader;
