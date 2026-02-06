
# Full Portal Enhancement Implementation Plan

## Overview

This plan implements all 8 phases of portal improvements for both contractor and client portals, including the URL cleanup feature to create user-friendly short URLs.

---

## Phase 1: URL Cleanup - Short Token URLs

**Objective**: Replace 64-character SHA-256 hex tokens with user-friendly 8-character codes

### Database Changes

```sql
-- Add short_code column to contractor_portal_tokens
ALTER TABLE contractor_portal_tokens ADD COLUMN short_code TEXT UNIQUE;

-- Create trigger to auto-generate short codes on insert
CREATE OR REPLACE FUNCTION generate_short_token_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate 8-character uppercase alphanumeric code from token hash
  NEW.short_code := UPPER(SUBSTRING(MD5(NEW.token || gen_random_uuid()::text) FROM 1 FOR 8));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_short_code_trigger
  BEFORE INSERT ON contractor_portal_tokens
  FOR EACH ROW
  WHEN (NEW.short_code IS NULL)
  EXECUTE FUNCTION generate_short_token_code();

-- Generate short codes for existing tokens
UPDATE contractor_portal_tokens 
SET short_code = UPPER(SUBSTRING(MD5(token || id::text) FROM 1 FOR 8))
WHERE short_code IS NULL;

-- Add RPC function to lookup by short code
CREATE OR REPLACE FUNCTION validate_portal_short_code(p_code TEXT)
RETURNS TABLE (
  token TEXT,
  project_id UUID,
  contractor_type TEXT,
  contractor_name TEXT,
  contractor_email TEXT,
  company_name TEXT,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.token,
    t.project_id,
    t.contractor_type,
    t.contractor_name,
    t.contractor_email,
    t.company_name,
    (t.is_active AND t.expires_at > NOW()) AS is_valid
  FROM contractor_portal_tokens t
  WHERE t.short_code = UPPER(p_code);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### New Files

**`src/pages/PortalRedirect.tsx`** - Short code lookup and redirect page
- Parse short code from `/p/:code` route parameter
- Call `validate_portal_short_code` RPC
- Redirect to `/contractor-portal?token=FULL_TOKEN`
- Show error state for invalid codes

### Modified Files

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/p/:code` route pointing to `PortalRedirect` |
| `src/components/project-settings/ContractorPortalSettings.tsx` | Display short URL (`/p/A1B2C3D4`) alongside full URL |

### URL Format Comparison

| Before | After |
|--------|-------|
| `/contractor-portal?token=d5f5f56630f4bb0e19fc63cceaba28f17db5f1d4f06db0e2f30645557967572b` | `/p/A1B2C3D4` |

---

## Phase 2: Token Notification Contact List

**Objective**: Create a managed contact list per token for email notifications

### Database Changes

```sql
CREATE TABLE token_notification_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token_id UUID REFERENCES contractor_portal_tokens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT, -- 'project_manager', 'site_engineer', 'contractor'
  receives_rfi_notifications BOOLEAN DEFAULT true,
  receives_status_updates BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(token_id, email)
);

ALTER TABLE token_notification_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can manage notification contacts"
ON token_notification_contacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM contractor_portal_tokens t
    WHERE t.id = token_notification_contacts.token_id
    AND (has_project_access(auth.uid(), t.project_id) OR is_admin(auth.uid()))
  )
);
```

### New Components

**`src/components/project-settings/TokenNotificationContacts.tsx`**
- Display contacts per token
- Add/remove contacts with name, email, role
- Toggle notification preferences (RFI, status updates)
- Import from registered portal users option

### Modified Files

| File | Changes |
|------|---------|
| `src/components/project-settings/ContractorPortalSettings.tsx` | Add "Manage Contacts" button per token, integrate `TokenNotificationContacts` component |

---

## Phase 3: Update RFI Flow for Portal Notifications

**Objective**: Notify all token contacts when RFIs are submitted

