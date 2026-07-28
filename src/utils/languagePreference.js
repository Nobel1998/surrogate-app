import AsyncStorageLib from './Storage';
import { APP_LANGUAGES } from '../constants/languages';
import { getDeviceAppLanguage } from './deviceLanguage';

export const LANGUAGE_STORAGE_KEY = 'app_language';
export const LANGUAGE_MANUAL_KEY = 'app_language_manual';

const SUPPORTED_LANGUAGE_CODES = new Set(APP_LANGUAGES.map((lang) => lang.code));

export const resolveAppLanguage = async () => {
  try {
    const isManual = await AsyncStorageLib.getItem(LANGUAGE_MANUAL_KEY);
    if (isManual === '1') {
      const savedLanguage = await AsyncStorageLib.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && SUPPORTED_LANGUAGE_CODES.has(savedLanguage)) {
        return savedLanguage;
      }
    }
  } catch (error) {
    console.error('Error reading language preference:', error);
  }

  return getDeviceAppLanguage();
};

export const saveManualLanguage = async (language) => {
  await AsyncStorageLib.setItem(LANGUAGE_STORAGE_KEY, language);
  await AsyncStorageLib.setItem(LANGUAGE_MANUAL_KEY, '1');
};
