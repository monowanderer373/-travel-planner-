# What to prepare for Google Sign-In and backend/database

Use this checklist so the app can support **Google Sign-In** and **cloud storage** (same profile and trip on laptop and phone). You do the setup below; then tell me when it’s done and I’ll wire the app to use it.

---

## Part 1 — Supabase (backend + database)

1. **Create a Supabase account and project**
   - Go to [supabase.com](https://supabase.com) → Sign up → **New project**.
   - Name (e.g. `wander-travel-planner`), set a database password, choose a region → Create.

2. **Get your Supabase keys**
   - In the project: **Settings** (gear) → **API**.
   - Copy **Project URL** (e.g. `https://xxxxx.supabase.co`).
   - Copy **anon public** key (click Reveal; it starts with `eyJ...`).

3. **Create database tables**
   - In Supabase: **SQL Editor** → **New query**.
   - Paste and run the SQL from **SUPABASE_SETUP.md** (Step 4) in this project. That creates `profiles` and `itineraries` tables.

4. **Put keys in your project (never in GitHub)**
   - In your **Travel Planner Project** folder, create **`.env.local`** (same folder as `package.json`).
   - Add (with your real values):
     ```env
     VITE_SUPABASE_URL=https://xxxxx.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJ...
     ```
   - Save. Do **not** commit this file or paste these keys in the repo or in chat.

---

## Part 2 — Google Sign-In (Google Cloud + Supabase)

5. **Create a Google Cloud project (or use an existing one)**
   - Go to [console.cloud.google.com](https://console.cloud.google.com).
   - Top bar: click the project dropdown → **New project** → name it (e.g. `wander-planner`) → Create.

6. **Enable Google Identity for sign-in**
   - In Google Cloud Console: **APIs & Services** → **OAuth consent screen**.
   - Choose **External** (or Internal if only for your org) → Next.
   - Fill App name (e.g. `Wander Travel Planner`), User support email, Developer contact → Save and Continue until you’re back.

7. **Create OAuth 2.0 credentials**
   - **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: e.g. `Wander Web`.
   - **Authorized redirect URIs** → **Add URI**.
   - You need Supabase’s redirect URL. In **Supabase dashboard** go to **Authentication** → **Providers** → **Google**; Supabase shows a “Callback URL” like:
     `https://xxxxx.supabase.co/auth/v1/callback`
   - Copy that exact URL and add it in Google Cloud under **Authorized redirect URIs**.
   - Create → copy the **Client ID** and **Client Secret**.

8. **Turn on Google in Supabase**
   - In Supabase: **Authentication** → **Providers** → **Google** → Enable.
   - Paste **Client ID** and **Client Secret** from step 7 → Save.

---

## What you need to have when you’re done

- [ ] **Supabase:** Project URL and anon key in **`.env.local`** (and SQL for tables already run).
- [ ] **Google:** OAuth Client ID and Client Secret created and **redirect URI** set to Supabase callback URL.
- [ ] **Supabase:** Google provider enabled with that Client ID and Client Secret.

You do **not** need to send me the keys. Just tell me:  
**“Supabase and Google Sign-In are set up; .env.local has the Supabase URL and anon key.”**  
Then I can wire the app to use Google Sign-In and the Supabase database so profiles and itineraries sync across devices.

---

## Quick reference

| What              | Where to get it |
|-------------------|-----------------|
| Supabase URL      | Supabase → Settings → API → Project URL |
| Supabase anon key | Supabase → Settings → API → anon public |
| Google Client ID  | Google Cloud Console → Credentials → OAuth 2.0 Client ID |
| Google Client Secret | Same OAuth client → copy secret |
| Supabase callback URL (for Google) | Supabase → Authentication → Providers → Google → Callback URL |

All of this is prepared in your project in **SUPABASE_SETUP.md** (Part 1). Part 2 (Google) is summarized above; if you want, I can add a **GOOGLE-SIGNIN-SETUP.md** with the same steps in more detail.
