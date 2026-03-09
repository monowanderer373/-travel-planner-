# Supabase setup for Wander Travel Planner

This guide explains how to add Supabase so user profiles and trip data can be stored in the cloud (and work across devices). The app is prepared to use Supabase; you only need to create a project and add your keys.

---

## What I need from you

After you finish the steps below, send me (or add to the project **without committing to GitHub**):

1. **Supabase project URL** — looks like: `https://xxxxxxxxxxxxx.supabase.co`
2. **Supabase anon (public) key** — a long string starting with `eyJ...`

**Important:** Do **not** put these in the repo if it’s public. Use a `.env.local` file (see below); that file is in `.gitignore` so it won’t be pushed.

---

## Step 1: Create a Supabase account and project

1. Go to [https://supabase.com](https://supabase.com) and sign up (free).
2. Click **New project**.
3. Choose:
   - **Organization** (or create one).
   - **Name:** e.g. `wander-travel-planner`.
   - **Database password:** choose a strong password and store it somewhere safe (you need it for DB access; the app uses the anon key only).
   - **Region:** pick one close to you.
4. Wait for the project to be created (1–2 minutes).

---

## Step 2: Get your URL and anon key

1. In the Supabase dashboard, open your project.
2. Go to **Settings** (gear icon in the sidebar) → **API**.
3. You’ll see:
   - **Project URL** — copy this (e.g. `https://abcdefghijk.supabase.co`).
   - **Project API keys** → **anon public** — click **Reveal** and copy this key.

---

## Step 3: Add keys to the project (local only)

1. In your project folder, create a file named **`.env.local`** (same folder as `package.json`).
2. Add these two lines (replace with your real values):

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Save the file. The app reads these with `import.meta.env.VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. **Do not commit `.env.local` to Git** — it should already be in `.gitignore`. If you use a public repo, never paste these keys in the repo or in chat; share them only over a secure channel if someone else needs to run the app.

---

## Step 4: Create the database tables (run in Supabase SQL editor)

1. In Supabase dashboard, go to **SQL Editor**.
2. Click **New query**.
3. **Important:** Paste **only** the SQL — do **not** copy the whole SUPABASE_SETUP.md file (that is Markdown and will cause a syntax error). Either:
   - Open the file **`supabase-tables.sql`** in this project and copy **all** of its contents into the SQL editor, or
   - Copy **only** the block between the \`\`\`sql and \`\`\` lines below (nothing else).
4. Run it (Run button). This creates tables for user profiles and itineraries. For **shared trip sync**, **share links**, and the **activity feed**, use the full **`supabase-tables.sql`** in this project (it includes `shared_itineraries` and `trip_activities`).

```sql
-- Profiles: one row per user (linked to Supabase Auth later, or use a simple id for now)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Itineraries: one row per trip (for now we link by profile_id; when you add Supabase Auth we use auth.uid())
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Allow read/write for anon users (we'll tighten with RLS later when you add Auth)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for now" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for now" ON public.itineraries FOR ALL USING (true) WITH CHECK (true);
```

After you add Supabase Auth (Google sign-in, etc.), we can replace these policies with proper rules so users only see their own data.

---

## What the app will do (once wired up)

- **With Supabase configured:** The app can save/load profiles and itinerary data to Supabase so the same user sees their trip on any device.
- **Without keys:** The app keeps using **localStorage** only (current behaviour). No errors; it just won’t sync to the cloud.

---

## Summary checklist

- [ ] Supabase account created  
- [ ] New project created  
- [ ] Project URL and anon key copied  
- [ ] `.env.local` created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`  
- [ ] SQL above run in Supabase SQL Editor  
- [ ] You’ve told me “Supabase is set up” (you don’t need to send the keys if you’ve added them to `.env.local`; I can then wire the app to use Supabase for sync).

If you prefer **Firebase** instead of Supabase, say so and I can add a Firebase version of this guide and the same “what I need from you” (project config + API key).
