
# Contractor Portal Automated Report Emails

## Overview

Add a new "Portal Summary" report type to the existing Report Automation Hub that aggregates all contractor portal data (tenants, drawings, procurement, cables, inspections, RFIs) into a single summary email. Recipients are automatically pulled from the portal token's notification contacts. From the second report onwards, a "Changes Since Last Report" section highlights what has changed.

---

## Architecture

```text
Report Automation Hub (Settings)
        |
        v
  "Portal Summary" card (new report type)
        |
        v
  send-scheduled-report (Edge Function)
        |
        v
  generate-portal-summary-email (NEW Edge Function)
        |
        +-- Queries all portal-relevant tables for the project
        +-- Queries snapshot table for previous report data
        +-- Computes diff (new/changed items)
        +-- Builds branded HTML email with summary + changes
        +-- Sends via Resend to all token_notification_contacts
        +-- Saves current snapshot for next comparison
```

---

## Changes Required

### 1. Database Migration

**New table: `portal_report_snapshots`** -- stores a JSON snapshot of portal data after each report is sent, enabling diff comparison for subsequent reports.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| project_id | uuid (FK) | Reference to projects table |
| report_date | timestamptz | When the report was generated |
| snapshot_data | jsonb | Full snapshot of counts and key items |
| created_at | timestamptz | Record creation time |

RLS: Service role only (edge function access). No public access needed.

### 2. Update Report Types Configuration

**File: `src/components/project-settings/report-automation/reportTypes.ts`**

Add a new `portal_summary` report type:
- Name: "Portal Summary"
- Description: "Contractor portal activity summary with change tracking"
- Icon: Users (or a portal-related icon)
- Content options:
  - Include Tenant Progress
  - Include Drawing Register
  - Include Procurement Status
  - Include Cable Status
  - Include Inspections
  - Include RFIs

### 3. Update Report Automation Hub

**File: `src/components/project-settings/report-automation/ReportAutomationHub.tsx`**

- For the Portal Summary report type, auto-populate recipients from `token_notification_contacts` for the project's active tokens instead of requiring manual email entry
- Add a note in the config modal showing "Recipients auto-populated from portal contacts"

### 4. Update ReportConfigModal

**File: `src/components/project-settings/report-automation/ReportConfigModal.tsx`**

- When report type is `portal_summary`, fetch and display contacts from `token_notification_contacts` (joined via `contractor_portal_tokens` for the project)
- Show the contacts as read-only badges with a note explaining they come from the portal token settings
- Allow adding additional manual recipients on top of the auto-populated ones

### 5. New Edge Function: `generate-portal-summary-email`

**File: `supabase/functions/generate-portal-summary-email/index.ts`**

This function:

1. **Fetches all portal data** for the project:
   - Tenants: count, completion stats from `tenants` table
   - Drawings: count, latest revisions from `project_drawings`
   - Procurement: count by status from `project_procurement_items`
   - Cables: count, installation status from `cable_schedule_entries`
   - Inspections: count by status from `inspection_requests`
   - RFIs: count by status from `rfis`

2. **Fetches previous snapshot** from `portal_report_snapshots` (most recent for this project)

3. **Computes changes** by comparing current data vs previous snapshot:
   - New items added (drawings, RFIs, inspections, procurement items)
   - Status changes (e.g., inspections moved from pending to completed)
   - Updated counts and percentages

4. **Builds HTML email** with:
   - Branded header with project name and report date
   - Current status summary table for each portal section
   - "Changes Since Last Report" section (only from 2nd report onwards) showing:
     - New items added with details
     - Status changes with before/after
     - Updated metrics comparison
   - Footer with report generation timestamp

5. **Saves current snapshot** to `portal_report_snapshots` for next comparison

6. **Returns** the HTML content (no PDF attachment -- this is an email-only summary)

### 6. Update send-scheduled-report Edge Function

**File: `supabase/functions/send-scheduled-report/index.ts`**

- Add `portal_summary` to the `ReportType` union and `REPORT_CONFIG` mapping
- For `portal_summary` type:
  - Auto-fetch recipients from `token_notification_contacts` for the project (in addition to any manually configured emails)
  - Call `generate-portal-summary-email` to get the HTML content
  - Send as an HTML email (no PDF attachment) via Resend
  - The email subject format: "[Project Name] - Contractor Portal Summary - [Date]"

---

## Data Aggregation Details

The portal summary will collect and present:

| Section | Data Source | Metrics |
|---------|-----------|---------|
| Tenants | `tenants` | Total count, completion %, items pending |
| Drawings | `project_drawings` | Total count, by status, latest revisions |
| Procurement | `project_procurement_items` | Total, by status (ordered/delivered/pending), overdue items |
| Cables | Cable schedule entries | Total cables, installed vs pending |
| Inspections | `inspection_requests` | Total, by status (pending/scheduled/completed), overdue |
| RFIs | `rfis` | Total, by status (open/answered/closed), overdue |

## Change Tracking Logic

The snapshot stores counts and key identifiers. On subsequent reports, the diff logic:

1. Compares item counts (e.g., "3 new drawings added")
2. Identifies new items by comparing ID lists
3. Tracks status transitions (e.g., "5 inspections moved to completed")
4. Highlights overdue items that were not overdue in the previous report

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Create `portal_report_snapshots` table |
| `src/components/project-settings/report-automation/reportTypes.ts` | Add `portal_summary` type |
| `src/components/project-settings/report-automation/ReportConfigModal.tsx` | Add auto-recipient logic for portal type |
| `src/components/project-settings/report-automation/ReportAutomationHub.tsx` | Minor update for portal recipient handling |
| `supabase/functions/generate-portal-summary-email/index.ts` | Create -- core summary + diff logic |
| `supabase/functions/send-scheduled-report/index.ts` | Add portal_summary dispatch |
