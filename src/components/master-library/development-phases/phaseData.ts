export interface PhaseChecklistItem {
  id: string;
  label: string;
}

export interface DevelopmentPhase {
  id: string;
  number: number;
  title: string;
  goal: string;
  prompt: string;
  checklist: PhaseChecklistItem[];
  verificationQuery: string;
  dependencies: string[];
}

export const developmentPhases: DevelopmentPhase[] = [
  {
    id: "phase-1-upload",
    number: 1,
    title: "BOQ Upload & File Parsing",
    goal: "Upload Excel/CSV files and correctly parse sheets/columns",
    prompt: `PHASE 1: BOQ Upload & File Parsing

OBJECTIVE: Enable users to upload BOQ Excel/CSV files and parse them correctly.

REQUIREMENTS:
1. Accept .xlsx, .xls, .csv files up to 10MB
2. Parse all sheets in the workbook
3. Display sheet names with row counts
4. Allow sheet selection (multi-select)
5. Auto-detect columns: Item Code, Description, Unit, Quantity, Rate, Amount
6. Show preview of first 10 rows per sheet

COLUMN DETECTION PATTERNS:
- Item Code: /item|code|no\\.?|ref/i
- Description: /desc|name|particular/i  
- Unit: /unit|uom/i
- Quantity: /qty|quantity/i
- Rate: /rate|price|cost/i
- Amount: /amount|total|value/i

ERROR HANDLING:
- Invalid file type → Show toast error
- Empty file → Show "No data found" message
- No headers detected → Suggest manual column mapping`,
    checklist: [
      { id: "p1-1", label: "Upload .xlsx file → All sheets listed" },
      { id: "p1-2", label: "Upload .csv file → Single sheet parsed" },
      { id: "p1-3", label: "Invalid file (.pdf) → Error message shown" },
      { id: "p1-4", label: "Empty file → Appropriate message" },
      { id: "p1-5", label: "Column detection works for standard BOQ" },
    ],
    verificationQuery: `SELECT id, file_name, status, total_items_extracted, created_at
FROM boq_uploads 
ORDER BY created_at DESC 
LIMIT 5;`,
    dependencies: [],
  },
  {
    id: "phase-2-extraction",
    number: 2,
    title: "AI Data Extraction & Cleaning",
    goal: "Extract structured data from raw BOQ content with AI",
    prompt: `PHASE 2: AI Data Extraction & Cleaning

ROLE: Construction Data Analyst and Quantity Surveyor

TASK 1 - DATA EXTRACTION:
1. Identify main headers (Item No, Description, Unit, Quantity, Rate, Amount)
2. Handle merged cells and sub-headings
3. Assign parent categories to each row
4. Remove empty/redundant rows

TASK 2 - UNIT STANDARDIZATION:
- m2, sqm, m.sq → M2
- m3, cum → M3
- m, lm → M
- nr, no, each → NO
- kg, kgs → KG
- set, sets → SET
- ps, prov sum → PS

TASK 3 - MATH VALIDATION:
- Verify: Quantity × Rate = Amount (5% tolerance)
- Flag discrepancies with reason

TASK 4 - STRUCTURE DETECTION:
- bill_number: Sequential from document
- bill_name: "ELECTRICAL INSTALLATION", "LIGHTING", etc.
- section_code: "A", "B", "1.0", etc.
- section_name: "CABLE CONTAINMENT", "DISTRIBUTION BOARDS"

STRUCTURE PATTERNS TO DETECT:
- "BILL No. X" or "BILL X" → New Bill
- "SECTION A" or "A." at start → Section header
- "1.0", "2.0" numbered headings → Section
- CAPITALIZED lines with no rate → Category/Section
- Indented items → Belong to above section

OUTPUT FORMAT:
{
  "row_number": 1,
  "item_description": "Clear description",
  "item_code": "A1.01",
  "unit": "M2",
  "quantity": 10,
  "supply_rate": 100.00,
  "install_rate": 50.00,
  "total_rate": 150.00,
  "bill_number": 1,
  "bill_name": "ELECTRICAL INSTALLATION",
  "section_code": "A",
  "section_name": "CABLE CONTAINMENT",
  "math_validated": true
}`,
    checklist: [
      { id: "p2-1", label: "Units standardized correctly (m2 → M2)" },
      { id: "p2-2", label: "Bill numbers extracted (not all null)" },
      { id: "p2-3", label: "Section codes populated (not all UNASSIGNED)" },
      { id: "p2-4", label: "Math validation running (check extraction_notes)" },
      { id: "p2-5", label: "Rate breakdown (supply/install) attempted" },
    ],
    verificationQuery: `SELECT 
  bill_number,
  bill_name,
  section_code,
  section_name,
  COUNT(*) as items,
  SUM(CASE WHEN unit IS NOT NULL THEN 1 ELSE 0 END) as units_detected,
  SUM(CASE WHEN total_rate > 0 THEN 1 ELSE 0 END) as rates_found
FROM boq_extracted_items
WHERE upload_id = '[UPLOAD_ID]'
GROUP BY bill_number, bill_name, section_code, section_name
ORDER BY bill_number, section_code;`,
    dependencies: ["phase-1-upload"],
  },
  {
    id: "phase-3-matching",
    number: 3,
    title: "Master Material Matching",
    goal: "Match extracted items to existing master materials",
    prompt: `PHASE 3: Master Material Matching

MATCHING LOGIC:
1. Load all active master_materials
2. For each extracted item, find best match

MATCHING RULES:
- Confidence >= 0.8: Strong match (same item + specs)
- Confidence 0.6-0.79: Partial match (similar item)
- Confidence < 0.6: No match → New item

MATCHING PATTERNS:
- Cables: Match by type + size + cores
  "4c 95mm XLPE" ↔ "4 Core 95mm² XLPE" → 0.85
- Lights: Match by type + dimensions
  "LED Panel 600x600" ↔ "600x600 LED Panel" → 0.90
- DBs: Match by type + ways
  "12 Way TPN DB" ↔ "12W Three Phase DB" → 0.80

OUTPUT:
- matched_material_id: UUID or null
- match_confidence: 0.0 to 1.0
- suggested_category_id: For unmatched items
- suggested_category_name: Category name

AUTO-UPDATE MASTER RATES:
When match_confidence >= 0.7:
- If master supply_cost = 0/null → Update with BOQ rate
- If master install_cost = 0/null → Update with BOQ rate
- Log in material_price_audit table`,
    checklist: [
      { id: "p3-1", label: "High confidence matches found (>0.8)" },
      { id: "p3-2", label: "Matched items link to correct master_material_id" },
      { id: "p3-3", label: "Unmatched items have suggested categories" },
      { id: "p3-4", label: "Master rates updated (check material_price_audit)" },
      { id: "p3-5", label: "Price history created for matches" },
    ],
    verificationQuery: `-- Check match distribution
SELECT 
  CASE 
    WHEN match_confidence >= 0.8 THEN 'High (0.8+)'
    WHEN match_confidence >= 0.6 THEN 'Medium (0.6-0.79)'
    ELSE 'Low/None (<0.6)'
  END as confidence_level,
  COUNT(*) as count
FROM boq_extracted_items
WHERE upload_id = '[UPLOAD_ID]'
GROUP BY 1;

-- Check rate updates
SELECT * FROM material_price_audit 
ORDER BY created_at DESC 
LIMIT 10;`,
    dependencies: ["phase-2-extraction"],
  },
  {
    id: "phase-4-outliers",
    number: 4,
    title: "Outlier & Anomaly Detection",
    goal: "Flag unusual rates and potential data errors",
    prompt: `PHASE 4: Outlier & Anomaly Detection

OUTLIER RULES:
1. Rate differs >50% from matched master rate → OUTLIER
2. Rate < R10 for materials (suspiciously low) → FLAG
3. Rate > R10,000 for standard items → FLAG
4. Quantity = 0 but rate > 0 → "Rate Only" item
5. Math error: Qty × Rate ≠ Amount (>5%) → FLAG

OUTPUT FIELDS:
- is_outlier: boolean
- outlier_reason: 
  - "Rate 80% higher than master"
  - "Suspiciously low rate"
  - "Math validation failed"
  - "Rate only - no quantity"

RATE AVERAGING:
For duplicate items in same upload:
- Track all rates found
- Calculate average
- Store in rate_tracker for comparison

MARKET BENCHMARKS (South Africa):
- Cable containment: R50-500/m
- Cables: R20-2000/m depending on size
- DBs: R3,000-50,000/unit
- Lighting: R200-5,000/unit
- General electricals: R50-10,000/item`,
    checklist: [
      { id: "p4-1", label: "Outliers detected (extraction_notes populated)" },
      { id: "p4-2", label: "Rate comparisons logged" },
      { id: "p4-3", label: "Math errors flagged" },
      { id: "p4-4", label: "Rate-only items identified (is_rate_only = true)" },
      { id: "p4-5", label: "Anomaly count in processing summary" },
    ],
    verificationQuery: `SELECT 
  item_description,
  total_rate,
  match_confidence,
  extraction_notes,
  is_rate_only
FROM boq_extracted_items
WHERE upload_id = '[UPLOAD_ID]'
  AND (extraction_notes IS NOT NULL OR is_rate_only = true)
ORDER BY row_number;`,
    dependencies: ["phase-3-matching"],
  },
  {
    id: "phase-5-review",
    number: 5,
    title: "Review & Master Library Update",
    goal: "Human review and update master library with new items",
    prompt: `PHASE 5: Review & Master Library Update

REVIEW WORKFLOW:
1. Display all extracted items in table
2. Show match status (Matched/New)
3. Allow filtering by status
4. Enable bulk actions

ACTIONS:
- "Approve All Matched": Set review_status = 'approved' for matched items
- "Add to Master": Create new master_materials entry
- "Assign Category": Set category for unmatched items
- "Mark Complete": Set upload status = 'reviewed'

ADDING NEW MATERIALS:
When user clicks "Add Selected to Master":
1. Check if item already added (added_to_master = false)
2. Get category from itemCategories map or suggested_category_id
3. Create master_materials entry:
   - material_code: item_code or 'BOQ-{timestamp}-{row}'
   - material_name: item_description
   - standard_supply_cost: supply_rate or total_rate × 0.7
   - standard_install_cost: install_rate or total_rate × 0.3
   - unit: Standardized unit
4. Update boq_extracted_items:
   - added_to_master = true
   - added_material_id = new material ID
   - review_status = 'approved'

REVIEW COMPLETE:
- Update boq_uploads.status = 'reviewed'
- Update boq_uploads.reviewed_at = now()
- Enable import to Final Account`,
    checklist: [
      { id: "p5-1", label: "Items display correctly in review table" },
      { id: "p5-2", label: "Filter by matched/unmatched works" },
      { id: "p5-3", label: "'Approve All Matched' updates statuses" },
      { id: "p5-4", label: "'Add to Master' creates master_materials" },
      { id: "p5-5", label: "Category selection works for unmatched" },
      { id: "p5-6", label: "'Mark Complete' changes upload status" },
    ],
    verificationQuery: `-- Check review status
SELECT 
  review_status,
  added_to_master,
  COUNT(*) as count
FROM boq_extracted_items
WHERE upload_id = '[UPLOAD_ID]'
GROUP BY review_status, added_to_master;

-- Check newly added materials
SELECT m.* 
FROM master_materials m
JOIN boq_extracted_items b ON m.id = b.added_material_id
WHERE b.upload_id = '[UPLOAD_ID]';`,
    dependencies: ["phase-4-outliers"],
  },
  {
    id: "phase-6-import",
    number: 6,
    title: "Final Account Import",
    goal: "Import reviewed BOQ into Final Account structure",
    prompt: `PHASE 6: Final Account Import

IMPORT FLOW:
1. User opens Final Account → Import from BOQ
2. Show completed/reviewed BOQ uploads for project
3. User selects BOQ upload
4. Display sections with item counts
5. User selects sections to import
6. Configure import mode:
   - "Contract only": final_quantity = 0
   - "Contract & Final": final_quantity = contract_quantity

DATA STRUCTURE:
BOQ Upload → Final Account Bills → Sections → Items

BILL CREATION:
- Group items by bill_number from extracted items
- Create final_account_bills if doesn't exist
- Map bill_name from BOQ

SECTION CREATION:
- Group items by section_code within each bill
- Create final_account_sections
- Set display_order from section order

ITEM CREATION:
For each boq_extracted_item:
- item_code: from extracted item
- description: item_description
- unit: standardized unit
- contract_quantity: quantity
- final_quantity: 0 or quantity (based on mode)
- supply_rate: from extracted item
- install_rate: from extracted item
- contract_amount: qty × (supply + install)
- source_boq_item_id: link back to extracted item

POST-IMPORT:
- Update final_accounts.source_boq_upload_id
- Recalculate bill totals`,
    checklist: [
      { id: "p6-1", label: "Reviewed BOQ uploads listed" },
      { id: "p6-2", label: "Sections display with item counts" },
      { id: "p6-3", label: "Bill structure created correctly" },
      { id: "p6-4", label: "Sections mapped with correct codes" },
      { id: "p6-5", label: "Items imported with rates" },
      { id: "p6-6", label: "source_boq_item_id linked" },
      { id: "p6-7", label: "Totals calculate correctly" },
    ],
    verificationQuery: `-- Check imported structure
SELECT 
  b.bill_number,
  b.bill_name,
  s.section_code,
  s.section_name,
  COUNT(i.id) as item_count,
  SUM(i.contract_amount) as contract_total
FROM final_account_bills b
JOIN final_account_sections s ON s.bill_id = b.id
JOIN final_account_items i ON i.section_id = s.id
WHERE b.final_account_id = '[ACCOUNT_ID]'
GROUP BY b.bill_number, b.bill_name, s.section_code, s.section_name
ORDER BY b.bill_number, s.section_code;`,
    dependencies: ["phase-5-review"],
  },
  
  // ============= CIRCUIT SCHEDULE & BOQ INTEGRATION PHASES =============
  {
    id: "phase-7-rate-library-db",
    number: 7,
    title: "Rate Library Database Tables",
    goal: "Create database schema for project rate library and circuit management",
    prompt: `PHASE 7: Rate Library Database Tables

OBJECTIVE: Create the foundational database tables for the Circuit Schedule & BOQ Integration system.

CREATE TABLES:

1. project_rate_library
   - id: UUID PRIMARY KEY
   - project_id: UUID REFERENCES projects(id)
   - item_code: TEXT NOT NULL
   - description: TEXT NOT NULL
   - unit: TEXT
   - supply_rate: NUMERIC(12,2) DEFAULT 0
   - install_rate: NUMERIC(12,2) DEFAULT 0
   - bill_section: TEXT (e.g., "B2.3")
   - source_boq_item_id: UUID REFERENCES boq_extracted_items(id)
   - is_custom: BOOLEAN DEFAULT false
   - created_at, updated_at: TIMESTAMPTZ

2. shop_distribution_boards
   - id: UUID PRIMARY KEY
   - shop_subsection_id: UUID REFERENCES final_account_subsections(id)
   - db_name: TEXT NOT NULL (e.g., "DB-1", "DB-12")
   - description: TEXT
   - display_order: INTEGER DEFAULT 0
   - created_at, updated_at: TIMESTAMPTZ

3. shop_circuits
   - id: UUID PRIMARY KEY
   - distribution_board_id: UUID REFERENCES shop_distribution_boards(id)
   - circuit_name: TEXT NOT NULL (e.g., "L1", "P1", "AC1")
   - circuit_type: TEXT CHECK (lighting, power, ac, data, fire, other)
   - description: TEXT
   - floor_plan_cable_id: UUID REFERENCES cable_entries(id)
   - display_order: INTEGER DEFAULT 0
   - created_at, updated_at: TIMESTAMPTZ

4. circuit_material_allocations
   - id: UUID PRIMARY KEY
   - circuit_id: UUID REFERENCES shop_circuits(id) ON DELETE CASCADE
   - rate_library_item_id: UUID REFERENCES project_rate_library(id)
   - quantity: NUMERIC(12,3) DEFAULT 0
   - is_variation: BOOLEAN DEFAULT false
   - notes: TEXT
   - created_at, updated_at: TIMESTAMPTZ

RLS POLICIES:
- Enable RLS on all tables
- Allow authenticated users full CRUD access

INDEXES:
- project_rate_library(project_id, item_code)
- shop_distribution_boards(shop_subsection_id)
- shop_circuits(distribution_board_id)
- circuit_material_allocations(circuit_id)`,
    checklist: [
      { id: "p7-1", label: "project_rate_library table created with all columns" },
      { id: "p7-2", label: "shop_distribution_boards table created" },
      { id: "p7-3", label: "shop_circuits table created with circuit_type check" },
      { id: "p7-4", label: "circuit_material_allocations table created" },
      { id: "p7-5", label: "RLS policies enabled and configured" },
      { id: "p7-6", label: "Indexes created for performance" },
      { id: "p7-7", label: "Foreign key relationships verified" },
    ],
    verificationQuery: `-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'project_rate_library',
  'shop_distribution_boards', 
  'shop_circuits',
  'circuit_material_allocations'
);

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%circuit%' OR tablename = 'project_rate_library';`,
    dependencies: ["phase-6-import"],
  },
  {
    id: "phase-8-rate-library-ui",
    number: 8,
    title: "Rate Library Manager UI",
    goal: "Build UI to import BOQ items into project rate library and manage rates",
    prompt: `PHASE 8: Rate Library Manager UI

OBJECTIVE: Create the Rate Library Manager component for managing project-specific rates imported from BOQ.

LOCATION: Add as new tab in Final Account or as component in LineShopsManager

COMPONENTS TO CREATE:

1. RateLibraryManager.tsx
   - Main container component
   - Tab for "Import from BOQ" and "Library Items"
   - Search/filter functionality
   - Grouped by bill_section

2. RateLibraryTable.tsx
   - Columns: Item Code, Description, Unit, Supply Rate, Install Rate, Total, Source, Actions
   - Inline editing for rates
   - Delete/duplicate actions
   - Sort by code, description, rate

3. ImportFromBOQDialog.tsx
   - Show list of reviewed BOQ uploads for project
   - Display sections with item counts
   - Select all / select sections
   - Import button creates project_rate_library entries
   - Skip duplicates (by item_code)

4. AddRateLibraryItemDialog.tsx
   - Manual entry for custom items
   - Fields: Item Code, Description, Unit, Supply Rate, Install Rate
   - Mark as is_custom = true
   - Bill section selector (dropdown with common sections)

UI FEATURES:
- Search across code and description
- Filter by bill_section
- Show "Custom" badge for is_custom items
- Show "BOQ" badge for items with source_boq_item_id
- Bulk select for delete
- Export to Excel

DATA FLOW:
BOQ Upload → boq_extracted_items → Import → project_rate_library
Custom Entry → project_rate_library (is_custom = true)`,
    checklist: [
      { id: "p8-1", label: "RateLibraryManager component renders" },
      { id: "p8-2", label: "Import from BOQ dialog shows reviewed uploads" },
      { id: "p8-3", label: "Section selection works in import dialog" },
      { id: "p8-4", label: "Items import to project_rate_library" },
      { id: "p8-5", label: "Rate library table displays imported items" },
      { id: "p8-6", label: "Inline rate editing saves correctly" },
      { id: "p8-7", label: "Add custom item dialog works" },
      { id: "p8-8", label: "Search and filter functional" },
    ],
    verificationQuery: `-- Check rate library has items
SELECT 
  project_id,
  COUNT(*) as total_items,
  SUM(CASE WHEN is_custom THEN 1 ELSE 0 END) as custom_items,
  SUM(CASE WHEN source_boq_item_id IS NOT NULL THEN 1 ELSE 0 END) as boq_items
FROM project_rate_library
GROUP BY project_id;`,
    dependencies: ["phase-7-rate-library-db"],
  },
  {
    id: "phase-9-db-manager",
    number: 9,
    title: "Distribution Board Manager",
    goal: "Create UI to manage distribution boards within each shop",
    prompt: `PHASE 9: Distribution Board Manager

OBJECTIVE: Add Distribution Board management within each Line Shop subsection.

LOCATION: New tab "Circuit Schedule" within LineShopSubsectionDetails

COMPONENTS TO CREATE:

1. CircuitScheduleTab.tsx
   - Container for DB list
   - "Add Distribution Board" button
   - Summary stats (total DBs, total circuits, total materials)

2. DistributionBoardManager.tsx
   - List of DBs for the shop subsection
   - Expandable/collapsible DB cards
   - Drag to reorder
   - Quick actions: Edit, Delete, Duplicate

3. DistributionBoardCard.tsx
   - Shows DB name, description
   - Circuit count badge
   - Expand to show circuits
   - Edit inline or modal

4. AddDistributionBoardDialog.tsx
   - Fields: DB Name (required), Description
   - Auto-suggest names: DB-1, DB-1A, DB-2, etc.
   - Validate unique name within shop

UI/UX:
- Accordion pattern for DB list
- Color-coded by circuit count (0 = gray, 1-5 = blue, 6+ = green)
- Show "No circuits" message when empty
- "Import from Floor Plan" button (links to Phase 11)

STATE MANAGEMENT:
- Use React Query for data fetching
- Optimistic updates for reordering
- Toast notifications for CRUD operations

INTEGRATION:
- shop_subsection_id links to final_account_subsections
- Future: Link to floor_plan_projects for cable import`,
    checklist: [
      { id: "p9-1", label: "Circuit Schedule tab added to shop subsection" },
      { id: "p9-2", label: "Distribution board list displays" },
      { id: "p9-3", label: "Add DB dialog creates new board" },
      { id: "p9-4", label: "Edit DB inline or modal works" },
      { id: "p9-5", label: "Delete DB with confirmation" },
      { id: "p9-6", label: "Reorder DBs updates display_order" },
      { id: "p9-7", label: "Circuit count shows on each DB card" },
    ],
    verificationQuery: `-- Check distribution boards
SELECT 
  db.id,
  db.db_name,
  db.description,
  fs.name as shop_name,
  COUNT(sc.id) as circuit_count
FROM shop_distribution_boards db
LEFT JOIN final_account_subsections fs ON fs.id = db.shop_subsection_id
LEFT JOIN shop_circuits sc ON sc.distribution_board_id = db.id
GROUP BY db.id, db.db_name, db.description, fs.name
ORDER BY db.display_order;`,
    dependencies: ["phase-7-rate-library-db"],
  },
  {
    id: "phase-10-circuit-manager",
    number: 10,
    title: "Circuit Manager & Templates",
    goal: "Create UI to manage circuits within distribution boards with templates",
    prompt: `PHASE 10: Circuit Manager & Templates

OBJECTIVE: Build circuit management UI with type classification and templates.

COMPONENTS TO CREATE:

1. CircuitManager.tsx
   - List circuits for a distribution board
   - Group by circuit_type (Lighting, Power, AC, Data, Fire)
   - Add/Edit/Delete/Duplicate circuits
   - "Assign Materials" button per circuit

2. CircuitCard.tsx
   - Circuit name, type badge, description
   - Material count indicator
   - Linked floor plan cable indicator
   - Expand to show allocated materials

3. AddCircuitDialog.tsx
   - Fields: Circuit Name, Type (dropdown), Description
   - Auto-name based on type: L1, L2 for Lighting, P1, P2 for Power
   - "Create from Template" option

4. CircuitTemplateManager.tsx
   - Predefined circuit configurations
   - Templates: Standard Lighting, Standard Power, AC Supply, Data Point
   - Each template has default materials
   - "Apply Template" creates circuit + material allocations

CIRCUIT TYPES:
- lighting: L1, L2, L3...
- power: P1, P2, P3...
- ac: AC1, AC2...
- data: D1, D2...
- fire: F1, F2...
- other: Custom naming

TEMPLATE EXAMPLES:
Standard Lighting Circuit:
- 2.5mm² Twin+E cable (qty based on length)
- Light switch 1-gang (1 No)
- Junction box (1 No)
- Cable clips (qty = length/0.3)

Standard Power Circuit:
- 4mm² Twin+E cable (qty based on length)
- Socket outlet double (2 No)
- Isolator (1 No)

UI FEATURES:
- Type filter tabs
- Bulk duplicate (copy L1 to L2, L3, etc.)
- Quick material preview on hover`,
    checklist: [
      { id: "p10-1", label: "Circuit list displays within DB" },
      { id: "p10-2", label: "Add circuit dialog with type selection" },
      { id: "p10-3", label: "Auto-naming works (L1, L2, P1, P2)" },
      { id: "p10-4", label: "Edit circuit updates correctly" },
      { id: "p10-5", label: "Delete circuit with cascade to allocations" },
      { id: "p10-6", label: "Duplicate circuit copies materials" },
      { id: "p10-7", label: "Circuit templates available" },
      { id: "p10-8", label: "Apply template creates circuit + materials" },
      { id: "p10-9", label: "Type filter/grouping works" },
    ],
    verificationQuery: `-- Check circuits and types
SELECT 
  db.db_name,
  sc.circuit_type,
  COUNT(*) as circuit_count,
  SUM((SELECT COUNT(*) FROM circuit_material_allocations WHERE circuit_id = sc.id)) as total_materials
FROM shop_circuits sc
JOIN shop_distribution_boards db ON db.id = sc.distribution_board_id
GROUP BY db.db_name, sc.circuit_type
ORDER BY db.db_name, sc.circuit_type;`,
    dependencies: ["phase-9-db-manager"],
  },
  {
    id: "phase-11-material-matrix",
    number: 11,
    title: "Circuit Material Matrix",
    goal: "Build spreadsheet-style material allocation interface",
    prompt: `PHASE 11: Circuit Material Matrix

OBJECTIVE: Create a spreadsheet-style interface for allocating materials to circuits (like your Excel circuit schedule).

COMPONENTS TO CREATE:

1. CircuitMaterialMatrix.tsx
   - Spreadsheet grid view
   - Rows = Circuits (grouped by DB)
   - Columns = Material codes from rate library
   - Cells = Editable quantity inputs
   - Auto-save on blur

2. MaterialColumnSelector.tsx
   - Search rate library for materials
   - Add columns to matrix
   - Reorder columns
   - Hide/show columns
   - "Add All from Section" option

3. CircuitMaterialAllocator.tsx
   - Alternative list view per circuit
   - "Add Material" with rate library search
   - Quantity input with unit display
   - Rate calculation preview (qty × rate)

4. MatrixSummaryRow.tsx
   - Column totals (sum of quantities per material)
   - Cost totals (qty × rate)
   - Export to Excel button

MATRIX FEATURES:
- Freeze first column (circuit names)
- Freeze header row (material codes)
- Tab navigation between cells
- Copy/paste support
- Highlight changed cells
- Undo/redo

KEYBOARD SHORTCUTS:
- Tab: Next cell
- Enter: Save and move down
- Escape: Cancel edit
- Ctrl+C/V: Copy/paste
- Ctrl+Z: Undo

DATA SYNC:
- Real-time save to circuit_material_allocations
- Optimistic updates
- Conflict resolution (last write wins)

CALCULATIONS:
- Per circuit total: SUM(qty × (supply_rate + install_rate))
- Per material total: SUM(all circuits qty)
- Grand total: SUM(all circuit totals)`,
    checklist: [
      { id: "p11-1", label: "Material matrix grid renders" },
      { id: "p11-2", label: "Add material columns from rate library" },
      { id: "p11-3", label: "Cell editing works with auto-save" },
      { id: "p11-4", label: "Tab navigation between cells" },
      { id: "p11-5", label: "Column totals calculate correctly" },
      { id: "p11-6", label: "Row totals (per circuit) show costs" },
      { id: "p11-7", label: "Copy/paste functionality" },
      { id: "p11-8", label: "Export to Excel works" },
      { id: "p11-9", label: "Alternative list view available" },
    ],
    verificationQuery: `-- Check material allocations
SELECT 
  sc.circuit_name,
  prl.item_code,
  prl.description,
  cma.quantity,
  cma.quantity * (prl.supply_rate + prl.install_rate) as total_cost
FROM circuit_material_allocations cma
JOIN shop_circuits sc ON sc.id = cma.circuit_id
JOIN project_rate_library prl ON prl.id = cma.rate_library_item_id
ORDER BY sc.circuit_name, prl.item_code;`,
    dependencies: ["phase-10-circuit-manager", "phase-8-rate-library-ui"],
  },
  {
    id: "phase-12-floor-plan-integration",
    number: 12,
    title: "Floor Plan to Circuit Integration",
    goal: "Link floor plan cables and equipment to circuits",
    prompt: `PHASE 12: Floor Plan to Circuit Integration

OBJECTIVE: Connect floor plan markup (cables, equipment) to the circuit schedule system.

INTEGRATION POINTS:

1. Cable Entry → Circuit Link
   - When drawing cables in Final Account Markup mode
   - Show "Assign to Circuit" option
   - Select Shop → DB → Circuit
   - Updates shop_circuits.floor_plan_cable_id

2. ImportFromFloorPlanDialog.tsx
   - List all cables from floor_plan_cables for the shop
   - Show cable_tag, from_location, to_location, measured_length
   - Multi-select cables to import
   - Create circuits from selected cables
   - Auto-name based on cable_tag pattern

3. FloorPlanCableSelector.tsx
   - Visual representation of cables
   - Filter by cable type, length range
   - Highlight already-linked cables
   - "Link to Existing Circuit" option

4. BulkCableImport.tsx
   - Import all cables for a DB at once
   - Smart grouping by cable_tag prefix
   - Preview before import
   - Conflict resolution for duplicates

IMPORT LOGIC:
For each cable entry:
1. Parse cable_tag for circuit name (e.g., "L1-001" → circuit "L1")
2. Find or create circuit in target DB
3. Create material allocations:
   - Cable material (from cable_type + cable_size)
   - Quantity = measured_length + extra_length

MARKUP ENHANCEMENTS:
- When in Final Account mode, show circuit assignment panel
- Quick-assign dropdown on cable selection
- Visual indicator for linked cables (different color/style)

AUTO-MATERIAL DETECTION:
Cable "4c 6mm²" at 25m creates:
- Rate library lookup: "4 Core 6mm² Cable"
- Allocation: circuit_id, rate_library_item_id, quantity: 25`,
    checklist: [
      { id: "p12-1", label: "Import from Floor Plan dialog shows cables" },
      { id: "p12-2", label: "Cable selection creates circuits" },
      { id: "p12-3", label: "Cable-to-circuit link saved (floor_plan_cable_id)" },
      { id: "p12-4", label: "Material allocations created from cable data" },
      { id: "p12-5", label: "Bulk import with preview works" },
      { id: "p12-6", label: "Already-linked cables highlighted" },
      { id: "p12-7", label: "Floor plan markup shows circuit assignment" },
      { id: "p12-8", label: "Linked cables show different visual style" },
    ],
    verificationQuery: `-- Check floor plan to circuit links
SELECT 
  sc.circuit_name,
  ce.cable_tag,
  ce.measured_length,
  ce.cable_type,
  ce.cable_size,
  db.db_name
FROM shop_circuits sc
JOIN cable_entries ce ON ce.id = sc.floor_plan_cable_id
JOIN shop_distribution_boards db ON db.id = sc.distribution_board_id
ORDER BY db.db_name, sc.circuit_name;`,
    dependencies: ["phase-11-material-matrix"],
  },
  {
    id: "phase-13-final-account-sync",
    number: 13,
    title: "Final Account Sync & Variation Tracking",
    goal: "Sync circuit materials to Final Account BOQ with variation detection",
    prompt: `PHASE 13: Final Account Sync & Variation Tracking

OBJECTIVE: Aggregate circuit materials to update Final Account items and track variations.

SYNC COMPONENTS:

1. SyncToFinalAccountButton.tsx
   - Appears in shop Circuit Schedule tab
   - Shows preview of what will be synced
   - Confirmation before sync
   - Progress indicator during sync

2. ShopMaterialSummary.tsx
   - Aggregate view: All materials across all circuits in shop
   - Columns: Item Code, Description, Unit, Total Qty, Contract Qty, Variance
   - Group by bill_section
   - Highlight variances (red = over, green = under)

3. SyncPreviewDialog.tsx
   - Shows line-by-line what will be updated
   - Contract vs Final quantities
   - New items (variations) highlighted
   - Allow exclude items from sync

4. VariationReport.tsx
   - List all variations for the shop
   - Filter: Additions, Omissions, Rate Changes
   - Total variation value
   - Export for claims documentation

SYNC LOGIC:
1. For each material in circuit_material_allocations:
   - Find matching final_account_items by item_code
   - If found: UPDATE final_quantity = SUM(circuit quantities)
   - If not found: CREATE new item with contract_quantity = 0 (variation)

2. Calculate variance:
   - variance_quantity = final_quantity - contract_quantity
   - variance_amount = variance_quantity × total_rate

3. Update timestamps:
   - final_account_items.updated_at = now()
   - Create audit log entry

VARIATION FLAGGING:
- is_variation = true for items with:
  - contract_quantity = 0 (new item)
  - is_custom = true in rate library
  - variance > 10% of contract

AUTO-RECALCULATION:
- After sync, recalculate:
  - Section totals
  - Bill totals
  - Final Account grand total

AUDIT TRAIL:
- Log each sync operation
- Store before/after values
- User who triggered sync
- Timestamp`,
    checklist: [
      { id: "p13-1", label: "Sync button appears in Circuit Schedule" },
      { id: "p13-2", label: "Preview dialog shows changes" },
      { id: "p13-3", label: "Material aggregation correct (sum across circuits)" },
      { id: "p13-4", label: "Existing final_account_items updated" },
      { id: "p13-5", label: "New items created for variations" },
      { id: "p13-6", label: "Variance calculated correctly" },
      { id: "p13-7", label: "Section/Bill totals recalculated" },
      { id: "p13-8", label: "Variation report displays" },
      { id: "p13-9", label: "Export variation report works" },
      { id: "p13-10", label: "Audit log entries created" },
    ],
    verificationQuery: `-- Check synced items and variances
SELECT 
  fai.item_code,
  fai.description,
  fai.contract_quantity,
  fai.final_quantity,
  fai.final_quantity - fai.contract_quantity as variance_qty,
  (fai.final_quantity - fai.contract_quantity) * (fai.supply_rate + fai.install_rate) as variance_amount
FROM final_account_items fai
JOIN final_account_sections fas ON fas.id = fai.section_id
JOIN final_account_bills fab ON fab.id = fas.bill_id
WHERE fab.final_account_id = '[ACCOUNT_ID]'
  AND fai.final_quantity != fai.contract_quantity
ORDER BY ABS(variance_qty) DESC;`,
    dependencies: ["phase-12-floor-plan-integration"],
  },
];
