
# Per-User Dropbox Authentication Implementation Plan

## Current Situation

The current Dropbox integration uses a **shared/global connection model**:
- A single row in the `storage_providers` table stores one set of Dropbox credentials
- All users share the same Dropbox account and see identical files
- This bypasses your Dropbox folder permission structure where certain users shouldn't have access to specific folders

## Goal

Implement **per-user Dropbox authentication** where:
- Each user connects their own Dropbox account
- Users only see files and folders their Dropbox account has access to
- Native Dropbox sharing/permission settings are fully respected
- Credentials are securely isolated per user with proper Row Level Security

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────────────┐
│                         Current Flow                            │
│  ┌──────────┐    ┌───────────────────┐    ┌────────────────┐   │
│  │ Any User │───▶│ storage_providers │───▶│ Shared Dropbox │   │
│  └──────────┘    │   (single row)    │    │    Account     │   │
│                  └───────────────────┘    └────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        New Flow                                 │
│  ┌──────────┐    ┌─────────────────────────┐                   │
│  │  User A  │───▶│ user_storage_connections│───▶ User A's      │
│  └──────────┘    │     (user_id = A)       │    Dropbox        │
│                  └─────────────────────────┘                   │
│  ┌──────────┐    ┌─────────────────────────┐                   │
│  │  User B  │───▶│ user_storage_connections│───▶ User B's      │
│  └──────────┘    │     (user_id = B)       │    Dropbox        │
│                  └─────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### 1. Database: Create Per-User Storage Connections Table

Create a new `user_storage_connections` table to store individual user credentials:

**Fields:**
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users, NOT NULL)
- `provider` (TEXT, e.g., 'dropbox')
- `credentials` (JSONB, encrypted tokens)
- `account_info` (JSONB, display name, email, storage quota)
- `connected_at` (TIMESTAMPTZ)
- `last_used_at` (TIMESTAMPTZ)
- `status` (TEXT, e.g., 'connected', 'expired', 'revoked')

**Row Level Security:**
- Users can only SELECT/UPDATE/DELETE their own connections
- INSERT requires authenticated user with user_id matching auth.uid()

### 2. Backend: Update OAuth Callback Function

Modify `dropbox-oauth-callback` to:
- Accept the user's session/JWT in the OAuth state parameter
- Store tokens in `user_storage_connections` linked to the specific user_id
- Handle the case where a user reconnects (update existing row vs. insert)

### 3. Backend: Update Dropbox Auth Function

Modify `dropbox-auth` to:
- **Initiate**: Encode the user's ID in the OAuth state for callback identification
- **Status**: Check the current user's connection in `user_storage_connections`
- **Disconnect**: Revoke tokens and remove only the current user's connection
- **Refresh**: Refresh tokens for the current user's session only

### 4. Backend: Update Dropbox API Proxy

Modify `dropbox-api` to:
- Extract the user's session from the Authorization header
- Fetch credentials from `user_storage_connections` for that specific user
- All file operations (list, upload, download, delete) use that user's tokens
- Token refresh logic updates only the current user's stored credentials

### 5. Frontend: Update useDropbox Hook

Modify `src/hooks/useDropbox.ts` to:
- Pass the user's JWT in all API calls for authentication
- Show connection status specific to the logged-in user
- Handle cases where the user hasn't connected yet

### 6. Frontend: Update UI Components

Update components to reflect per-user status:
- `DropboxConnector.tsx`: Shows the current user's connection status
- `DropboxBrowser.tsx`: Displays only files the user's Dropbox account can access
- `SaveToDropboxButton.tsx`: Uploads to the user's own Dropbox
- `DropboxFolderPicker.tsx`: Navigates the user's accessible folders

### 7. Migration: Handle Existing Global Connection

- The existing `storage_providers` table remains for admin/system-level configuration
- Optionally migrate the current global connection to a specific admin user
- Clear guidance to users that they need to connect their individual accounts

---

## Technical Details

### New Database Migration

```sql
-- Per-user storage connections
CREATE TABLE user_storage_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  credentials JSONB,
  account_info JSONB,
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  status TEXT DEFAULT 'connected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_storage_connections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own connections
CREATE POLICY "Users can manage own connections"
  ON user_storage_connections FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### OAuth State Parameter Enhancement

The OAuth state will encode user identification:
```javascript
const state = JSON.stringify({
  nonce: crypto.randomUUID(),
  userId: user.id,
  returnUrl: '/backup'
});
// Base64 encode for URL safety
const encodedState = btoa(state);
```

### Edge Function Authentication Pattern

All Dropbox edge functions will:
1. Extract JWT from Authorization header
2. Verify the session with Supabase
3. Query `user_storage_connections` filtered by the authenticated user_id
4. Return 401 if no connection exists for that user

---

## Security Considerations

1. **Token Isolation**: Each user's refresh/access tokens are stored separately
2. **RLS Protection**: Users cannot query or modify other users' tokens
3. **Session Verification**: Edge functions validate JWT before accessing tokens
4. **Dropbox Permissions**: Native folder sharing settings in Dropbox are fully respected

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration | Create `user_storage_connections` table with RLS |
| `supabase/functions/dropbox-auth/index.ts` | User-specific OAuth initiation, status, disconnect |
| `supabase/functions/dropbox-oauth-callback/index.ts` | Store tokens per user_id from state |
| `supabase/functions/dropbox-api/index.ts` | Fetch user-specific tokens, authenticate requests |
| `src/hooks/useDropbox.ts` | Pass JWT, user-specific connection state |
| `src/components/storage/DropboxConnector.tsx` | Show user's own connection status |
| `src/components/storage/DropboxBrowser.tsx` | No structural changes (uses hook) |
| `src/components/storage/SaveToDropboxButton.tsx` | No structural changes (uses hook) |
| `src/components/storage/DropboxFolderPicker.tsx` | No structural changes (uses hook) |

---

## Additional Improvement Prompts

After this implementation, consider these enhancements:
- **Add connection expiry notifications**: Alert users when their Dropbox token is about to expire
- **Implement admin visibility**: Allow admins to see which users have connected Dropbox (without seeing their tokens)
- **Add Dropbox activity logging**: Track file operations per user for audit purposes
- **Enable team folder support**: Special handling for Dropbox Business team folders
