

# Conflict Resolution UI for Offline Sync

## Summary
Implement a conflict resolution system that detects when the same record has been edited both locally (offline) and on the server, then presents users with a clear UI to choose which version to keep or merge changes manually.

## Current State Analysis

### Existing Infrastructure
- **Offline Storage**: IndexedDB stores `synced`, `localUpdatedAt`, and `syncedAt` metadata on each record
- **Sync Hooks**: Module-specific hooks (`useCableOfflineSync`, `useBudgetOfflineSync`, `useDrawingOfflineSync`) handle upsert operations without conflict detection
- **Timestamp Fields**: All tables (`cable_entries`, `budget_line_items`, `project_drawings`) have `updated_at` columns for server-side tracking
- **Current Behavior**: During sync, local changes blindly upsert to server, potentially overwriting concurrent server changes

### Gap Identified
No mechanism exists to:
1. Detect if the server record was modified after the local edit was made
2. Present users with both versions for comparison
3. Allow users to choose the preferred version or merge field-by-field

---

## Implementation Plan

### 1. Create Conflict Detection Types and Utilities
**New File:** `src/lib/conflictResolution.ts`

Define shared types and helper functions:
- `ConflictRecord<T>` type containing local version, server version, record ID, and store name
- `detectConflict()` function comparing `localUpdatedAt` with server `updated_at`
- `ConflictResolution` enum: `USE_LOCAL`, `USE_SERVER`, `MERGE`

### 2. Create Conflict Resolution Dialog Component
**New File:** `src/components/pwa/ConflictResolutionDialog.tsx`

A reusable dialog that:
- Shows side-by-side comparison of local vs server versions
- Highlights fields that differ between versions
- Provides three resolution options:
  - "Keep My Changes" - overwrites server with local
  - "Use Server Version" - discards local changes
  - "Merge" - opens field-by-field selection (advanced)
- Handles multiple conflicts in sequence with progress indicator

UI Layout:
```text
+--------------------------------------------------+
|  Sync Conflict Detected                     [X]  |
|  1 of 3 conflicts                                |
+--------------------------------------------------+
|  This record was modified both offline and on    |
|  the server. Choose which version to keep.       |
+--------------------------------------------------+
|  +---------------------+  +--------------------+ |
|  | Your Changes        |  | Server Version     | |
|  | (2 hours ago)       |  | (30 mins ago)      | |
|  +---------------------+  +--------------------+ |
|  | cable_tag: ABC-101  |  | cable_tag: ABC-101 | |
|  | from: Panel A  [!]  |  | from: Panel B  [!] | |
|  | to: DB-01           |  | to: DB-01          | |
|  | quantity: 2    [!]  |  | quantity: 5    [!] | |
|  +---------------------+  +--------------------+ |
+--------------------------------------------------+
| [Keep My Changes] [Use Server] [Merge Fields...] |
+--------------------------------------------------+
```

### 3. Create Conflict Context Provider
**New File:** `src/contexts/ConflictContext.tsx`

Global context to:
- Queue detected conflicts from any module
- Track resolution progress
- Trigger the conflict dialog when conflicts are detected
- Provide `addConflict()` and `resolveConflict()` methods

### 4. Create useConflictDetection Hook
**New File:** `src/hooks/useConflictDetection.ts`

A hook that wraps sync operations to:
- Fetch the server version before upserting
- Compare `updated_at` timestamps
- If server was modified after `localUpdatedAt`, queue the conflict instead of blindly syncing
- Return resolution status

### 5. Update Module-Specific Sync Hooks

**Modify:** `src/hooks/useCableOfflineSync.ts`, `src/hooks/useBudgetOfflineSync.ts`, `src/hooks/useDrawingOfflineSync.ts`

Changes:
- Import and use `useConflictDetection`
- Before upsert, check for conflicts
- If conflict detected, call `addConflict()` from context instead of upserting
- After user resolves conflict, complete the sync with chosen version

### 6. Integrate Conflict Provider in App Root
**Modify:** `src/App.tsx`

