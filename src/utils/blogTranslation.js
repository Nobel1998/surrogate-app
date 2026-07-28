const SUPPORTED_LANGUAGES = ['zh', 'es'];

const normalize = (value) => {
  if (value == null) return '';
  return String(value).trim();
};

export const resolveBlogField = (event, field, language) => {
  if (!event || !field) return '';

  const normalizedLanguage = SUPPORTED_LANGUAGES.includes(language) ? language : 'en';
  const translatedKey = normalizedLanguage === 'en' ? field : `${field}_${normalizedLanguage}`;

  const translatedValue = normalize(event?.[translatedKey]);
  if (translatedValue) return translatedValue;

  return normalize(event?.[field]);
};

export const getLocalizedBlog = (event, language) => {
  if (!event) return event;

  return {
    ...event,
    title: resolveBlogField(event, 'title', language),
    description: resolveBlogField(event, 'description', language),
    content: resolveBlogField(event, 'content', language),
  };
};

const LOCALE_BY_LANGUAGE = {
  en: 'en-US',
  zh: 'zh-CN',
  es: 'es-ES',
};

export const formatEventDate = (eventDate, language = 'en') => {
  if (!eventDate) return '';
  const locale = LOCALE_BY_LANGUAGE[language] || LOCALE_BY_LANGUAGE.en;
  return new Date(eventDate).toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const translateBlogCategory = (category, t) => {
  const raw = normalize(category) || 'General';
  const key = `blog.categories.${raw}`;
  const translated = t(key);
  return translated === key ? raw : translated;
};
