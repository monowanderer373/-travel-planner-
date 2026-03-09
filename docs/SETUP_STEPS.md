# Supabase & sync setup – step-by-step

## Step 3 (and Step 4 point 1): Run the SQL in Supabase

**What to do:** Run the **full** `supabase-tables.sql` file in Supabase **once**.

- **Replace or new?**  
  **New query.** You are not “replacing” the whole database.  
  1. In Supabase Dashboard go to **SQL Editor**.  
  2. Click **New query**.  
  3. Open the file **`supabase-tables.sql`** in your project (in Cursor or File Explorer).  
  4. Copy **all** of its contents and paste into the Supabase SQL Editor.  
  5. Click **Run**.

- **What happens:**  
  - `CREATE TABLE IF NOT EXISTS` means: if a table already exists (e.g. `profiles`, `itineraries`, `shared_itineraries`), it is **left as-is**; if it doesn’t exist, it is created.  
  - New tables (e.g. `trip_activities`) are created.  
  - The last line adds `shared_itineraries` to Realtime. If you see an error like “already in publication”, you can ignore it.

So: **one new query, paste full file, run once.** No need to “replace” old tables manually.

---

## Step 3 point 2: Replication page is empty – do I need it?

**No.** The **Replication** page you opened (Database → Replication) is for **read replicas** and external data pipelines. You do **not** need to add anything there for shared-trip sync.

**Realtime** (live updates between users) is enabled by the **last line** of `supabase-tables.sql`:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_itineraries;
```

That uses the **publication** `supabase_realtime`, which is separate from the Replication page. So:

- **Replication page:** leave as-is; nothing to add there.  
- **Realtime:** already enabled when you run the full `supabase-tables.sql` (see above).

---

## Step 4 point 2: What to do with `docs/DATA_ARCHITECTURE.md`

**No action in terminal or Supabase.**  
`docs/DATA_ARCHITECTURE.md` is **documentation only**. It explains:

- Why data was not syncing before.  
- How the fix works (trip id, shared_itineraries, Realtime).

**What you can do:** Open the file in Cursor (or on GitHub) and read it if you want to understand the sync model. No commands to run.

---

## Step 4 point 3: Where is `SUPABASE_SETUP.md` updated?

**In Cursor (your project), not in Supabase.**

- **SUPABASE_SETUP.md** is a **file in your repo** (in the project folder). It has already been updated to say: use the full **`supabase-tables.sql`** for shared trip sync and activity feed.  
- **Supabase** does not “have” this file. Supabase only gets the **schema** when you **run the SQL** in the SQL Editor (Step 3 above).  
- So: the “update” is in your **Cursor project**. You don’t update anything inside the Supabase dashboard for this file.

---

## Quick checklist

| Step | Where | Action |
|------|--------|--------|
| Run SQL | **Supabase** → SQL Editor | New query → paste full `supabase-tables.sql` → Run |
| Replication page | **Supabase** → Database → Replication | Do nothing; leave empty |
| Realtime | Handled by SQL | Done when you run the full SQL file |
| DATA_ARCHITECTURE.md | **Cursor** (docs folder) | Read only; no terminal or Supabase action |
| SUPABASE_SETUP.md | **Cursor** (project root) | Already updated in the project; no Supabase action |
