// ============================================
// i18n Configuration
// ============================================

export const locales = ['en', 'zh-CN'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh-CN';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '简体中文',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  'zh-CN': '🇨🇳',
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

export function getLocaleFromHeader(header: string | null): Locale {
  if (!header) return defaultLocale;
  
  // Parse Accept-Language header
  const languages = header
    .split(',')
    .map((lang) => {
      const [code, q = '1'] = lang.trim().split(';q=');
      return { code: code.trim(), q: parseFloat(q) };
    })
    .sort((a, b) => b.q - a.q);
  
  for (const { code } of languages) {
    // Check for exact match
    if (isValidLocale(code)) return code;
    
    // Check for language match (e.g., 'en-US' -> 'en')
    const baseCode = code.split('-')[0];
    if (isValidLocale(baseCode)) return baseCode;
  }
  
  return defaultLocale;
}

export default {
  locales,
  defaultLocale,
  localeNames,
  localeFlags,
  isValidLocale,
  getLocaleFromHeader,
};
