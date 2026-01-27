
# Fix Dropbox File Browser Configuration Issue

## Problem Identified

The root cause is a **state synchronization issue** between multiple instances of the `useDropbox` hook:

1. The `CloudStorageSettings` component mounts and calls `useDropbox()`, which triggers `checkConnection()`
2. The connection check succeeds, and `isConnected` becomes `true` in that hook instance
3. This causes the `DropboxBrowser` component to render (because parent sees `isConnected=true`)
4. `DropboxBrowser` creates its **own** `useDropbox()` instance with fresh state (`isConnected=false`)
5. The new instance's `checkConnection` is **skipped due to debouncing** (global `lastCheckTime` was just set)
6. The browser's `isConnected` stays `false`, so `loadFolder()` never runs

## Solution: Share Connection State Properly

There are two approaches to fix this. I recommend **Option A** for simplicity:

### Option A: Initialize State from Global Check Result (Recommended)

Modify `useDropbox` to cache the last successful connection result and use it to initialize new hook instances immediately.

**Changes to `src/hooks/useDropbox.ts`:**
- Add a global cache for the last known connection status
- Initialize `isConnected` from the cache if available
- Update the cache when connection status changes

### Option B: Pass Connection Status as Prop

Have `CloudStorageSettings` pass the connection status to `DropboxBrowser` as a prop, avoiding duplicate hook calls.

**Changes:**
- Add `isConnected` prop to `DropboxBrowser`
- Remove `useDropbox` state from `DropboxBrowser`, only use the API functions

---

## Implementation Details (Option A)

### 1. Modify `src/hooks/useDropbox.ts`

Add global state cache before the hook:

```typescript
// Cache for sharing connection state across hook instances
let cachedConnectionState: {
  isConnected: boolean;
  connectionStatus: DropboxConnectionStatus | null;
  accountInfo: DropboxAccountInfo | null;
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 30000; // 30 seconds
```

Update state initialization to use cache:

```typescript
export function useDropbox() {
  // Initialize from cache if fresh
  const initialState = cachedConnectionState && 
    (Date.now() - cachedConnectionState.timestamp < CACHE_TTL_MS);
  
  const [isConnected, setIsConnected] = useState(
    initialState ? cachedConnectionState!.isConnected : false
  );
  const [isLoading, setIsLoading] = useState(!initialState);
  // ... rest of state
```

Update the connection check to write to cache:

```typescript
if (response.ok) {
  const status = await response.json();
  // Update cache
  cachedConnectionState = {
    isConnected: status.connected,
    connectionStatus: status,
    accountInfo: null,
    timestamp: Date.now()
  };
  // ... set state
}
```

### 2. Simplify `DropboxBrowser.tsx` Load Effect

Remove the 100ms timeout that was added as a workaround:

```typescript
useEffect(() => {
  if (isConnected) {
    loadFolder(currentPath);
  }
}, [currentPath, isConnected, loadFolder]);
```

---

## Technical Summary

| Component | Change |
|-----------|--------|
| `useDropbox.ts` | Add global state cache + initialize from cache |
| `DropboxBrowser.tsx` | Remove debounce timeout, simplify useEffect |

## Expected Outcome

- When the File Browser tab loads, it will immediately have `isConnected=true` from the cache
- The `loadFolder()` call will execute immediately on mount
- Folder contents will display seamlessly without timing delays

## Additional Improvement Suggestions

After this fix is implemented, consider:
1. Add a loading skeleton while folder contents are being fetched
2. Implement pagination for folders with many files (Dropbox has `has_more` in response)
3. Add file preview thumbnails for images
4. Enable multi-select for batch operations
