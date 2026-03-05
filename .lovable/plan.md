

# Fix: Shared Generator Report Shows Incorrect Load Data

## The Problem

The shared report page (`ClientGeneratorReportView.tsx`) and the edge function (`get-shared-generator-report`) have a fundamental data accuracy issue: **loads are recalculated from scratch using a basic `area × kw_per_sqm` formula, completely ignoring `manual_kw_override` values that users have set on tenants.**

The internal app correctly respects `manual_kw_override` in two places:
- `GeneratorTenantList.tsx` (the tenant list UI) — checks override first, falls back to formula
- `GeneratorReportExportPDFButton.tsx` (PDF export) — same logic

But **three places get it wrong**:
1. `ClientGeneratorReportView.tsx` — the shared external page (critical — client-facing)
2. `GeneratorReport.tsx` — the internal report page's chart calculations (lines 141-152)
3. The edge function doesn't include `manual_kw_override` in the tenants query (it does `select("*")` so the data is there, but the frontend ignores it)

## The Fix

### 1. Fix `ClientGeneratorReportView.tsx` — `calculateLoading` function (lines 59-68)
Update to match the correct pattern from `GeneratorTenantList.tsx`:
- Check `tenant.manual_kw_override` first — if set, return that value
- Only fall back to `area × kw_per_sqm` if no override exists

### 2. Fix `GeneratorReport.tsx` — `calculateLoading` function (lines 141-152)
Apply the same fix so internal charts also show correct values. This ensures the internal report page matches what `GeneratorTenantList` shows.

### 3. Ensure edge function fetches tenants for all sections (not just "breakdown")
Currently tenants are only fetched when `sharedSections.includes("breakdown")`. But tenant data is needed for the **overview** section too (total kW calculation). Change to always fetch tenants when any load-related section is shared.

## Technical Details

The corrected `calculateLoading` pattern:
```typescript
const calculateLoading = (tenant: any): number => {
  if (tenant.own_generator_provided) return 0;
  if (tenant.manual_kw_override != null) return Number(tenant.manual_kw_override);
  if (!tenant.area) return 0;
  const kwPerSqm = { /* from settings */ };
  return tenant.area * (kwPerSqm[tenant.shop_category] || 0.03);
};
```

The edge function fix (line 70-72): fetch tenants when overview OR breakdown is shared:
```typescript
sharedSections.includes("breakdown") || sharedSections.includes("overview")
  ? supabase.from("tenants").select("*").eq("project_id", projectId)
  : Promise.resolve({ data: [], error: null }),
```

## Impact
- External shared reports will show correct, matching load values
- Internal report charts will align with the tenant list
- PDF exports already work correctly (no change needed)

