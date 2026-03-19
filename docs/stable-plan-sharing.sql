-- Notion-style stable plan sharing
-- Run this in Supabase SQL Editor AFTER your existing base tables exist.
--
-- Goal:
-- 1. Each itinerary row stays the single source of truth for a plan.
-- 2. A stable share token points to the same plan forever, unless revoked.
-- 3. Members are tracked separately from UI-only tripmates.
-- 4. Invited/shared plans can appear in a guest's "Your Plan" list.

-- 1) Extend itineraries with stable sharing metadata
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS sharing_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS link_access TEXT NOT NULL DEFAULT 'invited',
  ADD COLUMN IF NOT EXISTS link_permission TEXT NOT NULL DEFAULT 'edit',
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS owner_profile_id UUID;

UPDATE public.itineraries
SET owner_profile_id = profile_id
WHERE owner_profile_id IS NULL;

ALTER TABLE public.itineraries
  DROP CONSTRAINT IF EXISTS itineraries_link_access_check;
ALTER TABLE public.itineraries
  ADD CONSTRAINT itineraries_link_access_check
  CHECK (link_access IN ('invited', 'link'));

ALTER TABLE public.itineraries
  DROP CONSTRAINT IF EXISTS itineraries_link_permission_check;
ALTER TABLE public.itineraries
  ADD CONSTRAINT itineraries_link_permission_check
  CHECK (link_permission IN ('view', 'edit'));

-- 2) One membership row per user per plan
CREATE TABLE IF NOT EXISTS public.plan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  joined_via TEXT NOT NULL DEFAULT 'invite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, user_id)
);

ALTER TABLE public.plan_members
  DROP CONSTRAINT IF EXISTS plan_members_role_check;
ALTER TABLE public.plan_members
  ADD CONSTRAINT plan_members_role_check
  CHECK (role IN ('owner', 'editor', 'viewer'));

ALTER TABLE public.plan_members
  DROP CONSTRAINT IF EXISTS plan_members_joined_via_check;
ALTER TABLE public.plan_members
  ADD CONSTRAINT plan_members_joined_via_check
  CHECK (joined_via IN ('owner', 'invite', 'link'));

CREATE INDEX IF NOT EXISTS idx_plan_members_plan_id ON public.plan_members(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_members_user_id ON public.plan_members(user_id);

-- 3) Share preview metadata for /share/<token> page.
-- Keep this table intentionally small so preview can show a title without exposing full JSON.
CREATE TABLE IF NOT EXISTS public.plan_shares (
  token TEXT PRIMARY KEY,
  plan_id UUID NOT NULL UNIQUE REFERENCES public.itineraries(id) ON DELETE CASCADE,
  owner_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  plan_title TEXT,
  destination TEXT,
  start_date DATE,
  end_date DATE,
  access_mode TEXT NOT NULL DEFAULT 'invited',
  permission_mode TEXT NOT NULL DEFAULT 'edit',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plan_shares
  DROP CONSTRAINT IF EXISTS plan_shares_access_mode_check;
ALTER TABLE public.plan_shares
  ADD CONSTRAINT plan_shares_access_mode_check
  CHECK (access_mode IN ('invited', 'link'));

ALTER TABLE public.plan_shares
  DROP CONSTRAINT IF EXISTS plan_shares_permission_mode_check;
ALTER TABLE public.plan_shares
  ADD CONSTRAINT plan_shares_permission_mode_check
  CHECK (permission_mode IN ('view', 'edit'));

-- 4) Backfill member rows for existing itinerary owners
INSERT INTO public.plan_members (plan_id, user_id, role, joined_via)
SELECT i.id, COALESCE(i.owner_profile_id, i.profile_id), 'owner', 'owner'
FROM public.itineraries i
WHERE COALESCE(i.owner_profile_id, i.profile_id) IS NOT NULL
ON CONFLICT (plan_id, user_id) DO UPDATE
SET role = EXCLUDED.role,
    updated_at = now();

-- 5) Backfill plan_shares from current stable share fields if available
INSERT INTO public.plan_shares (
  token,
  plan_id,
  owner_profile_id,
  plan_title,
  destination,
  start_date,
  end_date,
  access_mode,
  permission_mode,
  is_active,
  updated_at
)
SELECT
  i.share_token,
  i.id,
  COALESCE(i.owner_profile_id, i.profile_id),
  NULLIF(COALESCE(i.data->'trip'->>'title', i.data->'trip'->>'destination'), ''),
  NULLIF(i.data->'trip'->>'destination', ''),
  NULLIF(i.data->'trip'->>'startDate', '')::date,
  NULLIF(i.data->'trip'->>'endDate', '')::date,
  COALESCE(NULLIF(i.link_access, ''), 'invited'),
  COALESCE(NULLIF(i.link_permission, ''), 'edit'),
  CASE WHEN i.revoked_at IS NULL THEN true ELSE false END,
  now()
