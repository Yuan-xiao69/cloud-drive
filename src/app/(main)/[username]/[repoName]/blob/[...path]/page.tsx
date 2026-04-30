'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import { sanitizeHtml } from '@/lib/security';

// mammoth and JSZip are loaded dynamically at runtime to avoid client-side bundle issues

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

const SaveIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
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

const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const RawIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const CodeBlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <polyline points="9 8 5 12 9 16" />
    <polyline points="15 8 19 12 15 16" />
  </svg>
);

const CopyRangeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const InfoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

const HistoryIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

// 语言检测
function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    kt: 'kotlin', swift: 'swift', cs: 'csharp', cpp: 'cpp', c: 'c',
    php: 'php', lua: 'lua', sh: 'bash', bash: 'bash', zsh: 'bash',
    yaml: 'yaml', yml: 'yaml', json: 'json', xml: 'xml', html: 'html',
    htm: 'html', css: 'css', scss: 'scss', less: 'less', sql: 'sql',
    md: 'markdown', r: 'r', scala: 'scala', ex: 'elixir', exs: 'elixir',
    erl: 'erlang', hs: 'haskell', pl: 'perl', pm: 'perl', dart: 'dart',
    vue: 'xml', svelte: 'xml', toml: 'ini', ini: 'ini', tf: 'hcl',
    dockerfile: 'dockerfile', makefile: 'makefile', proto: 'protobuf',
  };
  if (fileName.toLowerCase() === 'dockerfile') return 'dockerfile';
  return langMap[ext] || 'plaintext';
}

// 语言显示名称
const langLabels: Record<string, string> = {
  javascript: 'JavaScript', typescript: 'TypeScript', python: 'Python',
  java: 'Java', cpp: 'C++', c: 'C', csharp: 'C#', go: 'Go', rust: 'Rust',
  ruby: 'Ruby', php: 'PHP', swift: 'Swift', kotlin: 'Kotlin',
  html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON', xml: 'XML',
  yaml: 'YAML', markdown: 'Markdown', sql: 'SQL', bash: 'Shell',
  plaintext: 'Plain Text', dockerfile: 'Dockerfile',
};

