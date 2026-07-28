// Freedom MedTEACH® injection training videos by app language.
// Site: https://freedommedteach.com

export const INJECTION_VIDEO_URLS = {
  en: 'https://freedommedteach.com/eng/',
  zh: 'https://freedommedteach.com/cmn/',
  es: 'https://freedommedteach.com/spa/',
};

export const DEFAULT_INJECTION_VIDEO_URL = INJECTION_VIDEO_URLS.en;

export const getInjectionVideoUrl = (language) => {
  if (language && INJECTION_VIDEO_URLS[language]) {
    return INJECTION_VIDEO_URLS[language];
  }
  return DEFAULT_INJECTION_VIDEO_URL;
};
