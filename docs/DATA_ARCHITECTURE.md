# Data Architecture & Sync

## Root cause: why data did not sync between users

The app used **two separate storage paths** that are **not shared** between users:

1. **Per-user Supabase row**  
   Table `public.itineraries` is keyed by `profile_id` (one row per user). When you save, your data goes to **your** row. When your friend saves, their data goes to **their** row. There is no shared “trip” row.

2. **Share link = one-time copy**  
   When you generate a share link, the app writes a snapshot to `shared_itineraries` (by share id). When your friend opens `?share=id`, the app loads that snapshot **once** into their state and then **clears** the share param. After that, all of their edits are saved to **their** `itineraries` row (by their `profile_id`). Your copy stays in your row. So each person edits their own copy; nothing is shared.

3. **localStorage**  
   Every change is also written to `localStorage` on the device. On load, the app can overwrite or mix with Supabase data, so even a single user can see stale or conflicting data across devices.

So: **trip data was never keyed by “trip”; it was keyed by “user”.** Sharing only copied a snapshot; there was no single source of truth for the trip.

## Required behavior

- One **trip** = one id (e.g. share id or trip id).
- Everyone who opens that trip (creator + friends via share/join link) should:
  - **Read** from the same record (e.g. `shared_itineraries[trip_id]`).
  - **Write** to the same record.
  - See each other’s updates in **real time** (or near real time) via Supabase Realtime.

## Implemented solution

1. **Trip id in share settings**  
   `shareSettings.tripId` is the id of the **current trip**. When set, the app treats the session as “in this shared trip”:
   - **Load:** from `shared_itineraries(tripId)` instead of `itineraries(profile_id)`.
   - **Save:** upsert into `shared_itineraries(tripId)` instead of `itineraries(profile_id)`.

2. **Setting trip id**  
   - **Creator:** When they generate a share link, we set `shareSettings.tripId = id` and save the payload to `shared_itineraries(id)`. All subsequent saves go to that row.
   - **Friend:** When they open `?share=id` or `/join/id`, we load from `shared_itineraries(id)` and call `replaceItineraryState` with that data, ensuring `shareSettings.tripId = id` so their saves go to the same row.

3. **One id for share and join**  
   Share link and tripmate (join) link use the **same** `tripId`, so both point to the same trip in `shared_itineraries`.

4. **Realtime**  
   When `shareSettings.tripId` is set, we subscribe to Supabase Realtime for `shared_itineraries` row with that id. When the row changes (any participant saves), we replace local state with the new payload so everyone sees the same data.

5. **localStorage**  
   When in a shared trip (`tripId` set), we still write to localStorage for quick restore, but we **prefer** Supabase for load: if we have `tripId`, we load from `shared_itineraries(tripId)` and overwrite local state. This avoids cached local data overriding shared data.

6. **Leaving a trip**  
   If the user clears trip data or chooses “use my own itinerary”, we clear `shareSettings.tripId` so the app falls back to per-user `itineraries(profile_id)` and localStorage.

This gives a single source of truth per trip and syncs all participants to the same data.
