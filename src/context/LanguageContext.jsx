import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, getStoredLanguage, setStoredLanguage } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getStoredLanguage);

  useEffect(() => {
    setLangState(getStoredLanguage());
  }, []);

  const setLanguage = useCallback((value) => {
    if (value !== 'en' && value !== 'zh-CN') return;
    setLangState(value);
    setStoredLanguage(value);
  }, []);

  const t = useCallback(
    (key, params) => {
      const dict = translations[lang] || translations.en;
      let text = dict[key] ?? translations.en[key] ?? key;
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return text;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
