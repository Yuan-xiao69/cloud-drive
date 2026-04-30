/**
 * 全局类型声明
 * 补充浏览器非标准 API 和动态加载库的类型定义
 */

// highlight.js 通过 CDN 动态加载，挂载到 window.hljs
interface HljsResult {
  value: string;
}

interface HljsStatic {
  configure(options: { languages: string[] }): void;
  highlightAuto(code: string, languageSubset?: string[]): HljsResult;
  highlightAll(): void;
}

interface Window {
  hljs?: HljsStatic;
}

// webkitdirectory 是非标准的 input 属性，用于文件夹选择
interface HTMLInputElement {
  webkitdirectory: string;
}
