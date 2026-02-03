
# Contractor Portal Enhancement Plan
## Focus: Procurement Transparency for Main Contractors & Subcontractors

---

## Current State Analysis

### What Exists Today

| Feature | Current Functionality | Limitations |
|---------|----------------------|-------------|
| **Procurement Tab** | Basic item list with status badges | Read-only, no detail view, no timeline |
| **Status Tracking** | 9 statuses (not_started to delivered) | No date tracking for status changes |
| **Supplier Info** | Name and expected delivery date | No contact details, no quote information |
| **Progress View** | Delivery percentage bar | Only shows delivered vs total, lacks granularity |

### Database Schema (project_procurement_items)
- `id`, `project_id`, `name`, `description`
- `status`, `supplier_name`, `expected_delivery`
- `source_type` (manual/final_account), `source_item_id`
- `notes`, `display_order`, `created_at`, `updated_at`

**Missing fields**: No history tracking, no PO numbers, no quote comparisons, no document attachments, no category grouping.

---

## Proposed Improvements

### Phase 1: Enhanced Procurement Visibility (Priority: High)

#### 1.1 Procurement Dashboard Overhaul

Replace the current basic overview with a more informative dashboard:

```text
PROCUREMENT DASHBOARD LAYOUT
+--------------------------------------------------+
| PROGRESS OVERVIEW                                 |
| [====75%====              ] 12/16 Items Ordered   |
+--------------------------------------------------+
| STATUS PIPELINE                                   |
| Quoting → Approved → Ordered → In Transit → Here  |
|    2         3          5          4         2    |
+--------------------------------------------------+
| UPCOMING DELIVERIES (Next 14 Days)               |
| • Transformers - ABC Supplier - Expected 12 Feb  |
| • DB Panels - XYZ Elec - Expected 15 Feb         |
+--------------------------------------------------+
| ITEMS REQUIRING ACTION (for PM visibility)       |
| • Generator Panels - Quote received, awaiting    |
|   approval (5 days pending)                       |
+--------------------------------------------------+
```

**New metrics to display:**
- Items by status with visual pipeline
- Upcoming deliveries timeline
- Items awaiting action (stalled items)
- Total value committed vs budget (if values tracked)

#### 1.2 Detailed Item View Dialog

Add an expandable detail view when clicking any procurement item:

**Information to show:**
- Full description and specifications
- Supplier contact details (name, email, phone)
- Quote information (if available)
- Status history timeline
- Expected vs actual delivery dates
- Related documents (quotes, POs, delivery notes)
- Notes and updates from project team

#### 1.3 Status History Timeline

Track and display when each status change occurred:

| Date | Status | Updated By | Notes |
|------|--------|------------|-------|
| 5 Feb | In Transit | System | Tracking #: ABC123 |
| 1 Feb | Ordered | PM Name | PO #: PO-2024-015 |
| 28 Jan | Approved | Director | Approved for R125,000 |
| 25 Jan | Quote Received | PM Name | 3 quotes received |

---

### Phase 2: Enhanced Data Model (Priority: High)

#### 2.1 New Database Columns for project_procurement_items

```sql
ALTER TABLE project_procurement_items ADD COLUMN IF NOT EXISTS
  category TEXT,                    -- e.g., 'Switchgear', 'Cables', 'Lighting'
  po_number TEXT,                   -- Purchase order reference
  tracking_number TEXT,             -- Shipment tracking
  supplier_email TEXT,              -- Contact details
  supplier_phone TEXT,
  quoted_amount NUMERIC,            -- Quote value
  actual_amount NUMERIC,            -- Final cost
  quote_valid_until DATE,           -- Quote expiry
  actual_delivery DATE,             -- When actually delivered
  priority TEXT DEFAULT 'normal',   -- low/normal/high/critical
  assigned_to TEXT;                 -- Responsible person
```

#### 2.2 New Table: procurement_status_history

