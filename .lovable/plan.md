

# Drawing Review Checklist System - Implementation Plan

## Overview

This plan expands the Drawing Register to include category-specific review checklists with verification items, a split-view drawing reviewer with zoom/pan functionality, and document linkage capabilities.

## Feature Summary

| Feature | Description |
|---------|-------------|
| Category-Based Checklists | Predefined check items for Site Plan, Power Layouts, CCTV/Access Control, and Tenant Layout drawings |
| Drawing Review Mode | Split-view panel with drawing preview (zoom/pan) and adjacent checklist |
| Editable Checklists | Admin ability to manage checklist templates and items |
| Document Links | Ability to link checklist items to required documentation |
| Progress Tracking | Visual indicators for review completion status |

---

## Architecture

### New Database Tables

```text
+----------------------------------+       +----------------------------------+
|   drawing_checklist_templates    |       |   drawing_checklist_items        |
+----------------------------------+       +----------------------------------+
| id (uuid, PK)                    |       | id (uuid, PK)                    |
| category_code (text, FK)         |------>| template_id (uuid, FK)           |
| name (text)                      |       | label (text)                     |
| description (text)               |       | parent_id (uuid, nullable)       |
| is_default (boolean)             |       | linked_document_type (text)      |
| created_at                       |       | sort_order (int)                 |
| updated_at                       |       | created_at                       |
+----------------------------------+       +----------------------------------+
                                                       |
                                                       v
+----------------------------------+       +----------------------------------+
|   drawing_review_status          |       |   drawing_review_checks          |
+----------------------------------+       +----------------------------------+
| id (uuid, PK)                    |       | id (uuid, PK)                    |
| drawing_id (uuid, FK)            |       | review_id (uuid, FK)             |
| reviewed_by (uuid, FK)           |       | item_id (uuid, FK)               |
| review_date (timestamp)          |       | is_checked (boolean)             |
| status (text)                    |       | notes (text)                     |
| notes (text)                     |       | checked_at (timestamp)           |
| created_at                       |       | checked_by (uuid, FK)            |
+----------------------------------+       +----------------------------------+
```

### Component Architecture

```text
DrawingRegisterPage
├── DrawingTable (existing)
│   └── [Review] action button -> Opens DrawingReviewDialog
├── DrawingGrid (existing)
│   └── [Review] action button -> Opens DrawingReviewDialog
└── DrawingReviewDialog (NEW)
    └── ResizablePanelGroup
        ├── Left Panel: DrawingPreviewPane
        │   ├── PDF/Image viewer with zoom/pan
        │   ├── Mouse wheel zoom
        │   └── Pan with drag
        └── Right Panel: DrawingChecklistPane
            ├── Category header with progress
            ├── Collapsible checklist sections
            │   ├── Checkbox items
            │   ├── Sub-items (indented)
            │   └── Document link icons
            └── Notes section
```

---

## Detailed Implementation

### Phase 1: Database Schema

Create four new tables to store checklist templates and review progress:

1. **drawing_checklist_templates** - Stores checklist definitions per drawing category
2. **drawing_checklist_items** - Stores individual checklist items with hierarchy support
3. **drawing_review_status** - Tracks overall review status per drawing
4. **drawing_review_checks** - Stores individual check completions

Default checklist data will be seeded for:
- Site Plan (19 items)
- Power Layouts (28 items with sub-items)
- CCTV and Access Control (14 items with sub-items)
- Tenant Layout (12 items with sub-items)

### Phase 2: Hooks and Types

Create new TypeScript types and React Query hooks:

**Types (src/types/drawingChecklists.ts):**
- `DrawingChecklistTemplate`
- `DrawingChecklistItem`
- `DrawingReviewStatus`
- `DrawingReviewCheck`

**Hooks (src/hooks/useDrawingChecklists.ts):**
- `useChecklistTemplates(categoryCode)` - Fetch templates by category
- `useChecklistItems(templateId)` - Fetch items for a template
- `useDrawingReview(drawingId)` - Fetch/create review status
- `useToggleCheckItem()` - Toggle check state mutation
- `useSaveReviewNotes()` - Save review notes mutation
- `useChecklistProgress(drawingId)` - Calculate completion percentage

### Phase 3: Drawing Preview Component with Zoom/Pan

Create `DrawingPreviewPane.tsx` with:

1. **PDF Rendering** using react-pdf (already installed)
2. **Zoom/Pan Controls:**
   - Mouse wheel for zoom (centered on cursor position)
   - Click and drag for panning
   - Zoom in/out buttons
   - Reset view button
   - Fit to width/height options
3. **View State Management:**
   - `zoom` (number, 0.1 to 10)
   - `offset` (x, y coordinates)
4. **Controls toolbar:**
   - Page navigation (for multi-page PDFs)
   - Zoom percentage indicator
   - Fullscreen toggle

### Phase 4: Checklist Panel Component

Create `DrawingChecklistPane.tsx` with:

1. **Header:**
   - Category name and icon
   - Progress bar (X of Y items checked)
   - Review status badge

2. **Checklist Items:**
   - Grouped by parent/child hierarchy
   - Collapsible sections for parent items
   - Checkbox with label
   - Document link icon (if linked_document_type set)
   - Notes tooltip/popover per item

3. **Footer:**
   - Overall notes textarea
   - Submit review button
   - Status selector (Draft, In Review, Approved)

### Phase 5: Review Dialog and Integration

Create `DrawingReviewDialog.tsx`:

