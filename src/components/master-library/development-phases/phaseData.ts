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
];