// 基础关键词高亮（不依赖 highlight.js CDN）
function highlightBasic(code: string, lang: string): string {
  const lines = code.split('\n');
  return lines.map(line => {
    let escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

    // 字符串
    escaped = escaped.replace(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="hljs-string">$&</span>');
    // 行内代码
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="hljs-string">`$1`</code>');
    // 注释
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span class="hljs-comment">$1</span>');
    escaped = escaped.replace(/(#.*$)/gm, '<span class="hljs-comment">$1</span>');
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hljs-comment">$1</span>');

    return escaped;
  }).join('\n');
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

// 代码预览组件
function CodePreview({ content, fileName, mimeType }: { content: string; fileName: string; mimeType: string | null }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hlLoaded, setHlLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'code' | 'raw'>('code');
  const [lineRangeStart, setLineRangeStart] = useState<number | null>(null);
  const [lineRangeEnd, setLineRangeEnd] = useState<number | null>(null);
  const [isSelectingRange, setIsSelectingRange] = useState(false);
  const [rangeCopied, setRangeCopied] = useState(false);
  const [foldedLines, setFoldedLines] = useState<Set<number>>(new Set());
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hlRef = useRef<boolean>(false);
  const codeTableRef = useRef<HTMLTableElement>(null);

  // 分页配置
  const LINES_PER_PAGE = 500; // 每页行数
  const lines = content.split('\n');
  const totalLines = lines.length;
  const totalPages = Math.ceil(totalLines / LINES_PER_PAGE);
  const needsPagination = totalLines > LINES_PER_PAGE;
  const [currentPage, setCurrentPage] = useState(1);
  const [showPagination, setShowPagination] = useState(needsPagination);

  // 分页导航
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setHighlightedLine(null);
      // 滚动到顶部
      if (codeTableRef.current) {
        codeTableRef.current.scrollTop = 0;
      }
    }
  };

  // 计算当前页显示的行范围
  const getPageLines = () => {
    if (!needsPagination || !showPagination) {
      return { start: 0, end: totalLines, pageLines: lines };
    }
    const start = (currentPage - 1) * LINES_PER_PAGE;
    const end = Math.min(start + LINES_PER_PAGE, totalLines);
    return { start, end, pageLines: lines.slice(start, end) };
  };

  const { start: pageStart, end: pageEnd, pageLines } = getPageLines();

  const lang = detectLanguage(fileName);
  const langLabel = langLabels[lang] || lang;

  // 检测 URL hash 行号跳转 (#L123)
  useEffect(() => {
    const hash = window.location.hash;
    const match = hash.match(/^#L(\d+)(?:-L(\d+))?$/);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      // 如果需要分页且行号不在当前页，跳转到对应页
      if (needsPagination && showPagination) {
        const targetPage = Math.ceil(lineNum / LINES_PER_PAGE);
        setCurrentPage(targetPage);
        setHighlightedLine(lineNum - 1);
      } else {
        setHighlightedLine(lineNum - 1);
        // 滚动到目标行
        setTimeout(() => {
          const lineEl = document.getElementById(`L${lineNum}`);
          if (lineEl) {
            lineEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [needsPagination, showPagination]);

  // 检测代码可折叠块 (函数/类定义)
  const detectFoldableBlocks = (lines: string[]): Set<number> => {
    const foldable = new Set<number>();
    const openBrackets = /[\{\[\(]$/;
    const closeBrackets = /^[\}\]\)]/;
    const blockKeywords = /^(export )?(async )?(function|class|const|let|var|if|for|while|switch|try|catch|else|interface|type|enum)\b/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // 函数/类定义后可折叠
      if (blockKeywords.test(line.trim()) || openBrackets.test(line.trim())) {
        // 查找对应的闭合行
        let bracketCount = 0;
        const open = (line.match(/[\{\[\(]/g) || []).length;
        const close = (line.match(/[\}\]\)]/g) || []).length;
        bracketCount = open - close;

        for (let j = i + 1; j < Math.min(i + 50, lines.length); j++) {
          const innerOpen = (lines[j].match(/[\{\[\(]/g) || []).length;
          const innerClose = (lines[j].match(/[\}\]\)]/g) || []).length;
          bracketCount += innerOpen - innerClose;
          if (bracketCount <= 0 && lines[j].trim().length > 0) {
            // 如果闭合行后还有更多内容，可以折叠
            if (j - i > 2) {
              foldable.add(i);
            }
            break;
          }
        }
      }
    }
    return foldable;
  };

  const initialFoldable = useMemo(() => detectFoldableBlocks(lines), [lines.join('\n')]);

  // 代码折叠
  const toggleFold = (lineIndex: number) => {
    setFoldedLines(prev => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  };

  // 行范围选择复制
  const handleLineClick = (lineIndex: number, e: React.MouseEvent) => {
    if (e.shiftKey && lineRangeStart !== null) {
      setLineRangeEnd(lineIndex);
    } else if (e.ctrlKey || e.metaKey) {
      setLineRangeStart(lineIndex);
      setLineRangeEnd(null);
    } else {
      setLineRangeStart(lineIndex);
      setLineRangeEnd(null);
    }
  };

  const copyRange = async () => {
    if (lineRangeStart === null) return;
    const end = lineRangeEnd ?? lineRangeStart;
    const start = Math.min(lineRangeStart, end);
    const rangeLines = lines.slice(start, end + 1).join('\n');
    try {
      await navigator.clipboard.writeText(rangeLines);
      setRangeCopied(true);
      setTimeout(() => setRangeCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy line range to clipboard:', err);
    }
  };

  // 加载 highlight.js
  useEffect(() => {
    if (hlRef.current) return;
    hlRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
      if (window.hljs) {
        window.hljs.configure({ languages: [] });
        window.hljs.highlightAll();
        setHlLoaded(true);
      }
    };
    script.onerror = () => setHlLoaded(false);
    document.head.appendChild(script);
  }, []);

  // 搜索
  const doSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchMatches([]);
      return;
    }
    const lines = content.split('\n');
    const matches: number[] = [];
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    lines.forEach((line, i) => {
      if (regex.test(line)) matches.push(i);
    });
    setSearchMatches(matches);
    setCurrentMatch(0);
  }, [content]);

  useEffect(() => {
    doSearch(searchTerm);
  }, [searchTerm, doSearch]);

  useEffect(() => {
    if (searchMatches.length > 0 && currentMatch >= searchMatches.length) {
      setCurrentMatch(0);
    }
  }, [searchMatches, currentMatch]);

  // Ctrl+F 快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchTerm('');
      }
      if (e.key === 'F3' && searchMatches.length > 0) {
        e.preventDefault();
        setCurrentMatch((prev) => (prev + 1) % searchMatches.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch, searchMatches]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy content to clipboard:', err);
    }
  };

  // 如果 highlight.js 已加载，用它高亮
  // 否则用基础高亮
  const highlightedLines = hlLoaded
    ? lines.map(line => {
        const result = window.hljs!.highlightAuto(line, [lang]);
        return result.value || line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      })
    : lines.map((line, i) => {
        const escaped = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');

        return escaped
          .replace(/(&quot;[^&]*?&quot;)/g, '<span class="hljs-string">$1</span>')
          .replace(/(`[^`]+`)/g, '<span class="hljs-string">$1</span>')
          .replace(/(\/\/[^\n]*)/g, '<span class="hljs-comment">$1</span>')
          .replace(/(#[^\n]*)/g, '<span class="hljs-comment">$1</span>');
      });

  // 搜索匹配
  const getHighlightedLine = (line: string, lineIndex: number): string => {
    if (!searchTerm.trim() || !searchMatches.includes(lineIndex)) {
      return highlightedLines[lineIndex] || '';
    }
    const escaped = line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const matchIdx = searchMatches.indexOf(lineIndex);
    const isCurrent = matchIdx === currentMatch;
    const currentClass = isCurrent ? ' current' : '';
    return highlightedLines[lineIndex]
      .replace(regex, `<mark class="hljs-search-match${currentClass}">$1</mark>`);
  };

  // 计算选中的行范围
  const selectedRange = lineRangeStart !== null && lineRangeEnd !== null
    ? `${Math.min(lineRangeStart, lineRangeEnd) + 1} - ${Math.max(lineRangeStart, lineRangeEnd) + 1}`
    : lineRangeStart !== null
      ? `${lineRangeStart + 1}`
      : null;

  // RAW 视图
  if (viewMode === 'raw') {
    return (
      <div className="code-viewer">
        <div className="code-viewer-header">
          <span className="code-viewer-lang">Raw</span>
          <div className="code-viewer-actions">
            <button
              className="code-viewer-btn active"
              onClick={() => setViewMode('code')}
              title="代码视图"
            >
              <CodeBlockIcon />
              代码
            </button>
            <button className="code-viewer-btn" onClick={handleCopy} title="复制全部">
              <CopyIcon />
              {copied ? '已复制' : '复制'}
            </button>
          </div>
        </div>
        <pre className="code-raw-view">
          <code>{content}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className="code-viewer">
      {/* Header */}
      <div className="code-viewer-header">
        <span className="code-viewer-lang">{langLabel}</span>
        <div className="code-viewer-actions">
          <button
            className="code-viewer-btn"
            onClick={() => setViewMode('raw')}
            title="查看原始文件"
          >
            <RawIcon />
            Raw
          </button>
          <button
            className={`code-viewer-btn ${showSearch ? 'active' : ''}`}
            onClick={() => {
              setShowSearch(!showSearch);
              if (!showSearch) {
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }
            }}
            title="搜索 (Ctrl+F)"
          >
            <SearchIcon />
            搜索
          </button>
          <button
            className="code-viewer-btn"
            onClick={handleCopy}
            title="复制代码"
          >
            <CopyIcon />
            {copied ? '已复制' : '复制'}
          </button>
          {selectedRange && (
            <button
              className="code-viewer-btn"
              onClick={copyRange}
              title="复制选中行"
            >
              <CopyRangeIcon />
              {rangeCopied ? '已复制' : `复制 ${selectedRange}`}
            </button>
          )}
          <button
            className="code-viewer-btn"
            onClick={() => {
              setDownloading(true);
              try {
                const bc = atob(content);
                const bn = new Uint8Array(bc.length);
                for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
                const blob = new Blob([bn], { type: mimeType || 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = fileName;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);
              } catch (err) {
                console.error('Failed to download file:', err);
              }
              setDownloading(false);
            }}
            title="下载原始文件"
          >
            <DownloadIcon />
            下载
          </button>
        </div>
      </div>

      {/* 分页控件 */}
      {needsPagination && (
        <div className="code-pagination">
          <div className="code-pagination-info">
            <span className="pagination-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showPagination}
                  onChange={(e) => {
                    setShowPagination(e.target.checked);
                    if (e.target.checked) {
                      // 确保跳转到正确的页
                      if (highlightedLine !== null) {
                        const targetPage = Math.ceil((highlightedLine + 1) / LINES_PER_PAGE);
                        setCurrentPage(targetPage);
                      }
                    }
                  }}
                />
                <span>分页显示</span>
              </label>
            </span>
            <span className="pagination-stats">
              共 {totalLines} 行
              {showPagination && `，第 ${pageStart + 1}-${pageEnd} 行`}
            </span>
          </div>
          {showPagination && (
            <div className="code-pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                title="第一页"
              >
                ««
              </button>
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                title="上一页"
              >
                «
              </button>
              <span className="pagination-current">
                第{' '}
                <input
                  type="number"
                  className="pagination-input"
                  value={currentPage}
                  min={1}
                  max={totalPages}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) goToPage(val);
                  }}
                />{' '}
                / {totalPages} 页
              </span>
              <button
                className="pagination-btn"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="下一页"
              >
                »
              </button>
              <button
                className="pagination-btn"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                title="最后一页"
              >
                »»
              </button>
            </div>
          )}
        </div>
      )}

      {/* Code */}
      <div style={{ overflowX: 'auto' }} ref={codeTableRef}>
        <table className="code-line-table">
          <tbody>
            {(showPagination ? pageLines : lines).map((line, i) => {
              // 计算实际的全局行号
              const globalLineIndex = showPagination ? pageStart + i : i;
              const isMatch = showPagination 
                ? searchMatches.filter(m => m >= pageStart && m < pageEnd).map(m => m - pageStart).includes(i)
                : searchMatches.includes(i);
              const isCurrent = showPagination
                ? searchMatches[currentMatch] >= pageStart && searchMatches[currentMatch] < pageEnd
                  && searchMatches[currentMatch] - pageStart === i
                : searchMatches[currentMatch] === i;
              const isHighlighted = showPagination 
                ? (highlightedLine !== null && highlightedLine >= pageStart && highlightedLine < pageEnd)
                  ? highlightedLine - pageStart === i
                  : false
                : highlightedLine === i;
              const isSelected = lineRangeStart !== null && (
                lineRangeEnd !== null
                  ? globalLineIndex >= Math.min(lineRangeStart, lineRangeEnd) && globalLineIndex <= Math.max(lineRangeStart, lineRangeEnd)
                  : globalLineIndex === lineRangeStart
              );
              const isFoldable = initialFoldable.has(globalLineIndex);
              const isFolded = foldedLines.has(globalLineIndex);

              // 如果折叠了，显示折叠信息
              if (isFolded && isFoldable) {
                return (
                  <tr key={`${showPagination ? 'page' + currentPage + '-' : ''}${globalLineIndex}`} className="code-line code-line-folded">
                    <td className="code-line-gutter">
                      <button
                        className="fold-btn"
                        onClick={() => toggleFold(globalLineIndex)}
                        title="展开"
                      >
                        <ChevronRightIcon />
                      </button>
                    </td>
                    <td className="code-line-content code-line-faded">
                      <code>{line || ' '}</code>
                      <span className="fold-hint">...</span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={`${showPagination ? 'page' + currentPage + '-' : ''}${globalLineIndex}`}
                  id={`L${globalLineIndex + 1}`}
                  className={`code-line ${isCurrent ? 'code-line-current' : ''} ${isHighlighted ? 'code-line-hash-highlight' : ''} ${isSelected ? 'code-line-selected' : ''}`}
                  onClick={(e) => handleLineClick(globalLineIndex, e)}
                  style={{
                    background: isCurrent
                      ? 'rgba(9, 105, 218, 0.06)'
                      : isHighlighted
                        ? 'rgba(255, 207, 51, 0.15)'
                        : isSelected
                          ? 'rgba(9, 105, 218, 0.1)'
                          : undefined,
                    cursor: 'pointer',
                  }}
                >
                  <td className="code-line-gutter">
                    {isFoldable ? (
                      <button
                        className="fold-btn"
                        onClick={(e) => { e.stopPropagation(); toggleFold(globalLineIndex); }}
                        title="折叠"
                      >
                        <ChevronDownIcon />
                      </button>
                    ) : (
                      <a
                        href={`#L${globalLineIndex + 1}`}
                        className="line-number-link"
                        onClick={(e) => {
                          e.preventDefault();
                          setHighlightedLine(globalLineIndex);
                          window.history.pushState(null, '', `#L${globalLineIndex + 1}`);
                        }}
                      >
                        {globalLineIndex + 1}
                      </a>
                    )}
                  </td>
                  <td className="code-line-content">
                    <code
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(isMatch ? getHighlightedLine(line, globalLineIndex) : highlightedLines[globalLineIndex]) }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 底部页码控件 */}
      {needsPagination && showPagination && (
        <div className="code-pagination code-pagination-bottom">
          <button
            className="pagination-btn"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            title="第一页"
          >
            ««
          </button>
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            title="上一页"
          >
            «
          </button>
          <span className="pagination-current">
            第{' '}
            <input
              type="number"
              className="pagination-input"
              value={currentPage}
              min={1}
              max={totalPages}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) goToPage(val);
              }}
            />{' '}
            / {totalPages} 页
          </span>
          <button
            className="pagination-btn"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="下一页"
          >
            »
          </button>
          <button
            className="pagination-btn"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            title="最后一页"
          >
            »»
          </button>
        </div>
      )}

      {/* 范围选择提示 */}
      {lineRangeStart !== null && (
        <div className="code-range-hint">
          <CopyRangeIcon />
          <span>已选择第 {lineRangeStart + 1} 行</span>
          {lineRangeEnd !== null && <span> 至第 {lineRangeEnd + 1} 行</span>}
          <span>（点击其他行调整范围，Ctrl+C 复制，Esc 取消）</span>
        </div>
      )}

      {/* Search bar */}
      {showSearch && (
        <div className="code-search-bar">
          <SearchIcon />
          <input
            ref={searchInputRef}
            className="code-search-input"
            placeholder="搜索... (F3 下一条)"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <span className="code-search-count">
              {searchMatches.length > 0
                ? `${currentMatch + 1} / ${searchMatches.length}`
                : '无匹配'}
            </span>
          )}
          {searchMatches.length > 0 && (
            <button
              className="code-viewer-btn"
              onClick={() => {
                // 跳转到当前搜索匹配所在页
                const matchLine = searchMatches[currentMatch];
                if (needsPagination && showPagination) {
                  const targetPage = Math.ceil((matchLine + 1) / LINES_PER_PAGE);
                  if (targetPage !== currentPage) {
                    setCurrentPage(targetPage);
                  }
                }
                setCurrentMatch((prev) => (prev + 1) % searchMatches.length);
              }}
            >
              ↓
            </button>
          )}
        </div>
      )}
    </div>
  );
}




