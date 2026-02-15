

# Complete PDF Migration Roadmap

This plan catalogues every PDF generator in the application and defines a phased migration path to consolidate them onto the **client-side SVG engine** (svg2pdf.js + jsPDF) with shared branding, persistence, and report history.

---

## Current State: 3 Engines, 20+ Generators

| # | Report | Current Engine | Location | Has History | Has Cover Page |
|---|--------|---------------|----------|-------------|----------------|
| 1 | Cost Report | SVG (Baseline) | `src/utils/svg-pdf/costReportPdfBuilder.ts` | Yes | Yes |
| 2 | Final Account | SVG (Migrated) | `src/utils/svg-pdf/finalAccountPdfBuilder.ts` | Yes | Yes |
| 3 | Specification | SVG (Migrated) | `src/utils/svg-pdf/specificationPdfBuilder.ts` | Yes | Yes |
| 4 | Tenant Completion | SVG (Migrated) | `src/utils/svg-pdf/handoverCompletionPdfBuilder.ts` | Yes | Yes |
| 5 | Project Outline | SVG (Migrated) | `src/utils/svg-pdf/projectOutlinePdfBuilder.ts` | Yes | Yes |
| 6 | Site Diary | SVG (Migrated) | `src/utils/svg-pdf/siteDiaryPdfBuilder.ts` | Yes | Yes |
| 7 | Cable Schedule | PDFShift (Server) | `supabase/functions/generate-cable-schedule-pdf/` | Yes | Yes |
| 8 | Generator Report | PDFShift (Server) | `supabase/functions/generate-generator-report-pdf/` | Yes | Yes |
| 9 | Bulk Services | PDFShift (Server) | `supabase/functions/generate-bulk-services-pdf/` | Yes | Yes |
| 10 | Floor Plan | PDFShift (Server) | `supabase/functions/generate-floor-plan-pdf/` | Yes | Yes |
| 11 | Electrical Budget | PDFShift (Server) | `supabase/functions/generate-electrical-budget-pdf/` | Yes | Yes |
| 12 | Tenant Tracker | PDFShift (Server) | `supabase/functions/generate-tenant-tracker-pdf/` | Yes | Yes |
| 13 | Legend Card | PDFShift (Server) | `supabase/functions/generate-legend-card-pdf/` | Yes | Yes |
| 14 | Verification Certificate | PDFShift (Server) | `supabase/functions/generate-verification-certificate-pdf/` | Partial | Yes |
| 15 | Roadmap Review | pdfmake (Server EF) | `supabase/functions/generate-roadmap-pdf/` | Yes | Yes |
| 16 | Tenant Evaluation | pdfmake (Server EF) | `supabase/functions/generate-tenant-evaluation-pdf/` | Yes | Yes |
| 17 | Cost Report (Server) | PDFShift (Server) | `supabase/functions/generate-cost-report-pdf/` | Yes | Yes |
| 18 | AI Prediction | Legacy jsPDF (Client) | `src/utils/exportPredictionPDF.ts` | No | No |
| 19 | Template PDF | PDFShift (Server) | `supabase/functions/generate-template-pdf/` | No | No |
| 20 | Scheduled Reports | Delegates to server EFs | `supabase/functions/send-scheduled-report/` | N/A | N/A |

---

## Migration Phases

### Phase 0: Shared Engine Hardening (Foundation)
**Goal**: Close the gaps in the SVG engine so all future migrations produce spec-compliant output.

| Task | Description |
|------|-------------|
| Add Running Headers to SVG engine | Implement `withStandardHeader()` in `sharedSvgHelpers.ts` -- title left, project name right, skipping page 1 |
| Add Table of Contents builder | Reusable TOC page generator with clickable section titles and page numbers |
| Add Executive Summary template | Optional summary page between cover and content |
| Add native SVG chart helpers | Donut, bar, and gauge chart SVG generators for reuse across reports |
| Update `useSvgPdfReport` hook | Add progress callbacks, error recovery, and retry logic |

### Phase 1: Simple Client-Side Migrations (Low Risk)
**Goal**: Migrate the simplest remaining client-side report.

| # | Report | Effort | Notes |
|---|--------|--------|-------|
| 1 | AI Prediction PDF | Small | Currently legacy jsPDF with no history. Create `aiPredictionPdfBuilder.ts`, add DB table + bucket, wire up `useSvgPdfReport` |

### Phase 2: Server-to-Client Migration -- Data-Heavy Reports (Medium Risk)
**Goal**: Move PDFShift reports that are primarily tables/data to client-side SVG.

| # | Report | Effort | Key Challenge |
|---|--------|--------|---------------|
| 2 | Cable Schedule | Medium | Landscape tables, many columns. Need paginated table support |
| 3 | Tenant Tracker | Medium | Multi-tenant data grid |
| 4 | Legend Card | Medium | Circuit layout tables, contactor data |
| 5 | Verification Certificate | Small | Simple certificate layout |
| 6 | Electrical Budget | Large | Complex BOQ sections, multi-level hierarchy |
| 7 | Template PDF | Small | Generic template rendering |

