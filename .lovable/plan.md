
# Drawing Management System Implementation Plan

## Executive Summary
This plan outlines the implementation of a comprehensive Drawing Management System for electrical engineering projects. Based on the provided drawing register (with 150+ drawings including Power Layouts, Lighting Layouts, Schematic Distribution Diagrams, CCTV Layouts, HVAC Layouts, and Tenant-specific drawings), we will create a centralised system that integrates with the existing Roadmap, Client Portal, Contractor Portal, and Handover Documents features.

## Current State Analysis

### Existing Infrastructure
- **handover_documents table**: Generic document storage without drawing-specific metadata (no drawing_number, revision fields)
- **budget_reference_drawings table**: Has the exact schema needed (drawing_number, revision, description) - useful as reference
- **project_roadmap_items table**: Supports link_url and link_label for external resource linking
- **Client/Contractor Portals**: Both query handover_documents with category-based filtering
- **Storage bucket**: `handover-documents` bucket exists for file storage

### Gap Analysis
1. No dedicated drawing register table with proper metadata (DRW No, Title, Revision, Status)
2. No drawing category system matching electrical engineering conventions
3. No link between roadmap items and specific drawings
4. No drawing version history tracking
5. No bulk import capability for drawing registers

---

## Proposed Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                        DRAWING MANAGEMENT SYSTEM                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────┐   │
│  │   Database   │    │   Frontend UI     │    │   Integrations      │   │
│  ├──────────────┤    ├──────────────────┤    ├─────────────────────┤   │
│  │              │    │                  │    │                     │   │
│  │ project_     │◄───│ DrawingRegister  │    │ ► Roadmap Items     │   │
│  │ drawings     │    │ Manager          │    │   (link_url)        │   │
│  │              │    │                  │    │                     │   │
│  │ drawing_     │◄───│ DrawingUpload    │    │ ► Client Portal     │   │
│  │ revisions    │    │ Dialog           │    │   (filtered view)   │   │
│  │              │    │                  │    │                     │   │
│  │ drawing_     │◄───│ BulkImport       │    │ ► Contractor Portal │   │
│  │ categories   │    │ Dialog           │    │   (drawing access)  │   │
│  │              │    │                  │    │                     │   │
│  └──────────────┘    │ DrawingViewer    │    │ ► Handover Docs     │   │
│                      │                  │    │   (auto-sync)       │   │
│                      └──────────────────┘    └─────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Design

### 1. New Table: `project_drawings`
```sql
CREATE TABLE project_drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Drawing Identification (matching your register format)
  drawing_number TEXT NOT NULL,        -- e.g., "636/E/001", "636/E/407/L"
  drawing_title TEXT NOT NULL,         -- e.g., "SITE PLAN ELECTRICAL INSTALLATION"
  
  -- Categorisation
  category TEXT NOT NULL,              -- power, lighting, schematic, cctv, hvac, signage, tenant
  subcategory TEXT,                    -- portion_a, portion_b, entrance_1, etc.
  
  -- Tenant Association (for tenant-specific drawings)
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  shop_number TEXT,                    -- Denormalised for quick access
  
  -- File Information  
  file_url TEXT,
  file_path TEXT,
  file_name TEXT,
  file_size INTEGER,
  file_type TEXT,                      -- pdf, dwg, dxf
  
  -- Revision Control
  current_revision TEXT DEFAULT 'A',
  revision_date DATE,
  revision_notes TEXT,
  
  -- Status Tracking
  status TEXT DEFAULT 'draft',         -- draft, issued_for_construction, as_built, superseded
  issue_date DATE,
  
  -- Portal Visibility
  visible_to_client BOOLEAN DEFAULT false,
  visible_to_contractor BOOLEAN DEFAULT true,
  included_in_handover BOOLEAN DEFAULT false,
  
  -- Roadmap Integration
  roadmap_item_id UUID REFERENCES project_roadmap_items(id) ON DELETE SET NULL,
  
  -- Metadata
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. New Table: `drawing_revisions` (Version History)
```sql
CREATE TABLE drawing_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID NOT NULL REFERENCES project_drawings(id) ON DELETE CASCADE,
  
  revision TEXT NOT NULL,              -- A, B, C, etc.
  revision_date DATE NOT NULL,
  revision_notes TEXT,
  
  file_url TEXT,
  file_path TEXT,
  file_size INTEGER,
  
  revised_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3. Reference Data: `drawing_categories`
