# Onboarding Standard Conformance — WM_Office_Web

Tracks this app against the **WM Onboarding Standard v1**
(`../ONBOARDING-STANDARD/STANDARD.md`). Stack profile: **S** (Supabase web SPA).
Update this file in the same PR as any auth change (STANDARD §4).

**State:** post-Phase 2 (2026-08-05). Phase 0 (RLS lockdown of profiles /
company_settings, admin-reset-password removal, CSPRNG invite generator,
useRoleAccess/AdminLayout fail-closed fixes) and Phase 2 (this pass: link-based
invites, resend, route guards, safe `?next`, roles cleanup, logout purge) are
implemented but **not yet deployed** — see "Deploy actions" at the bottom.

Legend: ✓ met · ◐ partial · ✗ not met · n.a. not applicable

## A. Entry & authentication

| # | Requirement (level) | Status | Evidence |
|---|---|---|---|
| A1 | Root triage by session **and role** (MUST) | ◐ | `src/pages/Index.tsx` triages by session only; all roles land on `/projects` |
| A2 | Branded auth surface, safe pre-auth read (SHOULD) | ◐ | `src/pages/Auth.tsx` reads `company_settings`, but the anon read is RLS-blocked (noted in `20260805100000_phase0_rls_lockdown.sql`) |
| A3 | Self-signup disabled at UI **and** provider level (MUST) | ✗ | `src/pages/Auth.tsx:124-185` still ships a Sign-up tab + `auth.signUp`; no `disable_signup` in `supabase/config.toml` — **top remaining MUST** |
| A4 | Magic-link/OTP login option (SHOULD, S) | ✗ | Password login only |
| A5 | zxcvbn (≥2) + HIBP on every password-set surface (MUST) | ✗ | `src/pages/SetPassword.tsx` has length/complexity rules only; kit `password-strength` not yet ported |
| A6 | Enumeration defence + 1.0–1.3 s timing pad on reset (MUST) | ✗ | `src/components/auth/ForgotPasswordDialog.tsx:27` calls `resetPasswordForEmail` with no pad/uniform response |
| A7 | Safe `?next` via allow-list + dot-segment normalisation (MUST) | ✓ | **Phase 2:** `src/lib/loginNext.ts` (`safeNext`), wired into both redirect sources in `src/pages/Auth.tsx`; `//evil.com`, `/\`, `/x/../y` neutralised |
| A8 | Env-gated captcha slot (SHOULD) | ✗ | No captcha on auth forms |
| A9 | Fail-closed route guards on every protected surface (MUST) | ✓ | **Phase 2:** `src/components/auth/ProtectedRoute.tsx` wraps every authenticated route in `src/App.tsx` (session-check, loading state, error ⇒ deny); `/admin` additionally keeps `AdminLayout`'s server-verified admin check |
| A10 | Server-side gating / RLS documented as boundary (SHOULD) | ✓ | SPA profile: client guards are UX only; **RLS is the hard boundary** (this file + guard header comment document it) |
| A11 | Guard unit tests (MUST) | ✗ | Repo has no test runner (`package.json` scripts: dev/build/lint only) — port kit `ProtectedRoute.test.tsx` + `loginNext.test.ts` once one exists |
| A12 | Auto-logout: schedule + idle + countdown + storage purge (SHOULD) | ✓ | `src/hooks/useSessionMonitor.ts` + `useIdleTracker.ts` (this app is the kit's source of record for A12) |
| A13 | Token scrub before async exchange; OTP-first recovery (MUST) | ◐ | `SetPassword.tsx` handles `PASSWORD_RECOVERY`, but hash tokens are not scrubbed from history and the recovery template is not OTP-first |
| A14 | MFA (MAY, S) | ✗ | Not implemented (optional) |

## B. Invitations

| # | Requirement (level) | Status | Evidence |
|---|---|---|---|
| B1 | Invite UI: email, name, role, delivery-mode toggle (MUST) | ✓ | **Phase 2:** `src/components/users/InviteUserDialog.tsx` — email-link (default) / temp-password-relay radio toggle; tenant scope n.a. (single-tenant app) |
| B2 | Server-enforced admin-only creation (MUST) | ✓ | `supabase/functions/invite-user/index.ts` — JWT verified, role checked against `user_roles`, input validated; rate limiting rests on provider limits (◐ note) |
| B3 | Role → `user_roles`, partial-failure rollback (MUST) | ✓ | `invite-user/index.ts` — role insert failure deletes the created auth user (kept from pre-Phase-2 code) |
| B4 | Never send passwords in email; CSPRNG relay + forced-change flag (MUST) | ✓ | **Phase 2:** invite email now carries only a single-use recovery action link to `/auth/set-password`; relay mode returns a server-generated CSPRNG(16, class-guaranteed, unbiased) password **once**; `must_change_password: true` set server-side |
| B5 | Never block on email: copy-link fallback (SHOULD) | ✓ | **Phase 2:** on send failure, `invite-user` returns `actionLink`; dialog and resend button surface it for manual delivery |
| B6 | Resend invite: fresh link, degrade to recovery (MUST) | ✓ | **Phase 2:** `action:"resend"` branch (refuses when no `profiles` row / deactivated; re-confirms email; fresh recovery link) + "Resend invite" button in `src/pages/UserManagement.tsx` for users with `last_login_at` null (maintained by the `auth.sessions` trigger, `20251029151929`) |
| B7 | Truthful invite status from real auth state (SHOULD) | ◐ | Status badge uses `profiles.status` + `last_login_at`/`login_count` (trigger-fed, not client-spoofable), but not `email_confirmed_at`/`last_sign_in_at` from GoTrue directly |
| B8 | Expired-link self-heal on the set-password page (SHOULD) | ✗ | `SetPassword.tsx` does not offer a fresh link inline; admin-side resend covers the workflow meanwhile |
| B9 | Bespoke invite table hardening (MUST, C only) | n.a. | Orphaned `user_invitations` table **dropped** in `20260805110000_phase2_roles_cleanup.sql`; the link flow supersedes its 7-day-expiry design |

## C. Provisioning & database

| # | Requirement (level) | Status | Evidence |
|---|---|---|---|
| C1 | All schema versioned in the repo (MUST) | ◐ | Migrations tree is authoritative for everything touched here; full live-DB DDL diff (Phase 1 pull) not yet done |
| C2 | `handle_new_user` creates profile; role logic out of trigger (MUST) | ✓ | `20251029152117` — trigger inserts profile only; the invite edge fn owns role assignment |
| C3 | Separate `user_roles` + enum; role never a column on profiles (MUST) | ✓ | **Phase 2:** `20260805110000_phase2_roles_cleanup.sql` drops legacy `profiles.role` + `user_role` enum (verified unread by src/ and functions/) and adds the missing **self-SELECT policy** on `user_roles` (non-admins were DB-locked out of reading their own role since `20251121091241`) |
| C4 | SECURITY DEFINER role helpers used by RLS (MUST) | ✓ | `has_role()` (`20251020013821`), `is_admin()` (`20251121090441`), both `search_path`-pinned; last two `profiles.role`-based policies migrated to `has_role()` in `20260805110000` |
| C5 | Forced-change flag written server-side with verified write (MUST) | ◐ | `invite-user` sets `must_change_password: true` server-side but does not read-back-verify; a failure logs a warning instead of failing loud (gmi-ops pattern not yet ported) |
| C6 | Active/inactive enforced at request time, reversible (MUST) | ◐ | `profiles.status` exists and resend refuses deactivated users, but no GoTrue ban / per-request enforcement, no last-admin guard |
| C7 | Auth events audit incl. logins (MUST) | ◐ | **Phase 2:** invite + resend audited server-side via `log_user_activity` RPC → `user_activity_logs`; logins tracked by `update_user_login_stats` trigger; not a dedicated no-FK `auth_events` table, no failed-login capture |
| C8 | Honest deletion (MUST) | ◐ | Out of Phase 2 scope; not verified |
| C9 | `onboarding_completed` DB flag + backfill (MUST) | ✗ | Only `first_login` / `must_change_password` exist; no wizard flag |
| C10 | No privileged credentials in client artifacts (MUST) | ✓ | Client uses publishable key only (`src/integrations/supabase/client.ts`); Phase 0 deleted the `admin-reset-password` fn |
| C11 | RLS default-deny, no `USING (true)` writes (MUST) | ◐ | Phase 0 (`20260805100000`) locked `profiles` + `company_settings`. **Known remaining big-ticket item: full RLS rebuild of the remaining `auth_full_access` business tables from `20251121091241` — deferred, tracked** |

## D. First-run experience

| # | Requirement (level) | Status | Evidence |
|---|---|---|---|
| D1 | Multi-step onboarding wizard (MUST) | ✗ | None; first login goes straight to `/projects` |
| D2 | Redirect-style, non-dismissable gate (MUST) | ◐ | `must_change_password` gate exists (`Auth.tsx` → `/auth/set-password`, `FirstLoginModal` in `DashboardLayout`), but it is a password gate, not an onboarding gate |
| D3 | Role explained to the new user (SHOULD) | ◐ | Invite email names the role (badge); no in-app explanation |
| D4 | Wizard failure modes handled (MUST) | n.a. | No wizard yet — apply when D1 lands |
| D5 | Product tours (MAY) | ✓ | `src/components/walkthrough/*` page tours |
| D6 | PWA install helper (MAY) | ✓ | `src/components/pwa/*` install prompt |

## E. Cross-cutting security

| # | Requirement (level) | Status | Evidence |
|---|---|---|---|
| E1 | CSRF double-submit (MUST, C only) | n.a. | S profile; no cookie-authenticated mutations |
| E2 | Rate limiting on login/reset/invite (SHOULD, S) | ◐ | Provider (GoTrue) limits only; no captcha (see A8) |
| E3 | Cache/state purge on sign-out and user change (MUST) | ✓ | **Phase 2:** every logout path now runs `signOut → queryClient.clear() → clearAllStorage()` — `src/pages/DashboardLayout.tsx`, `src/pages/ProjectSelect.tsx`, and the pre-existing auto-logout in `src/hooks/useSessionMonitor.ts` (whose `clearAllStorage` is now the shared export) |
| E4 | Password change requires re-authentication (MUST) | ✗ | `SetPassword.tsx` calls `auth.updateUser` with no current-password check (acceptable in the recovery context, but the same surface serves in-app changes) |
| E5 | Docs match code; stale " 2" duplicates removed (SHOULD) | ◐ | This file created/verified with the Phase 2 change; an untracked `node_modules 2/` duplicate exists at repo root (not committed; local cleanup advised) |
| E6 | Guard + invite/reset smoke tests (MUST) | ✗ | No test runner in the repo — blocking A11/E6; adopt Vitest, then port kit tests + `auth-smoke.mjs` pattern |

## Phase 2 change inventory (2026-08-05)

- `supabase/functions/invite-user/index.ts` — link-based invites (recovery
  action link → `/auth/set-password`), dual delivery (email link / one-time
  CSPRNG relay), `action:"resend"`, copy-link fallback, server-side audit.
- `supabase/functions/_shared/email-templates.ts` — `userInviteTemplate`
  rewritten: set-password CTA, **no credentials in email**.
- `src/components/users/InviteUserDialog.tsx` — delivery-mode toggle; shows
  the temp password or fallback link exactly once.
- `src/pages/UserManagement.tsx` — resend-invite button for never-signed-in
  users.
- `src/components/auth/ProtectedRoute.tsx` (new), `src/App.tsx` — fail-closed
  guards on all authenticated routes; token portals stay public.
- `src/lib/loginNext.ts` (new), `src/pages/Auth.tsx` — safe `?next`.
- `supabase/migrations/20260805110000_phase2_roles_cleanup.sql` — user_roles
  self-SELECT; drop `profiles.role`, `user_role` enum, `user_invitations`.
- `src/integrations/supabase/types.ts` — hand-trimmed to match the migration
  (regenerate after applying it).
- `src/pages/DashboardLayout.tsx`, `src/pages/ProjectSelect.tsx`,
  `src/hooks/useSessionMonitor.ts` — E3 logout purge on all paths.

## Deploy actions required

1. Apply migration `20260805110000_phase2_roles_cleanup.sql` (after the Phase 0
   migration `20260805100000_phase0_rls_lockdown.sql`).
2. Redeploy the `invite-user` edge function (shared `_shared/email-templates.ts`
   change ships with it). Optional env: `APP_URL` (falls back to
   `PUBLIC_SITE_URL`, then the lovable.app domain) — must be the SPA origin so
   the emailed link lands on `/auth/set-password`.
3. Regenerate `src/integrations/supabase/types.ts` from the live DB once the
   migration is applied.
4. Sanity test: invite (email mode) → open link → set password → sign in;
   invite (relay mode) → first login forces password change; resend for a
   pending user; logout from `/projects` and `/dashboard` leaves no cached data.

## Top remaining gaps (tracked)

1. **C11 — full RLS rebuild** of the remaining `auth_full_access` business
   tables (`20251121091241`) — deferred, tracked (big-ticket).
2. **A3 — self-signup still enabled** (UI tab + no provider `disable_signup`).
3. **A5/A6 — password strength (zxcvbn+HIBP) and enumeration defence.**
4. **E6/A11 — no test runner**, so guard/`safeNext`/invite tests can't land.
5. **C9/D1/D2 — onboarding flag + wizard + gate.**
