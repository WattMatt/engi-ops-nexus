
# Offline Capabilities Review & Project Contact Access Fix

## Issue Analysis

### Root Cause Identified
The `useProjectClientCheck` hook queries `project_contacts` from Supabase, but:

1. **No offline support**: `project_contacts` is not included in IndexedDB stores, so when offline or network is degraded, the query returns `null`
2. **`hasClient` becomes `false`** when the query fails or times out
3. **DashboardLayout then redirects** to contact-library, thinking no client is assigned
4. **No error feedback** is shown to the user when this happens

### Evidence
- Database confirms clients ARE assigned (MOOLMAN GROUP, ABLAND, etc.)
- RLS policy on `project_contacts` is `USING (true)` for authenticated users (correct)
- The offline storage (`offlineStorage.ts`) supports 12 stores but NOT `project_contacts`
- Console logs show Dropbox connection errors ("Load failed") indicating network issues

## Implementation Plan

### Phase 1: Add Error Handling to Client Check Hook
**File: `src/hooks/useProjectClientCheck.ts`**

Add proper error state and retry logic:
- Return an `error` field from the hook
- Add `retry: 2` to the query options
- Cache successful results to localStorage as fallback
- Check localStorage if Supabase query fails

```typescript
// Proposed changes
export function useProjectClientCheck(projectId: string | null): ProjectClientStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ["project-client-check", projectId],
    queryFn: async () => {
      // First check localStorage cache
      const cached = localStorage.getItem(`client-check-${projectId}`);
      
      const { data, error } = await supabase
        .from("project_contacts")
        .select("id, organization_name, contact_person_name, logo_url")
        .eq("project_id", projectId)
        .eq("contact_type", "client")
        .limit(1)
        .maybeSingle();

      if (error) {
        // On network error, use cache if available
        if (cached) return JSON.parse(cached);
        throw error;
      }

      // Cache successful result
      if (data) {
        localStorage.setItem(`client-check-${projectId}`, JSON.stringify(data));
      }
      return data;
    },
    enabled: !!projectId,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  // ...
}
```

### Phase 2: Fix Premature Redirect Logic
**File: `src/pages/DashboardLayout.tsx`**

The current logic redirects when `!hasClient`, but this can trigger during:
- Initial load (before query completes)
- Network errors (query fails)

Fix:
- Only redirect if query is complete AND confirmed no client
- Add network error state handling
- Show offline indicator when network issues detected

```typescript
// Proposed changes
const { hasClient, isLoading: isCheckingClient, error: clientCheckError } = 
  useProjectClientCheck(projectId);

// Only block if we CONFIRMED no client (not just failed to fetch)
const shouldBlockContent = !loading && !isCheckingClient && 
  projectId && !hasClient && !clientCheckError && !allowedWithoutClient;
```

### Phase 3: Add Offline Cache for Project Contacts
**File: `src/lib/offlineStorage.ts`**

Add `PROJECT_CONTACTS` store to enable offline access:

```typescript
export const STORES = {
  // ... existing stores
  PROJECT_CONTACTS: 'project_contacts',
} as const;
```

### Phase 4: Add Network Status Indicator
**File: `src/pages/DashboardLayout.tsx`**

Show a visual indicator when offline or network is degraded:

```typescript
const isOnline = navigator.onLine;
// Show toast or banner when offline
```

### Phase 5: Sync Project Contacts on Login
When a project is selected, cache its contacts to IndexedDB for offline access.

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useProjectClientCheck.ts` | Add localStorage cache fallback, error state, retry logic |
| `src/pages/DashboardLayout.tsx` | Fix redirect logic to not trigger on errors, add offline indicator |
| `src/lib/offlineStorage.ts` | Add `PROJECT_CONTACTS` store |
| `src/hooks/useOfflineSync.ts` | Add project_contacts to sync map |

## Technical Flow After Fix

```text
User selects project
        │
        ▼
useProjectClientCheck runs
        │
        ├─► Query succeeds → Cache to localStorage → hasClient = true
        │
        └─► Query fails (offline/error)
                │
                ├─► Check localStorage cache
                │       │
                │       ├─► Cache exists → Use cached data → hasClient = true
                │       │
                │       └─► No cache → Show network error banner (NOT redirect)
                │
                └─► Return error state (do NOT redirect)
```

## Expected Outcome
- Users with assigned clients will NOT be incorrectly redirected
- Network errors show a helpful message instead of forcing contact setup
- Offline users can access projects using cached client data
- Clear distinction between "no client assigned" vs "failed to check"
