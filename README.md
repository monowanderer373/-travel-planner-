# Wander — Travel Itinerary Planner

A modern, pastel-themed web app for planning multi-day travel itineraries with a daily timeline (8 AM–11 PM), saved places, and sharing.

## Features

- **Trip details**: Destination, dates, budget, travel style
- **Google Maps place link**: Paste a place link to see a place card (title, hours, address, photo, rating, reviews). UI + placeholder for future API integration.
- **Transport link**: Paste a route or train schedule link for travel time, route overview, next times. UI + placeholder.
- **Multi-day itinerary**: Add days; each day has its own 8 AM–11 PM timeline.
- **Timeline planner**: Click start hour, then end hour to create a linked block. Edit name, duration, and notes.
- **Saved places**: Save places and use voting (thumbs up, “Most voted”).
- **Share**: Modal with generated link and options “Allow others to vote” / “Allow others to edit”.
- **Summary & export**: Day-by-day summary, total time, copy summary, export JSON.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Why do I get "Connection refused" or Error -102 after restarting Cursor?

The app only runs while the **dev server** is running. When you close Cursor or the terminal where `npm run dev` was running, the server stops, so [http://localhost:5173](http://localhost:5173) will show connection refused (Error -102).

**To load the site again:** open the project in Cursor, open a terminal (e.g. **Terminal → New Terminal**), and run:

```bash
npm run dev
```

Leave that terminal open while you use the app. When you see `Local: http://localhost:5173/`, open that URL in your browser.

## Build for production

```bash
npm run build
```

Output is in `dist/`. Serve that folder with any static host.

## Deploy to GitHub and share

1. Create a new repo on GitHub and push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Wander travel planner"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Option A — GitHub Pages**
   - In repo: **Settings → Pages**
   - Source: **GitHub Actions** (or “Deploy from a branch” and choose `main` / `dist`)
   - If using “Deploy from a branch”, build first and push the `dist` folder (or use a branch that contains the built files).
   - For a **single-page app**, add in `vite.config.js`:
     ```js
     export default defineConfig({
       plugins: [react()],
       base: '/YOUR_REPO_NAME/',  // e.g. '/wander-planner/'
     })
     ```
   - Then use the “Build and deploy” workflow or a custom workflow that runs `npm run build` and deploys `dist`.

3. **Option B — Vercel / Netlify**
   - Import the GitHub repo. Build command: `npm run build`, output directory: `dist`. No `base` change needed for Vercel/Netlify.

Share the deployed URL with friends.

## Tech stack

- React 19 + Vite 7
- React Router 7
- CSS (pastel theme, animations, responsive layout)

## Placeholder integrations

These are UI-only; replace with real APIs when ready:

- **Google Maps place**: `PlaceLinkInput.jsx` → `fetchPlaceFromLink(link)`
- **Transport / train**: `TransportLinkInput.jsx` → `fetchTransportFromLink(link)`
- **Voting**: Persisted in React state; can be moved to a backend.
- **Sharing**: Link generation is client-side; for real sharing, use a backend to store itinerary by ID and serve at `/share/:id`.
