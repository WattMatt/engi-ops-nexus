
# Fix Portal Summary: Recipient Control and Data Queries

## Problem Summary

Two critical bugs caused the test email to fail:

1. **Wrong recipients**: The `portal_summary` branch in `send-scheduled-report` always merges manually provided emails with ALL portal notification contacts. In manual/test mode, it should ONLY use the explicitly provided recipients.
2. **Empty content**: The `generate-portal-summary-email` function queries a non-existent table (`cable_schedule_entries`) and uses wrong column names, causing all data sections to render empty.

---

## Saxdowne Data Available

| Section | Count | Notes |
|---------|-------|-------|
| Tenants | 24 | Linked via `project_id` |
| Drawings | 35 | Uses `drawing_title` column (not `title`) |
| Procurement | 11 | Correct schema |
| Cables | 37 | Via `cable_entries` joined through `cable_schedules`, installation tracked via `contractor_installed` boolean |
| Inspections | 0 | Correct schema, just no data yet |
| RFIs | 0 | Correct schema, just no data yet |

---

## Changes Required

### 1. Fix `send-scheduled-report` -- Recipient Logic (lines 530-618)

**Problem**: Line 550 merges manual recipients with auto-fetched contacts:
```
const allRecipients = [...new Set([...recipientEmails, ...portalRecipients])];
```

**Fix**: Only auto-fetch portal contacts in `scheduled` mode. When triggered manually, use ONLY the provided `recipientEmails`. Add a flag or check the mode context to distinguish.

The simplest approach: pass a `isManualTrigger` flag through to `generateAndSendReport`, and skip the auto-fetch of `token_notification_contacts` when it is true.

### 2. Fix `generate-portal-summary-email` -- Data Queries

**File**: `supabase/functions/generate-portal-summary-email/index.ts`

Fixes needed:

| Issue | Current (broken) | Correct |
|-------|------------------|---------|
| Cable table | `cable_schedule_entries` | `cable_entries` joined via `cable_schedules` |
| Cable project link | Direct `project_id` on entries | Join: `cable_schedules.project_id` then `cable_entries.schedule_id` |
| Cable status column | `installation_status` | `contractor_installed` (boolean) |
| Drawing title column | `title` | `drawing_title` |
| Drawing revision column | `revision` | `current_revision` |

The cable query needs a two-step approach:
1. Fetch `cable_schedules` IDs for the project
2. Fetch `cable_entries` by those schedule IDs

### 3. Delete Stale Snapshot

The failed test run saved an empty snapshot to `portal_report_snapshots`. This needs to be cleaned up so the next test shows accurate "first report" behaviour (or correct diffs).

---

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-scheduled-report/index.ts` | Add manual-mode flag; skip auto-fetching contacts when manual |
| `supabase/functions/generate-portal-summary-email/index.ts` | Fix table names, column names, and cable join logic |
| Database cleanup | Delete the empty snapshot row for Saxdowne |

## After Fix

Once deployed, I will re-send the test email to arno@wmeng.co.za ONLY, with actual Saxdowne data populated across all sections.
