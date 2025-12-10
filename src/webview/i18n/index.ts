/**
 * i18n - Internationalization module
 * Supports 10 languages: en, ru, zh, es, pt, ja, de, fr, ko, hi
 */

export { Language, Translations } from './types';

import { Language, Translations } from './types';
import { en } from './locales/en';
import { ru } from './locales/ru';
import { zh } from './locales/zh';
import { es } from './locales/es';
import { pt } from './locales/pt';
import { ja } from './locales/ja';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { ko } from './locales/ko';
import { hi } from './locales/hi';

// All translations
const translations: Record<Language, Translations> = {
  en, ru, zh, es, pt, ja, de, fr, ko, hi
};

// Language labels for UI
const languageLabels: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  zh: '中文',
  es: 'Español',
  pt: 'Português',
  ja: '日本語',
  de: 'Deutsch',
  fr: 'Français',
  ko: '한국어',
  hi: 'हिन्दी',
};

/**
 * Get translation for a key
 */
export function t(key: keyof Translations, lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations.en[key] || key;
}

/**
 * Get all translations for a language
 */
export function getTranslations(lang: Language): Translations {
  return translations[lang] || translations.en;
}


/**
 * Get language options for dropdown
 */
export function getLanguageOptions(): { value: Language; label: string }[] {
  return (Object.keys(languageLabels) as Language[]).map(code => ({
    value: code,
    label: languageLabels[code],
  }));
}

/**
 * Get language label
 */
export function getLanguageLabel(lang: Language): string {
  return languageLabels[lang] || languageLabels.en;
}

/**
 * Check if language is supported
 */
export function isValidLanguage(lang: string): lang is Language {
  return lang in translations;
}

/**
 * Get all supported languages
 */
export function getSupportedLanguages(): Language[] {
  return Object.keys(translations) as Language[];
}