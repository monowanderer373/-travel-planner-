import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import AddTripmateButton from '../components/AddTripmateButton';
import LeaveSharedTripButton from '../components/LeaveSharedTripButton';
import ActivityFeed from '../components/ActivityFeed';
import TripmatesBoard from '../components/TripmatesBoard';
import DashboardHero from '../components/DashboardHero';
import SmartPasteBar from '../components/SmartPasteBar';
import TodayAgendaCard from '../components/TodayAgendaCard';
import UnplannedSavesCard from '../components/UnplannedSavesCard';
import BudgetSnapshotCard from '../components/BudgetSnapshotCard';
import DashboardCard from '../components/DashboardCard';
import { useItinerary } from '../context/ItineraryContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase, hasSupabase } from '../lib/supabase';
import { decodeInviteToken } from '../utils/publicUrl';
import './Home.css';

const PENDING_INVITE_KEY = 'pending_invite_token';
const PENDING_TRIP_KEY = 'pending_trip_id';

export default function Home() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { trip, days, replaceItineraryState, setActiveTripId } = useItinerary();
  const shareHandledRef = useRef(false);
  const inviteHandledRef = useRef(false);

  const shareId = searchParams.get('share');
  const tripParam = searchParams.get('trip') || (typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_TRIP_KEY) : null);
  const inviteParam = searchParams.get('invite') || (typeof localStorage !== 'undefined' ? localStorage.getItem(PENDING_INVITE_KEY) : null);

  const getInviteCandidates = (token) => {
    if (!token) return [];
    const first = decodeInviteToken(token) || token;
    const second = decodeInviteToken(first) || first;
    return [...new Set([first, second, token].filter(Boolean))];
  };

  // Legacy ?share= param (same behaviour as before)
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
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('share');
          return next;
        }, { replace: true });
      })
      .catch(() => setSearchParams((prev) => { const n = new URLSearchParams(prev); n.delete('share'); return n; }, { replace: true }));
  }, [shareId, user, replaceItineraryState, setSearchParams]);

  // Preferred trip param ?trip=ID (Notion-like stable link)
  useEffect(() => {
    if (!tripParam || !user || !hasSupabase() || !supabase || inviteHandledRef.current) return;
    inviteHandledRef.current = true;
    const candidates = getInviteCandidates(tripParam);

    const tryFetchTrip = async () => {
      for (const candidateId of candidates) {
        setActiveTripId(candidateId);
        const { data: row, error } = await supabase
          .from('shared_itineraries')
          .select('data')
          .eq('id', candidateId)
          .maybeSingle();
        if (error || !row?.data) continue;

        const data = row.data;
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(PENDING_TRIP_KEY);
          localStorage.removeItem(PENDING_INVITE_KEY);
        }
        replaceItineraryState({
          ...data,
          shareSettings: { ...data.shareSettings, tripId: candidateId },
        });
        try {
          const cr = (data?.tripCreator?.email || '').trim().toLowerCase();
          const ue = (user?.email || '').trim().toLowerCase();
          if (!cr || !ue || cr !== ue) {
            sessionStorage.setItem('share_join_flow', candidateId);
          }
        } catch {}
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('trip');
          next.delete('source');
          return next;
        }, { replace: true });
        return;
      }
      inviteHandledRef.current = false;
    };

    tryFetchTrip().catch(() => {
      inviteHandledRef.current = false;
    });
  }, [tripParam, user, replaceItineraryState, setActiveTripId, setSearchParams]);

  // Legacy invite param ?invite=TOKEN
  useEffect(() => {
    if (!inviteParam || tripParam || !user || !hasSupabase() || !supabase || inviteHandledRef.current) return;
    inviteHandledRef.current = true;
    const candidates = getInviteCandidates(inviteParam);

    const tryFetch = async () => {
      for (const candidateId of candidates) {
        setActiveTripId(candidateId);
        const { data: row, error } = await supabase
          .from('shared_itineraries')
          .select('data')
          .eq('id', candidateId)
          .maybeSingle();
        if (!error && row?.data) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(PENDING_INVITE_KEY);
            localStorage.removeItem(PENDING_TRIP_KEY);
          }
          const data = row.data;
          replaceItineraryState({
            ...data,
            shareSettings: { ...data.shareSettings, tripId: candidateId },
          });
          try {
            const cr = (data?.tripCreator?.email || '').trim().toLowerCase();
            const ue = (user?.email || '').trim().toLowerCase();
            if (!cr || !ue || cr !== ue) sessionStorage.setItem('share_join_flow', candidateId);
          } catch {}
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.delete('invite');
            next.delete('source');
            return next;
          }, { replace: true });
          return;
        }
      }
      inviteHandledRef.current = false;
    };

    tryFetch().catch(() => {
      inviteHandledRef.current = false;
    });
  }, [inviteParam, tripParam, user, replaceItineraryState, setActiveTripId, setSearchParams]);

  const hasTripDetails = trip.destination?.trim() && trip.startDate && trip.endDate;

  return (
    <div className="page home-page">
      <header className="page-header home-dashboard-header">
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
      <DashboardHero />
      <SmartPasteBar />
      <div className="home-dashboard">
        <TodayAgendaCard />
        <UnplannedSavesCard />
        <BudgetSnapshotCard />
        <DashboardCard titleKey="home.tripmates.title">
          <TripmatesBoard />
        </DashboardCard>
        <DashboardCard titleKey="home.activity.title" actionLabel="home.activity.viewAll" actionTo="/itinerary">
          <ActivityFeed />
        </DashboardCard>
      </div>
      <LeaveSharedTripButton variant="home" />
    </div>
  );
}
