# Data Storage & Monetization — Your Questions Answered

## 1. How is user data stored? Is it all stored in GitHub?

**No.** GitHub (and GitHub Pages) only hosts **code and static files**. It does **not** provide:

- A database for user accounts, profiles, or itineraries
- A backend server to process sign-ups or logins
- Any place to store per-user data

**What you have now:** The app uses **localStorage** in the visitor’s browser. All trip data (itinerary, days, saved places, etc.) lives only on that device. If they clear browser data or use another device, it’s gone. Nothing is sent to GitHub.

**If you want real user accounts and data that persists across devices:**

- **Option A — “Sign in with Google” only:** You still need somewhere to store **profiles and itineraries**. For example: **Firebase** (Firestore + Auth) or **Supabase** (database + Auth). Google Sign-In only identifies the user; you store their data in your own database.
- **Option B — Email/password sign up:** Same idea: use Firebase, Supabase, or your own backend + database to store accounts and trip data.

So: **GitHub does not store user data.** For persistent user data, you add a backend/database (e.g. Firebase or Supabase); your code can stay on GitHub.

---

## 2. If users upload receipts and photos, are those stored in GitHub?

**No.** GitHub does not accept or store user uploads (receipts, photos, etc.). Repos are for **code and static assets**, not user-generated files.

To support uploads you need **file storage**, for example:

- **Firebase Storage**
- **Supabase Storage**
- **AWS S3** (or similar)

You’d upload files from the app to one of these services; they are not stored in GitHub.

---

## 3. My repo is public. Does that mean everyone can use my details or copy my code?

**Yes.** A **public** GitHub repo means:

- Anyone can **view** your code
- Anyone can **fork** it and make their own version
- Anyone can **use** your code within the terms of your **license** (e.g. MIT)

If you want to restrict who can see or use the code, you’d make the repo **private**. (Note: GitHub Pages for private repos has limitations on the free tier.)

---

## 4. To monetize, do I have to leave GitHub and rent a domain? Can I still use GitHub if I add donations or a “Pro” version?

- **You do not have to leave GitHub to monetize.** Many projects keep code on GitHub and still:
  - Accept **donations** (e.g. GitHub Sponsors, Ko-fi, Buy Me a Coffee)
  - Offer a **“Pro”** or paid tier (e.g. paid features on a deployed site)
  - Use a **custom domain** (you can point a domain you buy to GitHub Pages, Vercel, Netlify, etc.)

- **Domain:** You can use a **custom domain** with GitHub Pages (or Vercel/Netlify) without “giving up” GitHub. You just connect the domain in the host’s settings.

- **Will GitHub detect or warn about donations / Pro features?**  
  **No.** Donations and paid tiers are normal and allowed. GitHub’s terms focus on things like illegal use, abuse, and crypto/mining abuse — not on “this project has a donate button” or “Pro features.” You’re fine to:
  - Add a “Support me” / donate link
  - Offer a “Pro” plan with advanced features (payments would go through Stripe, Paddle, etc., not through GitHub)

**Summary:** You can keep the repo on GitHub, deploy the site (even with a custom domain), and add monetization (donations, Pro) without GitHub penalizing you. For user data and uploads, you’ll use a separate backend/database and file storage, not GitHub.

---

## 5. Where is trip data stored? Is it in a folder on my laptop?

**No.** Trip data is stored in **localStorage**, which is managed by the **browser**, not by a visible folder in your project or on your desktop.

- **Your project folder** (e.g. `Travel Planner Project`) only contains **code** (HTML, JS, CSS, config). No user data is written there.
- **localStorage** lives inside the browser's own data directory (e.g. for Chrome: inside your user profile, in a database file the browser uses). You don't open it like a normal folder; the app reads/writes it via JavaScript when someone uses your site in that browser.
- So: **your laptop** = your code lives in your project folder; **your friend's laptop** = when they open your website in their browser, their profile and trip data are stored in **their** browser's localStorage (their device), not in your folder and not on a server.

---

## 6. How does the site recognize my friend when they revisit?

With the current setup (no Firebase/Supabase):

- **Same browser, same device:** When your friend revisits your site in the **same** browser they used before, the browser still has the same localStorage. The app loads their profile (name, etc.) from localStorage and "recognizes" them — they stay signed in and see the same trip data.
- **New browser or new device:** If they use a different browser, clear cookies/storage, or open the site on another phone/PC, that browser has **different** (empty) localStorage. The app does **not** recognize them; they'll see the welcome page again and would need to "sign up" again (and they'd get a new, separate trip in that browser).

So recognition is **per browser, per device**, until you add a backend (e.g. Firebase/Supabase) to store accounts and trips on a server.
