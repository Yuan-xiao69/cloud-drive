import type { Metadata, Viewport } from 'next';
import { ThemeProvider, AuthProvider } from '@/lib/providers';
import { AnnouncementProvider } from '@/lib/hooks/use-announcements';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { AppShell } from '@/components/design';
import '@/app/globals.css';
import '@/components/design/tokens.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#C15F3C',
};

export const metadata: Metadata = {
  title: {
    template: '%s - 知识托管平台',
    default: '知识托管平台 — 类 GitHub 文件托管与协作',
  },
  description: '类 GitHub 风格的个人/团队文件托管与协作平台。支持仓库管理、文件上传预览、Issue/PR、讨论区、权限控制、SSE 实时通知。',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    siteName: '知识托管平台',
    locale: 'zh_CN',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '知识托管平台',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%231f2328"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();
            `,
          }}
        />
        <ThemeProvider>
          <AuthProvider>
            <AnnouncementProvider>
              <AnnouncementBanner />
              <AppShell>{children}</AppShell>
            </AnnouncementProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
