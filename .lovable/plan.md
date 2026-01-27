
# Dropbox Integration User Journey Plan

## Understanding the Current Situation

Based on my exploration, here's what exists:

### Current Dropbox Access Points
1. **Backup & Recovery Page (`/admin/backup`)** - Admin-only, contains:
   - DropboxConnector (connect/disconnect account)
   - DropboxBrowser (file management)
   - DropboxBackupSync (backup syncing)
   
2. **Project Settings (`/dashboard/project-settings`)** - Contains:
   - DropboxFolderPicker (link a folder to a project)
   
3. **Report Previews & Lists** - Contains:
   - SaveToDropboxButton (save generated PDFs/reports)

### The Problem
The main connection UI is admin-only at `/admin/backup`, but since we've implemented **per-user authentication**, every user needs their own connection. Regular users currently have no way to connect their Dropbox account.

---

## Proposed User Journey

### Phase 1: User Connects Their Dropbox Account

**New Location: User Settings Page (`/settings`)**

Add a new "Cloud Storage" tab to the existing Settings page where any authenticated user can:
- Connect/disconnect their personal Dropbox account
- View their connection status and account info
- Browse their files (limited view)
- See their activity logs

```text
Settings
├── Profile
├── Notifications  
├── App Settings
├── Company
├── PDF Quality
├── PDF Templates
├── Invoice Settings
├── Guides & Tours
├── Cloud Storage    ← NEW TAB
│   ├── Connection status
│   ├── Connect/Disconnect button
│   ├── Account info (name, email, storage quota)
│   ├── Quick file browser preview
│   └── Recent activity summary
└── Developer Tools
```

### Phase 2: User Works with Dropbox in Projects

**Enhanced Project Settings - Dropbox Section**

When a user views project settings, they can link a Dropbox folder:
- If not connected: Show prompt to connect first (link to Settings > Cloud Storage)
- If connected: Show DropboxFolderPicker to select project folder

**Document/Report Pages - Load from Dropbox**

Add "Import from Dropbox" buttons to key upload dialogs:
- Drawing upload dialogs
- Document upload dialogs  
- BOQ import wizards
- Budget upload components

**Report Generation - Save to Dropbox**

The existing SaveToDropboxButton already works well for saving reports.
- Defaults to project's linked folder if set
- Allows custom folder selection

### Phase 3: Standalone Dropbox File Manager (Optional)

Add a dedicated file management page accessible from the sidebar for power users who need full file browsing capabilities.

---

## Implementation Steps

### Step 1: Create Cloud Storage Settings Component

Create a new `CloudStorageSettings.tsx` component that includes:
- DropboxConnector (reused)
- Connection health indicator
- Compact file browser preview
- Recent activity summary
- Link to full file manager (if admin)

### Step 2: Add Cloud Storage Tab to Settings Page

Update `src/pages/Settings.tsx` to include the new Cloud Storage tab available to all authenticated users.

### Step 3: Create "Import from Dropbox" Dialog Component

Create a reusable `ImportFromDropboxDialog.tsx` component that:
- Opens a modal with DropboxBrowser in selection mode
- Allows single or multiple file selection
- Downloads selected files and returns them to the parent component
- Can be integrated into any upload workflow

### Step 4: Enhance DropboxFolderPicker with Connection Check

Update the folder picker to:
- Show a clear message if user isn't connected
- Provide a quick-connect button or link to Settings

### Step 5: Add Connection Status to Navigation Header

Add a small Dropbox connection indicator in the dashboard header:
- Shows connected/disconnected status
- Quick link to connect or manage

### Step 6: Update Backup Page Context (Admin)

Rename/reframe the admin backup page:
- Focus on system-wide backup management
- Admin visibility of user connection statuses
- Remove user-specific connection UI (now in Settings)

---

## New Components to Create

| Component | Purpose |
|-----------|---------|
| `CloudStorageSettings.tsx` | Settings tab content for Dropbox connection |
| `ImportFromDropboxDialog.tsx` | Reusable file picker dialog for imports |
| `DropboxConnectionBanner.tsx` | Prompt shown when Dropbox is needed but not connected |
| `DropboxStatusIndicator.tsx` | Small status badge for headers/menus |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add "Cloud Storage" tab |
| `src/components/storage/DropboxFolderPicker.tsx` | Add connection check with link to settings |
| `src/components/storage/DropboxConnector.tsx` | Ensure it works standalone (not admin-dependent) |
| `src/pages/BackupManagement.tsx` | Refocus on admin backup tasks, remove user connection UI |
| Various upload dialogs | Integrate ImportFromDropboxDialog where appropriate |

---

## User Journey Walkthrough

### Scenario 1: New User Connects Dropbox

1. User logs into the application
2. User navigates to **Settings > Cloud Storage**
3. User clicks "Connect to Dropbox"
4. User is redirected to Dropbox OAuth (signs in with their office credentials)
5. After authorization, redirected back with success message
6. Settings page shows their connected account info

### Scenario 2: User Saves Report to Dropbox

1. User generates a Cost Report
2. User clicks "Save to Dropbox" button
3. Dialog opens showing their accessible folders
4. User selects destination folder (or uses project default)
5. Report is saved to their Dropbox account

### Scenario 3: User Imports File from Dropbox

1. User is uploading a drawing revision
2. User clicks "Import from Dropbox" (instead of local file picker)
3. Modal opens with their Dropbox file browser
4. User navigates to and selects the PDF file
5. File is downloaded and attached to the drawing

### Scenario 4: User Links Project to Dropbox Folder

1. User goes to Project Settings
2. In "Dropbox Folder" section:
   - If not connected: sees prompt with link to Settings > Cloud Storage
   - If connected: sees folder browser, selects `/Projects/ProjectName`
3. Future exports default to this project folder

---

## Technical Details

### CloudStorageSettings Component Structure

```text
CloudStorageSettings
├── DropboxConnector (connection UI)
├── QuickBrowserPreview (if connected)
│   └── Shows 5 most recent files
├── ActivitySummary (if connected)
│   └── Shows last 5 actions
└── HelpText (connection benefits)
```

### ImportFromDropboxDialog Props

```typescript
interface ImportFromDropboxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelect: (file: DropboxFile, content: ArrayBuffer) => void;
  allowedExtensions?: string[];  // e.g., ['.pdf', '.xlsx']
  title?: string;
  description?: string;
}
```

### Connection Banner Behavior

The `DropboxConnectionBanner` appears:
- In DropboxFolderPicker when not connected
- In SaveToDropboxButton dialog when not connected  
- At top of upload dialogs when Dropbox import is available but not connected

---

## Security Considerations

- All Dropbox operations use the user's own OAuth tokens
- RLS ensures users can only access their own connection records
- Activity logging tracks all file operations per user
- No cross-user data access is possible

---

## Additional Improvement Prompts

After this implementation, consider these enhancements:
- **Add bulk import from Dropbox**: Allow selecting multiple files at once for batch document imports
- **Add Dropbox sync status indicators**: Show when project files are synced to Dropbox with last sync timestamps
- **Add offline file caching**: Cache frequently accessed Dropbox files for offline viewing
- **Add Dropbox search integration**: Search files across Dropbox directly from the app without browsing folders
