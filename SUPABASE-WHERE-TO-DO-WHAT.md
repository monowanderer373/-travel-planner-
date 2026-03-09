# Supabase: where to do what

Two places are involved: **Supabase (website)** and **your project in Cursor (your computer)**. Use this to know where each step happens.

---

## 1. Where do I put the Project URL and anon public key?

**Not in the Supabase SQL editor.**  
Put them in **your project folder in Cursor**, in a file named **`.env.local`**.

- **Supabase SQL Editor** = only for running SQL (e.g. creating tables). You do **not** type your URL or key there.
- **Project URL and anon key** = go in **`.env.local`** in your **Travel Planner Project** folder (see section 3 below).

---

## 2. Where is SUPABASE_SETUP.md? The SQL editor doesn’t show anything.

**SUPABASE_SETUP.md** is a file in **your project on your computer**, not inside Supabase.

- **Where it is:** Open your **Travel Planner Project** folder in **Cursor**. In the file list (left sidebar), look for **SUPABASE_SETUP.md** in the root of the project (same level as `package.json`, `src`, etc.).
- **Supabase SQL Editor** in the browser is empty on purpose. You don’t “open” SUPABASE_SETUP there. You:
  1. Open **SUPABASE_SETUP.md** in **Cursor** (your project).
  2. Find **Step 4** and copy the **whole SQL block** (from `CREATE TABLE` down to the last `...WITH CHECK (true);`).
  3. Go to **Supabase** in your browser → **SQL Editor**.
  4. **Paste** that SQL into the big text area (where it says “Hit CTRL+K to generate query or just start typing”).
  5. Click the green **Run** button.  
  That creates the tables. SUPABASE_SETUP.md is only the instructions and the SQL to copy; the actual execution happens in the Supabase SQL Editor.

---

## 3. How do I create .env.local? In Supabase or in Cursor?

Create **`.env.local`** in **Cursor**, in your **Travel Planner Project** folder (the same folder that has `package.json`).  
You do **not** create it in Supabase. Supabase is the cloud service; your app runs from your computer and reads `.env.local` from your project folder.

**Steps in Cursor:**

1. In the left sidebar, make sure you’re in **Travel Planner Project** (root of the project).
2. Right‑click in the file list (or use **File → New File**).
3. Create a new file and name it exactly: **`.env.local`** (including the dot at the start).
4. Open `.env.local` and add these two lines (replace with the values you copied from Supabase):

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

5. Save the file.

So: **both “those two” values (URL and anon key) go in this one file, `.env.local`, in Cursor, in the Travel Planner Project folder.** You don’t create any of these files in Supabase; you only create the project and run SQL there.

---

## Quick reference

| What | Where |
|------|--------|
| Project URL & anon key | **Cursor** → your project folder → file **`.env.local`** |
| SUPABASE_SETUP.md | **Cursor** → your project folder (root) → open it there, copy the SQL from Step 4 |
| Run the SQL (create tables) | **Supabase** (browser) → SQL Editor → paste the SQL → **Run** |
| Create .env.local | **Cursor** → Travel Planner Project folder → new file named `.env.local` |

Summary: **Keys and .env.local = in Cursor (your folder).** **Creating tables = in Supabase SQL Editor (browser).** **SUPABASE_SETUP.md = in Cursor; you copy from it into Supabase.**
