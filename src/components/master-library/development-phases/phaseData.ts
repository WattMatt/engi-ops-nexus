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
  // ============= FINAL ACCOUNT DEVELOPMENT PHASES =============
  {
    id: "fa-phase-1-structure",
    number: 1,
    title: "Final Account Structure & Auto-Creation",
    goal: "Auto-create final account when project is selected, establish base structure",
    prompt: `PHASE 1: Final Account Structure & Auto-Creation

OBJECTIVE: Ensure Final Account is automatically created when a project is selected, with proper bill/section hierarchy.

REQUIREMENTS:
1. Auto-create final_accounts record when user navigates to Final Accounts page
2. Use project details to populate initial fields:
   - account_number: "FA-{project_number}"
   - account_name: project name
   - client_name: from project
   - status: "draft"

DATABASE STRUCTURE:
- final_accounts (main record, one per project)
- final_account_bills (Bill No 1, 2, etc.)
- final_account_sections (sections within bills)
- final_account_subsections (shop-level breakdown)
- final_account_items (line items with contract/final quantities)

VERIFICATION:
- Navigate to Final Accounts with a project selected
- Account should auto-create if none exists
- Bills tab should be the default view`,
    checklist: [
      { id: "fa1-1", label: "Final account auto-creates on page load" },
      { id: "fa1-2", label: "Account number follows FA-{project_number} pattern" },
      { id: "fa1-3", label: "Client name populated from project" },
      { id: "fa1-4", label: "Status defaults to 'draft'" },
      { id: "fa1-5", label: "Bills & Sections tab is default view" },
    ],
    verificationQuery: `SELECT 
  fa.id,
  fa.account_number,
  fa.account_name,
  fa.client_name,
  fa.status,
  p.name as project_name
FROM final_accounts fa
JOIN projects p ON fa.project_id = p.id
ORDER BY fa.created_at DESC
LIMIT 5;`,
    dependencies: [],
  },
  {
    id: "fa-phase-2-bills-sections",
    number: 2,
    title: "Bills & Sections Management",
    goal: "Create and manage bills with nested sections for organizing items",
    prompt: `PHASE 2: Bills & Sections Management

OBJECTIVE: Build UI for creating/managing bills and their sections.

BILLS:
- bill_number: Sequential (1, 2, 3...)
- bill_name: "ELECTRICAL INSTALLATION", "LIGHTING", etc.
- Display contract_total, final_total, variation_total

SECTIONS:
- section_code: "A", "B", "1.0", "2.0"
- section_name: "CABLE CONTAINMENT", "DISTRIBUTION BOARDS"
- Nested under bills
- Display totals aggregated from items

UI REQUIREMENTS:
1. Collapsible bill cards showing summary
2. Add Bill button with name input
3. Add Section button within each bill
4. Drag to reorder sections
5. Edit/Delete actions with confirmation
6. Real-time total calculations

CALCULATIONS:
- Bill total = SUM(section totals)
- Section total = SUM(item contract_amounts or final_amounts)
- Variation = final_total - contract_total`,
    checklist: [
      { id: "fa2-1", label: "Bills display with correct numbering" },
      { id: "fa2-2", label: "Add Bill creates new bill with name" },
      { id: "fa2-3", label: "Sections nest under bills correctly" },
      { id: "fa2-4", label: "Add Section works within bill context" },
      { id: "fa2-5", label: "Edit bill/section name works" },
      { id: "fa2-6", label: "Delete bill cascades to sections/items" },
      { id: "fa2-7", label: "Totals calculate and display correctly" },
    ],
    verificationQuery: `SELECT 
  b.bill_number,
  b.bill_name,
  b.contract_total,
  b.final_total,
  COUNT(s.id) as section_count
FROM final_account_bills b
LEFT JOIN final_account_sections s ON s.bill_id = b.id
WHERE b.final_account_id = '[ACCOUNT_ID]'
GROUP BY b.id
ORDER BY b.bill_number;`,
    dependencies: ["fa-phase-1-structure"],
  },
  {
    id: "fa-phase-3-items",
    number: 3,
    title: "Line Items Management",
    goal: "Add, edit, and manage individual line items within sections",
    prompt: `PHASE 3: Line Items Management

OBJECTIVE: Full CRUD for final account items within sections.

ITEM FIELDS:
- item_code: Reference code (e.g., "A1.01")
- description: Item description
- unit: M, M2, NO, etc.
- contract_quantity: Original BOQ quantity
- final_quantity: Measured/actual quantity
- supply_rate: Material cost per unit
- install_rate: Labour cost per unit
- contract_amount: contract_qty × (supply + install)
- final_amount: final_qty × (supply + install)
- variation_amount: final_amount - contract_amount

UI REQUIREMENTS:
1. Table view with all columns
2. Add Item dialog with form
3. Inline editing for quantities
4. Quantity input with +/- controls
5. Real-time amount calculations
6. Delete with confirmation
7. Copy item functionality

SPECIAL ITEM TYPES:
- is_prime_cost: For PC/PS items
- is_provisional: For provisional sums
- is_rate_only: Rate items with no quantity

VALIDATION:
- Quantity must be >= 0
- Rates must be >= 0
- Alert on large variations (>20%)`,
    checklist: [
      { id: "fa3-1", label: "Items table displays all columns" },
      { id: "fa3-2", label: "Add Item dialog works correctly" },
      { id: "fa3-3", label: "Inline quantity editing works" },
      { id: "fa3-4", label: "Amounts calculate automatically" },
      { id: "fa3-5", label: "Delete item with confirmation" },
      { id: "fa3-6", label: "Section totals update on item changes" },
      { id: "fa3-7", label: "Prime cost items handled correctly" },
    ],
    verificationQuery: `SELECT 
  i.item_code,
  i.description,
  i.unit,
  i.contract_quantity,
  i.final_quantity,
  i.supply_rate,
  i.install_rate,
  i.contract_amount,
  i.final_amount,
  (i.final_amount - i.contract_amount) as variation
FROM final_account_items i
JOIN final_account_sections s ON i.section_id = s.id
WHERE s.bill_id IN (
  SELECT id FROM final_account_bills 
  WHERE final_account_id = '[ACCOUNT_ID]'
)
ORDER BY i.display_order;`,
    dependencies: ["fa-phase-2-bills-sections"],
  },
  {
    id: "fa-phase-4-subsections",
    number: 4,
    title: "Shop Subsections (Tenant Breakdown)",
    goal: "Break down sections by shop/tenant for retail projects",
    prompt: `PHASE 4: Shop Subsections (Tenant Breakdown)

OBJECTIVE: Enable section breakdown by individual shops/tenants.

SUBSECTION FIELDS:
- section_id: Parent section
- shop_number: "G01", "L23", etc.
- shop_name: Tenant name
- gross_area: Shop GLA
- Items can be assigned to subsection

USE CASE:
For retail/mall projects where each shop has its own:
- Lighting quantities
- Power points
- Distribution boards
- Cable runs

UI REQUIREMENTS:
1. Toggle to enable subsection view
2. Add Shop Subsection button
3. Show shop list with item counts
4. Filter items by shop
5. Copy items from one shop to another
6. Bulk assign items to shop

CALCULATIONS:
- Shop total = SUM(items in subsection)
- Section total = SUM(all shop totals + unassigned)
- Support for shop-specific variations`,
    checklist: [
      { id: "fa4-1", label: "Subsections display under sections" },
      { id: "fa4-2", label: "Add Shop Subsection works" },
      { id: "fa4-3", label: "Items can be assigned to subsection" },
      { id: "fa4-4", label: "Shop totals calculate correctly" },
      { id: "fa4-5", label: "Copy items between shops works" },
      { id: "fa4-6", label: "Filter by shop works" },
    ],
    verificationQuery: `SELECT 
  ss.shop_number,
  ss.shop_name,
  ss.gross_area,
  COUNT(i.id) as item_count,
  SUM(i.contract_amount) as contract_total
FROM final_account_subsections ss
LEFT JOIN final_account_items i ON i.shop_subsection_id = ss.id
WHERE ss.section_id IN (
  SELECT s.id FROM final_account_sections s
  JOIN final_account_bills b ON s.bill_id = b.id
  WHERE b.final_account_id = '[ACCOUNT_ID]'
)
GROUP BY ss.id
ORDER BY ss.shop_number;`,
    dependencies: ["fa-phase-3-items"],
  },
  {
    id: "fa-phase-5-prime-costs",
    number: 5,
    title: "Prime Costs & Provisional Sums",
    goal: "Track PC/PS items with profit percentages and adjustments",
    prompt: `PHASE 5: Prime Costs & Provisional Sums

OBJECTIVE: Dedicated management for Prime Cost and Provisional Sum items.

PRIME COST (PC):
- Client-supplied materials
- Contractor adds profit % (typically 10-15%)
- final_amount = prime_cost × (1 + profit_percentage)

PROVISIONAL SUM (PS):
- Estimated budget for undefined work
- Actual amount determined later
- Track spent vs. remaining

FIELDS:
- item_type: 'PC', 'PS', or 'MEASURED'
- prime_cost: Base value
- profit_percentage: Default 10%
- adjustment_amount: Manual adjustments
- reason: Explanation for variations

UI REQUIREMENTS:
1. Separate "Prime Costs" tab in Final Account
2. Table showing all PC/PS items
3. Edit profit percentage per item
4. Show original vs. current amounts
5. Track total PC/PS exposure
6. Summary card with totals

CALCULATIONS:
- PC Total = SUM(prime_cost × (1 + profit%))
- PS Spent = SUM(actual amounts against PS)
- PS Remaining = PS Original - PS Spent`,
    checklist: [
      { id: "fa5-1", label: "Prime Costs tab displays PC/PS items" },
      { id: "fa5-2", label: "Profit percentage editable per item" },
      { id: "fa5-3", label: "PC amounts calculate with profit" },
      { id: "fa5-4", label: "PS tracking shows spent/remaining" },
      { id: "fa5-5", label: "Summary totals display correctly" },
      { id: "fa5-6", label: "Items marked correctly (is_prime_cost)" },
    ],
    verificationQuery: `SELECT 
  i.item_code,
  i.description,
  i.is_prime_cost,
  i.prime_cost,
  i.profit_percentage,
  i.prime_cost * (1 + COALESCE(i.profit_percentage, 0)/100) as total_with_profit
FROM final_account_items i
WHERE i.is_prime_cost = true
AND i.section_id IN (
  SELECT s.id FROM final_account_sections s
  JOIN final_account_bills b ON s.bill_id = b.id
  WHERE b.final_account_id = '[ACCOUNT_ID]'
);`,
    dependencies: ["fa-phase-3-items"],
  },
  {
    id: "fa-phase-6-import",
    number: 6,
    title: "Final Account BOQ Import",
    goal: "Import reviewed BOQ uploads into Final Account structure",
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
      { id: "fa6-1", label: "Import from BOQ button visible in Final Account" },
      { id: "fa6-2", label: "Reviewed BOQ uploads listed for selection" },
      { id: "fa6-3", label: "Sections display with item counts" },
      { id: "fa6-4", label: "Section selection works (multi-select)" },
      { id: "fa6-5", label: "Import mode options shown (Contract only / Contract & Final)" },
      { id: "fa6-6", label: "Bills created from bill_number grouping" },
      { id: "fa6-7", label: "Sections created with correct codes/names" },
      { id: "fa6-8", label: "Items imported with all fields populated" },
      { id: "fa6-9", label: "source_boq_item_id linked correctly" },
      { id: "fa6-10", label: "Bill/section totals recalculated" },
      { id: "fa6-11", label: "final_accounts.source_boq_upload_id updated" },
    ],
    verificationQuery: `-- Check imported structure
SELECT 
  b.bill_number,
  b.bill_name,
  s.section_code,
  s.section_name,
  COUNT(i.id) as item_count,
  SUM(i.contract_amount) as contract_total,
  COUNT(i.source_boq_item_id) as linked_items
FROM final_account_bills b
JOIN final_account_sections s ON s.bill_id = b.id
JOIN final_account_items i ON i.section_id = s.id
WHERE b.final_account_id = '[ACCOUNT_ID]'
GROUP BY b.bill_number, b.bill_name, s.section_code, s.section_name
ORDER BY b.bill_number, s.section_code;

-- Verify source link
SELECT source_boq_upload_id FROM final_accounts 
WHERE id = '[ACCOUNT_ID]';`,
    dependencies: ["fa-phase-3-items"],
  },
  {
    id: "fa-phase-7-discrepancies",
    number: 7,
    title: "BOQ Discrepancies Summary",
    goal: "Compare contract vs final quantities and highlight discrepancies",
    prompt: `PHASE 7: BOQ Discrepancies Summary

OBJECTIVE: Create a summary view showing all items with quantity/rate differences.

DISCREPANCY TYPES:
1. Quantity Variance: final_qty ≠ contract_qty
2. Rate Variance: Rate changed from BOQ (if source linked)
3. New Items: Items added post-contract
4. Omitted Items: Contract items with final_qty = 0
5. Re-measured: Significant quantity change

CALCULATIONS:
- Quantity Variance % = (final_qty - contract_qty) / contract_qty × 100
- Value Variance = final_amount - contract_amount
- Flag if variance > 10%

UI REQUIREMENTS:
1. "BOQ Discrepancies" tab in Final Account
2. Filter by variance type
3. Sort by variance value
4. Export to Excel
5. Summary cards showing:
   - Total additions
   - Total omissions
   - Net variation
   - Items over threshold

THRESHOLD SETTINGS:
- Minor: < 5% variance
- Moderate: 5-20% variance  
- Major: > 20% variance`,
    checklist: [
      { id: "fa7-1", label: "Discrepancies tab shows variance items" },
      { id: "fa7-2", label: "Quantity variance calculated correctly" },
      { id: "fa7-3", label: "Filter by variance type works" },
      { id: "fa7-4", label: "Sort by variance value works" },
      { id: "fa7-5", label: "Summary cards display totals" },
      { id: "fa7-6", label: "Threshold highlighting applied" },
      { id: "fa7-7", label: "Export functionality works" },
    ],
    verificationQuery: `SELECT 
  i.item_code,
  i.description,
  i.contract_quantity,
  i.final_quantity,
  i.contract_amount,
  i.final_amount,
  (i.final_amount - i.contract_amount) as variation,
  CASE 
    WHEN i.contract_quantity = 0 THEN 100
    ELSE ROUND(((i.final_quantity - i.contract_quantity) / i.contract_quantity * 100)::numeric, 2)
  END as variance_percent
FROM final_account_items i
WHERE i.section_id IN (
  SELECT s.id FROM final_account_sections s
  JOIN final_account_bills b ON s.bill_id = b.id
  WHERE b.final_account_id = '[ACCOUNT_ID]'
)
AND i.final_quantity != i.contract_quantity
ORDER BY ABS(i.final_amount - i.contract_amount) DESC;`,
    dependencies: ["fa-phase-6-import"],
  },
  {
    id: "fa-phase-8-variations",
    number: 8,
    title: "Variation Orders & Claims",
    goal: "Track and manage variation orders with approval workflow",
    prompt: `PHASE 8: Variation Orders & Claims

OBJECTIVE: Formal variation order management with numbering and approvals.

VARIATION ORDER FIELDS:
- vo_number: Sequential (VO-001, VO-002)
- title: Brief description
- description: Detailed scope
- status: draft, submitted, approved, rejected
- submitted_date, approved_date
- claimed_amount, approved_amount
- linked_items: Array of final_account_item IDs

WORKFLOW:
1. Create VO from identified discrepancies
2. Add items to VO (can select from variations)
3. Submit for approval
4. Client reviews and approves/rejects
5. Approved amount updates final account

UI REQUIREMENTS:
1. Variation Orders list view
2. Create VO dialog
3. Add items to VO (picker)
4. Status workflow buttons
5. Print/export VO
6. Dashboard showing VO status summary

AUTOMATION:
- Auto-suggest VOs when variance > threshold
- Link items to VO updates their vo_reference
- Approved VOs update approved_variation_amount`,
    checklist: [
      { id: "fa8-1", label: "Variation Orders table displays correctly" },
      { id: "fa8-2", label: "Create VO with proper numbering" },
      { id: "fa8-3", label: "Add items to VO works" },
      { id: "fa8-4", label: "Status workflow (draft→submitted→approved)" },
      { id: "fa8-5", label: "Approved amount updates on approval" },
      { id: "fa8-6", label: "VO summary on dashboard" },
      { id: "fa8-7", label: "Export/print VO functionality" },
    ],
    verificationQuery: `SELECT 
  vo.vo_number,
  vo.title,
  vo.status,
  vo.claimed_amount,
  vo.approved_amount,
  COUNT(voi.id) as item_count
FROM variation_orders vo
LEFT JOIN variation_order_items voi ON voi.variation_order_id = vo.id
WHERE vo.final_account_id = '[ACCOUNT_ID]'
GROUP BY vo.id
ORDER BY vo.vo_number;`,
    dependencies: ["fa-phase-7-discrepancies"],
  },
  {
    id: "fa-phase-9-account-overview",
    number: 9,
    title: "Account Overview & Summary",
    goal: "Dashboard view with comprehensive final account summary",
    prompt: `PHASE 9: Account Overview & Summary

OBJECTIVE: Create summary dashboard showing final account health and totals.

SUMMARY CARDS:
1. Contract Sum: Total of all contract_amounts
2. Final Account Value: Total of all final_amounts
3. Net Variation: Difference with % change
4. Approved Variations: Sum of approved VOs
5. Pending Claims: Sum of submitted but not approved

BREAKDOWN CHARTS:
- Pie chart: Distribution by bill
- Bar chart: Contract vs Final by section
- Trend: Variation over time (if audit log exists)

STATUS INDICATORS:
- Overall status (draft, in-progress, final, certified)
- Completion % (items with final_qty / total items)
- Risk level based on variation %

QUICK ACTIONS:
- Generate Report
- Export to Excel
- Submit for Certification
- View Audit Trail

ACCOUNT DETAILS:
- Editable fields: Notes, status
- Display: Created date, last modified
- Client information`,
    checklist: [
      { id: "fa9-1", label: "Summary cards display correct totals" },
      { id: "fa9-2", label: "Contract sum calculates correctly" },
      { id: "fa9-3", label: "Variation percentage shows" },
      { id: "fa9-4", label: "Status can be changed" },
      { id: "fa9-5", label: "Notes field saves" },
      { id: "fa9-6", label: "Export functionality works" },
      { id: "fa9-7", label: "Completion percentage accurate" },
    ],
    verificationQuery: `SELECT 
  fa.account_number,
  fa.account_name,
  fa.status,
  (SELECT SUM(contract_total) FROM final_account_bills WHERE final_account_id = fa.id) as contract_sum,
  (SELECT SUM(final_total) FROM final_account_bills WHERE final_account_id = fa.id) as final_sum,
  (SELECT COUNT(*) FROM final_account_items i 
   JOIN final_account_sections s ON i.section_id = s.id
   JOIN final_account_bills b ON s.bill_id = b.id
   WHERE b.final_account_id = fa.id) as total_items,
  (SELECT COUNT(*) FROM final_account_items i 
   JOIN final_account_sections s ON i.section_id = s.id
   JOIN final_account_bills b ON s.bill_id = b.id
   WHERE b.final_account_id = fa.id AND i.final_quantity > 0) as measured_items
FROM final_accounts fa
WHERE fa.id = '[ACCOUNT_ID]';`,
    dependencies: ["fa-phase-8-variations"],
  },
  {
    id: "fa-phase-10-reporting",
    number: 10,
    title: "Final Account Reporting",
    goal: "Generate formatted reports and exports for final account",
    prompt: `PHASE 10: Final Account Reporting

OBJECTIVE: Generate professional reports and data exports.

REPORT TYPES:

1. Summary Report:
   - Cover page with project details
   - Executive summary
   - Total contract vs final
   - Major variations list
   - Bill breakdown table

2. Detailed BOQ Report:
   - Full item listing by bill/section
   - Contract and final quantities
   - Rate breakdowns
   - Variation calculations

3. Variation Report:
   - All VOs with status
   - Supporting documentation
   - Approval history

4. Certification Report:
   - Final statement format
   - Signature blocks
   - Payment breakdown

EXPORT FORMATS:
- PDF (formatted report)
- Excel (raw data with formulas)
- CSV (simple data export)

UI REQUIREMENTS:
1. Report type selection
2. Date range filters
3. Section selection
4. Preview before generate
5. Download/email options`,
    checklist: [
      { id: "fa10-1", label: "Summary report generates" },
      { id: "fa10-2", label: "Detailed BOQ report works" },
      { id: "fa10-3", label: "PDF export functional" },
      { id: "fa10-4", label: "Excel export with calculations" },
      { id: "fa10-5", label: "Report preview available" },
      { id: "fa10-6", label: "Section filtering works" },
    ],
    verificationQuery: `-- Verify data available for reports
SELECT 
  b.bill_number,
  b.bill_name,
  b.contract_total,
  b.final_total,
  b.variation_total,
  (SELECT COUNT(*) FROM final_account_sections WHERE bill_id = b.id) as sections,
  (SELECT COUNT(*) FROM final_account_items i 
   JOIN final_account_sections s ON i.section_id = s.id
   WHERE s.bill_id = b.id) as items
FROM final_account_bills b
WHERE b.final_account_id = '[ACCOUNT_ID]'
ORDER BY b.bill_number;`,
    dependencies: ["fa-phase-9-account-overview"],
  },
];