For each report:
- Create `src/utils/svg-pdf/{name}PdfBuilder.ts`
- Create DB table + storage bucket (if not existing)
- Update export button component to use `useSvgPdfReport`
- Add `ReportHistoryPanel` integration
- Keep server Edge Function as fallback during transition

### Phase 3: Server-to-Client Migration -- Visual Reports (Higher Risk)
**Goal**: Move reports that contain charts, images, or complex visuals.

| # | Report | Effort | Key Challenge |
|---|--------|--------|---------------|
| 8 | Generator Report | Large | SVG donut charts, financial calculations |
| 9 | Bulk Services | Large | Technical calculations, potential chart captures |
| 10 | Floor Plan | Large | Floor plan image rendering, annotations |
| 11 | Cost Report (Server) | Medium | Dual-engine -- server copy serves scheduled emails. Keep server EF for email, client SVG for interactive use |

### Phase 4: pdfmake Server-Side Migration (Moderate Risk)
**Goal**: Replace pdfmake Edge Functions with client-side SVG.

| # | Report | Effort | Key Challenge |
|---|--------|--------|---------------|
| 12 | Roadmap Review | Large | Complex multi-section report with charts, TOC, risk matrices. Most feature-rich pdfmake report |
| 13 | Tenant Evaluation | Medium | Scoring tables, comparison data |

### Phase 5: Scheduled Report Adaptation
**Goal**: Ensure `send-scheduled-report` Edge Function can work with the new engine.

| Task | Description |
|------|-------------|
| Hybrid approach | Scheduled reports run server-side (no browser). Keep lightweight server EFs that generate minimal PDFs for email, OR pre-generate PDFs client-side and store for scheduled pickup |
| Storage-first pattern | Client generates PDF on save -> stores in bucket -> scheduled job fetches latest stored PDF and emails it |

### Phase 6: Cleanup and Deprecation
**Goal**: Remove legacy code once all migrations are validated.

| Task | Description |
|------|-------------|
| Remove PDFShift dependency | Delete `generate-pdf-pdfshift` Edge Function, remove PDFSHIFT_API_KEY secret |
| Remove legacy pdfmake client code | Clean up `src/utils/pdfmake/` directory (keep engine registry if still useful) |
| Remove legacy jsPDF utilities | Clean up `src/utils/pdfExportBase.ts`, `pdfStyleManager.ts`, `pdfStandardsHelper.ts` |
| Archive migration docs | Mark `PDF_MIGRATION_STATUS.md`, `MIGRATION_CHECKLIST.md` as complete |
| Update `PDF_GENERATION_SPEC.md` | Remove multi-engine references, document SVG-only standard |

---

## Estimated Timeline

| Phase | Duration | Reports Covered |
|-------|----------|-----------------|
| Phase 0 | 1-2 sessions | Engine hardening (headers, TOC, charts) |
| Phase 1 | 1 session | AI Prediction (1 report) |
| Phase 2 | 3-4 sessions | Cable, Tenant Tracker, Legend Card, Verification, Budget, Template (6 reports) |
| Phase 3 | 3-4 sessions | Generator, Bulk Services, Floor Plan, Cost Report server (4 reports) |
| Phase 4 | 2-3 sessions | Roadmap Review, Tenant Evaluation (2 reports) |
| Phase 5 | 1-2 sessions | Scheduled report adaptation |
| Phase 6 | 1 session | Cleanup |

**Total**: ~12-16 sessions to full consolidation.

---

## Success Criteria

- All 20 report types generate via the SVG engine client-side
- Every report has: branded cover page, running header, running footer (Page X of Y), and report history
- Zero dependency on PDFShift API key
- Scheduled email reports use pre-generated PDFs from storage
- Single shared helper file (`sharedSvgHelpers.ts`) for all branding standards
- `PDF_GENERATION_SPEC.md` updated to reflect SVG-only architecture

---

## Technical Details

### New files per migration (template)
```
src/utils/svg-pdf/{reportName}PdfBuilder.ts    -- SVG page builder
src/components/{module}/{Report}ExportPDFButton.tsx  -- Updated button (existing)
```

### Database migration per report (if no table exists)
```sql
CREATE TABLE public.{report_name}_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  {foreign_key}_id UUID REFERENCES public.{parent_table}(id),
  project_id UUID REFERENCES public.projects(id),
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  revision INTEGER DEFAULT 1,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.{report_name}_reports ENABLE ROW LEVEL SECURITY;
-- + INSERT storage bucket
```

### Scheduled reports strategy
The `send-scheduled-report` Edge Function currently calls other server EFs to generate PDFs on-the-fly. Post-migration, it will instead query the latest stored PDF from the relevant storage bucket, eliminating the need for server-side PDF generation entirely.

