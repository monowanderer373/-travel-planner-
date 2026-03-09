-- Copy ONLY this file's contents into Supabase SQL Editor (do not copy from SUPABASE_SETUP.md)

-- Profiles: one row per user (linked to Supabase Auth later)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itineraries: one row per trip (link by profile_id; with Supabase Auth we use auth.uid())
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (we'll tighten policies when Auth is added)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

-- Shared itineraries: one row per trip; all participants read/write this row (sync)
CREATE TABLE IF NOT EXISTS public.shared_itineraries (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shared_itineraries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for shared_itineraries" ON public.shared_itineraries;
CREATE POLICY "Allow all for shared_itineraries" ON public.shared_itineraries FOR ALL USING (true) WITH CHECK (true);

-- Trip activity feed: who did what (for shared trips)
CREATE TABLE IF NOT EXISTS public.trip_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id TEXT NOT NULL REFERENCES public.shared_itineraries(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_id TEXT,
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON public.trip_activities(trip_id);
ALTER TABLE public.trip_activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for trip_activities" ON public.trip_activities;
CREATE POLICY "Allow all for trip_activities" ON public.trip_activities FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for now" ON public.profiles;
CREATE POLICY "Allow all for now" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow all for now" ON public.itineraries;
CREATE POLICY "Allow all for now" ON public.itineraries FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime for shared trips (so all participants see updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_itineraries;
