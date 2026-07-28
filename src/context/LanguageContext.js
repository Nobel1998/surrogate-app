import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { translate } from '../i18n/translations';
import { getDeviceAppLanguage } from '../utils/deviceLanguage';
import { resolveAppLanguage, saveManualLanguage } from '../utils/languagePreference';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => getDeviceAppLanguage());
  const [loading, setLoading] = useState(true);

  const refreshLanguage = useCallback(async () => {
    const resolvedLanguage = await resolveAppLanguage();
    setLanguage(resolvedLanguage);
    return resolvedLanguage;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLanguage = async () => {
      try {
        const resolvedLanguage = await resolveAppLanguage();
        if (isMounted) {
          setLanguage(resolvedLanguage);
        }
      } catch (error) {
        console.error('Error loading language:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLanguage();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshLanguage();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [refreshLanguage]);

  const changeLanguage = async (newLanguage) => {
    try {
      await saveManualLanguage(newLanguage);
      setLanguage(newLanguage);
    } catch (error) {
      console.error('Error saving language:', error);
      throw error;
    }
  };

  const getLanguageLabel = (lang) => {
    const labels = {
      en: 'English',
      zh: '中文',
      es: 'Español',
    };
    return labels[lang] || lang;
  };

  const t = (key, variables = {}) => translate(key, language, variables);

  const value = {
    language,
    changeLanguage,
    getLanguageLabel,
    t,
    loading,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};
