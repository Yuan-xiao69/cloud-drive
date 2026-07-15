'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { sanitizeHtml } from '@/lib/security';
import { api } from '@/lib/api/client';
import ZipPreview from '@/components/repo/blob/ZipPreview';
import FileEditor from '@/components/repo/FileEditor';
import { Button, PageLayout, PageLayoutContent } from '@/components/design';
import { useAuth } from '@/lib/providers';
import toast from 'react-hot-toast';

const FileIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M3.5 1.75a.25.25 0 0 0-.25.25v11.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V6H9.75A1.75 1.75 0 0 1 8 4.25V1.75H3.5zm5.5 0v1.5a.25.25 0 0 0 .25.25H11v2.75A1.75 1.75 0 0 1 9.25 6H8V1.75z"/>
  </svg>
);

const RepoIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

interface ZipTreeNode { name: string; size: number; isDir: boolean; children: ZipTreeNode[]; }

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function renderZipTree(nodes: ZipTreeNode[], depth: number): React.ReactNode {
  return nodes.map((node, i) => (
    <React.Fragment key={`${depth}-${i}`}>
      <div className="zip-file-item" style={{ paddingLeft: 12 + depth * 20 }}>
        {node.isDir ? '📁' : '📄'} <span className="zip-file-name">{node.name}</span>
        {!node.isDir && <span className="zip-file-size">{formatSize(node.size)}</span>}
        {node.isDir && <span className="zip-file-size">目录</span>}
      </div>
      {node.children.length > 0 && renderZipTree(node.children, depth + 1)}
    </React.Fragment>
  ));
}