Wrap the app with `ConflictProvider` to make conflict resolution globally available.

### 7. Add Conflict Indicator to Offline Status Bar
**Modify:** `src/components/pwa/OfflineSyncStatusBar.tsx`

Add visual indicator when conflicts are pending:
- Show conflict count badge
- Add "Resolve Conflicts" button that opens the dialog

---

## Technical Details

### Conflict Detection Logic

```typescript
interface ConflictRecord<T> {
  id: string;
  storeName: StoreName;
  localVersion: T & { localUpdatedAt: number };
  serverVersion: T & { updated_at: string };
  fieldDiffs: string[]; // Fields that differ
}

function detectConflict<T>(
  localRecord: T & { localUpdatedAt?: number },
  serverRecord: T & { updated_at: string }
): boolean {
  if (!localRecord.localUpdatedAt) return false;
  
  const serverUpdatedAt = new Date(serverRecord.updated_at).getTime();
  
  // Conflict if server was updated AFTER we made our local edit
  return serverUpdatedAt > localRecord.localUpdatedAt;
}
```

### Field Diff Calculation

```typescript
function calculateFieldDiffs<T extends Record<string, unknown>>(
  local: T,
  server: T,
  ignoredFields: string[] = ['synced', 'localUpdatedAt', 'syncedAt', 'updated_at', 'created_at']
): string[] {
  const diffs: string[] = [];
  
  for (const key of Object.keys(local)) {
    if (ignoredFields.includes(key)) continue;
    if (JSON.stringify(local[key]) !== JSON.stringify(server[key])) {
      diffs.push(key);
    }
  }
  
  return diffs;
}
```

### Resolution Flow

```text
User clicks "Sync Now"
        |
        v
For each unsynced record:
        |
        v
Fetch server version by ID
        |
        v
Server updated after localUpdatedAt? ----No----> Upsert normally
        |
       Yes
        |
        v
Add to conflict queue
        |
        v
Show ConflictResolutionDialog
        |
        v
User chooses resolution:
  - Keep Local: Upsert local version
  - Use Server: Delete local, refetch
  - Merge: Build merged record, upsert
        |
        v
Mark as synced
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/conflictResolution.ts` | Types, detection utilities, diff helpers |
| `src/components/pwa/ConflictResolutionDialog.tsx` | Main conflict UI dialog |
| `src/contexts/ConflictContext.tsx` | Global conflict queue management |
| `src/hooks/useConflictDetection.ts` | Hook for conflict-aware sync operations |

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useCableOfflineSync.ts` | Add conflict detection before sync |
| `src/hooks/useBudgetOfflineSync.ts` | Add conflict detection before sync |
| `src/hooks/useDrawingOfflineSync.ts` | Add conflict detection before sync |
| `src/components/pwa/OfflineSyncStatusBar.tsx` | Add conflict count and resolve button |
| `src/App.tsx` | Wrap with ConflictProvider |
| `src/components/pwa/index.ts` | Export new components |

---

## User Experience

After implementation, when a conflict is detected:

1. **During Sync**: Instead of silently overwriting, sync pauses and shows conflict count in status bar
2. **Notification**: Toast appears: "1 sync conflict detected - review required"
3. **Resolution Dialog**: User opens dialog showing side-by-side comparison with differing fields highlighted
4. **Clear Actions**: Three buttons with clear outcomes:
   - "Keep My Changes" (with warning that server changes will be lost)
   - "Use Server Version" (with warning that local changes will be discarded)
   - "Merge Fields" (opens field-by-field picker for advanced users)
5. **Progress**: For multiple conflicts, shows "1 of 3" progress indicator
6. **Completion**: After all resolved, normal sync completes with success toast

---

## Future Enhancements

After this implementation, consider:
1. **Auto-merge for non-conflicting fields**: If different fields were changed, auto-merge without user intervention
2. **Conflict history log**: Track past conflicts and resolutions for debugging
3. **Real-time conflict prevention**: Use Supabase Realtime to warn users when another user is editing the same record
4. **Undo resolution**: Allow undoing a conflict resolution within a short time window

