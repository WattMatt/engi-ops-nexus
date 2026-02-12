

# Contractor Portal Activity Widget for Admin Dashboard

## Overview
Add a new dashboard widget to the admin area that provides a real-time summary of contractor portal activity, including active tokens, recent visitors, and expiring links. This gives administrators instant visibility into portal health without needing to navigate elsewhere.

## What You'll See

The widget will appear on the admin Projects page and will display three sections:

1. **Summary metrics bar** -- Active tokens count, total visitors, and links expiring soon
2. **Expiring links alert** -- Tokens expiring within 14 days, with quick "Extend" action
3. **Recent visitors list** -- Last 10 portal visitors showing name, email, which link they used, and when

---

## Technical Plan

### New file: `src/components/admin/ContractorPortalWidget.tsx`

A self-contained card component that:
- Queries `contractor_portal_tokens` for active/expiring token stats
- Queries `portal_user_sessions` for recent visitor activity (last 10 sessions)
- Displays 3 MetricCards: Active Tokens, Total Visitors (last 30 days), Expiring Soon (next 14 days)
- Shows a compact table of expiring tokens with a one-click "Extend 30 days" button
- Shows a compact table of recent visitors with name, email, contractor link name, and timestamp
- Uses existing UI components (Card, MetricCard, Table, Button, Badge)
- Uses `@tanstack/react-query` for data fetching, matching existing patterns

### Modified file: `src/pages/ProjectSelect.tsx`

- Import and render `ContractorPortalWidget` at the top of the admin projects view (only when `isAdminRoute` is true)
- Conditionally shown so it only appears in the `/admin` context, not the regular project selector

### Modified file: `src/components/AdminSidebar.tsx`

- No changes needed -- the widget is embedded in the existing admin projects page

### Data queries used

```sql
-- Active tokens count
SELECT count(*) FROM contractor_portal_tokens 
WHERE is_active = true AND expires_at > now();

-- Expiring within 14 days
SELECT * FROM contractor_portal_tokens 
WHERE is_active = true AND expires_at BETWEEN now() AND now() + interval '14 days';

-- Recent visitors (last 10)
SELECT pus.*, cpt.contractor_name, cpt.short_code 
FROM portal_user_sessions pus
JOIN contractor_portal_tokens cpt ON pus.token_id = cpt.id
ORDER BY pus.created_at DESC LIMIT 10;
```

### Extend token action
The "Extend 30 days" button will update `expires_at` by adding 30 days to the current expiry date, using the existing Supabase client.

### No database changes required
All data already exists in `contractor_portal_tokens` and `portal_user_sessions` tables. Existing RLS policies for authenticated admin users already grant access.