### Modified Edge Function

**`supabase/functions/send-rfi-notification/index.ts`**

Add logic to:
1. Query `token_notification_contacts` for the token where `receives_rfi_notifications = true`
2. Query `portal_user_sessions` for registered portal users (optional)
3. Merge recipients with existing `project_members` list
4. Send to all unique email addresses

```typescript
// Add after fetching project members
const { data: tokenContacts } = await supabase
  .from('token_notification_contacts')
  .select('email, name')
  .eq('token_id', payload.tokenId)
  .eq('receives_rfi_notifications', true);

tokenContacts?.forEach(contact => {
  if (contact.email && !recipientEmails.includes(contact.email)) {
    recipientEmails.push(contact.email);
  }
});
```

### Modified Files

| File | Changes |
|------|---------|
| `supabase/functions/send-rfi-notification/index.ts` | Add token contact lookup and merge recipients |
| `src/components/contractor-portal/ContractorRFISection.tsx` | Pass `tokenId` in notification payload |

---

## Phase 4: User Login Testing & Access Logging

**Objective**: Verify user session tracking works correctly

### Modified Files

| File | Changes |
|------|---------|
| `src/components/contractor-portal/PortalUserIdentityDialog.tsx` | Add detailed console logging for session creation/updates |
| `src/pages/ContractorPortal.tsx` | Add retry logic with exponential backoff for token validation, add "Clear Cache & Retry" button |

### Enhancements

```typescript
// Add to PortalUserIdentityDialog.tsx
console.log('[Portal] Persisting user session:', {
  tokenId,
  email: data.email,
  timestamp: new Date().toISOString()
});

// Add to ContractorPortal.tsx
const validateTokenWithRetry = async (attempts = 3) => {
  for (let i = 0; i < attempts; i++) {
    try {
      const { data, error } = await supabase.rpc('validate_contractor_portal_token', {...});
      if (!error) return data;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
    } catch (e) {
      if (i === attempts - 1) throw e;
    }
  }
};
```

---

## Phase 5: Portal Code Cleanup Verification

**Objective**: Confirm only current portal code exists

### Verification Tasks

1. Search for orphaned components - **DONE** (no legacy files found)
2. Verify `PORTAL_VERSION = '2.1.0'` cache busting active - **DONE**
3. Confirm no duplicate route handlers - **DONE**
4. Remove any dead imports - To be checked during implementation

---

## Phase 6: Add Tooltips to Portals

**Objective**: Add contextual help tooltips throughout both portals

### Contractor Portal Tooltips

| Location | Tooltip Content |
|----------|-----------------|
| Drawing Register tab | "View and download electrical drawings with full revision history" |
| Tenant Tracker tab | "Track documentation status and order deadlines per tenant" |
| Cable Status tab | "Monitor cable installation and verification status" |
| Inspections tab | "Request and track site inspections" |
| Procurement tab | "View procurement status and update order dates" |
| RFI Tracker tab | "Submit and track Requests for Information" |
| DB Last Order column | "Deadline to place distribution board orders - calculated from BO date" |
| Lighting Last Order column | "Deadline to place lighting orders - calculated from BO date" |
| SOW column | "Scope of Work document received" |
| Layout column | "Shop layout plan received" |

### Client Portal Tooltips

| Location | Tooltip Content |
|----------|-----------------|
| View badge | "You have permission to view this report" |
| Comment badge | "You can add comments and feedback to this report" |
| Sign-off badge | "You can provide formal approval for this report" |
| Report cards | Description of what each report contains |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/ContractorPortal.tsx` | Wrap tab triggers with `InfoTooltip` |
| `src/components/contractor-portal/ContractorTenantTracker.tsx` | Add tooltips to table headers |
| `src/pages/ClientPortal.tsx` | Add tooltips to permission badges and report cards |

### Implementation Pattern

```typescript
import { InfoTooltip } from "@/components/ui/rich-tooltip";

