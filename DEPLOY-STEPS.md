# Step-by-step: Build and deploy to GitHub Pages

This guide explains **what** to run, **where**, and **how** to get your site (and the 404 fix) live on GitHub Pages.

---

## Part 1: What is “npm” and “npm run build”?

- **npm** = the tool that installs and runs your project’s JavaScript/React app. It comes with **Node.js** (you need Node installed on your PC).
- **npm run build** = a command defined in your project’s `package.json`. It runs **Vite** to turn your source code into a ready-to-deploy folder called **dist/**.
- **Where to run it** = in a **terminal**, with the terminal’s current folder set to your **Travel Planner Project** folder (the one that contains `package.json`).

So: **“Run npm run build”** means: open a terminal in your project folder and type `npm run build`. That creates (or updates) the **dist/** folder with `index.html`, `404.html`, and the built JS/CSS.

---

## Part 2: Easiest way — Let GitHub build and deploy (recommended)

Your project already has a **GitHub Actions** workflow (`.github/workflows/deploy.yml`). When you **push your code to the `main` branch**, GitHub will:

1. Run `npm run build` on GitHub’s servers  
2. Use the **dist/** folder (including **404.html**)  
3. Deploy it to GitHub Pages  

So you **don’t have to run `npm run build` on your PC** for the site to update. You only need to **push your latest code**.

### Steps (easiest)

1. **Open a terminal**  
   - In VS Code / Cursor: **Terminal → New Terminal** (or `` Ctrl+` ``).  
   - Or: open **Command Prompt** or **PowerShell**, then go to your project folder (see step 2).

2. **Go to your project folder**  
   In the terminal, run (change the path if your folder is elsewhere):
   ```bash
   cd "C:\Users\asus\Desktop\Vibe Coding\Cursor Project\Travel Planner Project"
   ```

3. **Push your code to GitHub**  
   ```bash
   git add .
   git commit -m "Update app and 404 fix for GitHub Pages"
   git push origin main
   ```

4. **Wait for GitHub to build and deploy**  
   - On GitHub.com, open your repo: **https://github.com/monowanderer373/-travel-planner-**  
   - Click the **“Actions”** tab.  
   - You should see a workflow run **“Deploy to GitHub Pages”**. Wait until it shows a green tick (about 1–2 minutes).  
   - That run does `npm run build` and deploys the whole **dist/** folder (including **404.html**).

5. **Check your site**  
   - Your site is at: **https://monowanderer373.github.io/-travel-planner-**  
   - Try opening a deep link (e.g. …/transport), then **refresh** — it should no longer show 404.

No need to run `npm run build` on your PC or upload **dist/** yourself when you use this method.

---

## Part 3: Run “npm run build” yourself (optional)

Use this if you want to **test the build locally** or understand what gets deployed.

### 1. Where to build

- **Folder:** Your **Travel Planner Project** folder (the one that contains **package.json** and **vite.config.js**).  
  Example:  
  `C:\Users\asus\Desktop\Vibe Coding\Cursor Project\Travel Planner Project`

### 2. Open a terminal in that folder

- **In Cursor/VS Code:**  
  - **File → Open Folder** and open **Travel Planner Project**.  
  - **Terminal → New Terminal** (or `` Ctrl+` ``).  
  The terminal will usually start in the project folder.

- **Or in Command Prompt / PowerShell:**  
  - Open Command Prompt or PowerShell.  
  - Run:
    ```bash
    cd "C:\Users\asus\Desktop\Vibe Coding\Cursor Project\Travel Planner Project"
    ```
  (Change the path if your project is somewhere else.)

### 3. Install dependencies (first time only)

If you’ve never run the project on this PC, run once:

```bash
npm install
```

This reads **package.json** and installs the tools (e.g. Vite, React) into a **node_modules** folder.

### 4. Run the build

```bash
npm run build
```

- **What it does:** Runs the **“build”** script from **package.json** (which runs **vite build**).  
- **Result:** A **dist/** folder appears (or is updated) in your project, containing:
  - **index.html**
  - **404.html** (same content — for the refresh/direct-link fix)
  - **assets/** (JS and CSS files)
  - **icons/** (if you have any)

### 5. Deploy the entire dist/ folder

With the **GitHub Actions** workflow (Part 2), you **don’t** copy **dist/** yourself — you just push code and GitHub builds and deploys **dist/**.

If you were **not** using GitHub Actions and instead deployed manually (e.g. upload to a host):

- You would upload **everything inside the dist/ folder** (all files and the **assets** and **icons** folders), not the project root.  
- The **404 fix** only works if **404.html** is included in what you upload.

So for your setup: **Part 2 (push to main)** is enough; the workflow deploys the entire **dist/** including **404.html**.

---

## Quick reference

| Goal                         | What to do |
|-----------------------------|------------|
| Update the live site        | Push to `main`; GitHub runs `npm run build` and deploys **dist/** |
| Test build on your PC       | In project folder: `npm run build` → check **dist/** |
| Fix 404 on refresh          | Already in place: build creates **404.html**; deploy **dist/** (GitHub Actions does this when you push) |

---

## Troubleshooting

- **“npm is not recognized”**  
  Install **Node.js** from https://nodejs.org (LTS). Restart the terminal after installing.

- **Build fails on GitHub Actions**  
  Check the **Actions** tab for the error. Fix any errors in code or config, then push again.

- **Site still 404 on refresh**  
  Make sure the last deploy used a build that includes **404.html** (your current workflow does). If you deploy manually, upload the full **dist/** including **404.html**.
