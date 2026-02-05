
# Fix: StorageWarningBanner Router Context Error

## Problem Identified
The application crashes on load with the error:
```
useNavigate() may be used only in the context of a <Router> component
```

The `StorageWarningBanner` component uses `useNavigate()` but is placed **outside** the `<BrowserRouter>` component in `App.tsx`, making the router context unavailable.

## Current Code Structure (Broken)
```
<ConflictProvider>
  ...
  <StorageWarningBanner />      // Uses useNavigate() - NO ROUTER YET!
  ...
  <BrowserRouter>               // Router starts here
    ...
  </BrowserRouter>
</ConflictProvider>
```

## Solution
Move `StorageWarningBanner` **inside** the `<BrowserRouter>` component so it has access to the router context.

## Files to Modify

### `src/App.tsx`
- Remove `<StorageWarningBanner />` from its current position (line 129)
- Add it inside `<BrowserRouter>`, alongside the Routes

## Fixed Code Structure
```
<ConflictProvider>
  ...
  <BrowserRouter>
    <StorageWarningBanner />    // Now has router context!
    <WalkthroughController />
    <Suspense>
      <Routes>...</Routes>
    </Suspense>
  </BrowserRouter>
</ConflictProvider>
```

## Additional Notes
This is a critical bug that completely breaks the application. After fixing this, the offline sync testing can proceed.

---

## Testing Plan (After Fix)
Once the router issue is fixed, I can proceed with the original offline sync testing:

1. Navigate to Drawing Register, Cable Schedules, or Budget pages
2. Go offline (simulated via browser)
3. Make changes to records
4. Verify changes are stored in IndexedDB
5. Go back online
6. Confirm sync occurs and data is pushed to server
7. Verify conflict resolution if applicable
