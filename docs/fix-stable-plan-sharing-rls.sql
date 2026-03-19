-- Fix recursive RLS in stable plan sharing
-- Run this AFTER docs/stable-plan-sharing.sql
--
-- Root cause:
-- - itineraries policies checked plan_members
-- - plan_members policies checked itineraries
-- - Postgres RLS detected infinite recursion and returned 500

-- 1) Helper functions that bypass recursive policy lookups safely
CREATE OR REPLACE FUNCTION public.current_user_owns_plan(target_plan_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.itineraries i
    WHERE i.id = target_plan_id
      AND auth.uid() = COALESCE(i.owner_profile_id, i.profile_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_plan_member(
  target_plan_id UUID,
  allowed_roles TEXT[] DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.plan_members pm
    WHERE pm.plan_id = target_plan_id
      AND pm.user_id = auth.uid()
      AND (
        allowed_roles IS NULL
        OR pm.role = ANY(allowed_roles)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_owns_plan(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_plan_member(UUID, TEXT[]) TO authenticated;

-- 2) Replace recursive policies on itineraries
DROP POLICY IF EXISTS "itineraries_select_owner_or_member" ON public.itineraries;
CREATE POLICY "itineraries_select_owner_or_member"
ON public.itineraries
FOR SELECT
USING (
  public.current_user_owns_plan(id)
  OR public.current_user_is_plan_member(id, NULL)
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
  public.current_user_owns_plan(id)
  OR public.current_user_is_plan_member(id, ARRAY['owner', 'editor'])
)
WITH CHECK (
  public.current_user_owns_plan(id)
  OR public.current_user_is_plan_member(id, ARRAY['owner', 'editor'])
);

DROP POLICY IF EXISTS "itineraries_delete_owner_only" ON public.itineraries;
CREATE POLICY "itineraries_delete_owner_only"
ON public.itineraries
FOR DELETE
USING (
  public.current_user_owns_plan(id)
);

-- 3) Replace recursive policies on plan_members
DROP POLICY IF EXISTS "plan_members_select_self_or_owner" ON public.plan_members;
CREATE POLICY "plan_members_select_self_or_owner"
ON public.plan_members
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.current_user_owns_plan(plan_id)
  OR public.current_user_is_plan_member(plan_id, NULL)
);

DROP POLICY IF EXISTS "plan_members_insert_owner_or_self_join" ON public.plan_members;
CREATE POLICY "plan_members_insert_owner_or_self_join"
ON public.plan_members
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR public.current_user_owns_plan(plan_id)
);

DROP POLICY IF EXISTS "plan_members_update_owner_only" ON public.plan_members;
CREATE POLICY "plan_members_update_owner_only"
ON public.plan_members
FOR UPDATE
USING (
  public.current_user_owns_plan(plan_id)
)
WITH CHECK (
  public.current_user_owns_plan(plan_id)
);

DROP POLICY IF EXISTS "plan_members_delete_owner_or_self_leave" ON public.plan_members;
CREATE POLICY "plan_members_delete_owner_or_self_leave"
ON public.plan_members
FOR DELETE
USING (
  user_id = auth.uid()
  OR public.current_user_owns_plan(plan_id)
);
