'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from '@/components/ui';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件的 JavaScript 错误，防止错误传播影响用户体验
 * 
 * 使用方式：
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 更新 state 使下一次渲染能够显示错误 UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 记录错误日志
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 调用自定义错误处理回调
    this.props.onError?.(error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    // 可选：刷新页面而不是仅重置状态
    // window.location.reload();
  };

  handleGoBack = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.history.back();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // 如果有自定义 fallback UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认错误 UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          padding: '2rem',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '4rem',
            marginBottom: '1rem',
            opacity: 0.8,
          }}>
            ⚠️
          </div>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: 'var(--text-primary, #24292f)',
          }}>
            页面出现了一些问题
          </h1>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--text-secondary, #57606a)',
            marginBottom: '1.5rem',
            maxWidth: '400px',
          }}>
            抱歉，页面加载时遇到了错误。请尝试刷新页面或返回上一页。
          </p>
          
          {/* 开发环境显示详细错误信息 */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div style={{
              width: '100%',
              maxWidth: '600px',
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: 'var(--bg-secondary, #f6f8fa)',
              borderRadius: '6px',
              textAlign: 'left',
              fontSize: '0.8rem',
              overflow: 'auto',
            }}>
              <details style={{ cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                  错误详情 (开发模式)
                </summary>
                <pre style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#d73a49',
                  margin: 0,
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack && (
                    `\n\n组件堆栈:\n${this.state.errorInfo.componentStack}`
                  )}
                </pre>
              </details>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '0.75rem',
          }}>
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReload}
            >
              刷新页面
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={this.handleGoBack}
            >
              返回上一页
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 简单的函数式 ErrorBoundary 包装器
 * 用于需要作为子组件的错误边界场景
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
): React.ComponentType<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
