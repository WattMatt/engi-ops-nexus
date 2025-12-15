export interface RoadmapDeliverable {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoadmapPhase {
  id: string;
  phase: number;
  title: string;
  description: string;
  duration: string;
  priority: 'critical' | 'high' | 'medium' | 'enhancement';
  status: 'complete' | 'in-progress' | 'pending' | 'future';
  deliverables: RoadmapDeliverable[];
  prompt: string;
}

export interface GrowthSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export const roadmapPhases: RoadmapPhase[] = [
  {
    id: 'phase-1',
    phase: 1,
    title: 'Foundation & Core Infrastructure',
    description: 'Database schema design, lighting library, and overview dashboard with core functionality.',
    duration: '2-3 weeks',
    priority: 'critical',
    status: 'complete',
    deliverables: [
      { id: '1-1', title: 'Database Schema Design (lighting_fittings, lighting_spec_sheets, project_lighting_schedules, lighting_comparisons)', completed: true },
      { id: '1-2', title: 'Lighting Library Tab with CRUD operations', completed: true },
      { id: '1-3', title: 'Search & Filter (by type, manufacturer, wattage, color temp, IP rating)', completed: true },
      { id: '1-4', title: 'Categories System (Downlights, Panel Lights, Linear, Floodlights, etc.)', completed: true },
      { id: '1-5', title: 'CSV/Excel Import for bulk fitting data', completed: true },
      { id: '1-6', title: 'Overview Dashboard with KPI cards and charts', completed: true },
      { id: '1-7', title: 'Route and navigation menu integration', completed: true },
    ],
    prompt: `Implement Phase 1 of the Lighting Module - Foundation & Core Infrastructure:

## Database Schema
Create the following tables with proper RLS policies:

\`\`\`sql
-- Lighting Fittings (Master Library)
CREATE TABLE public.lighting_fittings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  fitting_code TEXT NOT NULL,
  manufacturer TEXT,
  model_name TEXT NOT NULL,
  fitting_type TEXT NOT NULL, -- downlight, panel, linear, floodlight, decorative, emergency, exit_sign
  wattage NUMERIC,
  lumen_output NUMERIC,
  color_temperature INTEGER, -- in Kelvin (2700K, 3000K, 4000K, etc.)
  cri INTEGER, -- Color Rendering Index (80-100)
  beam_angle INTEGER, -- in degrees
  ip_rating TEXT, -- IP20, IP44, IP65, etc.
  ik_rating TEXT, -- IK08, IK10, etc.
  lifespan_hours INTEGER,
  dimensions TEXT, -- JSON or formatted string
  weight NUMERIC,
  supply_cost NUMERIC DEFAULT 0,
  install_cost NUMERIC DEFAULT 0,
  category TEXT,
  subcategory TEXT,
  is_dimmable BOOLEAN DEFAULT false,
  driver_type TEXT, -- constant current, constant voltage, DALI, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Spec Sheets
CREATE TABLE public.lighting_spec_sheets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fitting_id UUID REFERENCES public.lighting_fittings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  parsed_data JSONB,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project Lighting Schedules
CREATE TABLE public.project_lighting_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  tenant_id UUID REFERENCES public.tenants(id),
  zone_name TEXT,
  fitting_id UUID REFERENCES public.lighting_fittings(id),
  quantity INTEGER DEFAULT 1,
  total_wattage NUMERIC,
  total_lumens NUMERIC,
  notes TEXT,
  approval_status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Comparisons
CREATE TABLE public.lighting_comparisons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  comparison_name TEXT NOT NULL,
  fitting_ids UUID[] NOT NULL,
  comparison_criteria JSONB,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.lighting_fittings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_spec_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_lighting_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lighting_comparisons ENABLE ROW LEVEL SECURITY;

-- Create appropriate RLS policies for authenticated users
\`\`\`

## Components to Build

### 1. LightingLibraryTab.tsx
- DataTable with all fittings from lighting_fittings table
- Add/Edit/Delete fitting dialogs
- Columns: Code, Manufacturer, Model, Type, Wattage, Lumens, Color Temp, CRI, IP Rating, Costs
- Filter dropdowns for: Type, Manufacturer, Color Temperature range
- Search by model name or code
- Export to CSV functionality

### 2. LightingOverview.tsx (Dashboard)
- KPI Cards:
  - Total Fittings in Library
  - Average Cost per Fitting
  - Total Project Fittings (from schedules)
  - Energy Summary (total wattage)
- Charts:
  - Fitting Distribution by Type (pie chart)
  - Cost Breakdown by Category (bar chart)
  - Color Temperature Distribution
- Recent Activity feed

### 3. AddFittingForm.tsx / EditFittingForm.tsx
- Form fields for all fitting properties
- Category/Subcategory dropdowns
- Cost inputs (supply + install)
- Validation using zod

### 4. Categories
Implement these default categories:
- Downlights (LED, Halogen, Recessed, Surface)
- Panel Lights (Recessed, Surface, Suspended)
- Linear (Battens, Strip Lights, Trunking)
- Floodlights (Exterior, Interior, Emergency)
- Decorative (Pendants, Wall Lights, Chandeliers)
- Emergency (Exit Signs, Emergency Packs, Combined)
- Outdoor (Bollards, Post Tops, Wall Packs)

### 5. Import/Export
- CSV import with column mapping
- Template download for correct format
- Bulk update capability`,
  },
  {
    id: 'phase-2',
    phase: 2,
    title: 'Spec Sheet Management',
    description: 'Upload system for specification sheets with AI-powered data extraction and library integration.',
    duration: '2 weeks',
    priority: 'high',
    status: 'complete',
    deliverables: [
      { id: '2-1', title: 'File Upload System (PDF, Images, Word docs)', completed: true },
      { id: '2-2', title: 'Supabase Storage bucket for spec sheets', completed: true },
      { id: '2-3', title: 'In-app document preview', completed: true },
      { id: '2-4', title: 'AI-powered data extraction (using google/gemini-2.5-flash)', completed: true },
      { id: '2-5', title: 'Auto-parse specs from uploaded PDFs', completed: true },
      { id: '2-6', title: 'Confidence scoring for extracted data', completed: true },
      { id: '2-7', title: 'One-click add parsed fitting to library', completed: true },
      { id: '2-8', title: 'Duplicate detection and warnings', completed: true },
    ],
    prompt: `Implement Phase 2 of the Lighting Module - Spec Sheet Management:

## Storage Setup
Create a Supabase storage bucket:
\`\`\`sql
INSERT INTO storage.buckets (id, name, public) VALUES ('lighting-spec-sheets', 'lighting-spec-sheets', false);

-- Storage policies for authenticated users
CREATE POLICY "Users can upload spec sheets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');
CREATE POLICY "Users can view spec sheets" ON storage.objects FOR SELECT USING (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own spec sheets" ON storage.objects FOR DELETE USING (bucket_id = 'lighting-spec-sheets' AND auth.role() = 'authenticated');
\`\`\`

## Components to Build

### 1. SpecSheetUploadTab.tsx
- Drag-and-drop file upload zone
- Support for PDF, JPG, PNG, DOCX files
- Upload progress indicator
- File list with preview thumbnails
- Link spec sheet to existing fitting or create new

### 2. SpecSheetViewer.tsx
- In-app PDF viewer using react-pdf
- Image viewer for JPG/PNG
- Zoom and pan controls
- Download original file option

### 3. AI Data Extraction (Edge Function)
Create an edge function \`extract-lighting-specs\` that:
- Accepts uploaded file (base64 or URL)
- Uses google/gemini-2.5-flash via Lovable AI
- Extracts: manufacturer, model, wattage, lumens, color temp, CRI, beam angle, IP rating, dimensions
- Returns structured JSON with confidence scores

\`\`\`typescript
// Edge function structure
const extractionPrompt = \`
Analyze this lighting specification sheet and extract the following data:
- Manufacturer name
- Model name/number
- Wattage (W)
- Lumen output (lm)
- Color temperature (K)
- CRI (Color Rendering Index)
- Beam angle (degrees)
- IP rating
- IK rating
- Dimensions (L x W x H)
- Weight
- Lifespan (hours)
- Dimmable (yes/no)
- Driver type

Return as JSON with confidence scores (0-1) for each field.
\`;
\`\`\`

### 4. ExtractionReviewDialog.tsx
- Display extracted data in editable form
- Show confidence indicators (green >0.8, yellow 0.5-0.8, red <0.5)
- Allow manual corrections
- "Add to Library" button
- "Re-extract" button if results are poor

### 5. Duplicate Detection
- Before adding, check for existing fittings with same:
  - Manufacturer + Model combination
  - Similar wattage/lumens within 5%
- Show warning dialog with existing matches
- Option to update existing or create new

### 6. Batch Processing
- Upload multiple spec sheets at once
- Queue-based processing
- Progress indicator for batch
- Summary of extraction results`,
  },
  {
    id: 'phase-3',
    phase: 3,
    title: 'Fitting Comparison & Analysis',
    description: 'Side-by-side comparison tool with cost and energy efficiency analysis features.',
    duration: '2 weeks',
    priority: 'high',
    status: 'future',
    deliverables: [
      { id: '3-1', title: 'Side-by-side comparison tool (2-6 fittings)', completed: false },
      { id: '3-2', title: 'Visual comparison matrix with highlighted differences', completed: false },
      { id: '3-3', title: 'Save comparisons for future reference', completed: false },
      { id: '3-4', title: 'Total cost calculation (Supply + Install)', completed: false },
      { id: '3-5', title: 'Project cost projection based on quantities', completed: false },
      { id: '3-6', title: 'Cost per lumen efficiency metric', completed: false },
      { id: '3-7', title: 'Energy consumption estimates (kWh)', completed: false },
      { id: '3-8', title: 'Monthly/annual running cost calculations', completed: false },
    ],
    prompt: `Implement Phase 3 of the Lighting Module - Fitting Comparison & Analysis:

## Components to Build

### 1. FittingComparisonTab.tsx
Main comparison interface with:
- Multi-select fitting picker (checkboxes in library)
- "Compare Selected" button (min 2, max 6)
- Saved comparisons list
- Quick compare from recent fittings

### 2. ComparisonMatrix.tsx
Side-by-side comparison view:
\`\`\`
| Property        | Fitting A    | Fitting B    | Fitting C    |
|-----------------|--------------|--------------|--------------|
| Manufacturer    | Philips      | LEDVANCE     | Signify      |
| Model           | CoreLine     | Panel Pro    | SmartBright  |
| Wattage         | 32W ✓        | 40W          | 36W          |
| Lumens          | 3400lm       | 4000lm ✓     | 3600lm       |
| Efficiency      | 106 lm/W ✓   | 100 lm/W     | 100 lm/W     |
| Color Temp      | 4000K        | 4000K        | 4000K        |
| CRI             | 80           | 80           | 90 ✓         |
| Supply Cost     | R450 ✓       | R520         | R680         |
| Install Cost    | R150         | R150         | R150         |
| Total Cost      | R600 ✓       | R670         | R830         |
| Cost/1000lm     | R176 ✓       | R168         | R231         |
\`\`\`

Features:
- Color-code best values (green checkmark)
- Highlight significant differences
- Collapsible sections (General, Performance, Costs, Physical)
- Export comparison to PDF

### 3. SaveComparisonDialog.tsx
- Name the comparison
- Add notes
- Select project to associate with
- Save to lighting_comparisons table

### 4. CostAnalysisPanel.tsx
Calculate and display:
- Per-fitting costs (supply + install)
- Cost per lumen (R/1000lm)
- Project cost projection:
  \`\`\`
  Quantity input: [____]
  
  | Fitting   | Unit Cost | Total Cost | Savings vs A |
  |-----------|-----------|------------|--------------|
  | Fitting A | R600      | R30,000    | -            |
  | Fitting B | R670      | R33,500    | -R3,500      |
  | Fitting C | R830      | R41,500    | -R11,500     |
  \`\`\`

### 5. EnergyAnalysisPanel.tsx
Calculate and display:
- Daily operating hours input
- Monthly energy consumption:
  \`kWh = (Wattage × Quantity × Hours × 30) / 1000\`
- Annual energy consumption
- Running cost (using configurable R/kWh rate)
- CO2 emissions estimate
- Payback period for more efficient option

\`\`\`
| Fitting   | Wattage | Monthly kWh | Annual Cost | 5-Year Total |
|-----------|---------|-------------|-------------|--------------|
| Fitting A | 32W     | 192 kWh     | R4,608      | R23,040      |
| Fitting B | 40W     | 240 kWh     | R5,760      | R28,800      |
| Fitting C | 36W     | 216 kWh     | R5,184      | R25,920      |
\`\`\`

### 6. EfficiencyMetrics.tsx
Display calculated metrics:
- Luminous efficacy (lm/W)
- Cost per lumen (R/1000lm)
- Total cost of ownership (5-year)
- Energy efficiency rating (A-G scale based on lm/W)

### 7. Settings for Analysis
Add to LightingSettingsTab:
- Default electricity rate (R/kWh)
- Default operating hours per day
- Analysis period (years)
- Include VAT toggle`,
  },
  {
    id: 'phase-4',
    phase: 4,
    title: 'Reporting & Documentation',
    description: 'Comprehensive report generator with PDF export, templates, and client portal integration.',
    duration: '2-3 weeks',
    priority: 'high',
    status: 'future',
    deliverables: [
      { id: '4-1', title: 'Comprehensive lighting report generator', completed: false },
      { id: '4-2', title: 'Per-tenant lighting schedules', completed: false },
      { id: '4-3', title: 'Compiled specification sheets section', completed: false },
      { id: '4-4', title: 'Approval tracking per area/tenant', completed: false },
      { id: '4-5', title: 'Professional PDF export with cover page and TOC', completed: false },
      { id: '4-6', title: 'Embedded images and charts in reports', completed: false },
      { id: '4-7', title: 'Reusable report templates', completed: false },
      { id: '4-8', title: 'Client portal integration with approval workflow', completed: false },
    ],
    prompt: `Implement Phase 4 of the Lighting Module - Reporting & Documentation:

## Components to Build

### 1. LightingReportTab.tsx
Main report generation interface:
- Report type selector:
  - Full Project Lighting Report
  - Tenant Schedule Report
  - Specification Summary
  - Comparison Report
- Include/exclude sections checkboxes
- Generate and preview before export

### 2. LightingScheduleSection.tsx
Per-tenant/zone schedule view:
\`\`\`
TENANT: Shop 1 - ABC Retail (125m²)
Zone: Sales Floor

| Item | Fitting Code | Description           | Qty | Wattage | Total W | Status   |
|------|-------------|-----------------------|-----|---------|---------|----------|
| 1    | DL-001      | LED Downlight 15W     | 24  | 15W     | 360W    | Approved |
| 2    | PL-002      | Panel Light 40W       | 6   | 40W     | 240W    | Pending  |
| 3    | EM-001      | Emergency Exit Sign   | 2   | 5W      | 10W     | Approved |

SUBTOTAL: 32 fittings | 610W | R18,450
\`\`\`

### 3. SpecificationSummarySection.tsx
Compiled spec sheets for report:
- Group by fitting type
- Include key specs in table format
- Link to full spec sheet PDFs
- Image/photo of each fitting

### 4. ApprovalTrackingSection.tsx
Track approval status:
- Status badges per tenant/zone
- Approval history log
- Sign-off capability
- Comments per section

### 5. PDF Report Generator
Using existing jspdf + jspdf-autotable:

\`\`\`typescript
// Report structure
interface LightingReportConfig {
  includesCoverPage: boolean;
  includeTableOfContents: boolean;
  sections: {
    executiveSummary: boolean;
    scheduleByTenant: boolean;
    scheduleByZone: boolean;
    specificationSheets: boolean;
    costSummary: boolean;
    energyAnalysis: boolean;
    approvalStatus: boolean;
    comparisons: boolean;
  };
  branding: {
    companyLogo: string;
    clientLogo: string;
    headerColor: string;
  };
}
\`\`\`

Features:
- Cover page with project details and logos
- Table of contents with page numbers
- Section headers with consistent styling
- Tables for schedules and costs
- Charts converted to images
- Appendix with full spec sheets

### 6. ReportTemplateManager.tsx
- Save report configurations as templates
- Default templates:
  - Full Project Report
  - Client Presentation
  - Internal Review
  - Tender Submission
- Edit/delete templates

### 7. Client Portal Integration
Add to existing client portal:
- Lighting Schedule tab
- Interactive schedule view (read-only)
- Approval workflow:
  - Review button per section
  - Approve/Request Changes options
  - Comment field
  - Digital signature capture
- Download approved schedules

### 8. Database additions
\`\`\`sql
-- Lighting Report Templates
CREATE TABLE public.lighting_report_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lighting Approvals
CREATE TABLE public.lighting_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  schedule_id UUID REFERENCES public.project_lighting_schedules(id),
  tenant_id UUID REFERENCES public.tenants(id),
  status TEXT DEFAULT 'pending', -- pending, approved, changes_requested
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  comments TEXT,
  signature_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
\`\`\``,
  },
  {
    id: 'phase-5',
    phase: 5,
    title: 'Advanced Features',
    description: 'Floor plan integration, 3D visualization, photometric analysis, and supplier integrations.',
    duration: 'Ongoing',
    priority: 'enhancement',
    status: 'future',
    deliverables: [
      { id: '5-1', title: 'Floor plan integration - drop fittings on plan', completed: false },
      { id: '5-2', title: 'Auto-calculate quantities from placed fittings', completed: false },
      { id: '5-3', title: 'Zone assignment for fittings', completed: false },
      { id: '5-4', title: '3D light cone preview', completed: false },
      { id: '5-5', title: 'Lux simulation and visual distribution', completed: false },
      { id: '5-6', title: 'IES file support for photometric data', completed: false },
      { id: '5-7', title: 'Lux level calculations and compliance checks', completed: false },
      { id: '5-8', title: 'Supplier quote requests integration', completed: false },
      { id: '5-9', title: 'Price sync with supplier databases', completed: false },
    ],
    prompt: `Implement Phase 5 of the Lighting Module - Advanced Features:

## 5.1 Floor Plan Integration

### FloorPlanLightingOverlay.tsx
Integrate with existing FloorPlan module:
- Toggle "Lighting Mode" on floor plan
- Fitting placement toolbar:
  - Select fitting from library
  - Click to place on plan
  - Drag to reposition
  - Right-click to remove
- Fitting symbol customization by type
- Quantity auto-calculation from placed fittings
- Zone boundary detection

\`\`\`typescript
interface PlacedFitting {
  id: string;
  fittingId: string;
  x: number;
  y: number;
  rotation: number;
  zoneId: string | null;
  tenantId: string | null;
}
\`\`\`

### LightingLayerControls.tsx
- Show/hide lighting layer
- Filter by fitting type
- Color-code by status (approved/pending)
- Export layout to schedule

## 5.2 3D Visualization

### LightConePreview.tsx
Using @react-three/fiber and @react-three/drei:
- 3D representation of light beam
- Adjustable:
  - Beam angle
  - Mounting height
  - Color temperature (warm/cool visualization)
- Light spread preview on floor plane

### LuxSimulation.tsx
- Input room dimensions
- Place fittings in 2D grid
- Calculate lux levels at work plane height
- Heat map visualization:
  - Green: Adequate lux
  - Yellow: Under-lit
  - Red: Over-lit
- Export lux calculation report

## 5.3 Photometric Analysis

### IESFileParser.tsx
Support for IES (Illuminating Engineering Society) files:
- Upload .ies files
- Parse photometric data
- Extract:
  - Candela distribution
  - Lumens
  - Mounting type
  - Lamp orientation
- Store parsed data with fitting

### PhotometricReport.tsx
- Polar candela distribution chart
- Utilization curves
- Spacing/mounting height ratios
- Recommended spacing calculations

### ComplianceChecker.tsx
Check against standards:
- SANS 10114 (Office lighting)
- SANS 10400-XA (Energy efficiency)
- Display required vs actual lux levels
- Generate compliance report

## 5.4 Supplier Integration

### SupplierQuoteRequest.tsx
- Select fittings for quote
- Enter quantities
- Select suppliers from database
- Generate RFQ document
- Email integration (if available)

### SupplierPriceSync.tsx
Future capability:
- API integration with suppliers
- Automatic price updates
- Stock availability checking
- Lead time information

### SupplierManagement.tsx
- Supplier database
- Contact information
- Product categories
- Preferred supplier flag
- Price history tracking

## Database Additions

\`\`\`sql
-- Floor Plan Lighting Placements
CREATE TABLE public.floor_plan_lighting (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  floor_plan_id UUID NOT NULL,
  fitting_id UUID NOT NULL REFERENCES public.lighting_fittings(id),
  x_position NUMERIC NOT NULL,
  y_position NUMERIC NOT NULL,
  rotation NUMERIC DEFAULT 0,
  zone_id UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  mounting_height NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- IES Photometric Data
CREATE TABLE public.lighting_photometric_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fitting_id UUID NOT NULL REFERENCES public.lighting_fittings(id),
  ies_file_path TEXT,
  candela_data JSONB,
  utilization_data JSONB,
  parsed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Suppliers
CREATE TABLE public.lighting_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  categories TEXT[],
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote Requests
CREATE TABLE public.lighting_quote_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id),
  supplier_id UUID REFERENCES public.lighting_suppliers(id),
  items JSONB NOT NULL, -- array of {fittingId, quantity}
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMP WITH TIME ZONE,
  response_received_at TIMESTAMP WITH TIME ZONE,
  quoted_total NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
\`\`\``,
  },
];

export const growthSuggestions: GrowthSuggestion[] = [
  {
    id: 'growth-1',
    title: 'AI Quote Generation',
    description: 'Automatically generate professional quotations from lighting schedules with custom terms and conditions.',
    prompt: `Implement AI Quote Generation for Lighting Module:

Create an automated quote generation system that:

1. QuoteGeneratorDialog.tsx
- Select tenant/zone schedules to include
- Add markup percentage
- Include/exclude items
- Terms and conditions editor
- Preview before generating

2. Quote Template
- Professional letterhead with company branding
- Itemized fitting list with quantities and prices
- Subtotals per section
- Markup and VAT calculations
- Validity period
- Payment terms
- Acceptance signature block

3. AI Enhancement (using google/gemini-2.5-flash)
- Generate professional cover letter
- Suggest competitive pricing based on market data
- Highlight value propositions
- Create executive summary

4. Database
\`\`\`sql
CREATE TABLE public.lighting_quotes (
  id UUID PRIMARY KEY,
  project_id UUID,
  quote_number TEXT,
  client_name TEXT,
  items JSONB,
  subtotal NUMERIC,
  markup_percent NUMERIC,
  vat_amount NUMERIC,
  total NUMERIC,
  valid_until DATE,
  terms TEXT,
  status TEXT, -- draft, sent, accepted, rejected
  created_at TIMESTAMP WITH TIME ZONE
);
\`\`\``,
  },
  {
    id: 'growth-2',
    title: 'Manufacturer Portal Integration',
    description: 'Direct API integrations with major lighting manufacturers for real-time product data and pricing.',
    prompt: `Implement Manufacturer Portal Integration:

Create integrations with major lighting manufacturers:

1. Supported Manufacturers
- Philips/Signify
- LEDVANCE/OSRAM
- Beka Schréder
- Radiant Lighting
- Eurolux

2. ManufacturerIntegration.tsx
- API key configuration per manufacturer
- Sync product catalogs
- Real-time pricing updates
- Stock availability checking
- Lead time information

3. ProductSearch.tsx
- Unified search across manufacturers
- Filter by specs, price, availability
- Compare across manufacturers
- Direct import to library

4. Edge Functions
- \`sync-manufacturer-products\`: Scheduled sync of product data
- \`check-product-availability\`: Real-time stock check
- \`get-current-pricing\`: Price lookup with caching

5. Database
\`\`\`sql
CREATE TABLE public.manufacturer_integrations (
  id UUID PRIMARY KEY,
  manufacturer_name TEXT,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT,
  product_count INTEGER
);
\`\`\``,
  },
  {
    id: 'growth-3',
    title: 'BIM/CAD Export',
    description: 'Export lighting layouts and schedules to Revit, AutoCAD, and IFC formats for BIM integration.',
    prompt: `Implement BIM/CAD Export for Lighting Module:

Create export capabilities for BIM software:

1. Supported Formats
- Revit (.rvt family files)
- AutoCAD (.dwg with blocks)
- IFC (Industry Foundation Classes)
- CSV for DIALux/Relux

2. BIMExportDialog.tsx
- Select export format
- Choose coordinate system
- Include/exclude data fields
- Mapping configuration
- Preview export

3. Export Data Structure
\`\`\`typescript
interface BIMFitting {
  id: string;
  familyName: string;
  typeName: string;
  x: number;
  y: number;
  z: number; // mounting height
  rotation: number;
  parameters: {
    wattage: number;
    lumens: number;
    colorTemp: number;
    // ... other parameters
  };
}
\`\`\`

4. Revit Family Generator
- Create basic Revit family templates
- Embed electrical parameters
- Include photometric data reference

5. AutoCAD Block Library
- Standard 2D symbols
- Layer assignments
- Attribute data

6. IFC Export
- Using web-ifc library (already installed)
- IfcLightFixture entities
- Property sets for electrical data`,
  },
  {
    id: 'growth-4',
    title: 'Mobile Field Verification App',
    description: 'Mobile app for on-site lighting verification, commissioning, and punch list management.',
    prompt: `Implement Mobile Field Verification for Lighting:

Create a mobile-friendly interface for field work:

1. MobileVerificationView.tsx (responsive)
- Simplified interface for tablets/phones
- Large touch targets
- Offline capability

2. Features
- View lighting schedule by zone
- Mark fittings as:
  - Installed
  - Verified working
  - Defective
  - Missing
- Capture photos of installations
- Add punch list items
- GPS location tagging

3. VerificationChecklist.tsx
- Per-fitting checklist:
  - Mounting secure
  - Correct fitting installed
  - Working properly
  - Lens/diffuser intact
  - Emergency function tested
- Sign-off per zone

4. PunchListManager.tsx
- Create punch items from field
- Assign to contractor
- Priority levels
- Photo attachments
- Status tracking
- Close-out workflow

5. Sync System
- Offline data storage (IndexedDB)
- Background sync when online
- Conflict resolution
- Last sync timestamp

6. Database
\`\`\`sql
CREATE TABLE public.lighting_verifications (
  id UUID PRIMARY KEY,
  schedule_item_id UUID,
  status TEXT, -- installed, verified, defective, missing
  verified_by UUID,
  verified_at TIMESTAMP WITH TIME ZONE,
  photos TEXT[],
  notes TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC
);

CREATE TABLE public.lighting_punch_items (
  id UUID PRIMARY KEY,
  project_id UUID,
  fitting_id UUID,
  description TEXT,
  priority TEXT,
  assigned_to TEXT,
  status TEXT,
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);
\`\`\``,
  },
  {
    id: 'growth-5',
    title: 'Carbon Calculator & Sustainability',
    description: 'Calculate carbon footprint, energy savings, and sustainability metrics for lighting choices.',
    prompt: `Implement Carbon Calculator & Sustainability Metrics:

Create sustainability analysis tools:

1. CarbonCalculator.tsx
- Calculate CO2 emissions from energy use
- Formula: kWh × Grid Emission Factor
- South African grid factor: ~0.9 kg CO2/kWh
- Annual and lifetime emissions

2. SustainabilityDashboard.tsx
- Carbon footprint summary
- Energy savings vs baseline
- Equivalent metrics:
  - Trees planted equivalent
  - Cars off road equivalent
  - Households powered equivalent
- Progress toward green building targets

3. ComparisonAnalysis.tsx
- Compare LED vs traditional options
- Energy savings calculation
- Carbon reduction
- Payback period
- Total cost of ownership

4. GreenBuildingCompliance.tsx
- LEED points calculator
- Green Star SA credits
- EDGE certification metrics
- SANS 10400-XA compliance

5. ReportSection
- Sustainability report section
- Export for green building submissions
- Year-over-year comparisons

6. Configuration
\`\`\`typescript
interface SustainabilityConfig {
  gridEmissionFactor: number; // kg CO2/kWh
  electricityRate: number; // R/kWh
  baselineWattsPerSqm: number; // comparison baseline
  operatingHoursPerYear: number;
  projectLifespanYears: number;
}
\`\`\`

7. Calculations
\`\`\`typescript
// Annual energy
const annualKWh = (totalWatts * hoursPerYear) / 1000;

// Carbon emissions
const annualCO2 = annualKWh * emissionFactor;

// Energy savings vs baseline
const baselineKWh = (area * baselineWpM2 * hoursPerYear) / 1000;
const savingsKWh = baselineKWh - annualKWh;
const savingsPercent = (savingsKWh / baselineKWh) * 100;

// Cost savings
const annualSavings = savingsKWh * electricityRate;

// Payback
const additionalCost = ledCost - traditionalCost;
const paybackYears = additionalCost / annualSavings;
\`\`\``,
  },
  {
    id: 'growth-6',
    title: 'Multi-Project Analytics',
    description: 'Cross-project insights, benchmarking, and trend analysis across all lighting projects.',
    prompt: `Implement Multi-Project Analytics for Lighting:

Create analytics dashboard for portfolio-wide insights:

1. PortfolioAnalytics.tsx
- Aggregate data across all projects
- Key metrics:
  - Total fittings across portfolio
  - Average cost per m²
  - Most used fittings
  - Preferred manufacturers
  - Average energy density (W/m²)

2. BenchmarkingView.tsx
- Compare projects against each other
- Industry benchmarks
- Cost per m² by building type
- Energy efficiency comparisons
- Identify outliers

3. TrendAnalysis.tsx
- Price trends over time
- Manufacturer preference shifts
- Technology adoption (LED %)
- Efficiency improvements

4. Charts & Visualizations
- Portfolio cost breakdown (pie)
- Project comparison (bar)
- Price trends (line)
- Efficiency scatter plot
- Geographic distribution (map)

5. ReportBuilder.tsx
- Custom analytics reports
- Select metrics and timeframe
- Export to PDF/Excel
- Schedule automated reports

6. Database Views
\`\`\`sql
CREATE VIEW lighting_portfolio_summary AS
SELECT 
  COUNT(DISTINCT project_id) as project_count,
  COUNT(*) as total_fittings,
  SUM(supply_cost + install_cost) as total_cost,
  AVG(wattage) as avg_wattage,
  AVG(lumen_output / NULLIF(wattage, 0)) as avg_efficacy
FROM lighting_fittings
JOIN project_lighting_schedules ON ...;

CREATE VIEW lighting_manufacturer_stats AS
SELECT 
  manufacturer,
  COUNT(*) as fitting_count,
  AVG(supply_cost) as avg_cost,
  COUNT(DISTINCT project_id) as projects_used
FROM lighting_fittings
GROUP BY manufacturer;
\`\`\`

7. Insights Engine (AI)
Using google/gemini-2.5-flash:
- Generate natural language insights
- Identify cost-saving opportunities
- Recommend standardization
- Flag anomalies`,
  },
];

export const getStatusColor = (status: RoadmapPhase['status']) => {
  switch (status) {
    case 'complete':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'in-progress':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'future':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

export const getStatusIcon = (status: RoadmapPhase['status']) => {
  switch (status) {
    case 'complete':
      return '✅';
    case 'in-progress':
      return '🔄';
    case 'pending':
      return '⏳';
    case 'future':
      return '🔮';
    default:
      return '📋';
  }
};

export const getPriorityColor = (priority: RoadmapPhase['priority']) => {
  switch (priority) {
    case 'critical':
      return 'bg-red-500/20 text-red-400';
    case 'high':
      return 'bg-orange-500/20 text-orange-400';
    case 'medium':
      return 'bg-blue-500/20 text-blue-400';
    case 'enhancement':
      return 'bg-purple-500/20 text-purple-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
};
