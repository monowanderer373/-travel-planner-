# What to prepare for Google Sign-In and backend/database

Use this checklist so the app can support **Google Sign-In** and **cloud storage** (same profile and trip on laptop and phone). You do the setup below; then tell me when it’s done and I’ll wire the app to use it.

---

## Part 1 — Supabase (backend + database)

1. **Create a Supabase account and project**
   - Go to [supabase.com](https://supabase.com) → Sign up → **New project**.
   - Name (e.g. `wander-travel-planner`), set a database password, choose a region → Create.

2. **Get your Supabase keys**
   - **API is under Settings, not Authentication.** In the **left sidebar**, click the **gear icon (Settings)** (usually near the bottom). Then click **API**.
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

7. **Get the Supabase Callback URL (you need this before creating the OAuth client)**
   - **Where it comes from:** Supabase **gives** you this URL. You do **not** get it from Google. You copy it **from** Supabase and paste it **into** Google in step 8.
   - **You do not need any users.** The Authentication page can be empty (no users). The Callback URL is a fixed setting, not a list of users.
   - **How to find it in Supabase:**
     - In the **left sidebar**, click **Authentication**.
     - Under **CONFIGURATION**, click **Sign In / Providers** (Supabase may show this instead of “Providers”).
     - Click **Google**. On that page you’ll see a **Callback URL** (or “Redirect URL”) like:  
       `https://xxxxxxxx.supabase.co/auth/v1/callback`  
       Copy that full URL.
   - **If you don’t see Google:** You can build the URL yourself. Click the **gear (Settings)** in the sidebar → **API** → copy your **Project URL** (e.g. `https://abcdefghijk.supabase.co`). The callback URL is that URL + `/auth/v1/callback`, e.g. `https://abcdefghijk.supabase.co/auth/v1/callback`.

8. **Create OAuth 2.0 credentials in Google Cloud**
   - **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
   - Application type: **Web application**.
   - Name: e.g. `Wander Web`.
   - Under **Authorized redirect URIs** → **Add URI** → paste the **Supabase Callback URL** you copied in step 7 (from Supabase, not from Google).
   - Create → copy the **Client ID** and **Client Secret**.

9. **Turn on Google in Supabase**
   - In Supabase: **Authentication** → **Sign In / Providers** (under CONFIGURATION) → **Google** → Enable.
   - Paste **Client ID** and **Client Secret** from step 8 → Save.

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
| Supabase callback URL (for Google) | Supabase → Authentication → **Sign In / Providers** → Google → Callback URL |

All of this is prepared in your project in **SUPABASE_SETUP.md** (Part 1). Part 2 (Google) is summarized above; if you want, I can add a **GOOGLE-SIGNIN-SETUP.md** with the same steps in more detail.