export default function BlobPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [isSaving, setIsSaving] = useState(false);
  const [isMarkdown, setIsMarkdown] = useState(false);
  const [isCodeFile, setIsCodeFile] = useState(false);
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
  const [zipFiles, setZipFiles] = useState<{ name: string; size: number }[]>([]);
  const [mdHlLoaded, setMdHlLoaded] = useState(false);

  const isCodeFileType = (name: string, mime: string): boolean => {
    if (!mime && !name) return false;
    const codeExts = /\.(js|jsx|ts|tsx|py|java|c|cpp|h|go|rs|rb|php|swift|kt|sh|bash|json|xml|html|htm|css|scss|less|sql|md|yaml|yml|toml|ini|txt|log|vue|svelte|proto|dockerfile|makefile|tf|hcl|r|scala|ex|erl|hs|pl|pm|dart)$/i;
    const codeMimes = mime.startsWith('text/') || mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('typescript');
    return codeExts.test(name) || codeMimes;
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
          const isCode = isCodeFileType(fileName, fileMimeType) && !isImg && !isP && !isD && !isZ && !isV && !isMd;

          setMimeType(fileMimeType);
          setIsImage(isImg);
          setIsPdf(isP);
          setIsDocx(isD);
          setIsZip(isZ);
          setIsVideo(isV);
          setIsMarkdown(isMd);
          setIsCodeFile(isCode);
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
              setVideoUrl(URL.createObjectURL(blob));
            }
          }
          if (isP && data.data.content) {
            const bc = atob(data.data.content);
            const bn = new Uint8Array(bc.length);
            for (let i = 0; i < bc.length; i++) bn[i] = bc.charCodeAt(i);
            setPdfUrl(URL.createObjectURL(new Blob([new Uint8Array(bn)], { type: 'application/pdf' })));
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
              const files: { name: string; size: number }[] = [];
              zip.forEach((relativePath, file) => {
                if (!file.dir) {
                  files.push({ name: relativePath, size: (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0 });
                }
              });
              setZipFiles(files);
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
    setIsSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const branchParam = branch ? `?branch=${encodeURIComponent(branch)}` : '';
      const res = await fetch(`/api/v1/repos/${username}/${repoName}/blob/${pathParts.join('/')}${branchParam}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ content, message: `Update ${fileName}` }),
      });
      const data = await res.json();
      if (data.code === 200) {
        setOriginalContent(content);
        setIsEditing(false);
        alert('保存成功！');
      } else {
        alert(data.message || '保存失败');
      }
    } catch {
      alert('保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 加载 highlight.js 用于 Markdown 代码块高亮（一次性加载）
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

    // 处理代码块
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;
    let codeBlockCount = 0;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // 添加代码块之前的文本
      if (match.index > lastIndex) {
        const beforeText = text.slice(lastIndex, match.index);
        parts.push(renderInlineMarkdown(beforeText, codeBlockCount));
      }

      // 添加代码块 - 使用 hljs 进行高亮
      const lang = match[1] || 'plaintext';
      const code = match[2].trim();
      
      // 如果 highlight.js 已加载，先高亮
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

    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(renderInlineMarkdown(text.slice(lastIndex), codeBlockCount));
    }

    return <div className="markdown-content">{parts}</div>;
  };

  // 处理行内 Markdown
  const renderInlineMarkdown = (text: string, baseKey: number): React.ReactNode => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;
    let key = baseKey * 1000;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 跳过代码块标记
      if (trimmed.startsWith('```')) {
        i++;
        continue;
      }

      // 空行
      if (trimmed === '') {
        elements.push(<div key={key++} className="md-empty-line" />);
        i++;
        continue;
      }

      // 标题
      if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={key++} className="md-h1">{renderInlineElements(trimmed.slice(2))}</h1>);
        i++;
        continue;
      }
      if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={key++} className="md-h2">{renderInlineElements(trimmed.slice(3))}</h2>);
        i++;
        continue;
      }
      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={key++} className="md-h3">{renderInlineElements(trimmed.slice(4))}</h3>);
        i++;
        continue;
      }
      if (trimmed.startsWith('#### ')) {
        elements.push(<h4 key={key++} className="md-h4">{renderInlineElements(trimmed.slice(5))}</h4>);
        i++;
        continue;
      }

      // 引用块
      if (trimmed.startsWith('> ')) {
        const quoteLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('> ')) {
          quoteLines.push(lines[i].trim().slice(2));
          i++;
        }
        elements.push(<blockquote key={key++} className="md-blockquote">{renderInlineElements(quoteLines.join(' '))}</blockquote>);
        continue;
      }

      // 无序列表
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems: string[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
          listItems.push(lines[i].trim().slice(2));
          i++;
        }
        elements.push(
          <ul key={key++} className="md-ul">
            {listItems.map((item, idx) => (
              <li key={idx}>{renderInlineElements(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      // 有序列表
      if (/^\d+\.\s/.test(trimmed)) {
        const listItems: string[] = [];
        while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
          listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
          i++;
        }
        elements.push(
          <ol key={key++} className="md-ol">
            {listItems.map((item, idx) => (
              <li key={idx}>{renderInlineElements(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      // 任务列表
      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('* [ ] ')) {
        const listItems: { text: string; checked: boolean }[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- [ ] ') || lines[i].trim().startsWith('* [ ] '))) {
          const item = lines[i].trim();
          listItems.push({ text: item.slice(6), checked: false });
          i++;
        }
        elements.push(
          <ul key={key++} className="md-ul md-task-list">
            {listItems.map((item, idx) => (
              <li key={idx} className="md-task-item">
                <input type="checkbox" disabled checked={false} className="md-checkbox" />
                <span>{renderInlineElements(item.text)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }
      if (trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ') || trimmed.startsWith('* [x] ')) {
        const listItems: { text: string; checked: boolean }[] = [];
        while (i < lines.length && (lines[i].trim().startsWith('- [x] ') || lines[i].trim().startsWith('- [X] ') || lines[i].trim().startsWith('* [x] '))) {
          const item = lines[i].trim();
          listItems.push({ text: item.slice(6), checked: true });
          i++;
        }
        elements.push(
          <ul key={key++} className="md-ul md-task-list">
            {listItems.map((item, idx) => (
              <li key={idx} className="md-task-item md-task-checked">
                <input type="checkbox" disabled checked={true} className="md-checkbox" />
                <span>{renderInlineElements(item.text)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // 水平线
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
        elements.push(<hr key={key++} className="md-hr" />);
        i++;
        continue;
      }

      // 普通段落
      elements.push(<p key={key++} className="md-p">{renderInlineElements(trimmed)}</p>);
      i++;
    }

    return <div key={`block-${baseKey}`}>{elements}</div>;
  };

  // 处理行内元素（粗体、斜体、链接、代码等）
  const renderInlineElements = (text: string): React.ReactNode => {
    if (!text) return null;

    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_|\[([^\]]+)\]\(([^)]+)\)|!\[([^\]]*)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match;
    let key = 0;

    while ((match = regex.exec(text)) !== null) {
      // 添加匹配之前的文本
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }

      const content = match[0];

      if (content.startsWith('`') && content.endsWith('`')) {
        // 行内代码
        parts.push(<code key={key++} className="md-inline-code">{content.slice(1, -1)}</code>);
      } else if (content.startsWith('**') && content.endsWith('**')) {
        // 粗体
        parts.push(<strong key={key++}>{content.slice(2, -2)}</strong>);
      } else if ((content.startsWith('*') && content.endsWith('*')) || (content.startsWith('__') && content.endsWith('__'))) {
        // 斜体
        parts.push(<em key={key++}>{content.slice(1, -1)}</em>);
      } else if (content.startsWith('[') && content.includes('](')) {
        // 链接
        const linkText = match[2] || content;
        const linkUrl = match[3] || '#';
        parts.push(<a key={key++} href={linkUrl} className="md-link" target="_blank" rel="noopener noreferrer">{linkText}</a>);
      } else if (content.startsWith('![') && content.includes('](')) {
        // 图片
        const altText = match[4] || '';
        const imgUrl = match[5] || '';
        parts.push(<img key={key++} src={imgUrl} alt={altText} className="md-image" />);
      } else {
        parts.push(content);
      }

      lastIndex = match.index + content.length;
    }

    // 添加剩余文本
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return <>{parts}</>;
  };

  return (
    <div className="page">
      <Header />
      <div className="page-container">
        {/* Enhanced Breadcrumb with Back Button */}
        <div className="blob-nav-bar">
          <button
            className="blob-nav-back"
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
          </button>
          
          <Link href={`/${username}/${repoName}`} className="blob-nav-root">
            <RepoIcon />
            <span>{repoName}</span>
          </Link>
          
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              <span className="blob-nav-sep">/</span>
              {i < pathParts.length - 1 ? (
                <Link href={`/${username}/${repoName}/blob/${pathParts.slice(0, i + 1).join('/')}`} className="blob-nav-link">
                  {decodeURIComponent(part)}
                </Link>
              ) : (
                <span className="blob-nav-current">{decodeURIComponent(part)}</span>
              )}
            </React.Fragment>
          ))}
        </div>

        {isLoading ? (
          <div className="skeleton h-64 w-full mt-4" />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => router.back()} className="btn btn-secondary">返回</button>
          </div>
        ) : (
          <>
            {/* File Header */}
            <div className="blob-header">
              <div className="blob-title">
                <FileIcon />
                <span className="blob-filename">{fileName}</span>
              </div>
              <div className="blob-actions">
                {isEditing ? (
                  <>
                    <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={isSaving}>
                      <SaveIcon />{isSaving ? '保存中...' : '保存'}
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => { setContent(originalContent); setIsEditing(false); }}>
                      取消
                    </button>
                  </>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => setIsEditing(true)}>
                    <EditIcon />编辑
                  </button>
                )}
              </div>
            </div>

            {/* File Content */}
            <div className="blob-content">
              {isEditing ? (
                <textarea
                  className="blob-editor"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="输入文件内容..."
                />
              ) : isImage ? (
                <div className="blob-image-container">
                  <img src={imageUrl} alt={fileName} className="blob-image" />
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
                <div className="zip-preview-container">
                  <div className="zip-header">
                    <FileIcon /><span>{fileName}</span><span className="zip-count">共 {zipFiles.length} 个文件</span>
                  </div>
                  <div className="zip-file-list">
                    {zipFiles.map((f, i) => (
                      <div key={i} className="zip-file-item">
                        <FileIcon /><span className="zip-file-name">{f.name}</span>
                        <span className="zip-file-size">{formatSize(f.size)}</span>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary mt-4" onClick={downloadRaw}>
                    <DownloadIcon />下载 {fileName}
                  </button>
                </div>
              ) : isVideo ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 24px', background: 'var(--color-bg-default)', border: '1px solid var(--color-border-default)', borderRadius: 6 }}>
                  <video controls style={{ maxWidth: '100%', maxHeight: '600px', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                    <source src={videoUrl} type={mimeType || 'video/mp4'} />
                    您的浏览器不支持视频播放
                  </video>
                  <button className="btn btn-secondary mt-4" onClick={downloadRaw}>
                    <DownloadIcon />下载视频
                  </button>
                </div>
              ) : isMarkdown ? (
                <div className="readme-preview markdown-body markdown-content">
                  {renderMarkdown(content)}
                </div>
              ) : isCodeFile ? (
                <CodePreview content={content} fileName={fileName} mimeType={mimeType} />
              ) : (
                <pre className="blob-code"><code>{content}</code></pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

