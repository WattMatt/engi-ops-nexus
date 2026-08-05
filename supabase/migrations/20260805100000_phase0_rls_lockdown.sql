-- =============================================================================
-- PHASE 0 SECURITY LOCKDOWN — sensitive-table RLS only
-- =============================================================================
-- Scope: remove the remaining blanket "auth_full_access" (FOR ALL TO
-- authenticated USING (true) WITH CHECK (true)) policies introduced by
-- 20251121091241 on the auth-sensitive tables where they are STILL active:
--   * public.profiles         (20251121091241 line 205 — never dropped)
--   * public.company_settings (20251121091241 line 204 — never dropped)
--
-- 20251127142256 added self/admin SELECT policies on profiles but did NOT drop
-- the blanket policy; because permissive policies are OR-combined, the blanket
-- policy kept full read/write open to every authenticated user. This migration
-- drops the blanket policy and (re-)creates a minimal, explicit policy set.
--
-- Explicitly NOT touched here (verified current state, no blanket policy):
--   * public.user_activity      — already correctly scoped by 20251125082126
--                                 (INSERT: user_id = auth.uid();
--                                  SELECT: self OR admin).
--   * public.user_activity_logs — its blanket policy was already dropped and
--                                 replaced by 20251128041934.
--   * public.user_invitations   — admin-only via "user_invitations_admin"
--                                 (20251125082126).
--   * public.user_roles         — admin-only via "admins_full_access"
--                                 (20251121091241, is_admin-gated, not blanket).
--   * All business/domain tables — full policy rebuild is deferred to a later
--                                  phase.
--
-- Compatibility notes (verified against actual app queries):
--   * profiles keeps a broad SELECT for authenticated users because many
--     non-admin features read co-workers' profiles for display (site-diary
--     task views, comments panels, project members, tenant reports). Narrowing
--     profile reads (e.g. a basic-info view without email/login stats) is
--     deferred to the full rebuild. The critical Phase 0 win is closing
--     arbitrary INSERT/UPDATE/DELETE by any authenticated user.
--   * profiles has NO client INSERT policy: rows are created by the
--     handle_new_user trigger (runs as function/table owner) and by edge
--     functions using the service role, both of which bypass RLS.
--   * company_settings reads stay open to all authenticated users (used by
--     cost reports, tenant reports, project outlines, etc.); writes become
--     admin-only. The only UI write sites (CompanySettings.tsx,
--     SessionSecuritySettings.tsx) render exclusively inside an isAdmin gate
--     in src/pages/Settings.tsx.
--   * src/pages/Auth.tsx reads company_settings pre-login (anon); that read
--     has been RLS-blocked since 20251121091241 (blanket was TO authenticated)
--     and this migration deliberately does not open anon access.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- public.profiles
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_full_access" ON public.profiles;

-- SELECT ----------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Phase 0 compatibility: co-worker profile reads used across non-admin
-- features (task assignees, comment authors, project members). To be
-- narrowed in the full policy rebuild.
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- UPDATE ----------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- DELETE ----------------------------------------------------------------------
-- Required by the admin "Remove user" flow (ManageUserDialog.tsx deletes the
-- profile row).
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT policy on purpose (see header).

-- -----------------------------------------------------------------------------
-- public.company_settings
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "auth_full_access" ON public.company_settings;
-- Stale pre-lockdown policy name; already removed by the 20251121091241
-- drop-all, but kept here for idempotency against older environments.
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;

-- SELECT ----------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view company settings" ON public.company_settings;
CREATE POLICY "Authenticated users can view company settings"
ON public.company_settings
FOR SELECT
TO authenticated
USING (true);

-- INSERT / UPDATE / DELETE: admin only ----------------------------------------
DROP POLICY IF EXISTS "Admins can insert company settings" ON public.company_settings;
CREATE POLICY "Admins can insert company settings"
ON public.company_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
ON public.company_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete company settings" ON public.company_settings;
CREATE POLICY "Admins can delete company settings"
ON public.company_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
