## Add Duplicate & Delete for Cost Reports

Add per-report actions on each card in the "All Reports" tab of `src/pages/CostReports.tsx`.

### UI changes (`src/pages/CostReports.tsx`)
- Add a `DropdownMenu` trigger (3-dot `MoreVertical` icon button) in the top-right of each report `Card`, replacing/sitting alongside the current FileText icon.
- Stop click propagation on the menu trigger so clicking it doesn't navigate into the report.
- Menu items:
  - **Duplicate** — runs duplicate mutation, then navigates to the new report.
  - **Delete** — opens `ConfirmDeleteDialog` (per project standard) titled "Delete Cost Report #N?" with a warning that all categories, line items, variations, and PDFs will be permanently removed.

### Delete
- Single `supabase.from("cost_reports").delete().eq("id", report.id)` call.
- DB cascades already handle `cost_categories` → `cost_line_items`, `cost_report_details`, `cost_report_pdfs`, `cost_variations` → `cost_variation_history` / `variation_line_items`.
- On success: invalidate `["cost-reports", projectId]`, toast success.

### Duplicate
Client-side sequential copy (keeps RLS, no migration needed):

1. Fetch source report row.
2. Compute next `report_number` = `max(report_number) + 1` for the project (the `(project_id, report_number)` unique constraint requires this).
3. Insert new `cost_reports` row copying all fields except `id`, `report_number`, `created_at`, `updated_at`, `created_by` (set to current user). Append " (Copy)" — actually keep `project_name` unchanged; the report number differentiates them.
4. Fetch source `cost_categories` (with their `cost_line_items`); insert new categories under the new report id, then bulk-insert line items remapped to the new category ids.
5. Fetch source `cost_report_details` row (if present) and insert a copy for the new report id.
6. Fetch source `cost_variations` (with their `variation_line_items`); insert new variations under the new report id, then bulk-insert variation line items remapped to new variation ids.
7. Skip `cost_report_pdfs` (those are generated artifacts of the original).
8. Skip `cost_variation_history` (audit trail belongs to the original).
9. On success: invalidate `["cost-reports", projectId]`, toast, optionally navigate to the new report.

Wrap the whole duplicate in a `useMutation`; if any step after step 3 fails, delete the newly created report row (cascade will clean partial children) and surface the error.

### Files touched
- `src/pages/CostReports.tsx` — menu, dialog, mutations.

No DB migration required.
