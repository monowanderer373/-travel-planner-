import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import SummaryBlock from '../components/SummaryBlock';
import AddTripmateButton from '../components/AddTripmateButton';
import ActivityFeed from '../components/ActivityFeed';
import TripmatesBoard from '../components/TripmatesBoard';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';
import { getTotalTravelDays } from '../utils/time';
import './Home.css';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trip, days, replaceItineraryState } = useItinerary();
  const shareHandledRef = useRef(false);

  const shareId = searchParams.get('share');

  useEffect(() => {
    if (!shareId || !user || !hasSupabase() || !supabase || shareHandledRef.current) return;
    shareHandledRef.current = true;
    supabase
      .from('shared_itineraries')
      .select('data')
      .eq('id', shareId)
      .maybeSingle()
      .then(({ data: row, error }) => {
        if (!error && row?.data) {
          const data = row.data;
          replaceItineraryState({
            ...data,
            shareSettings: { ...data.shareSettings, tripId: shareId },
          });
        }
        setSearchParams({}, { replace: true });
      })
      .catch(() => setSearchParams({}, { replace: true }));
  }, [shareId, user, replaceItineraryState, setSearchParams]);
  const hasTripDetails = trip.destination?.trim() && trip.startDate && trip.endDate;
  const totalDays = hasTripDetails ? getTotalTravelDays(trip.startDate, trip.endDate) : days.length;

  return (
    <div className="page home-page">
      <header className="page-header">
        <h1>{t('home.title')}</h1>
        <div className="page-header-actions">
          <AddTripmateButton />
        </div>
      </header>
      {!hasTripDetails && (
        <p className="home-validation-hint">
          {t('home.validationHint')}
        </p>
      )}
      <section className="section home-trip-summary">
        <div className="home-trip-summary-header">
          <h2 className="section-title">{t('home.tripDetails')}</h2>
          <Link to="/create" className="home-edit-trip">{t('home.editTrip')}</Link>
        </div>
        <div className="summary-overview home-trip-overview">
          <p><strong>{t('home.destination')}:</strong> {trip.destination || t('home.dash')}</p>
          <p><strong>{t('home.dates')}:</strong> {trip.startDate && trip.endDate ? `${trip.startDate} – ${trip.endDate}` : t('home.dash')}</p>
          <p><strong>{t('home.totalDays')}:</strong> {totalDays}</p>
          {trip.locations?.length > 0 && (
            <p><strong>{t('home.locations')}:</strong> {trip.locations.join(', ')}</p>
          )}
        </div>
      </section>
      <SummaryBlock />
      <TripmatesBoard />
      <ActivityFeed />
    </div>
  );
}
