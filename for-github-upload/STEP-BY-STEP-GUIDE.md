# Step-by-step: Where you edit and how to update GitHub

## Important: Where do you edit files?

**You edit files only in your own folder on your computer** (the **Travel Planner Project** folder).

- **Your folder** = `Travel Planner Project` on your laptop (e.g. `C:\Users\asus\Desktop\Vibe Coding\Cursor Project\Travel Planner Project`).  
  You open this folder in Cursor, edit code here, save, and run `npm run dev` here.

- **GitHub** = a copy of your project on the internet. You do **not** edit the code on GitHub when using the normal workflow. You only **upload (push)** from your folder to GitHub so that the website copy matches your folder.

So: **edit in your own folder first**, then run the steps below to **send those changes to GitHub**.

---

## Fix these errors first (if you see them)

If the terminal shows:

- **`fatal: unable to auto-detect email address`** → Git needs your name and email before the first commit.
- **`error: src refspec main does not match any`** → Usually means the first commit did not succeed (often because of the email error above).
- **`failed to push some refs to 'https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git'`** → You must replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your real GitHub username and repo name.

**Do this once, then run the steps again:**

1. **Set your Git name and email** (use your real name and the email tied to your GitHub account):
   ```bash
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```
   Example: `git config --global user.email "asus@gmail.com"` and `git config --global user.name "Asus"`.

2. **Use your real GitHub repo URL** (not the placeholder):
   ```bash
   git remote set-url origin https://github.com/YOUR_ACTUAL_USERNAME/YOUR_ACTUAL_REPO.git
   ```
   Example: if your GitHub username is `johndoe` and the repo is `travel-planner`, run:
   ```bash
   git remote set-url origin https://github.com/johndoe/travel-planner.git
   ```

3. **Then run the full sequence again:** `git add .` → `git commit -m "..."` → `git branch -M main` → `git push -u origin main --force`.

---

## Step-by-step: Replace the repo on GitHub

Do everything below in your **Travel Planner Project** folder. Use a terminal (e.g. in Cursor: **Terminal → New Terminal**).

---

### Step 2.1 — Open the right folder in the terminal

1. In Cursor, open the **Travel Planner Project** folder (the one that contains `package.json`, `src`, `public`).
2. Open a terminal: **Terminal → New Terminal** (or press `` Ctrl+` ``).
3. Check that you are in the right place. Type:
   ```bash
   dir
   ```
   You should see things like `package.json`, `src`, `public`, `index.html`. If you see `node_modules` and `package.json`, you are in the right folder.

---

### Step 2.2 — First time only: turn this folder into a Git repo and link to GitHub

**Do this only if you have never run `git init` in this folder before.**

1. **Initialize Git** (this makes your current folder a “Git repository” so you can track changes and push to GitHub):
   ```bash
   git init
   ```
   You should see something like: `Initialized empty Git repository in ... Travel Planner Project\.git`

2. **Connect this folder to your GitHub repo** (replace with your real GitHub username and repo name):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   Example: if your username is `johndoe` and the repo is `my-travel-planner`, you would run:
   ```bash
   git remote add origin https://github.com/johndoe/my-travel-planner.git
   ```
   If you already added `origin` before and want to change the URL:
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

After this, you do **not** need to run Step 2.2 again. Next time you can start from Step 2.3.

---

### Step 2.3 — Tell Git to include all your files (except what’s in .gitignore)

1. Make sure you have **saved all your edits** in Cursor (your own folder).
2. In the same terminal, run:
   ```bash
   git add .
   ```
   - This means: “include every change in this folder for the next upload.”
   - Git will **not** add `node_modules`, `dist`, or `.env.local` (they are in `.gitignore`). Everything else (code, `public/icons`, etc.) will be included.

---

### Step 2.4 — Save a “snapshot” of your project with a message

1. Run:
   ```bash
   git commit -m "Update travel planner: icons, Nier theme, auth, fix icon paths"
   ```
   - This saves a snapshot of all the files you added in Step 2.3 **on your computer only**. Nothing is on GitHub yet.
   - You can change the message between the quotes to describe what you did (e.g. `"Fix sidebar icons"`).

If Git says “nothing to commit, working tree clean,” it means there are no new changes since the last commit. That’s fine if you already committed; you can still push (Step 2.6).

---

### Step 2.5 — Make sure the branch name is `main`

1. Run:
   ```bash
   git branch -M main
   ```
   This renames your current branch to `main` so it matches the default branch name on GitHub. You only need to do this once (or if your branch was named something else).

---

### Step 2.6 — Send your folder to GitHub (replace the repo)

1. Run:
   ```bash
   git push -u origin main --force
   ```
   - **`git push`** = send your commits from your folder to GitHub.
   - **`origin`** = the GitHub repo you added in Step 2.2.
   - **`main`** = the branch name.
   - **`--force`** = “make GitHub look exactly like my folder, even if that overwrites what’s on GitHub.”

2. If GitHub asks you to sign in:
   - Use your GitHub username and password, or a **Personal Access Token** if you have two-factor authentication.
   - The first time you might be asked to log in in the browser.

3. When it finishes, open your repo on GitHub in the browser. The files there should now match your **Travel Planner Project** folder (except `node_modules`, `dist`, `.env.local`).

---

## Summary: edit where, then what?

| Where you work | What you do |
|----------------|-------------|
| **Your folder** (Travel Planner Project) | Edit code, save, run the app, then run the Git commands (Steps 2.3–2.6) in the terminal. |
| **GitHub** | You don’t edit code here. You only **push** from your folder so GitHub gets an updated copy. |

So: **edit in your own folder first**, then run the steps above to replace (or update) the repo on GitHub.
