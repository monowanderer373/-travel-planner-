# How to Put Your Travel Planner on GitHub Pages (Step by Step)

Follow these steps in order. You only need a web browser and your project on your computer.

---

## Part 1: Get Your Project on GitHub

### Step 1: Make sure your project is in a folder on your computer
- Your travel planner folder (the one with `package.json` and `src` inside) should be on your computer.
- You will “push” this folder to GitHub.

### Step 2: Create a new repository on GitHub
1. Open your browser and go to **https://github.com**
2. Log in to your account.
3. Click the **+** at the top right, then click **New repository**.
4. Fill in:
   - **Repository name:** Type a name, e.g. `travel-planner` or `Trial-Project-1`.  
     Remember this name — you will use it in Part 3.
   - **Public** should be selected.
   - Do **not** check “Add a README” (your folder already has files).
5. Click **Create repository**.

### Step 3: Put your travel planner code into this repo

You already created the repo and you see the page with “Quick setup” and “uploading an existing file”. This step means: **take the folder of your travel planner from your computer and put its contents into this empty repo.**

You can do it in one of these ways:

---

**Option A – Upload in the browser (no Git needed)**

1. **Find the folder**  
   On your computer, open the folder that contains your travel planner project.  
   It’s the folder that has:
   - a **`src`** folder  
   - a **`package.json`** file  
   - an **`index.html`** file  
   - a **`.github`** folder (if you have the deployment setup)  

   Example path: `C:\Users\asus\Desktop\Vibe Coding\Cursor Project\Trial Project 1`

2. **Open that folder and select what to upload**  
   - Open the folder in File Explorer so you see all items inside (e.g. `src`, `public`, `package.json`, `index.html`, `.github`, `node_modules`, etc.).  
   - Select **everything inside** this folder.  
   - **Do not include the `node_modules` folder** (it’s very big and not needed on GitHub).  
     - To select all except `node_modules`: select all (Ctrl+A), then hold **Ctrl** and click the **`node_modules`** folder to unselect it.  
     - Or: select only these: `src`, `public` (if it exists), `.github`, `index.html`, `package.json`, `package-lock.json` (if it exists), `vite.config.js`, `index.html`, and any other files in the root (not `node_modules`).

3. **Upload to GitHub**  
   - Go back to your GitHub repo page (the one in your picture).  
   - In the **“Quick setup”** box, click the link **“uploading an existing file”**.  
   - You’ll see an area where you can drag files or choose them.  
   - Either **drag** the files and folders you selected (from Step 2) into that area, or click **“choose your files”** and select them.  
   - Wait until all files finish uploading.  
   - Scroll down and type a short message in the box (e.g. “Add travel planner code”), then click **“Commit changes”**.

4. **Done**  
   Your travel planner code is now in the repo. You can go to the next part (Part 2 – base URL, then Part 3 – GitHub Pages).

---

**Option B – Using GitHub Desktop**  
1. Open GitHub Desktop.  
2. **File → Add local repository** and choose your travel planner folder.  
3. If it says “not a Git repository”, click **create a repository** there.  
4. Then **Publish repository** (or **Push** if it’s already published).  
5. Choose your GitHub account and the repo you created (e.g. `travel-planner`).  
6. Click **Publish** / **Push**.

**Option C – Using the terminal (Command Prompt or PowerShell)**  
1. Open the terminal in your project folder (e.g. right‑click the folder → “Open in Terminal” or “Open PowerShell window here”).  
2. Run these one by one (replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your GitHub username and the repo name you chose):

```text
git init
git add .
git commit -m "First commit - travel planner"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

3. If it asks for your GitHub login, use your username and a **Personal Access Token** (not your normal password).  
   You can create a token at: GitHub → **Settings** → **Developer settings** → **Personal access tokens**.

After this, your code should be on GitHub.

---

## Part 2: Match the “base” to your repo name

Your app needs to know it will live at `https://username.github.io/REPO_NAME/`.

1. On your computer, open the file **`vite.config.js`** in your project (e.g. in Cursor or Notepad).
2. Find the line that says **`base: '/-travel-planner/'`** (or similar).
3. The part between the quotes must **exactly match your repo name**, with a **`/`** at the start and end.  
   Examples:
   - Repo name **`-travel-planner-`** → use **`base: '/-travel-planner-/',`**
   - Repo name **`travel-planner`** → use **`base: '/travel-planner/',`**

4. Save the file.
5. Push this change to GitHub (commit and push again, same as in Step 3).

---

## Part 3: Turn on GitHub Pages

1. On GitHub, open **your repository** (the one you created).
2. Click **Settings** (top menu of the repo).
3. In the left sidebar, click **Pages** (under “Code and automation” or “Build and deployment”).
4. Under **“Build and deployment”**:
   - **Source:** choose **GitHub Actions** (not “Deploy from a branch”).
5. Do **not** change anything else. Save if there is a button.

---

## Part 4: Let GitHub build and deploy

1. Click the **Actions** tab at the top of your repository.
2. You should see a workflow named **“Deploy to GitHub Pages”** (or similar).
3. Each time you push to the `main` branch, this workflow runs:
   - It builds your app.
   - It deploys the built files to GitHub Pages.
4. Click on the latest run. Wait until you see a green tick (success). The first time can take 1–2 minutes.
5. If you see a red X, click the run and read the error message; often it’s a typo in the repo name or a failed build.

---

## Part 5: Open your live site

1. Go back to **Settings → Pages** in your repo.
2. At the top you’ll see something like: **“Your site is live at https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/”**
3. Click that link (or copy it into your browser).

Your travel planner should load. If you see a blank page or wrong paths, double‑check the **base** in `vite.config.js` (Part 2) and that the repo name matches.

---

## Quick checklist

- [ ] Created a new **public** repo on GitHub.  
- [ ] Pushed your project into that repo (main branch).  
- [ ] In **vite.config.js**, set **base** to **`'/YOUR_REPO_NAME/'`** (same as the repo name).  
- [ ] In repo **Settings → Pages**, set source to **GitHub Actions**.  
- [ ] Under **Actions**, the “Deploy to GitHub Pages” run finished with a green tick.  
- [ ] Opened the live URL from **Settings → Pages**.

---

## If your branch is named `master` instead of `main`

- In the file **`.github/workflows/deploy.yml`**, find the line **`branches: - main`**.
- Change it to **`branches: - master`**.
- Save and push again.

---

## Summary

- **GitHub** holds your code.  
- **GitHub Pages** hosts the built app for free.  
- **GitHub Actions** builds the app and deploys it when you push.  
- Your app’s address is: **https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/**  
- Always keep **base** in `vite.config.js` equal to **`/YOUR_REPO_NAME/`**.

If something doesn’t work, say which step you’re on and what you see (e.g. error message or a screenshot), and we can fix it step by step.