function base64ToUint8Array(base64: string): Uint8Array | null {
  try {
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
    const binaryString = atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** 简洁的文本文件预览 —— 文件托管定位，不做代码阅读器 */
function TextPreview({ content, fileName, isOwner, onEdit }: {
  content: string;
  fileName: string;
  isOwner?: boolean;
  onEdit?: () => void;
}) {
  const download = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success('已复制');
    } catch { toast.error('复制失败'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
        <span className="text-xs text-[var(--ds-text-secondary)]">{fileName}</span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copy}><CopyIcon />复制</Button>
          {isOwner && onEdit && (
            <Button variant="ghost" size="sm" onClick={onEdit}><EditIcon />编辑</Button>
          )}
          <Button variant="ghost" size="sm" onClick={download}><DownloadIcon />下载</Button>
        </div>
      </div>
      <pre className="p-4 bg-[var(--ds-surface-default)] font-mono text-sm overflow-x-auto m-0 whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}

export default function BlobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useAuth();
  const username = params.username as string;
  const repoName = params.repoName as string;
  const pathParts = (params.path as string[]) || [];
  const fileName = pathParts.length > 0 ? decodeURIComponent(pathParts[pathParts.length - 1]) : 'README.md';
  const branch = searchParams.get('branch') || undefined;

  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isTextFile, setIsTextFile] = useState(false);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isImage, setIsImage] = useState(false);
  const [isPdf, setIsPdf] = useState(false);
  const [isDocx, setIsDocx] = useState(false);
  const [isZip, setIsZip] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [docxHtml, setDocxHtml] = useState<string>('');
  const [zipFiles, setZipFiles] = useState<ZipTreeNode[]>([]);
  const [mdHlLoaded, setMdHlLoaded] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setIsOwner(!!(currentUser && currentUser.username === username));
  }, [currentUser, username]);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const isTextFileType = (name: string, mime: string): boolean => {
    if (!mime && !name) return false;
    const textExts = /\.(txt|log|json|xml|html|htm|css|scss|less|yaml|yml|toml|ini|md)$/i;
    const textMimes = mime.startsWith('text/') || mime.includes('json') || mime.includes('xml');
    return textExts.test(name) || textMimes;
  };

  const downloadRaw = useCallback(() => {
    if (!content || !mimeType) return;
    try {
      const byteCharacters = atob(content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to save file:', err);
    }
  }, [content, mimeType, fileName]);

  useEffect(() => {
    async function fetchContent() {
      setIsLoading(true);
      setError(null);
      try {
        const apiPath = pathParts.join('/');
        const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        const res = await fetch(`/api/v1/repos/${username}/${repoName}/blob/${apiPath}${branchParam}`);
        const data = await res.json();
        if (data.code === 200) {
          const fileMimeType = data.data.mimeType || '';
          const imageExt = /\.(png|jpg|jpeg|gif|webp|svg|ico|bmp)$/i.test(fileName);
          const isImg = fileMimeType.startsWith('image/') || imageExt;
          const isP = /\.(pdf)$/i.test(fileName);
          const isD = /\.(docx)$/i.test(fileName);
          const isZ = /\.(zip)$/i.test(fileName);
          const isV = /\.(mp4|webm|ogg|mov|avi|wmv)$/i.test(fileName);
          const isMd = fileName.endsWith('.md') && !isImg;
          const isText = isTextFileType(fileName, fileMimeType) && !isImg && !isP && !isD && !isZ && !isV && !isMd;

          setMimeType(fileMimeType);
          setIsImage(isImg);
          setIsPdf(isP);
          setIsDocx(isD);
          setIsZip(isZ);
          setIsVideo(isV);
          setIsMarkdown(isMd);
          setIsTextFile(isText);
          setContent(data.data.content || '');
          setOriginalContent(data.data.content || '');

          if (isImg) {
            setImageUrl(`data:${fileMimeType || 'image/png'};base64,${data.data.content || ''}`);
          }
          if (isV && data.data.content) {
            const mime = fileMimeType || 'video/mp4';
            const uint8Array = base64ToUint8Array(data.data.content);
            if (uint8Array) {
              const blob = new Blob([new Uint8Array(uint8Array)], { type: mime });
              const url = URL.createObjectURL(blob);
              blobUrlRef.current = url;
              setVideoUrl(url);
            }
          }
          if (isP && data.data.content) {
            const bc = atob(data.data.content);
            const bn = new Uint8Array(bc.length);
            for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
            const url = URL.createObjectURL(new Blob([new Uint8Array(bn)], { type: 'application/pdf' }));
            blobUrlRef.current = url;
            setPdfUrl(url);
          }
          if (isD && data.data.content) {
            try {
              const bc = atob(data.data.content);
              const bn = new Uint8Array(bc.length);
              for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
              const mammoth = (await import('mammoth')).default;
              const result = await mammoth.convertToHtml({ arrayBuffer: bn.buffer });
              setDocxHtml(result.value);
            } catch (e) {
              console.warn('docx 预览转换失败:', e);
            }
          }
          if (isZ && data.data.content) {
            try {
              const bc = atob(data.data.content);
              const bn = new Uint8Array(bc.length);
              for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
              const JSZip = (await import('jszip')).default;
              const zip = await JSZip.loadAsync(bn);
              const pathMap: Record<string, ZipTreeNode> = {};
              zip.forEach((relativePath, file) => {
                const parts = relativePath.split('/');
                let parentPath = '';
                for (let i = 0; i < parts.length; i++) {
                  const fullPath = parentPath ? `${parentPath}/${parts[i]}` : parts[i];
                  if (!pathMap[fullPath]) {
                    const node: ZipTreeNode = { name: parts[i], size: 0, isDir: file.dir || i < parts.length - 1, children: [] };
                    pathMap[fullPath] = node;
                    if (parentPath && pathMap[parentPath]) pathMap[parentPath].children.push(node);
                  }
                  parentPath = fullPath;
                }
                if (!file.dir) {
                  const fp = relativePath;
                  if (pathMap[fp]) pathMap[fp].size = (file as any)._data?.uncompressedSize || 0;
                }
              });
              const roots = Object.values(pathMap).filter(n => {
                const entry = Object.entries(pathMap).find(([, v]) => v === n);
                return entry && !entry[0].includes('/');
              });
              setZipFiles(roots);
            } catch (e) {
              console.warn('zip 文件解析失败:', e);
            }
          }
        } else {
          setError(data.message || '文件不存在');
        }
      } catch (err) {
        setError('加载失败: ' + (err as Error).message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchContent();
  }, [username, repoName, pathParts, fileName, branch]);

  const handleSave = async () => {
    if (content === originalContent) { setIsEditing(false); return; }
    try {
      const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const data = await api.put(`/api/v1/repos/${username}/${repoName}/blob/${pathParts.join('/')}${branchParam}`, { content, message: `Update ${fileName}` });
      if (data.code === 200) {
        setOriginalContent(content);
        setIsEditing(false);
        toast.success('保存成功！');
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  // 加载 highlight.js 用于 Markdown 文本块高亮
  useEffect(() => {
    if (!isMarkdown) return;
    if (window.hljs) {
      setMdHlLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
      if (window.hljs) {
        window.hljs.configure({ languages: [] });
        setMdHlLoaded(true);
      }
    };
    document.head.appendChild(script);
  }, [isMarkdown]);

  // 增强 Markdown 渲染
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let codeBlockCount = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(renderInlineMarkdown(beforeText, codeBlockCount));
      }

      const lang = match[1] || 'plaintext';
      const code = match[2].trim();

      let highlightedCode = code;
      if (window.hljs) {
        const result = window.hljs.highlightAuto(code, [lang]);
        highlightedCode = result.value;
      }

      parts.push(
        <pre key={`code-${codeBlockCount}`} className="md-code-block">
          <code
            className={`hljs language-${lang}`}
            data-lang={lang}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(highlightedCode) }}
          />
        </pre>
      );
      codeBlockCount++;
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(renderInlineMarkdown(text.slice(lastIndex), codeBlockCount));
    }

    return <div className="markdown-content">{parts}</div>;
  };

  const renderInlineMarkdown = (text: string, baseKey: number): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = baseKey * 1000;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('```')) { i++; continue; }
      if (trimmed === '') { elements.push(<div key={key++} className="md-empty-line" />); i++; continue; }
      if (trimmed.startsWith('# ')) { elements.push(<h1 key={key++} className="md-h1">{renderInlineElements(trimmed.slice(2))}</h1>); i++; continue; }
      if (trimmed.startsWith('## ')) { elements.push(<h2 key={key++} className="md-h2">{renderInlineElements(trimmed.slice(3))}</h2>); i++; continue; }
      if (trimmed.startsWith('### ')) { elements.push(<h3 key={key++} className="md-h3">{renderInlineElements(trimmed.slice(4))}</h3>); i++; continue; }
      if (trimmed.startsWith('#### ')) { elements.push(<h4 key={key++} className="md-h4">{renderInlineElements(trimmed.slice(5))}</h4>); i++; continue; }

      if (trimmed.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('> ')) { quoteLines.push(lines[i].trim().slice(2)); i++; }
        elements.push(<blockquote key={key++} className="md-blockquote">{renderInlineElements(quoteLines.join(' '))}</blockquote>);
        continue;
      }

      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) { listItems.push(lines[i].trim().slice(2)); i++; }
        elements.push(<ul key={key++} className="md-ul">{listItems.map((item, idx) => (<li key={idx}>{renderInlineElements(item)}</li>))}</ul>);
        continue;
      }

      if (/^\d+\.\s/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) { listItems.push(lines[i].trim().replace(/^\d+\.\s/, '')); i++; }
        elements.push(<ol key={key++} className="md-ol">{listItems.map((item, idx) => (<li key={idx}>{renderInlineElements(item)}</li>))}</ol>);
        continue;
      }

      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
        const listItems: { text: string; checked: boolean }[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- [ ] ') || lines[i].trim().startsWith('* [ ] '))) { listItems.push({ text: lines[i].trim().slice(6), checked: false }); i++; }
        elements.push(<ul key={key++} className="md-ul md-task-list">{listItems.map((item, idx) => (<li key={idx} className="md-task-item"><input type="checkbox" disabled checked={false} className="md-checkbox" /><span>{renderInlineElements(item.text)}</span></li>))}</ul>);
        continue;
      }
      if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ') || trimmed.startsWith('* [x] ')) {
        const listItems: { text: string; checked: boolean }[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- [x] ') || lines[i].trim().startsWith('- [X] ') || lines[i].trim().startsWith('* [x] '))) { listItems.push({ text: lines[i].trim().slice(6), checked: true }); i++; }
        elements.push(<ul key={key++} className="md-ul md-task-list">{listItems.map((item, idx) => (<li key={idx} className="md-task-item md-task-checked"><input type="checkbox" disabled checked={true} className="md-checkbox" /><span>{renderInlineElements(item.text)}</span></li>))}</ul>);
        continue;
      }

      if (trimmed === '---' || trimmed === '***' || trimmed === '___') { elements.push(<hr key={key++} className="md-hr" />); i++; continue; }

      elements.push(<p key={key++} className="md-p">{renderInlineElements(trimmed)}</p>);
      i++;
    }

    return <div key={`block-${baseKey}`}>{elements}</div>;
  };

  const renderInlineElements = (text: string): React.ReactNode => {
    if (!text) return null;
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[([^\]]+)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      const content = match[0];
      if (content.startsWith('`') && content.endsWith('`')) parts.push(<code key={key++} className="md-inline-code">{content.slice(1, -1)}</code>);
      else if (content.startsWith('**') && content.endsWith('**')) parts.push(<strong key={key++}>{content.slice(2, -2)}</strong>);
      else if ((content.startsWith('*') && content.endsWith('*')) || (content.startsWith('__') && content.endsWith('__'))) parts.push(<em key={key++}>{content.slice(1, -1)}</em>);
      else if (content.startsWith('[') && content.includes('](')) { const linkText = match[1] || content; const linkUrl = match[2] || '#'; parts.push(<a key={key++} href={linkUrl} className="md-link" target="_blank" rel="noopener noreferrer">{linkText}</a>); }
      else if (content.startsWith('![') && content.includes('](')) { const altText = match[3] || ''; const imgUrl = match[4] || ''; parts.push(<img key={key++} src={imgUrl} alt={altText} className="md-image" />); }
      else parts.push(content);
      lastIndex = match.index + content.length;
    }

    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return <>{parts}</>;
  };

  return (
    <PageLayout containerWidth="full" padding="none"><PageLayoutContent><div className="flex flex-col min-h-screen bg-[var(--ds-page-bg)]">
      <Header />
      <div className="max-w-[var(--ds-container-max)] mx-auto w-full px-4 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="w-7 h-7 p-0"
            onClick={() => {
              if (pathParts.length > 1) {
                const parentPath = pathParts.slice(0, -1).join('/');
                router.push(`/${username}/${repoName}/blob/${parentPath}`);
              } else {
                router.push(`/${username}/${repoName}`);
              }
            }}
            title="返回上级目录"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Button>

          <Link href={`/${username}/${repoName}`} className="flex items-center gap-1 text-[var(--ds-accent-default)] hover:underline no-underline">
            <RepoIcon />
            <span>{repoName}</span>
          </Link>

          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <span className="text-[var(--ds-text-secondary)]">/</span>
              {i < pathParts.length - 1 ? (
                <Link href={`/${username}/${repoName}/blob/${pathParts.slice(0, i + 1).join('/')}`} className="text-[var(--ds-accent-default)] hover:underline no-underline max-w-[200px] truncate">
                  {decodeURIComponent(part)}
                </Link>
              ) : (
                <span className="text-[var(--ds-text-primary)] font-medium max-w-[300px] truncate">{decodeURIComponent(part)}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {isLoading ? null : error ? (
          <div className="text-center py-16">
            <p className="text-[var(--ds-danger-default)] mb-4">{error}</p>
            <Button variant="secondary" onClick={() => router.back()}>返回</Button>
          </div>
        ) : (
          <>
            {/* File Header */}
            <div className="flex items-center justify-between p-4 bg-[var(--ds-surface-subtle)] border border-[var(--ds-border-default)] rounded-t-[var(--ds-radius-sm)] mb-0">
              <div className="flex items-center gap-2 text-sm">
                <FileIcon />
                <span className="font-mono text-sm font-medium text-[var(--ds-text-primary)]">{fileName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={downloadRaw}>
                  <DownloadIcon />下载
                </Button>
                {isOwner && (
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)}>
                    <EditIcon />编辑
                  </Button>
                )}
              </div>
            </div>

            {/* File Content */}
            <div className="border border-[var(--ds-border-default)] border-t-0 rounded-b-[var(--ds-radius-sm)] overflow-hidden">
              {isEditing ? (
                <div>
                  <textarea
                    className="w-full min-h-[400px] p-4 font-mono text-sm bg-[var(--ds-page-bg)] text-[var(--ds-text-primary)] border-none outline-none resize-y"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="输入文件内容..."
                  />
                  <div className="flex justify-end gap-2 px-4 py-2 border-t border-[var(--ds-border-default)] bg-[var(--ds-surface-subtle)]">
                    <Button variant="secondary" size="sm" onClick={() => { setContent(originalContent); setIsEditing(false); }}>
                      取消
                    </Button>
                    <Button variant="primary" size="sm" onClick={handleSave} disabled={content === originalContent}>
                      保存
                    </Button>
                  </div>
                </div>
              ) : isImage ? (
                <div className="flex items-center justify-center p-8 bg-[var(--ds-surface-subtle)]">
                  <img src={imageUrl} alt={fileName} className="max-w-full max-h-[600px] object-contain rounded" />
                </div>
              ) : isPdf ? (
                <div className="pdf-preview-container">
                  <iframe src={pdfUrl} className="pdf-iframe" title={fileName} />
                </div>
              ) : isDocx ? (
                <div className="docx-preview-container">
                  <div className="docx-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(docxHtml) }} />
                </div>
              ) : isZip ? (
                <div className="p-4">
                  <ZipPreview fileName={fileName} zipFiles={zipFiles} />
                  <Button className="mt-4" onClick={downloadRaw}>
                    <DownloadIcon />下载 {fileName}
                  </Button>
                </div>
              ) : isVideo ? (
                <div className="flex flex-col items-center p-12 bg-[var(--ds-page-bg)] border border-[var(--ds-border-default)] rounded-[var(--ds-radius-sm)]">
                  <video controls className="max-w-full max-h-[600px] rounded-[var(--ds-radius-md)] shadow-lg">
                    <track kind="captions" />
                    <source src={videoUrl} type={mimeType || 'video/mp4'} />
                    您的浏览器不支持视频播放
                  </video>
                  <Button variant="secondary" className="mt-4" onClick={downloadRaw}>
                    <DownloadIcon />下载视频
                  </Button>
                </div>
              ) : isMarkdown ? (
                <div className="readme-preview markdown-body markdown-content p-6">
                  {renderMarkdown(content)}
                </div>
              ) : isTextFile ? (
                <TextPreview content={content} fileName={fileName} isOwner={isOwner} onEdit={() => setShowEditor(true)} />
              ) : (
                <pre className="p-4 bg-[var(--ds-surface-subtle)] font-mono text-sm text-[var(--ds-text-primary)] overflow-x-auto m-0 rounded-b-md"><code>{content}</code></pre>
              )}
            </div>
          </>
        )}
      </div>

      {/* 在线编辑器 */}
      {showEditor && (
        <FileEditor
          isOpen={showEditor}
          fileContent={originalContent || content}
          fileName={fileName}
          username={username}
          repoName={repoName}
          filePath={pathParts.join('/')}
          onClose={() => setShowEditor(false)}
          onSaved={() => {
            setShowEditor(false);
            window.location.reload();
          }}
        />
      )}
    </div></PageLayoutContent></PageLayout>
  );
}
