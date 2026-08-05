-- =============================================================================
-- PHASE 2 — user_roles self-SELECT + legacy role store cleanup
-- =============================================================================
-- Scope (Onboarding Standard C3/C4, follows 20260805100000_phase0_rls_lockdown):
--
-- 1. user_roles self-SELECT policy.
--    20251121091241 dropped every policy on every table (DO-block) and left
--    user_roles with only "admins_full_access" (FOR ALL, is_admin-gated).
--    Consequence: non-admins (moderators, users) cannot read their OWN role
--    row — client role checks (useRoleAccess) silently degrade for them.
--    Fix: add a self-scoped SELECT policy. Admin write paths are untouched.
--
-- 2. Drop the legacy duplicate role store: profiles.role + the user_role enum.
--    History: 20251020004321 created profiles.role (type user_role); the
--    canonical store has been public.user_roles (+ app_role enum + has_role())
--    since 20251020013821, which nulled the column and declared it phased out.
--    Verified before dropping (2026-08-05):
--      * No frontend read: grep of src/ finds no profiles.role usage
--        (all ".role" hits are user_roles, project_members.role, message
--        roles, etc.).
--      * No edge-function read: grep of supabase/functions/ finds none.
--      * handle_new_user (latest def: 20251029152117) does not write it.
--      * The only live DB dependents are two RLS policies created AFTER the
--        20251121091241 drop-all: invoice_notification_settings /
--        invoice_notification_logs (20251129042517). They are re-created on
--        has_role() below BEFORE the column drop.
--      * "Admins can manage projects" (20251020004321, referenced
--        profiles.role) was dropped by 20251121091241's drop-all; a defensive
--        DROP IF EXISTS is included in case the live DB drifted.
--
-- 3. Drop public.user_invitations.
--    Fully orphaned: created 20251025042918, policy-tightened 20251125082126,
--    but no code path reads or writes it (grep of src/ + supabase/functions/:
--    only the generated types file mentions it). Its bespoke 7-day-expiry
--    token design is superseded by the recovery-action-link invite flow in
--    supabase/functions/invite-user.
--
-- After applying, regenerate src/integrations/supabase/types.ts
-- (`supabase gen types typescript`) — the checked-in copy has been hand-
-- trimmed to match this migration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. user_roles: users can read their own role (admins keep full access via
--    the existing "admins_full_access" policy; policies are OR-combined)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2a. Migrate the last profiles.role-dependent policies to has_role()
--     (must happen before the column drop; DROP COLUMN would otherwise fail
--     on the dependent policy predicates)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admin users can manage invoice notification settings"
  ON public.invoice_notification_settings;
CREATE POLICY "Admin users can manage invoice notification settings"
ON public.invoice_notification_settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admin users can view invoice notification logs"
  ON public.invoice_notification_logs;
CREATE POLICY "Admin users can view invoice notification logs"
ON public.invoice_notification_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Defensive: dropped by 20251121091241's drop-all, but remove it explicitly
-- in case the live DB drifted from the migration history.
DROP POLICY IF EXISTS "Admins can manage projects" ON public.projects;

-- -----------------------------------------------------------------------------
-- 2b. Drop the legacy role column and its enum
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS public.user_role;

-- -----------------------------------------------------------------------------
-- 3. Drop the orphaned bespoke invitation table (superseded by the
--    recovery-action-link flow in the invite-user edge function)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.user_invitations;
