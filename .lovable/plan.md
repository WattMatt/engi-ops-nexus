

# Distribution Board Legend Card - Electronic Completion System

## Overview

Add a new "DB Legend Cards" tab to the Contractor Portal where contractors can electronically fill out distribution board legend cards for each tenant. Once completed, they can submit the card to a selected project contact for review. The system also needs a new database table and a PDF generation pipeline for the completed legend cards.

## What the Form Captures

Based on the uploaded example (DB-TEL legend card), each legend card contains:

1. **Header Info**: DB Name, Address, Phone, Email, Tel Number, DOL Reg No, COC No, Addendum No, Date
2. **Section Info**: Section name (e.g. "EMERGENCY SECTION"), fed-from info, feeding breaker ID, feeding system/cabling info
3. **Circuit Breaker Schedule**: A two-column table with up to ~50 rows per column (CB 1-50 left, CB 51-100+ right), each row having Circuit Breaker Number, Description, and Amp Rating
4. **Contactor Details**: Up to 3 contactors (C1, C2, C3) with fields for Amps, Controlling, KW, Coil, Poles

## Database Design

### New Table: `db_legend_cards`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid PK | |
| tenant_id | uuid FK -> tenants | Which tenant this board belongs to |
| project_id | uuid FK -> projects | Project reference |
| db_name | text | e.g. "DB-TEL", "DB-LV1" |
| address | text | Installation address |
| phone | text | Contractor phone |
| email | text | Contractor email |
| tel_number | text | Alternative tel |
| dol_reg_no | text | DOL registration number |
| coc_no | text | COC number |
| addendum_no | text | Addendum reference |
| section_name | text | e.g. "EMERGENCY SECTION" |
| fed_from | text | e.g. "MAIN BOARD 1.2" |
| feeding_breaker_id | text | |
| feeding_system_info | text | Cabling info |
| circuits | jsonb | Array of {cb_no, description, amp_rating} for all circuit breakers |
| contactors | jsonb | Array of {name, amps, controlling, kw, coil, poles} |
| status | text | 'draft', 'submitted', 'approved', 'rejected' |
| submitted_at | timestamptz | When contractor submitted |
| submitted_by_name | text | Contractor name who submitted |
| submitted_by_email | text | Contractor email who submitted |
| submitted_to_contact_id | uuid FK -> project_contacts | Who it was submitted to |
| reviewer_notes | text | Feedback from reviewer |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: Public read/write (portal is token-based, not auth-based -- consistent with existing portal patterns).

### Enable Realtime

For live updates when cards are submitted or reviewed.

## New Components

### 1. Contractor Portal Tab: `ContractorDBLegendCards.tsx`

- New tab added to the portal (8th tab) with a circuit board icon
- Shows a list of tenants with their legend card status
- "View / Edit" button per tenant opens the legend card form
- Status badges: Draft, Submitted, Approved, Rejected
- Option to add multiple boards per tenant (e.g. DB-TEL, DB-LV1, DB-EMERG)

### 2. Legend Card Form: `DBLegendCardForm.tsx`

- Full electronic form matching the PDF layout
- Header section: DB Name, Address, Phone, Email, DOL Reg No, COC No
- Section info: Section name, Fed From, Feeding Breaker ID
- Circuit breaker table: Dynamic rows (add/remove), two-column layout on desktop
  - Each row: CB Number (auto-incremented), Description (text input), Amp Rating (text input)
- Contactor section: Up to 3 contactors with Amps, Controlling, KW, Coil, Poles fields
- Auto-save as draft
- Submit button with contact selector (from project_contacts)

### 3. Submit Dialog: `DBLegendCardSubmitDialog.tsx`

- Shows a dropdown of project contacts to submit to
- Confirmation step
- Triggers notification email to selected contact

### 4. Dashboard View (Internal): `DBLegendCardsDashboard.tsx`

- For the internal dashboard (not portal) to review submitted cards
- Approve/Reject with notes
- Export to PDF

## Contractor Portal Integration

In `src/pages/ContractorPortal.tsx`:
- Add 8th tab "DB Legend Cards" with grid icon
- Grid changes from `grid-cols-7` to `grid-cols-8`
- Pass project ID, contractor name, email to the new component

## Notification Edge Function

Create `send-legend-card-notification` edge function:
- Triggered when a contractor submits a completed legend card
- Sends email to the selected project contact
- Uses Resend API (consistent with existing notification functions)
- Includes project name, tenant/shop number, DB name, and a link back to review

## PDF Generation (Future Enhancement)

Add `generate-legend-card-pdf` edge function using the unified PDF pipeline:
- Uses the shared cover page from `pdfStandards.ts`
- Generates a professional PDF matching the original paper form layout
- Available for download from both portal and dashboard

## File Structure

```
src/components/contractor-portal/
  ContractorDBLegendCards.tsx          -- Tab content: tenant list with legend card status
  DBLegendCardForm.tsx                -- The electronic form
  DBLegendCardSubmitDialog.tsx        -- Submit to contact dialog

supabase/functions/
  send-legend-card-notification/
    index.ts                          -- Email notification on submission
```

## Implementation Sequence

1. Create the `db_legend_cards` database table with RLS policies
2. Build `ContractorDBLegendCards.tsx` -- tenant list with card status
3. Build `DBLegendCardForm.tsx` -- the full electronic form
4. Build `DBLegendCardSubmitDialog.tsx` -- submit with contact selection
5. Add the new tab to `ContractorPortal.tsx`
6. Create the notification edge function
7. Deploy and test end-to-end via the portal

