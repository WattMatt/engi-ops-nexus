
# Add Offline Sync Status Bar to Drawing Register, Cable Schedules, and Budget Pages

## Summary
Integrate the existing `OfflineSyncStatusBar` component into three key modules to provide real-time visibility of offline sync status and pending changes. Each page will connect to its corresponding offline sync hook and display connection status, pending change counts, and manual sync controls.

## Current State
- `OfflineSyncStatusBar` component exists in `src/components/pwa/OfflineSyncStatusBar.tsx` with two display modes (compact and full)
- Offline sync hooks exist for each module:
  - `useDrawingOfflineSync` - returns `unsyncedCount`, `pendingUploadsCount`, `isOnline`, `syncNow`
  - `useCableOfflineSync` - returns `unsyncedCount`, `isOnline`, `syncNow`
  - `useBudgetOfflineSync` - returns `unsyncedCount`, `isOnline`, `syncNow`
- None of these pages currently display offline sync status to users

## Implementation Plan

### 1. Drawing Register Page
**File:** `src/components/drawings/DrawingRegisterPage.tsx`

- Import `OfflineSyncStatusBar` from `@/components/pwa/OfflineSyncStatusBar`
- Import `useDrawingOfflineSync` from `@/hooks`
- Initialize the hook with the current `projectId`
- Add a state variable to track `lastSyncAt` timestamp
- Place the status bar below the page header, before the main tabs
- Use full-width mode for better visibility
- Wire up `pendingCount` (sum of `unsyncedCount + pendingUploadsCount`) and `onSync` callback

### 2. Cable Schedule Detail Page
**File:** `src/pages/CableScheduleDetail.tsx`

- Import `OfflineSyncStatusBar` and `useCableOfflineSync`
- Initialize the hook with the `scheduleId` from URL params
- Add tracking for `isSyncing` state and `lastSyncAt`
- Place the status bar in the header section, after the title and before the tabs
- Use full-width mode

### 3. Electrical Budget Detail Page
**File:** `src/pages/ElectricalBudgetDetail.tsx`

- Import `OfflineSyncStatusBar` and `useBudgetOfflineSync`
- Initialize the hook with the `budgetId` from URL params
- Add tracking for sync state
- Place the status bar in the header section, after the back button and title
- Use full-width mode

---

## Technical Details

### Integration Pattern for Each Page

```text
+------------------------------------------+
|  Page Header (title, buttons)            |
+------------------------------------------+
|  OfflineSyncStatusBar                    |  <-- NEW
|  [Cloud icon] Online | 2 pending | Sync  |
+------------------------------------------+
|  Main Content (Tabs, etc.)               |
+------------------------------------------+
```

### Hook Integration Example

```typescript
// Import the offline sync hook
const {
  unsyncedCount,
  pendingUploadsCount,  // Only for drawings
  isOnline,
  syncNow
} = useDrawingOfflineSync({ projectId, enabled: !!projectId });

// Track sync state
const [isSyncing, setIsSyncing] = useState(false);
const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

// Wrapper to track sync timing
const handleSync = async () => {
  setIsSyncing(true);
  try {
    await syncNow();
    setLastSyncAt(Date.now());
  } finally {
    setIsSyncing(false);
  }
};
```

### OfflineSyncStatusBar Props

| Prop | Source | Description |
|------|--------|-------------|
| `pendingCount` | Hook's `unsyncedCount` (+ `pendingUploadsCount` for drawings) | Number of items waiting to sync |
| `isSyncing` | Local state | Whether sync is in progress |
| `onSync` | Handler calling hook's `syncNow` | Triggers manual sync |
| `lastSyncAt` | Local state | Timestamp of last successful sync |
| `compact` | `false` | Use full-width mode for page integration |

### Conditional Rendering
The status bar will be shown when:
- There are pending changes to sync (`pendingCount > 0`)
- OR the device is offline (`!isOnline`)
- OR to show "All synced" feedback briefly after sync completes

This matches the existing behavior in `OfflineSyncStatusBar` which handles showing/hiding states internally.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/drawings/DrawingRegisterPage.tsx` | Add hook, state, and status bar component |
| `src/pages/CableScheduleDetail.tsx` | Add hook, state, and status bar component |
| `src/pages/ElectricalBudgetDetail.tsx` | Add hook, state, and status bar component |

---

## User Experience

After implementation, users will see:

1. **Online with no pending changes**: Minimal indicator showing "Online" or hidden entirely
2. **Online with pending changes**: Warning-styled bar showing count and "Sync Now" button
3. **Offline**: Red-styled bar showing "Offline" with queued change count
4. **During sync**: Loading spinner with "Syncing..." text
5. **After sync**: Brief "All changes synced" success message

This provides clear visibility into data synchronization status, especially important for field use where connectivity may be intermittent.

---

## Additional Improvement Suggestions

After this implementation, consider these enhancements:
1. **Conflict Resolution UI**: When the same record is edited both locally and on the server, show a resolution dialog
2. **Storage Quota Monitoring**: Add warnings when approaching IndexedDB storage limits
3. **Sync History Log**: Track and display recent sync operations for debugging
4. **Auto-retry Backoff**: Implement exponential backoff for failed sync attempts
5. **Selective Sync**: Allow users to choose which items to sync first when multiple pending

