'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Card, Input, Modal, ModalFooter } from '@/components/design';
import { api } from '@/lib/api/client';
import { sanitizeHtml } from '@/lib/security';
import toast from 'react-hot-toast';
import { EditorView, ViewUpdate } from '@codemirror/view';
import { basicSetup } from '@codemirror/basic-setup';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { python } from '@codemirror/lang-python';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';

// 支持在线编辑的扩展名
const EDITABLE_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'ts', 'tsx', 'js', 'jsx', 'py', 'html', 'css',
  'csv', 'xml', 'yaml', 'yml', 'toml', 'env', 'gitignore', 'dockerfile',
  'vue', 'scss', 'less', 'sh', 'bash', 'sql', 'graphql', 'rs', 'go',
  'java', 'rb', 'php', 'swift', 'kt', 'c', 'cpp', 'h', 'hpp', 'r',
  'dart', 'lua', 'cfg', 'conf', 'ini', 'editorconfig', 'properties',
]);

// 根据扩展名获取 CodeMirror 语言扩展
function getLanguageExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts':
    case 'tsx':
      return javascript({ jsx: true, typescript: true });
    case 'js':
    case 'jsx':
      return javascript({ jsx: true });
    case 'json':
      return json();
    case 'html':
    case 'htm':
    case 'xml':
    case 'svg':
    case 'vue':
      return html();
    case 'css':
    case 'scss':
    case 'less':
      return css();
    case 'py':
      return python();
    case 'md':
      return markdown();
    default:
      // 对于其他文件类型使用 JavaScript 基础高亮
      if (/^(tsx?|jsx?)$/i.test(ext)) return javascript();
      return null;
  }
}

interface FileEditorProps {
  fileContent: string;
  fileName: string;
  username: string;
  repoName: string;
  filePath: string;
  onClose: () => void;
  onSaved: () => void;
  isOpen: boolean;
}

export default function FileEditor({
  fileContent, fileName, username, repoName,
  filePath, onClose, onSaved, isOpen,
}: FileEditorProps) {
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [content, setContent] = useState(fileContent);
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isEditable = EDITABLE_EXTENSIONS.has(ext);
  const isMarkdown = ext === 'md';

  // 初始化 CodeMirror
  useEffect(() => {
    if (!isOpen || !isEditable || !editorRef.current) return;

    const langExt = getLanguageExtension(fileName);

    const state = EditorState.create({
      doc: fileContent,
      extensions: [
        basicSetup,
        oneDark,
        ...(langExt ? [langExt] : []),
        EditorView.updateListener.of((update: ViewUpdate) => {
          if (update.docChanged) {
            setContent(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [isOpen, isEditable, fileName]); // eslint-disable-line react-hooks/exhaustive-deps

  // 简单 Markdown 转 HTML（预览用）
  const markdownPreview = useMemo(() => {
    if (!isMarkdown) return '';
    let html = content
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, (_m: string, code: string) => `<pre><code>${code.trim()}</code></pre>`)
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>');
    return sanitizeHtml(html);
  }, [content, isMarkdown]);

  const handleSave = async () => {
    if (!content.trim()) {
      toast.error('内容不能为空');
      return;
    }
    setIsSaving(true);
    try {
      const formData = new FormData();
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      formData.append('file', blob, fileName);
      formData.append('path', filePath);
      formData.append('message', message || `更新 ${fileName}`);
      formData.append('overwrite', 'true');

      const data = await api.post(`/api/v1/repos/${username}/${repoName}/upload`, formData);
      if (data.code === 200 || data.code === 201) {
        toast.success('文件已保存');
        onSaved();
      } else {
        toast.error(data.message || '保存失败');
      }
    } catch {
      toast.error('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  // 不支持编辑的文件类型
  if (!isEditable) {
    const downloadUrl = `/api/v1/repos/${username}/${repoName}/raw/${filePath}`;
    return (
      <Modal isOpen onClose={onClose} title={fileName} maxWidth="400px" footer={
        <>
          <Button variant="secondary" onClick={onClose}>关闭</Button>
          <Button variant="primary" onClick={() => { window.open(downloadUrl, '_blank'); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            下载文件
          </Button>
        </>
      }>
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <span className="text-4xl">📄</span>
          <p className="text-sm text-[var(--ds-text-secondary)]">此文件类型不支持在线编辑</p>
          <p className="text-xs text-[var(--ds-text-tertiary)]">Office 文档、图片、音视频等请下载后本地编辑</p>
        </div>
        </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      maxWidth="100%"
      title={`编辑: ${fileName}`}
      closeOnOverlay={false}
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleSave}
          confirmLabel="提交更改"
          confirmLoading={isSaving}
          cancelLabel="取消"
        />
      }
    >
      <div role="textbox" aria-label="文件编辑器" tabIndex={0} onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }}>
        {/* 文件信息 */}
        <div className="flex items-center gap-2 -mt-1 mb-3">
          {isMarkdown && (
            <span className="text-xs px-1.5 py-0.5 bg-[var(--ds-accent-subtle)] text-[var(--ds-accent-default)] rounded">
              Markdown
            </span>
          )}
          <span className="text-xs text-[var(--ds-text-tertiary)]">
            Ctrl+S 保存 · Esc 关闭
          </span>
        </div>

        {/* 编辑器主体 */}
        <div className={`flex ${isMarkdown ? 'flex-row' : 'flex-col'} border border-[var(--ds-border-default)] rounded overflow-hidden`} style={{ height: '55vh' }}>
          <div className={`${isMarkdown ? 'w-1/2' : 'w-full'} h-full`} ref={editorRef} />
          {isMarkdown && (
            <div className="w-1/2 h-full p-4 border-l border-[var(--ds-border-default)] overflow-auto">
              <div
                className="text-sm markdown-content text-[var(--ds-text-primary)]"
                dangerouslySetInnerHTML={{ __html: markdownPreview }}
              />
            </div>
          )}
        </div>

        {/* 提交信息输入 */}
        <div className="mt-3">
          <Input
            type="text"
            variant="filled"
            placeholder="描述你的更改... (Enter 提交)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          />
        </div>
      </div>
    </Modal>
  );
}
