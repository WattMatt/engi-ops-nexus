
# Contractor Portal Cleanup and Access Resolution Plan

## Summary of Issues Found

### 1. Access Denied Errors
**Root Cause Analysis:**
- All tokens in the database are currently valid and active
- The only non-test user is **Niel Terblanche** (niel@moolmangroup.co.za) with a valid token expiring Feb 22, 2026
- No failed access attempts are logged in `contractor_portal_access_log` for any users other than test accounts
- The validation function (`validate_contractor_portal_token`) requires both `expires_at > now()` AND `is_active = true`

**Likely Causes:**
- Users are accessing old/bookmarked links with expired or deactivated tokens
- Token was manually deactivated or the link was corrupted
- Browser cache issues causing token to not be passed correctly

### 2. Outdated Landing Pages/Tabs
**Root Cause:**
- Users are seeing the **old UI** with tabs: "Documentation, Cable Schedule" instead of the current "Drawing Register"
- This is caused by **browser caching** of the older JavaScript bundle
- Legacy components still exist in codebase but are no longer used

### 3. Code Cleanup Needed
**Dead Code Identified:**
- `ContractorDocumentStatus.tsx` (679 lines) - old dashboard component
- `ContractorHandoverDocuments.tsx` (342 lines) - old documents browser
- Total: ~1,000 lines of unused code

---

## Implementation Plan

### Phase 1: Add Better Error Diagnostics (High Priority)
Add detailed error messages to help identify specific access issues:

**File: `src/pages/ContractorPortal.tsx`**
- Enhance error handling to distinguish between:
  - Missing token parameter
  - Expired token
  - Deactivated token
  - Invalid/corrupted token
- Add a "Request New Link" button with project contact info
- Log failed attempts to help diagnose issues

### Phase 2: Force Cache Refresh (High Priority)
Ensure users get the latest version of the portal:

**File: `src/pages/ContractorPortal.tsx`**
- Add a version check that forces reload if outdated
- Add meta tags to prevent aggressive caching on portal pages

### Phase 3: Remove Legacy Code (Medium Priority)
Clean up unused components:

**Files to Delete:**
- `src/components/contractor-portal/ContractorDocumentStatus.tsx`
- `src/components/contractor-portal/ContractorHandoverDocuments.tsx`

### Phase 4: Add Admin Token Diagnostics (Medium Priority)
Add a diagnostic view in Project Settings to help admins:

**File: `src/components/project-settings/ContractorPortalSettings.tsx`**
- Show token health status (expired, active, access count)
- Add "Reactivate" and "Resend Link" quick actions
- Display recent failed access attempts

### Phase 5: Add Failed Access Logging (Low Priority)
Track when users fail to access the portal:

**Database Migration:**
- Add `failed_access_log` table or update existing logging
- Record failed token validation attempts with timestamp and reason

---

## Technical Details

### Enhanced Token Validation Response
```typescript
// Current: Returns generic "Invalid or expired access link"
// Proposed: Return specific reasons

interface ValidationResult {
  is_valid: boolean;
  error_code?: 'MISSING' | 'EXPIRED' | 'INACTIVE' | 'NOT_FOUND';
  error_message?: string;
  expires_at?: string;
  project_contact?: string;
}
```

### Version-Based Cache Busting
```typescript
// Add to ContractorPortal.tsx
const PORTAL_VERSION = '2.1.0';
const storedVersion = localStorage.getItem('contractor_portal_version');

if (storedVersion !== PORTAL_VERSION) {
  localStorage.setItem('contractor_portal_version', PORTAL_VERSION);
  if (storedVersion) {
    window.location.reload();
  }
}
```

### Files Modified
| File | Action | Lines Changed |
|------|--------|---------------|
| `src/pages/ContractorPortal.tsx` | Enhance error handling, add version check | ~50 lines |
| `src/components/contractor-portal/ContractorDocumentStatus.tsx` | DELETE | -679 lines |
| `src/components/contractor-portal/ContractorHandoverDocuments.tsx` | DELETE | -342 lines |
| `src/components/project-settings/ContractorPortalSettings.tsx` | Add diagnostics panel | ~80 lines |

---

## Identifying the Denied User

Based on database analysis:
- **No failed access attempts are currently logged** for any users
- The only external contractor token belongs to **Niel Terblanche** (niel@moolmangroup.co.za)
- His token is **VALID** until Feb 22, 2026

**To identify who was denied access:**
1. After implementing failed access logging, we can track future denials
2. Ask the affected user to share their portal URL so we can check the token
3. Check if they are using an old/different link than the one generated

---

## Next Steps After Approval

1. Implement enhanced error handling with specific error messages
2. Add version-based cache refresh mechanism
3. Delete legacy components (ContractorDocumentStatus, ContractorHandoverDocuments)
4. Add admin diagnostics panel to ContractorPortalSettings
5. Optionally: Add database migration for failed access logging
