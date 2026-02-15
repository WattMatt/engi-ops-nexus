

# Fix Build Errors Across the Application

The application specification you shared is consistent with what's already in the codebase -- no new structural changes are needed from it. However, there are **~30 build errors** across multiple files that need fixing. Here's the plan organized by error category:

---

## 1. Create Missing `src/types/cableTypes.ts` Module

**Problem:** `src/utils/cableSizing.ts` and `src/utils/cableValidation.ts` import `ValidationWarning` from `../types/cableTypes`, but this file doesn't exist.

**Fix:** Create `src/types/cableTypes.ts` exporting the `ValidationWarning` interface (likely `{ message: string; severity: string; code?: string }`), derived from how it's used in `cableValidation.ts`.

---

## 2. Fix `useOfflineSync` Return Type Mismatch

**Problem:** `OfflineSyncIndicator.tsx` and `offlineScenarios.test.tsx` destructure `pendingCount`, `lastSyncAt`, and `lastError` from `useOfflineSync()`, but the hook only returns `queueSize`, not those properties.

**Fix:** Add `pendingCount` (alias for `queueSize`), `lastSyncAt`, and `lastError` to the `useOfflineSync` hook's return value.

---

## 3. Fix `InspectionForm` Type Error

**Problem:** The form data passed to `createInspection()` has optional `title`, but `InspectionData` requires it.

**Fix:** Cast or assert the validated form data before passing it to `createInspection`, since zod validation guarantees `title` is present.

---

## 4. Fix `InspectionList` / `useOfflineInspections` Supabase Type Errors

**Problem:** The `inspections` and `sites` tables don't exist in the Supabase schema, so `.from('inspections')` and `.from('sites')` fail type checking.

**Fix:** Use `.from('inspections' as any)` and `.from('sites' as any)` type assertions as these are forward-looking tables not yet in the schema. This silences TypeScript while preserving runtime intent.

---

## 5. Fix Edge Function `error.message` on `unknown` Type

**Problem:** Two edge functions catch `error` as `unknown` but access `error.message` directly.

**Fix:** Cast to `(error as Error).message` in both:
- `supabase/functions/notify-expiring-portal-tokens/index.ts` (line 269)
- `supabase/functions/send-legend-card-notification/index.ts` (line 60)

---

## 6. Fix `UniversalFloorPlanViewer` `.state` Access

**Problem:** `react-zoom-pan-pinch` v3 no longer exposes `.state` on the render prop ref.

**Fix:** Remove the `state` destructure from the render callback and use the component's built-in API instead.

---

## 7. Fix `PDFService.ts` Type Errors

**Problem:** Multiple issues:
- `project.address` doesn't exist on the projects table type
- `pageMargins` not in `DocumentBuilderOptions`
- `name` not in `CompanyDetails`
- `costReport.total_budget` doesn't exist
- `generateCostReportPDF` receives wrong argument type

**Fix:** Update field references to match the actual database schema (e.g., use `project.city` instead of `address`), fix the `CompanyDetails` object shape, and correct the `generateCostReportPDF` call signature.

---

## 8. Fix `ReportConfig` Duplicate Export

**Problem:** Both `src/types/common.ts` and `src/types/PDFServiceTypes.ts` export `ReportConfig`, causing ambiguity in `src/types/index.ts`.

**Fix:** Rename one of them (e.g., `PDFReportConfig` in `PDFServiceTypes.ts`) or use explicit re-exports in `index.ts`.

---

## 9. Fix Test File (`offlineScenarios.test.tsx`)

**Problem:** Test passes arguments to `useOfflineSync()` which accepts none, and references `pendingCount`.

**Fix:** Update test to match the current hook signature after fix #2 is applied.

---

## Technical Summary

| # | File(s) | Error Type | Fix |
|---|---------|-----------|-----|
| 1 | `src/types/cableTypes.ts` | Missing module | Create file |
| 2 | `useOfflineSync.ts` | Missing return props | Add aliases |
| 3 | `InspectionForm.tsx` | Optional vs required | Type assertion |
| 4 | `InspectionList.tsx`, `useOfflineInspections.ts`, `useOfflineSync.ts` | Unknown table | `as any` casts |
| 5 | 2 edge functions | `unknown` error | `as Error` cast |
| 6 | `UniversalFloorPlanViewer.tsx` | Removed API | Remove `.state` |
| 7 | `PDFService.ts` | Schema mismatch | Fix field names |
| 8 | `types/index.ts` | Duplicate export | Rename/re-export |
| 9 | `offlineScenarios.test.tsx` | Stale test | Update test |

All fixes are non-breaking and preserve existing runtime behavior.