```sql
CREATE TABLE procurement_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_item_id UUID REFERENCES project_procurement_items(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 2.3 New Table: procurement_documents

```sql
CREATE TABLE procurement_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procurement_item_id UUID REFERENCES project_procurement_items(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,  -- quote, po, delivery_note, invoice, specification
  file_name TEXT NOT NULL,
  file_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Phase 3: Contractor-Specific Enhancements (Priority: Medium)

#### 3.1 Category Grouping for Contractors

Group procurement items by category for easier navigation:

```text
PROCUREMENT BY CATEGORY
├── Switchgear (4 items)
│   ├── MV Switchgear Panel - Ordered
│   ├── LV Main Switchboard - In Transit
│   └── ...
├── Transformers (2 items)
│   ├── 1MVA Transformer - Delivered
│   └── 500kVA Transformer - Pending Quote
├── Distribution Boards (8 items)
│   └── ...
└── Cables & Accessories (6 items)
```

#### 3.2 Delivery Calendar View

Add a calendar tab showing expected deliveries:

- Month/week view of expected deliveries
- Color-coded by status (on-track, at-risk, delayed)
- Click to view item details
- Filter by category or supplier

#### 3.3 Subcontractor-Specific Views

For subcontractors, filter procurement to show only items relevant to their scope:

- Electrical subcontractor sees electrical items
- HVAC subcontractor sees HVAC items
- Configurable via portal access settings

---

### Phase 4: Communication & Transparency (Priority: Medium)

#### 4.1 Procurement Updates Section

Allow contractors to see recent updates:

```text
RECENT UPDATES
─────────────────────────────────
Today
• MV Switchgear Panel status changed to "In Transit"
• Tracking number added: ZA-2024-78901

Yesterday  
• DB Panels quote approved (R45,000)
• Generator delivery rescheduled to 20 Feb

3 days ago
• New item added: Emergency Lighting Units
```

#### 4.2 Delivery Confirmation Workflow

Allow contractors to confirm receipt of delivered items:

- "Mark as Received" button for items marked "Delivered"
- Optional photo upload for proof of delivery
- Condition notes (received in good condition / damaged / incomplete)
- Timestamp and contractor name recorded

#### 4.3 RFI Integration for Procurement

Quick-create RFI from procurement items:

- "Query this item" button on each procurement item
- Pre-fills RFI with item reference and context
- Auto-categorizes as "Procurement Query"

---

### Phase 5: Admin/PM Enhancements (Priority: Lower)

#### 5.1 Enhanced Procurement Settings Page

Improve the existing ProcurementTrackingSettings component:

- Bulk import from cable schedule (cables to procure)
- Import from budget line items
- Category assignment and prioritization
- Supplier database integration
- Quote comparison view

#### 5.2 Automated Notifications (Future)

Email notifications to contractors when:
- New items added to procurement
- Status changes (especially "Ordered" and "In Transit")
- Delivery date changes
- Items marked as delivered

---

## Implementation Order

### Step 1: Database Schema Updates
1. Add new columns to `project_procurement_items`
2. Create `procurement_status_history` table
3. Create `procurement_documents` table
4. Add triggers for automatic history tracking
5. Set up RLS policies

### Step 2: Enhanced Contractor Procurement View
1. Create `ContractorProcurementDashboard.tsx` - new overview component
2. Create `ProcurementItemDetail.tsx` - detail dialog with timeline
3. Create `ProcurementDeliveryCalendar.tsx` - calendar view
4. Create `ProcurementActivityFeed.tsx` - recent updates list
5. Update `ContractorProcurementStatus.tsx` to use new components

### Step 3: Category & Filtering
1. Add category grouping to procurement list
2. Add filter controls (by status, category, supplier)
3. Add search functionality
4. Add sorting options (by date, status, category)

### Step 4: Admin Improvements
1. Enhance `EditProcurementItemDialog.tsx` with new fields
2. Create `ProcurementDocumentsPanel.tsx` for file attachments
3. Add bulk operations (bulk status update, bulk import)
4. Create status change tracking in mutations

### Step 5: Delivery Confirmation
1. Create `ConfirmDeliveryDialog.tsx`
2. Add confirmation workflow to contractor view
3. Update database with confirmation records

---

## File Changes Summary

| File | Type | Description |
|------|------|-------------|
| `ContractorProcurementStatus.tsx` | Modify | Restructure with new dashboard layout |
| `ContractorProcurementDashboard.tsx` | New | Overview metrics and pipeline view |
| `ProcurementItemDetail.tsx` | New | Detailed item view with timeline |
| `ProcurementStatusTimeline.tsx` | New | Status history timeline component |
| `ProcurementDeliveryCalendar.tsx` | New | Calendar view for deliveries |
| `ProcurementActivityFeed.tsx` | New | Recent updates feed |
| `ProcurementCategoryGroup.tsx` | New | Grouped item display |
| `ConfirmDeliveryDialog.tsx` | New | Contractor delivery confirmation |
| `EditProcurementItemDialog.tsx` | Modify | Add new fields (PO, tracking, etc.) |
| `AddProcurementItemDialog.tsx` | Modify | Add category and priority |
| `ProcurementTrackingSettings.tsx` | Modify | Enhanced admin interface |
| `ProcurementDocumentsPanel.tsx` | New | Document attachments management |
| `ContractorPortalSettings.tsx` | Modify | Add procurement category filters |

---

## Additional Recommendations

1. **Mobile Optimization**: Ensure all procurement views are mobile-friendly for site use

2. **Export Capability**: Add PDF/Excel export of procurement status for site meetings

3. **Integration with Cable Schedule**: Auto-create procurement items for major cable orders

4. **Budget Linkage**: Connect procurement items to budget line items for cost tracking

5. **Supplier Rating**: Track supplier performance (on-time delivery rate)

6. **Critical Path Highlighting**: Flag items on the critical path that could delay project

---

## Technical Considerations

- All new tables require RLS policies (public read for contractors with valid tokens)
- Status history trigger should capture user info from auth context
- File uploads to use existing Supabase storage bucket pattern
- Calendar component can use existing date-fns for date manipulation
- Consider offline capability for delivery confirmation on site
