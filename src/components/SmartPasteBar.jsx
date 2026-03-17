import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import './SmartPasteBar.css';

export default function SmartPasteBar() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = (value || '').trim();
    if (!url) return;
    setValue('');
    navigate('/saved', { state: { pasteUrl: url } });
  };

  return (
    <form className="smart-paste-bar" onSubmit={handleSubmit}>
      <input
        type="url"
        className="smart-paste-input"
        placeholder={t('home.paste.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t('home.paste.placeholder')}
      />
      <button type="submit" className="smart-paste-btn primary">
        {t('home.paste.button')}
      </button>
    </form>
  );
}
