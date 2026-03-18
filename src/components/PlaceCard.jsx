import { useState } from 'react';
import { Link } from 'react-router-dom';
import { getDisplayEmbedUrl } from '../utils/mapsEmbed';
import { useLanguage } from '../context/LanguageContext';
import './PlaceCard.css';

export default function PlaceCard({ place, onAddToDay, onAddToSaved, savedFeedback }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const displayEmbedUrl = place.embedUrl ? getDisplayEmbedUrl(place.embedUrl) : null;
  const openUrl = place.mapUrl || displayEmbedUrl;

  return (
    <article className="place-card">
      {displayEmbedUrl && (
        <div className="place-card-embed">
          <iframe
            src={displayEmbedUrl}
            title={place.title}
            className="place-card-embed-iframe"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={openUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="place-card-embed-open"
          >
            {t('place.openMapNewTab')}
          </a>
        </div>
      )}

      <div className="place-card-body">
        <h3 className="place-card-title">{place.title}</h3>
        {place.hours && place.hours !== '—' && (
          <p className="place-card-hours">
            <strong>{t('place.operatingHours')}</strong> {place.hours}
          </p>
        )}

        {place.extraNote && (
          <div className="place-card-extra-note">
            <strong>{t('place.extraNote')}:</strong> {place.extraNote}
          </div>
        )}

        <button
          type="button"
          className="place-card-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? t('place.less') : t('place.moreDetails')}
        </button>

        {expanded && place.reviews?.length > 0 && (
          <div className="place-card-details animate-in">
            <h4>Top reviews</h4>
            <ul className="place-card-reviews">
              {place.reviews.slice(0, 3).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="place-card-actions">
          <button type="button" className="primary" onClick={onAddToDay}>
            {t('place.addToDay')}
          </button>
          {onAddToSaved && (
            <>
              {savedFeedback ? (
                <div className="place-card-saved-feedback">
                  <span className="place-card-saved-badge">{t('place.saved')}</span>
                  <Link to="/saved" className="place-card-saved-link">{t('place.viewInSaved')}</Link>
                </div>
              ) : (
                <button type="button" onClick={onAddToSaved}>
                  {t('place.savePlace')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