1. **Layout:** Full-screen dialog with ResizablePanelGroup
2. **Left Panel (60%):** DrawingPreviewPane
3. **Resize Handle:** Draggable divider
4. **Right Panel (40%):** DrawingChecklistPane
5. **Header:** Drawing number, title, current revision

Integrate into existing components:
- Add "Review" button to DrawingTable row actions
- Add "Review" button to DrawingGrid card actions
- Add review progress indicator to drawing list

### Phase 6: Checklist Management (Admin)

Create admin interface at `/dashboard/drawings/checklists`:

1. **Template List:**
   - View all templates by category
   - Create new template
   - Set default template

2. **Template Editor:**
   - Add/edit/delete items
   - Drag-and-drop reordering
   - Set parent-child relationships
   - Link to document types

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/types/drawingChecklists.ts` | Type definitions |
| `src/hooks/useDrawingChecklists.ts` | Data hooks |
| `src/components/drawings/review/DrawingPreviewPane.tsx` | PDF viewer with zoom/pan |
| `src/components/drawings/review/DrawingChecklistPane.tsx` | Checklist panel |
| `src/components/drawings/review/DrawingReviewDialog.tsx` | Main review dialog |
| `src/components/drawings/review/ChecklistItem.tsx` | Individual checklist item |
| `src/components/drawings/review/ChecklistSection.tsx` | Grouped items section |
| `src/components/drawings/admin/ChecklistTemplateEditor.tsx` | Admin template editor |
| `src/components/drawings/admin/ChecklistItemEditor.tsx` | Admin item editor |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/drawings/DrawingTable.tsx` | Add Review action, progress indicator |
| `src/components/drawings/DrawingGrid.tsx` | Add Review action, progress indicator |
| `src/components/drawings/index.ts` | Export new components |
| `src/types/drawings.ts` | Add review-related types |
| `src/App.tsx` | Add checklist admin route (if needed) |

---

## Default Checklist Data

### Site Plan Check Sheet (19 items)
- Access control detail - booms at entrances
- Lighting circuiting
- Generator plinth details
- Anchor supply routing
- North arrow to be indicated
- MV cable between council and consumer RMU
- Routing to electrical connection
- Sleeves for electrified fence
- Landscaping sleeves
- Sleeve schedule
- Parking area lights
- Kiosk positions
- Lighting schedule
- Lighting specification
- Telecom routing
- Generator positions
- Telkom/Meet me room position
- Mini sub positions
- Main board positions
- Electrical connection position

### Power Layouts Check Sheet (28+ items with sub-items)
- Fire cupboard detail
  - Plug in fire hose reel cupboards
- Legend
  - Check notes on title block
  - Check legend items
- Grid lines
- Break glass units
- Energizer isolators
- Title block check
  - Author details
  - Client name/logo
  - Drawing name
- Key plan
- Sockets in main board cupboards
- Walkway/Mall - decoration plugs
- Shop boards
  - Correct position
  - Correct size
  - AC controller draw box with 25mm conduit to ceiling void
  - Fibre draw box with 25mm conduit to ceiling void
  - P9000 trunking to ceiling void
  - P8000 trunking to ceiling void
- Cable tray/wire basket notes with heights
- Isolators points for lifts
  - 60A TP isolator at the top
  - 20A SP isolator at the bottom for sump pump
- Isolators for shop signage
- Routes for mall lighting
- Ensure main boards are indicated to scale

### CCTV and Access Control Check Sheet (14+ items)
- Issue of layouts to both parties
- CCTV points
  - Images
  - Sleeves to be indicated on site plan early on for coordination with civil
  - Conduit links
  - Heights
- Data cabinets
  - Power required for each
  - Wire basket to also link these up
- Speakers
  - Conduit link
- Booms
  - Power
  - Data
  - Conduits
  - Details
  - Goose necks
- Access control at centre management
- Electrified fencing
  - Energiser plug
  - Route to boundary
  - Entrance details at all gates
- Control room
  - Points and the rest

### Tenant Layout Check Sheet (12+ items)
- Power layout section reflected
  - Correctly scaled board position with dimensions
  - Telkom point
  - AC point
- Lighting layout section reflected
  - Trunking reflected with dimensions and height
- DB board elevation detail
- Schematic distribution board indicated
  - Correct and corresponding cable size reflected
  - Correct board size reflected
  - Circuit breakers align with circuits reflected on layouts
  - Correct air-conditioning information reflected
- Key plan indicated with correct position
- Lighting schedule reflected
  - Images
  - Description
  - Supplier
  - Quantity
- Single applicable legend indicated
- Scope of work indicated
  - Key points to be highlighted

---

## Technical Specifications

### Zoom/Pan Implementation
```text
Zoom: Mouse wheel (factor 1.1x per scroll)
      Centered on cursor position
      Range: 10% to 1000%
Pan:  Click and drag with mouse
      Cursor changes to grab/grabbing
```

### Document Link Types
Checklist items can link to documentation types:
- `lighting_schedule`
- `scope_of_work`
- `db_elevation`
- `schematic_diagram`
- `cable_schedule`
- `equipment_spec`
- (extensible)

### RLS Policies
- All users can view checklists and review status
- Only assigned reviewers can modify review checks
- Only admins can modify checklist templates

---

## Additional Improvements

After core implementation, consider:

1. **Export Review Report** - Generate PDF of completed review with checked items
2. **Review History** - Track changes over time with audit log
3. **Bulk Review** - Review multiple drawings with shared checklist
4. **Notifications** - Alert when drawing ready for review
5. **Review Assignment** - Assign specific reviewers to drawings

