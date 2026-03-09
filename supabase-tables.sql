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

CREATE POLICY "Allow all for now" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON public.itineraries FOR ALL USING (true) WITH CHECK (true);
