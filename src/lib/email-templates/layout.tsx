import {
  Html,
  Body,
  Container,
  Head,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  title: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, title, children }: EmailLayoutProps) {
  return (
    <Html lang="zh-CN">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.headerText}>{title}</Text>
          </Section>
          <Section style={styles.content}>{children}</Section>
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              此邮件由知识托管平台自动发送，请勿直接回复。
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    backgroundColor: '#FAF9F5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px 0',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #E8E3DA',
  },
  header: {
    padding: '24px',
    borderBottom: '1px solid #E8E3DA',
  },
  headerText: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: '#3B3228',
  },
  content: {
    padding: '24px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #E8E3DA',
    backgroundColor: '#F5F2EC',
  },
  footerText: {
    margin: 0,
    fontSize: '12px',
    color: '#8B8680',
    textAlign: 'center' as const,
  },
};
