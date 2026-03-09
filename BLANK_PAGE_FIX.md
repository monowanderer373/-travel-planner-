# If your GitHub Pages site shows a blank page

## 1. Use the exact URL

Your site only works when you open the **full** address. Do not use the root:

- ❌ `https://monowanderer373.github.io`
- ✅ `https://monowanderer373.github.io/-travel-planner-/` (leading hyphen before `travel`, trailing slash)

Copy the address from **GitHub → Settings → Pages → "Your site is live at..."** and use that link exactly (including the path and trailing slash).

---

## 2. Check the path in Settings

The path in that URL must match `base` in `vite.config.js`:

- If the URL is **`.../travel-planner-/`** (one hyphen, at the end only) → the repo name is `travel-planner-`. Then `base` in vite must be `'/travel-planner-'` (see step 3).
- If the URL is **`.../-travel-planner-/`** (hyphens at start and end) → the repo name is `-travel-planner-`. Then `base` should stay `'/-travel-planner-/'`.

---

## 3. If the URL has no leading hyphen

If in Settings → Pages the URL is `https://monowanderer373.github.io/travel-planner-**/` (no hyphen before `travel`), then in `vite.config.js` change:

```js
base: '/travel-planner-/',
```

Then run `git add .`, `git commit -m "Fix base for GitHub Pages"`, `git push origin main`. After the deploy finishes, open the URL from Settings again.

---

## 4. See what’s failing in the browser

1. Open your live site URL (the one from Settings).
2. Press **F12** (or right‑click → Inspect) to open Developer Tools.
3. Open the **Console** tab. Note any red errors.
4. Open the **Network** tab, refresh the page. Look for red rows (failed requests).

- If you see **404** on files like `index-xxxxx.js` or `index-xxxxx.css`, the **base path is wrong**. Fix it as in step 3 (match `base` to the path in the “Your site is live at” URL).
- If you see other errors, copy the message and use it to debug (or share it for help).

---

## 5. 404 after “Sign in with Google”

If you see **“There isn’t a GitHub Pages site here”** after logging in with Google:

1. **Check the address bar** when the 404 appears. Note the exact URL (e.g. `https://monowanderer373.github.io` with no path, or a path that’s wrong). That’s where Supabase sent you; it must match your real app URL.
2. **Supabase Redirect URLs** (Authentication → URL Configuration) must include **exactly** that URL (and the correct one with path), e.g.:
   - `https://monowanderer373.github.io/-travel-planner-/`
   - Optionally also: `https://monowanderer373.github.io/-travel-planner-` (no trailing slash)
3. **Site URL** in the same page should be: `https://monowanderer373.github.io/-travel-planner-/`
4. Confirm **GitHub Pages** is on and the last deploy succeeded: repo → **Actions** → latest “Deploy to GitHub Pages” run has a green check. Then open **Settings → Pages** and use the “Your site is live at…” URL to open the app.
5. Always **open the app from that full URL** (with path and trailing slash) before clicking “Sign in with Google”, so the redirect after login goes back to the same address.
