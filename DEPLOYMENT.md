# Deploying the Travel Planner

This app is a static React (Vite) SPA. After `npm run build`, deploy the `dist/` folder to any static host.

## Hosting options (free or low-cost)

### 1. **GitHub Pages** (free)
- Push your repo to GitHub, then enable **Pages** in repo **Settings → Pages**.
- Source: **GitHub Actions** (recommended) or **Deploy from branch** (e.g. `main` / `docs` or root and select `dist`).
- **Sign in with Google / Supabase:** So the deployed site can use Supabase, add two **repository secrets** in GitHub: **Settings → Secrets and variables → Actions** → **New repository secret**. Create:
  - `VITE_SUPABASE_URL` = your Supabase project URL (same as in `.env.local`), e.g. `https://xxxx.supabase.co` — no spaces, no quotes.
  - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key (same as in `.env.local`).
  The deploy workflow uses these when running `npm run build`, so the built app will have "Sign in with Google" working. Do **not** commit `.env.local` to the repo. After adding or fixing secrets, go to **Actions** → **Deploy to GitHub Pages** → **Run workflow** so a new build runs with the secrets.
- **Redirect URL for production:** In Supabase dashboard go to **Authentication** → **URL Configuration**. Under **Redirect URLs**, add your live site URL (with trailing slash), e.g. `https://monowanderer373.github.io/-travel-planner-/`. If you get a 404 after Google sign-in, also add the URL **without** trailing slash, e.g. `https://monowanderer373.github.io/-travel-planner-`, so both are allowed.
- **Share links:** The workflow sets `VITE_APP_PUBLIC_URL` so “Share itinerary” links use your live URL instead of localhost. If you use a different GitHub Pages URL, edit `.github/workflows/deploy.yml` and change `VITE_APP_PUBLIC_URL` to match.
- If using **branch**: set branch to `main` (or your branch), folder to `/ (root)` or the folder that contains `index.html` after build. For Vite, you can set **Build** to `npm run build` and **Output directory** to `dist`, or use the **static HTML** option and copy `dist` contents to the chosen branch folder.
- **Recommended**: Use the **“GitHub Actions”** workflow. Create `.github/workflows/deploy.yml` to build and deploy to `gh-pages` (or use a ready-made “Vite deploy to GitHub Pages” workflow). Your site will be at `https://<username>.github.io/<repo-name>/`.
- **Base URL**: If the app is not at the root (e.g. `https://user.github.io/travel-planner/`), set in `vite.config`: `base: '/travel-planner/'` (match your repo name).
- **Refresh / direct links**: The build creates `404.html` (same as `index.html`). When someone opens a deep link (e.g. `/transport`) or refreshes, GitHub Pages serves `404.html`, so the SPA loads and the correct page is shown. Deploy the full `dist/` folder including `404.html`.

### 2. **Netlify** (free tier)
- [netlify.com](https://www.netlify.com) – drag-and-drop the `dist` folder or connect your Git repo.
- **Build command:** `npm run build`  
- **Publish directory:** `dist`
- Free HTTPS, custom domain optional. Good for static SPAs.

### 3. **Vercel** (free tier)
- [vercel.com](https://vercel.com) – connect GitHub repo; it usually detects Vite.
- **Build command:** `npm run build`  
- **Output directory:** `dist` (or leave default if it matches).
- Free HTTPS and global CDN.

### 4. **Cloudflare Pages** (free)
- [pages.cloudflare.com](https://pages.cloudflare.com) – connect Git or upload `dist`.
- **Build command:** `npm run build`  
- **Build output directory:** `dist`
- Fast CDN and free tier.

### 5. **Replit** (you mentioned)
- You can run the app on Replit; for a “deployed” static site you’d run the dev server or use Replit’s hosting. For a production-style deploy, exporting the built `dist` and hosting it on Netlify/Vercel/Pages is often simpler and more reliable than keeping a Replit container running 24/7.

## Summary

| Service         | Free tier | Best for              |
|----------------|-----------|------------------------|
| **GitHub Pages** | Yes       | Already using GitHub   |
| **Netlify**      | Yes       | Easiest deploy + Git   |
| **Vercel**       | Yes       | React/Vite, very smooth|
| **Cloudflare Pages** | Yes  | Speed + free           |

**Recommendation:** Use **GitHub Pages** (since you use GitHub) or **Netlify** for a quick, free, and reliable deploy. Ensure `base` in Vite config matches your site path (e.g. `base: '/your-repo-name/'` for GitHub Pages if the app lives in a subpath).
