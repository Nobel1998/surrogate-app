import { NativeModules, Platform } from 'react-native';
import * as Localization from 'expo-localization';
import { APP_LANGUAGES } from '../constants/languages';

const SUPPORTED_LANGUAGE_CODES = new Set(APP_LANGUAGES.map((lang) => lang.code));

const mapLocaleTagToAppLanguage = (localeTag) => {
  if (!localeTag || typeof localeTag !== 'string') return null;

  const normalized = localeTag.toLowerCase().replace('_', '-');
  const primary = normalized.split('-')[0];

  if (primary === 'zh') return 'zh';
  if (SUPPORTED_LANGUAGE_CODES.has(primary)) return primary;

  return null;
};

const appendLocaleTag = (tags, value) => {
  if (value && typeof value === 'string' && !tags.includes(value)) {
    tags.push(value);
  }
};

const getNativeLocaleTags = () => {
  const tags = [];

  if (Platform.OS === 'ios') {
    const settings = NativeModules.SettingsManager?.settings;
    appendLocaleTag(tags, settings?.AppleLocale);
    if (Array.isArray(settings?.AppleLanguages)) {
      settings.AppleLanguages.forEach((tag) => appendLocaleTag(tags, tag));
    }
  } else if (Platform.OS === 'android') {
    appendLocaleTag(tags, NativeModules.I18nManager?.localeIdentifier);
  }

  return tags;
};

const getDeviceLocaleTags = () => {
  const tags = [];

  try {
    if (typeof Localization.getLocales === 'function') {
      for (const locale of Localization.getLocales()) {
        appendLocaleTag(tags, locale?.languageCode);
        appendLocaleTag(tags, locale?.languageTag);
      }
    }
  } catch (error) {
    console.warn('Failed to read locales from expo-localization:', error);
  }

  if (typeof Localization.locale === 'string') {
    appendLocaleTag(tags, Localization.locale);
  }

  getNativeLocaleTags().forEach((tag) => appendLocaleTag(tags, tag));

  try {
    appendLocaleTag(tags, Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    // Ignore Intl failures.
  }

  return tags;
};

export const getDeviceAppLanguage = () => {
  for (const tag of getDeviceLocaleTags()) {
    const mapped = mapLocaleTagToAppLanguage(tag);
    if (mapped) return mapped;
  }

  return 'en';
};