FROM public.itineraries i
WHERE i.share_token IS NOT NULL
ON CONFLICT (token) DO UPDATE
SET
  plan_id = EXCLUDED.plan_id,
  owner_profile_id = EXCLUDED.owner_profile_id,
  plan_title = EXCLUDED.plan_title,
  destination = EXCLUDED.destination,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  access_mode = EXCLUDED.access_mode,
  permission_mode = EXCLUDED.permission_mode,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- 6) RLS
ALTER TABLE public.plan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "itineraries_select_owner_or_member" ON public.itineraries;
CREATE POLICY "itineraries_select_owner_or_member"
ON public.itineraries
FOR SELECT
USING (
  auth.uid() = COALESCE(owner_profile_id, profile_id)
  OR EXISTS (
    SELECT 1
    FROM public.plan_members pm
    WHERE pm.plan_id = itineraries.id
      AND pm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "itineraries_insert_owner" ON public.itineraries;
CREATE POLICY "itineraries_insert_owner"
ON public.itineraries
FOR INSERT
WITH CHECK (
  auth.uid() = profile_id
  AND auth.uid() = COALESCE(owner_profile_id, profile_id)
);

DROP POLICY IF EXISTS "itineraries_update_owner_or_editor" ON public.itineraries;
CREATE POLICY "itineraries_update_owner_or_editor"
ON public.itineraries
FOR UPDATE
USING (
  auth.uid() = COALESCE(owner_profile_id, profile_id)
  OR EXISTS (
    SELECT 1
    FROM public.plan_members pm
    WHERE pm.plan_id = itineraries.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
  )
)
WITH CHECK (
  auth.uid() = COALESCE(owner_profile_id, profile_id)
  OR EXISTS (
    SELECT 1
    FROM public.plan_members pm
    WHERE pm.plan_id = itineraries.id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'editor')
  )
);

DROP POLICY IF EXISTS "itineraries_delete_owner_only" ON public.itineraries;
CREATE POLICY "itineraries_delete_owner_only"
ON public.itineraries
FOR DELETE
USING (
  auth.uid() = COALESCE(owner_profile_id, profile_id)
);

DROP POLICY IF EXISTS "plan_members_select_self_or_owner" ON public.plan_members;
CREATE POLICY "plan_members_select_self_or_owner"
ON public.plan_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = plan_members.plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  )
  OR EXISTS (
    SELECT 1
    FROM public.plan_members pm
    WHERE pm.plan_id = plan_members.plan_id
      AND pm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "plan_members_insert_owner_or_self_join" ON public.plan_members;
CREATE POLICY "plan_members_insert_owner_or_self_join"
ON public.plan_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = plan_members.plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  )
);

DROP POLICY IF EXISTS "plan_members_update_owner_only" ON public.plan_members;
CREATE POLICY "plan_members_update_owner_only"
ON public.plan_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = plan_members.plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = plan_members.plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  )
);

DROP POLICY IF EXISTS "plan_members_delete_owner_or_self_leave" ON public.plan_members;
CREATE POLICY "plan_members_delete_owner_or_self_leave"
ON public.plan_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = plan_members.plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  )
);

-- Preview page can read active share metadata by token.
DROP POLICY IF EXISTS "plan_shares_select_active" ON public.plan_shares;
CREATE POLICY "plan_shares_select_active"
ON public.plan_shares
FOR SELECT
USING (is_active = true);

DROP POLICY IF EXISTS "plan_shares_owner_manage" ON public.plan_shares;
CREATE POLICY "plan_shares_owner_manage"
ON public.plan_shares
FOR ALL
USING (auth.uid() = owner_profile_id)
WITH CHECK (auth.uid() = owner_profile_id);

-- 7) Realtime for canonical plan rows
ALTER PUBLICATION supabase_realtime ADD TABLE public.itineraries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_members;

-- Notes:
-- - Keep old shared_itineraries table during rollout for backward compatibility.
-- - Once frontend fully moves to plan_shares + plan_members + itineraries,
--   shared_itineraries can be retired in a later cleanup migration.