// Wrap existing content
<InfoTooltip
  title="Drawing Register"
  description="View and download electrical drawings with full revision history. Drawings are grouped by discipline."
  icon={FileText}
  side="bottom"
>
  <TabsTrigger value="drawings" className="gap-2">
    <FileText className="h-4 w-4" />
    <span className="hidden sm:inline">Drawing Register</span>
  </TabsTrigger>
</InfoTooltip>
```

---

## Phase 7: Add Floor Plan Tab to Contractor Portal

**Objective**: Display tenant floor plan markup with colour coding

### New Component

**`src/components/contractor-portal/ContractorFloorPlanView.tsx`**

Read-only floor plan viewer featuring:
- Composite floor plan image with tenant zones
- Colour coding matching tenant tracker status:
  - Green = Complete (all docs received, orders placed)
  - Orange = In Progress
  - Gray = Unassigned
- Click zone to see tenant details popup
- Legend showing colour meanings
- Auto-refresh when tenant status changes

### Component Structure

```text
ContractorFloorPlanView
├── Floor plan image (read-only)
├── Overlay zones with tenant colours  
├── Legend (reusing FloorPlanLegend compact mode)
└── Click zone → show tenant popup with status
```

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/ContractorPortal.tsx` | Add new "Floor Plan" tab with `Map` icon |

### New Tab Addition

```typescript
// Add to tab list
<TabsTrigger value="floorplan" className="gap-2">
  <Map className="h-4 w-4" />
  <span className="hidden sm:inline">Floor Plan</span>
</TabsTrigger>

// Add tab content
<TabsContent value="floorplan">
  <ContractorFloorPlanView projectId={project.id} />
</TabsContent>
```

---

## Files Summary

### New Files (4)

| File | Purpose |
|------|---------|
| `src/pages/PortalRedirect.tsx` | Short code lookup and redirect |
| `src/components/project-settings/TokenNotificationContacts.tsx` | Manage notification contacts per token |
| `src/components/contractor-portal/ContractorFloorPlanView.tsx` | Read-only floor plan viewer |
| `supabase/migrations/XXXXX_portal_enhancements.sql` | Database changes for short codes and contacts |

### Modified Files (7)

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/p/:code` route |
| `src/pages/ContractorPortal.tsx` | Add Floor Plan tab, retry logic, tooltips |
| `src/pages/ClientPortal.tsx` | Add tooltips to badges and cards |
| `src/components/project-settings/ContractorPortalSettings.tsx` | Display short URLs, notification contacts |
| `src/components/contractor-portal/ContractorTenantTracker.tsx` | Add column tooltips |
| `src/components/contractor-portal/ContractorRFISection.tsx` | Pass tokenId to notification |
| `supabase/functions/send-rfi-notification/index.ts` | Add token contacts to notification recipients |

---

## Database Changes Summary

1. **`contractor_portal_tokens`** - Add `short_code` column with auto-generation trigger
2. **`token_notification_contacts`** - New table for managing per-token notification recipients
3. **`validate_portal_short_code`** - New RPC function for short code lookups

---

## Implementation Order

1. Database migration (short codes + notification contacts)
2. Short URL redirect page (`PortalRedirect.tsx`)
3. Update routing (`App.tsx`)
4. Update token settings UI (show short URLs + contacts)
5. Update RFI notification edge function
6. Add tooltips to both portals
7. Create floor plan viewer component
8. Add Floor Plan tab to contractor portal
9. Add retry logic and debug logging

---

## Testing Checklist

- [ ] Generate new token and verify short code created
- [ ] Access portal via short URL (`/p/XXXXXXXX`)
- [ ] Verify user identity dialog logs to `portal_user_sessions`
- [ ] Add notification contacts and verify RFI emails sent
- [ ] Verify tooltips display correctly on hover
- [ ] Verify floor plan displays with correct tenant colours
- [ ] Test offline access with cached data
- [ ] Test expired token handling shows proper error

