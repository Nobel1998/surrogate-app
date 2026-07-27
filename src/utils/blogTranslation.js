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
