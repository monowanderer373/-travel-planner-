import { useState } from 'react';
import { Link } from 'react-router-dom';
import './PlaceCard.css';

export default function PlaceCard({ place, onAddToDay, onAddToSaved, savedFeedback }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="place-card">
      {place.embedUrl && (
        <div className="place-card-embed">
          <iframe
            src={place.embedUrl}
            title={place.title}
            className="place-card-embed-iframe"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <a
            href={place.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="place-card-embed-open"
          >
            Open map in new tab
          </a>
        </div>
      )}

      <div className="place-card-body">
        <h3 className="place-card-title">{place.title}</h3>
        {place.hours && place.hours !== '—' && (
          <p className="place-card-hours">
            <strong>Operating hours:</strong> {place.hours}
          </p>
        )}

        {place.extraNote && (
          <div className="place-card-extra-note">
            <strong>Extra note:</strong> {place.extraNote}
          </div>
        )}

        <button
          type="button"
          className="place-card-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? 'Less' : 'More details'}
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
            Add to day timeline
          </button>
          {onAddToSaved && (
            <>
              {savedFeedback ? (
                <div className="place-card-saved-feedback">
                  <span className="place-card-saved-badge">Saved ✓</span>
                  <Link to="/saved" className="place-card-saved-link">View in Saved Places</Link>
                </div>
              ) : (
                <button type="button" onClick={onAddToSaved}>
                  Save place
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
}
