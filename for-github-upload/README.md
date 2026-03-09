# For GitHub upload

This folder is your **checklist and reference** for updating GitHub. The project to upload is **one level up**: **Travel Planner Project** (the folder that contains this `for-github-upload` folder).

---

## Steps to replace the repo on GitHub (repeat anytime)

Do this in the **Travel Planner Project** folder (the parent of this folder).

1. Open a **terminal** in **Travel Planner Project**.

2. **If you have not used Git here before:**
   ```bash
   git init
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```
   (Replace with your real GitHub username and repo name.)

3. **Upload and replace the repo:**
   ```bash
   git add .
   git commit -m "Update travel planner: icons, Nier theme, auth, fix icon paths"
   git branch -M main
   git push -u origin main --force
   ```
   (`--force` overwrites the GitHub repo with this folder. To only add new changes without overwriting, use `git push origin main` without `--force`.)

4. Done. The GitHub repo now matches your local folder.

---

## More details

- **Step-by-step (where you edit, each command explained):** **STEP-BY-STEP-GUIDE.md** in this folder.
- Full guide: **GITHUB_UPDATE.md** in the project root (one level up).
- Do not upload: `node_modules`, `dist`, `.env.local` (Git ignores these if you use the commands above).
- Checklist: **CHECKLIST.txt** in this folder.
