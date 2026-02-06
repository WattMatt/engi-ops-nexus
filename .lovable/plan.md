

# Automatic Daily Session Expiry & Cache Clear Implementation

## Overview

This plan implements a scheduled automatic logout system that forces users to re-authenticate at a configurable time each day, while also clearing their local cache and storage. This is useful for security compliance, ensuring users don't leave sessions open indefinitely on shared devices.

## Implementation Strategy

The solution uses a **client-side session monitor** that checks the current time against a configured logout time, combined with an **admin-configurable setting** stored in the database. This approach works across all platforms (web, PWA, mobile via Capacitor).

---

## Architecture

```text
+------------------+     +-------------------+     +------------------+
|  Admin Settings  | --> |  Company Settings | --> | Session Monitor  |
|  (UI Config)     |     |  (DB storage)     |     |  (Client Hook)   |
+------------------+     +-------------------+     +------------------+
                                                           |
                                                           v
                                                   +------------------+
                                                   |  Force Logout    |
                                                   |  - Sign out      |
                                                   |  - Clear storage |
                                                   |  - Redirect      |
                                                   +------------------+
```

---

## Changes Required

### 1. Database Schema Update

Add session management columns to the existing `company_settings` table:

| Column | Type | Description |
|--------|------|-------------|
| `auto_logout_enabled` | boolean | Toggle for the feature (default: false) |
| `auto_logout_time` | time | Time of day to trigger logout (e.g., "02:00:00") |
| `auto_logout_timezone` | text | Timezone for the scheduled time (e.g., "Africa/Johannesburg") |

### 2. New Hook: `useSessionMonitor`

**Location**: `src/hooks/useSessionMonitor.ts`

Core logic:
- Runs a check every minute while user is authenticated
- Compares current time against the configured logout time (accounting for timezone)
- Triggers logout if within the scheduled window (e.g., 02:00 - 02:05)
- Performs a complete cache clear:
  - Supabase auth signOut
  - localStorage.clear()
  - sessionStorage.clear()
  - IndexedDB database deletion
  - Cache API cleanup
  - React Query cache clear

### 3. Session Monitor Integration

**Location**: `src/pages/DashboardLayout.tsx` and `src/pages/AdminLayout.tsx`

- Add `useSessionMonitor()` hook to both layout components
- The hook will silently monitor in the background
- When triggered, shows a brief toast notification ("Session expired - please log in again") then redirects to `/auth`

### 4. Admin Configuration UI

**Location**: `src/pages/Settings.tsx` (Admin settings section)

New card under admin settings:
- **Session Security** card with:
  - Toggle switch for "Enable daily auto-logout"
  - Time picker for "Logout time" (default: 02:00 AM)
  - Timezone selector (defaults to user's local timezone)
  - Description explaining the feature

---

## Technical Details

### Session Monitor Logic

```text
Every 60 seconds:
1. Check if auto_logout_enabled = true
2. Get current time in configured timezone
3. Check if current time is within logout window (configured time +/- 2 mins)
4. If yes AND user is authenticated:
   a. Sign out from backend
   b. Clear all local storage
   c. Clear IndexedDB
   d. Clear Cache API
   e. Show notification
   f. Redirect to /auth
```

### Storage Clearing Process

The following will be cleared during auto-logout:
- **localStorage**: All project-specific keys, settings, cached data
- **sessionStorage**: Temporary state
- **IndexedDB**: All offline stores (site diary, cables, budgets, drawings, etc.)
- **Cache API**: PWA cached assets and API responses
- **React Query cache**: In-memory query cache

### Grace Period Handling

To prevent users from being logged out while actively working:
- Only trigger if the user has been idle for 5+ minutes
- Store last activity timestamp
- If user is actively using the app during logout window, delay by 30 minutes

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/hooks/useSessionMonitor.ts` | Create | Core session monitoring logic |
| `src/hooks/useIdleTracker.ts` | Create | Track user activity for grace period |
| `src/components/settings/SessionSecuritySettings.tsx` | Create | Admin UI for configuration |
| `src/pages/DashboardLayout.tsx` | Modify | Add session monitor hook |
| `src/pages/AdminLayout.tsx` | Modify | Add session monitor hook |
| `src/pages/Settings.tsx` | Modify | Add session security settings section |
| Database migration | Create | Add columns to company_settings |

---

## Security Considerations

- The logout time is configurable only by admin/moderator users
- The feature is disabled by default
- All credentials and tokens are properly invalidated on logout
- Works even if user closes browser and reopens later (persisted setting check)

---

## Additional Improvement Suggestions

After implementing this feature, consider:
1. **Session activity logging** - Track when users log in/out for audit purposes
2. **Maximum session duration** - Add a maximum hours setting (e.g., 12 hours max regardless of time)
3. **Device-specific sessions** - Allow users to see and revoke sessions on other devices
4. **Pre-logout warning** - Show a 5-minute warning notification before auto-logout

