# Integration Strategy: wm-compliance into wm-office

## Overview
The `wm-compliance` project contains a mature **Offline-First Inspection System** and a robust **Compliance/Template Engine**. This strategy outlines how to port these features into `wm-office` without disrupting existing workflows.

## 1. Offline Core Infrastructure (Priority: High)
`wm-office` needs a reliable offline engine for its PWA goals.

### Source Files (`wm-compliance`)
- `src/lib/offlineDB.ts`: IndexedDB wrapper for local storage.
- `src/hooks/useOfflineSync.ts`: Queue manager for background syncing (Create/Update/Delete/Upload).
- `src/hooks/useNetworkStatus.ts` (or equivalent logic in `App.tsx`): robust online/offline detection.

### Integration Steps
1.  **Copy `src/lib/offlineDB.ts` to `wm-office/src/lib/offlineDB.ts`**.
    *   *Adaptation*: Ensure the database name avoids conflicts (e.g., change `wm_compliance_offline` to `wm_office_offline`).
2.  **Copy `src/hooks/useOfflineSync.ts` to `wm-office/src/hooks/useOfflineSync.ts`**.
    *   *Adaptation*: Review mutation types. `wm-compliance` likely has specific mutations for inspections. We should generalize this or add `wm-office` specific mutations (e.g., `CREATE_DAILY_LOG`, `UPDATE_TIMESHEET`).
3.  **Enhance `OfflineIndicator`**:
    *   `wm-office` already has a simple `OfflineIndicator`.
    *   Update it to show *sync status* (e.g., "5 items pending sync") using the state from `useOfflineSync`.

## 2. Inspection & Compliance Module (Priority: Medium)
`wm-office` has a placeholder `Inspections` route. `wm-compliance` has a full feature.

### Source Files
- `src/pages/Inspections.tsx`: Dashboard.
- `src/pages/InspectionDetail.tsx`: Execution logic.
- `src/pages/COCDocumentation.tsx`: specialized compliance forms.
- `src/components/inspection/`: Reusable components (checklists, signature pads, etc.).

### Integration Steps
1.  **Analyze Database Schema**:
    *   Check `wm-compliance` Supabase types (`src/integrations/supabase/types.ts`).
    *   Ensure `wm-office` has corresponding tables (`inspections`, `inspection_items`, `inspection_templates`, `compliance_documents`).
    *   *Action*: Create a SQL migration script for missing tables in `wm-office`.
2.  **Port Components**:
    *   Move `src/pages/Inspections` -> `wm-office/src/pages/Inspections` (renaming the existing one or merging).
    *   Port specialized components (Signature Pad, Photo Uploader).
3.  **Route Integration**:
    *   Update `src/App.tsx` in `wm-office` to use the new, more capable inspection pages.

## 3. Template Engine (Priority: Low/Future)
`wm-compliance` allows creating dynamic inspection templates.

### Source Files
- `src/pages/TemplateBuilderPage.tsx`
- `src/pages/TemplateValidator.tsx`

### Integration Steps
1.  This can be a separate "Admin" module in `wm-office`.
2.  Port `TemplateBuilderPage` to `wm-office/src/pages/admin/TemplateBuilder.tsx`.

## Execution Plan

### Phase 4.1: Foundation
- [ ] Port `offlineDB.ts`.
- [ ] Port `useOfflineSync.ts`.
- [ ] Verify offline storage works in `wm-office` dev environment.

### Phase 4.2: Data & Types
- [ ] Compare `types.ts` between projects.
- [ ] Generate migration SQL for `inspections` tables.

### Phase 4.3: UI Migration
- [ ] Migrate `Inspections` page.
- [ ] Migrate `InspectionDetail` page.
- [ ] Test "Create Inspection" in offline mode within `wm-office`.
