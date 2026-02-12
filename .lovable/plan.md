

# Fix Contractor Portal Access: Add Anonymous RLS Policies

## Problem
Contractors access the portal as anonymous (unauthenticated) users via token-based links. Most project data tables only have RLS policies for `authenticated` users, causing "Access Denied" or empty screens on the Drawings, Cable Status, Floor Plan, Procurement, RFIs, and Inspections tabs.

## Solution

### Step 1: Create Security Helper Function

Create `has_valid_contractor_portal_token(p_project_id UUID)` -- a `SECURITY DEFINER` function that checks whether an active, non-expired contractor token exists for the given project. This mirrors the existing `has_valid_client_portal_token` pattern.

```sql
CREATE OR REPLACE FUNCTION has_valid_contractor_portal_token(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM contractor_portal_tokens
    WHERE project_id = p_project_id
      AND is_active = true
      AND expires_at > now()
  );
$$;
```

### Step 2: Add Anon SELECT Policies

Add `FOR SELECT TO anon` policies on each blocked table:

| Table | Policy Condition |
|-------|-----------------|
| `project_drawings` | `has_valid_contractor_portal_token(project_id)` |
| `drawing_revisions` | Join through `project_drawings` to get `project_id` |
| `cable_schedules` | `has_valid_contractor_portal_token(project_id)` |
| `floor_plan_zones` | `has_valid_contractor_portal_token(project_id)` |
| `procurement_items` | `has_valid_contractor_portal_token(project_id)` |
| `rfis` | `has_valid_contractor_portal_token(project_id)` |
| `inspection_requests` | `has_valid_contractor_portal_token(project_id)` |

For `drawing_revisions` (which has `drawing_id` not `project_id`):
```sql
CREATE POLICY "Anon contractor view revisions"
ON drawing_revisions FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM project_drawings pd
    WHERE pd.id = drawing_revisions.drawing_id
      AND has_valid_contractor_portal_token(pd.project_id)
  )
);
```

### Step 3: Improve Error Diagnostics in Portal UI

Update `ContractorPortal.tsx` and `PortalRedirect.tsx` error screens to include:
- The short code used and timestamp
- A "Copy Error Details" button so contractors can paste diagnostic info when reporting issues
- Clearer error messages distinguishing between expired, revoked, and not-found links

### Security Notes
- All new policies are **SELECT-only** -- contractors cannot modify data
- Access is scoped to projects with at least one active, non-expired token
- The helper function uses `SECURITY DEFINER` to avoid RLS recursion
- No sensitive user/auth data is exposed

### Files Changed
- **Database migration** (new): 1 function + 7 RLS policies
- `src/pages/ContractorPortal.tsx`: Enhanced error display with diagnostics
- `src/pages/PortalRedirect.tsx`: Enhanced error display with diagnostics

