// ============================================
// Internationalization (i18n) Support
// ============================================

import type { Locale } from './i18n/config';

// Dictionary type
export type Dictionary = typeof import('./i18n/en').default;

// i18n namespace types
export interface NamespaceDictionary {
  common: typeof import('./i18n/en').common;
  auth: typeof import('./i18n/en').auth;
  repo: typeof import('./i18n/en').repo;
  discussion: typeof import('./i18n/en').discussion;
  admin: typeof import('./i18n/en').admin;
  settings: typeof import('./i18n/en').settings;
  errors: typeof import('./i18n/en').errors;
}

// Locale messages
export const dictionaries = {
  en: () => import('./i18n/en').then((mod) => mod.default),
  'zh-CN': () => import('./i18n/zh-CN').then((mod) => mod.default),
} as const;

// Fetch dictionary for a locale
export async function getDictionary(locale: Locale): Promise<NamespaceDictionary> {
  const loader = dictionaries[locale] || dictionaries['zh-CN'];
  return loader();
}

// ============================================
// Translation Helper Functions
// ============================================

/**
 * Get a nested value from an object using dot notation
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const value = path.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object' && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, obj as unknown);
  return typeof value === 'string' ? value : path;
}

/**
 * Pluralize a string based on count
 * Usage: t('{{count}} item', { count: 5 }) or t('{{count}} user', { count, plural: { one: 'user', other: 'users' } })
 */
export interface PluralOptions {
  count: number;
  plural?: { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string };
  defaultValue?: string;
}

export function pluralize(options: PluralOptions): string {
  const { count, plural, defaultValue } = options;
  
  if (!plural) return defaultValue || String(count);
  
  // CLDR plural rules (simplified)
  const rules: Record<string, string> = {
    zero: 'zero',
    one: 'one',
    two: 'two',
    few: 'few',
    many: 'many',
    other: 'other',
  };
  
  let rule = 'other';
  if (count === 0 && 'zero' in plural) rule = 'zero';
  else if (count === 1 && 'one' in plural) rule = 'one';
  else if (count === 2 && 'two' in plural) rule = 'two';
  
  return plural[rule as keyof typeof plural] || defaultValue || String(count);
}

/**
 * Interpolate variables in a string
 * Supports: {{variable}}, {{variable.name}}
 */
export function interpolate(template: string, variables: Record<string, unknown> = {}): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, key) => {
    const value = key.split('.').reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, variables);
    return value !== undefined ? String(value) : match;
  });
}

/**
 * Create a translation function for a specific namespace
 */
export function createTranslator<T extends Record<string, unknown>>(
  namespaceData: T,
  variables: Record<string, unknown> = {}
) {
  return function t(key: string, vars?: Record<string, unknown>): string {
    const value = getNestedValue(namespaceData, key);
    const mergedVars = { ...variables, ...vars };
    return interpolate(value, mergedVars);
  };
}

// ============================================
// Server-side Translation (for RSC)
// ============================================

export async function getTranslations(locale: Locale, namespace?: string) {
  const dict = await getDictionary(locale);
  
  if (namespace && namespace in dict) {
    return dict[namespace as keyof NamespaceDictionary];
  }
  
  return dict;
}

// ============================================
// Client-side Hook
// ============================================

// This would be used with React Context or a hook
// Example usage in a Client Component:
//
// 'use client';
// import { useTranslation } from '@/lib/i18n/client';
//
// export function MyComponent() {
//   const { t, locale, setLocale } = useTranslation();
//   return <button>{t('common:buttons.submit')}</button>;
// }

export default {
  getDictionary,
  getNestedValue,
  pluralize,
  interpolate,
  createTranslator,
  getTranslations,
};
