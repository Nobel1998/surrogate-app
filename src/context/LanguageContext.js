import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorageLib from '../utils/Storage';
import { translate } from '../i18n/translations';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

const LANGUAGE_STORAGE_KEY = 'app_language';

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorageLib.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) {
        setLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = async (newLanguage) => {
    try {
      await AsyncStorageLib.setItem(LANGUAGE_STORAGE_KEY, newLanguage);
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

  // Translation function
  const t = (key, variables = {}) => {
    return translate(key, language, variables);
  };

  const value = {
    language,
    changeLanguage,
    getLanguageLabel,
    t, // Translation function
    loading,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};


