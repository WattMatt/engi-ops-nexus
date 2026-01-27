

# Dropbox Integration Implementation Plan

## Overview
Integrate Dropbox as an external storage provider, enabling users to:
- Connect their Dropbox account via OAuth
- Browse files and folders from Dropbox
- Upload project documents to Dropbox
- Sync handover documents and backups to Dropbox

---

## Phase 1: Dropbox App Setup & OAuth Configuration

### 1.1 Create Dropbox App (User Action Required)
You'll need to create a Dropbox App in the Dropbox Developer Console:
1. Go to https://www.dropbox.com/developers/apps
2. Create a new app with "Scoped access" and "Full Dropbox" access
3. Note the **App Key** and **App Secret**
4. Add redirect URI: `https://rsdisaisxdglmdmzmkyw.supabase.co/functions/v1/dropbox-oauth-callback`

### 1.2 Store Secrets
Required secrets to be added:
- `DROPBOX_APP_KEY` - Your Dropbox app key
- `DROPBOX_APP_SECRET` - Your Dropbox app secret

---

## Phase 2: Backend Edge Functions

### 2.1 `dropbox-auth` Edge Function
Handles OAuth flow initiation and token management:
- `GET /initiate` - Generates OAuth URL for user authorization
- `POST /refresh` - Refreshes expired access tokens
- `POST /disconnect` - Revokes tokens and cleans up

### 2.2 `dropbox-oauth-callback` Edge Function  
Handles the OAuth callback from Dropbox:
- Exchanges authorization code for access/refresh tokens
- Stores encrypted tokens in `storage_providers` table
- Redirects user back to the application

### 2.3 `dropbox-api` Edge Function
Proxies Dropbox API calls with token management:
- `POST /list-folder` - List files and folders
- `POST /upload` - Upload files to Dropbox
- `POST /download` - Download files from Dropbox
- `POST /create-folder` - Create new folders
- `GET /account-info` - Get connected account details

---

## Phase 3: Database Updates

### 3.1 Storage Provider Configuration
Utilize existing `storage_providers` table structure:
```text
+------------------+----------------------------------------+
| Column           | Usage for Dropbox                      |
+------------------+----------------------------------------+
| provider_name    | 'dropbox'                              |
| enabled          | true when connected                    |
| credentials      | {access_token, refresh_token, expiry}  |
| config           | {account_email, root_folder, sync_prefs}|
| test_status      | 'connected' / 'expired' / 'error'      |
+------------------+----------------------------------------+
```

### 3.2 User-Specific Connections
Add `user_id` column to `storage_providers` to support per-user Dropbox connections (optional enhancement for multi-user scenarios).

---

## Phase 4: Frontend Components

### 4.1 Dropbox Connection UI (`src/components/storage/DropboxConnector.tsx`)
- "Connect to Dropbox" button initiating OAuth
- Connection status display
- Disconnect option
- Account info display (name, email, storage used)

### 4.2 Dropbox File Browser (`src/components/storage/DropboxBrowser.tsx`)
- Folder navigation with breadcrumbs
- File/folder listing with icons
- Upload files to current folder
- Download selected files
- Create new folders

### 4.3 Storage Providers Tab Enhancement (`src/pages/BackupManagement.tsx`)
Replace placeholder with:
- Grid of available providers (Dropbox, Google Drive, OneDrive, S3)
- Connection status for each
- Configuration options

### 4.4 Document Integration
Add "Save to Dropbox" option to:
- Handover document exports
- PDF report generation
- Backup file destinations

---

## Phase 5: Sync Features (Future Enhancement)

### 5.1 Two-Way Sync Configuration
- Select Dropbox folder for project sync
- Configure sync direction (upload-only, download-only, bidirectional)
- Conflict resolution preferences

### 5.2 Automatic Backup to Dropbox
Extend existing backup system:
- Add Dropbox as backup destination option
- Schedule automatic syncs
- Retention management in Dropbox

---

## Technical Details

### OAuth 2.0 Flow
```text
User                    App                     Dropbox
  |                      |                         |
  |-- Click Connect ---->|                         |
  |                      |-- Generate Auth URL --->|
  |<-- Redirect to Dropbox ----------------------->|
  |                      |                         |
  |-- Authorize App ---->|                         |
  |<-- Redirect with code ------------------------>|
  |                      |-- Exchange code ------->|
  |                      |<-- Access + Refresh ----|
  |                      |-- Store tokens -------->|
  |<-- Connected! -------|                         |
```

### Token Storage Security
- Access tokens: Short-lived (4 hours), stored encrypted
- Refresh tokens: Long-lived, stored encrypted in database
- Automatic refresh before expiry
- Tokens stored server-side only (never exposed to frontend)

### Dropbox API Endpoints Used
- `/oauth2/token` - Token exchange and refresh
- `/2/files/list_folder` - List directory contents
- `/2/files/upload` - Upload files (up to 150MB)
- `/2/files/download` - Download files
- `/2/files/create_folder_v2` - Create folders
- `/2/users/get_current_account` - Get account info

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `supabase/functions/dropbox-auth/index.ts` | OAuth flow management |
| `supabase/functions/dropbox-oauth-callback/index.ts` | OAuth callback handler |
| `supabase/functions/dropbox-api/index.ts` | Dropbox API proxy |
| `src/components/storage/DropboxConnector.tsx` | Connection UI |
| `src/components/storage/DropboxBrowser.tsx` | File browser |
| `src/components/storage/StorageProviderCard.tsx` | Provider card component |
| `src/hooks/useDropbox.ts` | Dropbox operations hook |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/BackupManagement.tsx` | Replace placeholder with provider grid |
| `supabase/config.toml` | Add new edge function entries |

---

## Implementation Order

1. **Secrets Setup** - Add DROPBOX_APP_KEY and DROPBOX_APP_SECRET
2. **Edge Functions** - Create OAuth and API proxy functions
3. **Database** - Any schema updates needed
4. **Frontend Connection** - DropboxConnector component
5. **File Browser** - DropboxBrowser component  
6. **Integration** - Add to BackupManagement page
7. **Document Integration** - "Save to Dropbox" options

---

## Estimated Effort
- Phase 1-2 (Backend): 2-3 hours
- Phase 3 (Database): 30 minutes
- Phase 4 (Frontend): 2-3 hours
- Phase 5 (Sync): Future enhancement

**Total for core integration: 5-7 hours**

