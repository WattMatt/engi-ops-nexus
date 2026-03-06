

# Defect Tracking & Pin Drop System — Implementation Plan

## Overview
Add a new "Defects" tab to the Contractor Portal where users can view project drawings as PDFs, drop pins to mark defects/observations, attach photos and notes, and track resolution status. All access will use the existing `anon` role + `has_valid_contractor_portal_token()` RLS pattern.

---

## 1. Database Schema (Migration)

Create 4 new tables and 2 enums, plus a storage bucket:

**Tables:**
- `defect_pins` — Core pin data (project_id, drawing_id, x/y %, title, description, status, priority, package, created_by_name/email, list_id)
- `defect_photos` — Photos attached to pins (pin_id, storage_path, uploaded_by_name)
- `defect_activity` — Audit trail (pin_id, activity_type, content, user_name, user_email)
- `defect_lists` — Custom observation lists/categories per project (project_id, name)

**Key design decisions:**
- No `references auth.users(id)` — contractors are unauthenticated. Store `created_by_name` and `created_by_email` (text fields) from the portal identity dialog instead.
- Use `defect_status` enum: `open`, `in_progress`, `resolved`, `closed`
- Use `defect_priority` enum: `low`, `medium`, `high`, `critical`
- `number_id` auto-assigned per drawing via a trigger or application logic.

**RLS Policies (all using `has_valid_contractor_portal_token`):**
- `defect_pins`: SELECT, INSERT, UPDATE for `anon`
- `defect_photos`: SELECT, INSERT for `anon`
- `defect_activity`: SELECT, INSERT for `anon`
- `defect_lists`: SELECT, INSERT for `anon`
- Authenticated users get access via `has_project_access()` as usual.

**Storage:** Create `defect-photos` bucket (public read, like `project-drawings`).

---

## 2. Frontend Components

### New Tab in ContractorPortal.tsx
Add a "Defects" tab (with `MapPin` icon) to the existing `TabsList`, rendering a new `<ContractorDefectTracker>` component.

### Component Tree
```text
ContractorDefectTracker
├── DrawingSelector         — Dropdown to pick a drawing
├── DefectListFilter        — Filter by observation list / status
├── DefectDrawingViewer     — Main viewer area
│   ├── react-pdf (Page)    — PDF background
│   ├── Pin Overlay Layer   — Absolute-positioned MapPin icons (color-coded)
│   └── fabric.js Canvas    — Optional markup/redlining layer
├── DefectSidebar           — List of all pins on current drawing
├── DefectPinDialog         — Create/edit pin (title, description, priority, package, photos)
└── DefectActivityTimeline  — Audit trail inside the pin dialog
```

### UX Flow
1. User selects a drawing from the project's drawing register.
2. PDF renders with `react-pdf`. Existing pins overlay as colored icons.
3. "Add Pin" mode: click on PDF → captures X/Y as percentage → opens `DefectPinDialog`.
4. Fill in title, description, priority, package, optional photos → save.
5. Click existing pin → opens detail sheet with activity timeline, status controls, photo gallery.
6. Status changes and comments auto-log to `defect_activity`.

### Pin Colors
- Red = Open
- Orange = In Progress  
- Blue = Resolved
- Green = Closed

---

## 3. Data Hooks

Following project conventions, create hooks in `src/hooks/`:
- `useDefectPins(projectId, drawingId)` — fetch pins with react-query
- `useDefectLists(projectId)` — fetch observation lists
- `useCreateDefectPin()` — mutation to insert pin + log activity
- `useUpdateDefectPin()` — mutation to update status/details + log activity
- `useDefectPhotos(pinId)` — fetch photos for a pin
- `useDefectActivity(pinId)` — fetch activity timeline

---

## 4. File Structure

```text
src/components/contractor-portal/defects/
├── ContractorDefectTracker.tsx
├── DefectDrawingViewer.tsx
├── DefectPinDialog.tsx
├── DefectSidebar.tsx
├── DefectActivityTimeline.tsx
├── DefectListFilter.tsx
└── DefectPhotoUpload.tsx
src/hooks/
├── useDefectPins.tsx
└── useDefectLists.tsx
```

---

## 5. Technical Notes

- **Coordinates:** Stored as percentage (0–100) of the PDF container dimensions, ensuring pins are responsive across screen sizes.
- **fabric.js:** Already installed (`fabric@^6.7.1`). Will be used for an optional markup overlay — drawings/circles/arrows saved as JSON per pin.
- **react-pdf:** Already installed (`react-pdf@^10.2.0`). Will reuse the pattern from `ContractorFloorPlanView`.
- **Photo compression:** Will use `browser-image-compression` (already installed) before uploading to storage.
- **No auth.users references:** All creator/assignee tracking uses name+email text fields from the portal identity system.

