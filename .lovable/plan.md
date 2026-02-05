

# Contractor Portal: Automatic Order Deadlines for Boards and Lights

## Overview
This plan adds automatic calculation of **Last Order Dates** and **Delivery Dates** for Distribution Boards (DBs) and Lighting based on the tenant's Beneficial Occupation (BO) Date. When a user inputs/updates the BO Date, these dates will be auto-calculated as **8 business weeks (40 weekdays)** prior to the BO Date.

## Current Behavior
- The Contractor Portal Tenant Tracker displays BO Date (calculated from `opening_date - beneficial_occupation_days`)
- The main TenantList already uses a 56-day (8 week) equipment deadline: `equipmentDeadline = addDays(beneficialDate, -56)`
- Existing DB/Lighting order dates are manual entries only
- No delivery date fields currently exist in the database

## Proposed Changes

### 1. Database Schema Updates
Add 4 new columns to the `tenants` table:

| Column | Type | Description |
|--------|------|-------------|
| `db_last_order_date` | date | Auto-calculated: 40 business days before BO |
| `db_delivery_date` | date | Auto-calculated: 40 business days before BO |
| `lighting_last_order_date` | date | Auto-calculated: 40 business days before BO |
| `lighting_delivery_date` | date | Auto-calculated: 40 business days before BO |

### 2. Date Calculation Logic
Create a utility function using date-fns `subBusinessDays`:

```text
subBusinessDays(boDate, 40)  // 8 weeks x 5 weekdays = 40 business days
```

This will skip weekends (Saturday/Sunday) automatically.

### 3. UI Updates - ContractorTenantTracker.tsx

Modify the table to display new date columns with visual styling:

| DB | Lighting |
|----|----------|
| Last Order: 15 Feb 2026 | Last Order: 15 Feb 2026 |
| Delivery: 15 Feb 2026 | Delivery: 15 Feb 2026 |

Color coding:
- **Red**: Date has passed (overdue)
- **Amber**: Within 14 days
- **Gray**: Future date (on track)

### 4. Auto-Population Trigger

When BO Date is set/updated (in admin TenantDialog or via bulk operations):
1. Calculate the 4 deadline dates using `subBusinessDays`
2. Persist to database alongside the BO Date
3. Real-time subscription will update Contractor Portal automatically

---

## Technical Implementation

### Files to Create

#### `src/utils/dateCalculations.ts`
Centralized utility for business day calculations:
- `calculateOrderDeadlines(boDate: Date)` - Returns all 4 calculated dates
- `getDeadlineStatus(date: Date)` - Returns 'overdue' | 'approaching' | 'normal'

### Files to Modify

#### `src/components/contractor-portal/ContractorTenantTracker.tsx`
- Add new table columns for Last Order and Delivery dates (DB and Lighting)
- Fetch new date fields from database
- Apply conditional styling based on deadline status
- Update TypeScript `Tenant` interface

#### `src/components/tenant/TenantDialog.tsx`
- Add auto-calculation of deadline dates when `opening_date` or `beneficial_occupation_days` changes
- Persist calculated dates to database on save

#### `src/components/tenant/TenantList.tsx`
- Update bulk opening date handler to also calculate and save deadline dates
- Display new deadline columns if desired

### Database Migration
```sql
ALTER TABLE public.tenants
ADD COLUMN db_last_order_date date,
ADD COLUMN db_delivery_date date,
ADD COLUMN lighting_last_order_date date,
ADD COLUMN lighting_delivery_date date;
```

---

## Visual Design

### Contractor Portal Table Layout

```text
+------------+-------------+------------+------------------+------------------+
| Shop       | Tenant Name | BO Date    | DB Deadlines     | Lighting Deadlines|
+------------+-------------+------------+------------------+------------------+
| S001       | ABC Store   | 15 Apr 26  | Order: 04 Feb 26 | Order: 04 Feb 26 |
|            |             | 30d left   | Deliv: 04 Feb 26 | Deliv: 04 Feb 26 |
+------------+-------------+------------+------------------+------------------+
```

Each deadline cell will show:
- Date in "dd MMM yy" format
- Status indicator (color-coded dot or badge)
- Days remaining/overdue as subtext

---

## Edge Cases

1. **No BO Date Set**: Deadline columns display "—" (dash)
2. **Past BO Date**: Show in red with "Overdue" status
3. **Weekends Properly Skipped**: Using `subBusinessDays` from date-fns v3.6.0+
4. **Real-time Updates**: Contractor Portal auto-refreshes via existing subscription

---

## Post-Implementation Improvements

After implementing this feature, consider:
1. **Add email notifications** when deadlines are approaching (7 days warning)
2. **Export deadline report** to PDF/Excel for procurement planning
3. **Allow manual override** of calculated dates for special cases
4. **Add holiday calendar** integration for more accurate business day calculations
 
 ---
 
 ## Implementation Status: ✅ COMPLETED
 
 The feature has been implemented with:
 
 1. ✅ Database migration adding 4 new columns to `tenants` table
 2. ✅ `src/utils/dateCalculations.ts` - Utility functions using `subBusinessDays(boDate, 40)`
 3. ✅ `ContractorTenantTracker.tsx` - New deadline columns with color-coded status indicators
 4. ✅ `TenantDialog.tsx` - Auto-calculation when saving tenant with opening date
 5. ✅ `TenantList.tsx` - Bulk opening date handler now also calculates all deadline dates

