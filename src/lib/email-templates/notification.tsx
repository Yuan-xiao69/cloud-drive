import { Section, Text, Link } from '@react-email/components';
import { EmailLayout } from './layout';

interface NotificationEmailProps {
  username: string;
  title: string;
  body: string;
  actionUrl?: string;
  actionLabel?: string;
}

export function NotificationEmail({
  username,
  title,
  body,
  actionUrl,
  actionLabel,
}: NotificationEmailProps) {
  return (
    <EmailLayout preview={title} title="通知">
      <Text style={styles.greeting}>你好 {username}，</Text>
      <Text style={styles.bodyText}>{body}</Text>
      {actionUrl && actionLabel && (
        <Section style={styles.actionWrap}>
          <Link href={actionUrl} style={styles.actionBtn}>
            {actionLabel}
          </Link>
        </Section>
      )}
    </EmailLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  greeting: {
    fontSize: '16px',
    lineHeight: 1.6,
    color: '#3B3228',
    margin: '0 0 16px',
  },
  bodyText: {
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#3B3228',
    margin: '0 0 20px',
  },
  actionWrap: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  actionBtn: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: '#C15F3C',
    color: '#FFFFFF',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
  },
};
