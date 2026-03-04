

# Dropbox Drawing Sync

## Overview
Build an edge function and UI component that scans Dropbox for project drawing PDFs and syncs them into the `project_drawings` table and Supabase Storage.

## Key Design Decision: Authentication
Your existing Dropbox integration uses **per-user OAuth** (tokens stored in `user_storage_connections`), not a global access token. The new `sync-drawings` edge function will reuse this same pattern -- the logged-in user's Dropbox credentials are used to scan folders. No new secret is needed.

## Implementation

### 1. Edge Function: `sync-drawings`

**Auth**: Validates the user's JWT, then fetches their Dropbox access token from `user_storage_connections` (same pattern as `dropbox-api`).

**Scanning logic**:
- Lists folders at `/OFFICE/PROJECTS/`
- Parses folder names matching `(NUMBER) NAME` pattern using regex `\((\d+)\)`
- Queries `projects` table matching `project_number`

**File processing** (per matched project):
- Navigates to `[folder]/39. ELECTRICAL/000. DRAWINGS/PDF/LATEST`
- Lists all `.pdf` files

**Sync logic** (per PDF):
- Checks `project_drawings` for existing record with same `file_name` and `project_id`
- If new:
  1. Downloads file content from Dropbox via API
  2. Uploads to `project-drawings` storage bucket
  3. Inserts into `project_drawings` with: `project_id`, `drawing_title` (filename without extension), `drawing_number` (derived from filename), `category` = 'electrical', `status` = 'draft', `current_revision` = '0', `file_url`, `file_path`, `file_name`

**Response**: Returns a JSON summary with scanned projects, new drawings imported, skipped drawings, and any errors.

### 2. Frontend: DropboxDrawingSync Component

A card-based UI placed in the Drawings section:
- "Sync Drawings from Dropbox" button that invokes the edge function
- Progress/loading state during sync
- Results display showing:
  - Projects scanned (with names)
  - New drawings imported (count per project)
  - Skipped (already existed)
  - Errors (if any)
- Requires Dropbox to be connected (shows connect prompt if not)

### 3. Config Update

Add `[functions.sync-drawings]` with `verify_jwt = false` to `supabase/config.toml` (JWT validated in code per existing pattern).

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/sync-drawings/index.ts` | Create -- the edge function |
| `src/components/drawings/DropboxDrawingSync.tsx` | Create -- the sync UI component |
| `src/components/drawings/index.ts` | Modify -- export new component |
| `supabase/config.toml` | Modify -- add function config |

### Technical Notes

- The edge function reuses the `getValidAccessToken` pattern from `dropbox-api` (refresh token handling, expiry checks)
- `drawing_number` is derived from the PDF filename by stripping the `.pdf` extension
- The `category` field is set to `'electrical'` since the path is within the ELECTRICAL folder
- `created_by` is set to the authenticated user's ID
- Storage path: `{project_id}/{filename}`
- The Dropbox download uses the `files/download` endpoint with the file path