```sql
CREATE TABLE drawing_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_tenant_specific BOOLEAN DEFAULT false
);

-- Pre-populated categories based on your register:
INSERT INTO drawing_categories (code, name, icon, sort_order, is_tenant_specific) VALUES
('site', 'Site Plans', 'map', 1, false),
('power', 'Power Layouts', 'zap', 2, false),
('lighting', 'Lighting Layouts', 'lightbulb', 3, false),
('schematic', 'Schematic Distribution Diagrams', 'git-branch', 4, false),
('cctv', 'CCTV & Security', 'camera', 5, false),
('hvac', 'HVAC Layouts', 'wind', 6, false),
('signage', 'Signage Layouts', 'type', 7, false),
('details', 'Detail Drawings', 'layers', 8, false),
('tenant', 'Tenant Drawings', 'store', 9, true);
```

### 4. RLS Policies
```sql
-- Enable RLS
ALTER TABLE project_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_revisions ENABLE ROW LEVEL SECURITY;

-- Project members can CRUD drawings
CREATE POLICY "Project members can manage drawings"
ON project_drawings FOR ALL
USING (has_project_access(auth.uid(), project_id));

-- Client portal access (filtered by visible_to_client)
CREATE POLICY "Client portal can view visible drawings"
ON project_drawings FOR SELECT TO anon
USING (
  visible_to_client = true 
  AND has_valid_client_portal_token(project_id)
);

-- Contractor portal access (filtered by visible_to_contractor)
CREATE POLICY "Contractor portal can view drawings"
ON project_drawings FOR SELECT TO anon
USING (visible_to_contractor = true);
```

---

## Frontend Components

### 1. Main Drawing Register Page (`/dashboard/drawings`)

**DrawingRegisterPage.tsx**
- Grid/Table view toggle
- Search and filter by category, status, tenant
- Bulk operations (publish to portal, export PDF register)
- Statistics dashboard (counts by category, revision status)

**Key Features:**
- Sort by drawing number (natural sort: 636/E/001 before 636/E/100)
- Filter by category tabs (matching your register sections)
- Quick edit inline for revision updates
- Drag-drop reordering within categories

### 2. Drawing Upload Dialog

**UploadDrawingDialog.tsx**
- Single file or bulk upload
- Drawing number auto-parsing from filename
- Category auto-detection from drawing number pattern
- Tenant linking for 4xx series drawings
- Revision tracking

### 3. Bulk Import from Excel

**BulkImportDrawingsDialog.tsx**
- Parse Excel file matching your register format
- Preview import with validation
- Map columns to database fields
- Create placeholder entries for missing files

### 4. Drawing Viewer

**DrawingViewerDialog.tsx**
- PDF preview with zoom/pan
- Revision history sidebar
- Quick revision upload
- Markup/annotation capability (future)

### 5. Roadmap Integration

**RoadmapDrawingLink.tsx**
- Link picker component in AddRoadmapItemDialog
- Shows drawings for the project
- Creates link_url pointing to drawing detail view
- Auto-updates link_label with drawing number

---

## Portal Integrations

### Client Portal Updates

**ClientDrawingsSection.tsx**
- New tab in client portal: "Project Drawings"
- Filtered view showing only `visible_to_client = true`
- Organised by category
- Download individual or bulk
- Search by drawing number or title

### Contractor Portal Updates

**ContractorDrawingsTab.tsx**
- Enhanced documentation browser
- Separate "Drawings" section from general documents
- Category-based navigation
- Quick filter for tenant-specific drawings
- Print-ready drawing register export

### Handover Documents Sync

