# How to Update Your Travel Planner on GitHub

You have **two ways** to replace or update the files in your GitHub repo. **Option 1 (Git)** is recommended.

---

## Option 1: Using Git (recommended)

You do **not** need to erase the repo or manually delete files. You update from your current project folder and push.

### If you already have a GitHub repo and want to replace it with this project

1. **Open a terminal** in this folder:  
   `Travel Planner Project`

2. **Initialize Git** (if this folder is not yet a git repo):
   ```bash
   git init
   ```

3. **Connect to your GitHub repo** (replace with your real repo URL):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   If you already had `origin` and want to replace it:
   ```bash
   git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

4. **Stage everything** (`.gitignore` will exclude `node_modules`, `.env.local`, etc.):
   ```bash
   git add .
   ```

5. **Commit:**
   ```bash
   git commit -m "Update: full travel planner with auth, Nier theme, Supabase setup"
   ```

6. **Push and replace the remote:**
   - First time pushing:
     ```bash
     git branch -M main
     git push -u origin main
     ```
   - If the repo already has different content and you want to **overwrite** it completely:
     ```bash
     git push -u origin main --force
     ```
     (`--force` replaces the history on GitHub with yours. Use only if you are sure.)

After this, your GitHub repo will show the same files as this project (except what’s in `.gitignore`).

---

### If the repo already has commits and you only want to update files (no full replace)

Same as above, but **skip** `--force`:

```bash
git add .
git commit -m "Update travel planner"
git push origin main
```

This adds a new commit on top of the existing history.

---

## Option 2: Erase and re-upload (manual)

Use this only if you don’t want to use Git.

1. On **GitHub.com**, open your repo.
2. Delete the files you want to replace (or delete the whole repo and create a new empty one).
3. In this project folder, **do not upload**:
   - `node_modules` (folder)
   - `dist` (folder)
   - `.env.local` (file with secrets)
4. Upload everything else:
   - All files and folders in `Travel Planner Project`  
   - e.g. drag the **contents** of `Travel Planner Project` (or the folder itself if the repo is empty) into the GitHub upload area.

GitHub will not have `node_modules` or `.env.local`; anyone who clones the repo will run `npm install` to get dependencies.

---

## What gets uploaded (and what doesn’t)

Because of `.gitignore`, Git will **not** push:

- `node_modules/`
- `dist/`
- `.env.local` (your Supabase keys stay only on your PC)
- `*.local` files
- Logs and editor folders

So you **don’t** need to manually erase or exclude these when using Git; they are ignored automatically.

---

## Quick reference

| Goal                         | Command / action                                      |
|-----------------------------|--------------------------------------------------------|
| First time push             | `git init` → `git add .` → `git commit -m "..."` → `git remote add origin <URL>` → `git push -u origin main` |
| Replace repo completely     | Same as above, then `git push -u origin main --force`  |
| Update repo (add changes)   | `git add .` → `git commit -m "..."` → `git push origin main` |

For the full list of steps and the “for-github” folder, see the **for-github-upload** folder in this project.

---

## Repeat these steps to replace the repo (anytime)

Use this **same project folder** (Travel Planner Project). Run these in a terminal **inside that folder**:

1. **Open terminal** in `Travel Planner Project`.

2. **If Git is not set up yet:**
   ```bash
   git init
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   (Replace YOUR_USERNAME and YOUR_REPO_NAME with your GitHub username and repo name.)

3. **Stage, commit, and push (replace repo on GitHub):**
   ```bash
   git add .
   git commit -m "Update travel planner: icons, Nier theme, auth, fix icon paths"
   git branch -M main
   git push -u origin main --force
   ```
   Use `--force` only when you want to **overwrite** the existing GitHub repo. To add changes without overwriting, use `git push origin main` without `--force`.

4. **Done.** Your GitHub repo now matches this local folder.
