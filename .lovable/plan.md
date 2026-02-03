
# Procurement System Rationalization Plan
## Avoiding Duplication Between Tenant Tracker and Procurement

---

## Problem Summary

Currently there are **two places** where tenant DB and lighting ordering could be tracked:

| System | What It Tracks | Data Fields |
|--------|---------------|-------------|
| **Tenant Tracker** | Per-tenant DB & Lighting status | `db_ordered`, `db_order_date`, `db_cost`, `lighting_ordered`, `lighting_order_date`, `lighting_cost` |
| **Procurement System** | General items with pipeline status | Full workflow: Quoting → Ordered → In Transit → Delivered |

If a user creates a procurement item for "Shop 101 DB Panel" AND marks `db_ordered` in the tenant record, you have **duplicate data** that can get out of sync.

---

## Recommended Approach

### Clear Separation of Concerns

```text
┌─────────────────────────────────────────────────────────────┐
│                    TENANT TRACKER                           │
│  (Per-Tenant Items - DBs & Lighting)                       │
├─────────────────────────────────────────────────────────────┤
│  • db_ordered, db_order_date, db_cost                      │
│  • lighting_ordered, lighting_order_date, lighting_cost    │
│  • Quick checkbox-based progress tracking                   │
│  • Linked to tenant schedule and handover                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  PROCUREMENT SYSTEM                         │
│  (General Infrastructure & Major Equipment)                │
├─────────────────────────────────────────────────────────────┤
│  Location Groups:                                           │
│  • General - Main switchgear, transformers, generators     │
│  • Back of House - Plant room equipment, cables            │
│  • Front of House - Common area equipment, signage         │
│                                                             │
│  Features:                                                  │
│  • Full status pipeline with history                        │
│  • PO numbers, tracking, supplier details                   │
│  • Delivery calendar and confirmations                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Implementation Changes

### 1. Remove "Tenant" from Procurement Location Groups

Since tenant DBs and lighting are tracked in the tenant schedule, we should:

- Remove the "Tenant" location group option from procurement
- Keep only: **General**, **Back of House**, **Front of House**
- Remove the tenant dropdown from procurement item forms

### 2. Enhance Tenant Tracker with Order Dates

The contractor portal tenant tracker currently only shows checkboxes. Enhance it to show:

- DB order date (if ordered)
- Lighting order date (if ordered)
- Cost values (optional, for PM visibility)

### 3. Update Add/Edit Procurement Dialogs

- Remove `tenant_id` field from `AddProcurementItemDialog`
- Remove `tenant_id` field from `EditProcurementItemDialog`
- Update location group options to exclude "Tenant"

### 4. Add Tenant Order Details to Tenant Dialog

Ensure the tenant dialog in project settings includes:
- `db_order_date` field
- `lighting_order_date` field
- (Already has `db_cost` and `lighting_cost`)

---

## Files to Modify

| File | Change |
|------|--------|
| `AddProcurementItemDialog.tsx` | Remove tenant dropdown and "Tenant" location group |
| `EditProcurementItemDialog.tsx` | Remove tenant dropdown and "Tenant" location group |
| `ProcurementTrackingSettings.tsx` | Remove tenant column from table |
| `ContractorTenantTracker.tsx` | Add order dates to table display |
| `TenantDialog.tsx` | Add `db_order_date` and `lighting_order_date` fields |

---

## Database Changes

No schema changes needed - the `tenants` table already has `db_order_date` and `lighting_order_date` columns. We just need to expose them in the UI.

The `tenant_id` and `location_group` columns in `project_procurement_items` can remain (for any edge cases), but the UI will no longer offer the "Tenant" option.

---

## UI Updates

### Contractor Portal - Tenant Tracker (Enhanced)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Shop │ Name       │ Connection │ SOW │ Layout │ DB           │ Lighting  │
├──────┼────────────┼────────────┼─────┼────────┼──────────────┼───────────┤
│ 101  │ Coffee Co  │ 60A TP     │ ✓   │ ✓      │ ✓ 15 Jan     │ ✓ 18 Jan  │
│ 102  │ Bakery     │ 40A TP     │ ✓   │ ✓      │ ✓ 15 Jan     │ —         │
│ 103  │ Boutique   │ 20A SP     │ ✓   │ —      │ —            │ —         │
└──────┴────────────┴────────────┴─────┴────────┴──────────────┴───────────┘
                                                  ^               ^
                                           Shows order date   Shows order date
                                           when checked       when checked
```

### Procurement - Location Groups (Simplified)

```text
┌─────────────────────────────────────────────────┐
│ Location Group                                  │
├─────────────────────────────────────────────────┤
│  ○ General        - Main infrastructure         │
│  ○ Back of House  - Plant room, services        │
│  ○ Front of House - Common areas, mall          │
└─────────────────────────────────────────────────┘
```

---

## Alternative Approach (If Tenant Procurement Needed)

If there's a need to track tenant items in the full procurement pipeline (with status history, PO tracking, etc.), we could instead:

1. Keep the tenant link in procurement
2. **Sync** procurement status changes back to the tenant record:
   - When procurement item reaches "Ordered" → set `db_ordered = true`
   - When procurement item reaches "Delivered" → could add `db_delivered` field
3. Display a warning if user tries to create a tenant DB/Lighting item when one already exists

This is more complex but provides the full pipeline for tenant items. Let me know if this alternative approach is preferred.

---

## Summary

The recommended approach is:

| Item Type | Track In | Why |
|-----------|----------|-----|
| Tenant DBs | Tenant Schedule | Simple checkboxes, linked to handover, already has cost fields |
| Tenant Lighting | Tenant Schedule | Same as above |
| Transformers | Procurement | General infrastructure, needs full tracking |
| Main Switchgear | Procurement | General infrastructure, needs full tracking |
| Generator Sets | Procurement | General infrastructure, needs full tracking |
| Plant Room Equipment | Procurement (BOH) | Back of house, needs supplier/delivery tracking |
| Common Area Lights | Procurement (FOH) | Front of house, shared areas |

This keeps data in one place and avoids confusion about which system to update.