**Auto-sync trigger:**
```sql
CREATE OR REPLACE FUNCTION sync_drawing_to_handover()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.included_in_handover = true AND (OLD.included_in_handover IS NULL OR OLD.included_in_handover = false) THEN
    INSERT INTO handover_documents (
      project_id, document_name, document_type, file_url, 
      source_type, source_id, notes
    ) VALUES (
      NEW.project_id,
      NEW.drawing_number || ' - ' || NEW.drawing_title,
      CASE NEW.category 
        WHEN 'power' THEN 'as_built_drawing'
        WHEN 'lighting' THEN 'as_built_drawing'
        ELSE 'electrical_drawings'
      END,
      NEW.file_url,
      'drawing',
      NEW.id,
      'Rev ' || NEW.current_revision
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## PDF Export: Drawing Register

Using your existing **pdfmake** infrastructure with branded cover page:

**DrawingRegisterPDFExport.tsx**
- Professional cover page with project branding
- Table of contents by category
- Main register table matching your Excel format
- Summary statistics
- Revision log appendix

---

## Implementation Phases

### Phase 1: Database & Core UI (Week 1)
1. Create database tables with migrations
2. Implement DrawingRegisterPage with basic CRUD
3. Add UploadDrawingDialog for single uploads
4. Create drawing category management

### Phase 2: Bulk Import & Roadmap (Week 2)
1. Build BulkImportDrawingsDialog
2. Integrate with roadmap linking
3. Add revision history tracking
4. Implement drawing number auto-parsing

### Phase 3: Portal Integrations (Week 3)
1. Add ClientDrawingsSection to client portal
2. Enhance ContractorDocumentStatus with drawings
3. Implement handover sync trigger
4. Add PDF register export

### Phase 4: Polish & Advanced Features (Week 4)
1. Drawing viewer with markup
2. Bulk operations (status change, portal visibility)
3. Email notifications for new revisions
4. Analytics dashboard

---

## Technical Considerations

### File Storage
- Use existing `handover-documents` bucket with `/drawings/` prefix
- Path structure: `{project_id}/drawings/{category}/{drawing_number}-{revision}.{ext}`
- Support PDF, DWG, DXF file types

### Drawing Number Parsing
Regex patterns for your format:
```typescript
// Standard: 636/E/001
const STANDARD_PATTERN = /^(\d+)\/([A-Z])\/(\d+)$/;

// With suffix: 636/E/407/L, 636/E/407/P1
const SUFFIX_PATTERN = /^(\d+)\/([A-Z])\/(\d+)\/([A-Z]\d?)$/;

// Tenant with letter: 636/E/4CM, 636/E/4PA/L
const TENANT_PATTERN = /^(\d+)\/([A-Z])\/4([A-Z]+)(?:\/([A-Z]))?$/;
```

### Category Auto-Detection
```typescript
const detectCategory = (drawingNumber: string): string => {
  const num = parseInt(drawingNumber.split('/')[2]);
  if (num >= 1 && num < 100) return 'site';
  if (num >= 100 && num < 200) return 'power';
  if (num >= 200 && num < 300) return 'lighting';
  if (num >= 300 && num < 400) return 'schematic';
  if (num >= 400 && num < 500) return 'tenant';
  if (num >= 600 && num < 700) return 'cctv';
  if (num >= 700 && num < 800) return 'hvac';
  if (num >= 800 && num < 900) return 'signage';
  return 'other';
};
```

---

## Success Metrics

1. **Drawing Register Completeness**: % of drawings uploaded vs. registered
2. **Revision Currency**: Average age of latest revisions
3. **Portal Accessibility**: Drawings accessible to clients/contractors
4. **Roadmap Coverage**: % of documentation roadmap items linked to drawings
5. **Handover Readiness**: % of drawings marked for handover

---

## Future Enhancements

1. **AI-powered drawing analysis**: Extract equipment lists from drawings
2. **CAD file preview**: Native DWG/DXF viewer integration
3. **Markup & redlining**: Collaborative annotation tools
4. **Drawing comparison**: Side-by-side revision comparison
5. **Mobile access**: Progressive web app for site access
6. **QR code linking**: Physical drawing sheets link to digital versions
