

# Comprehensive PDF Generation Audit and Specification Pipeline

## The Problem You Raised

The previous plan only addressed 4 of the PDFShift-based edge functions for header/footer/page-break fixes. It did **not**:
- Catalogue every PDF generation process in the project
- Compare them against each other for consistency gaps
- Address client-side generators that have the same issues
- Create a binding specification that prevents recurrence
- Establish a pipeline/checklist for future development

This plan does all of the above.

---

## Complete PDF Generation Inventory

### A. Server-Side Edge Functions (PDFShift HTML-to-PDF)

| # | Function | Lines | Header/Footer | Page Numbers | Row Break Protection | Cover Page |
|---|----------|-------|---------------|-------------|---------------------|------------|
| 1 | `generate-tenant-tracker-pdf` | 1036 | Manual (broken) | Hardcoded "Page 3" | Missing | Yes |
| 2 | `generate-cable-schedule-pdf` | 652 | Manual (broken) | Hardcoded | Missing | Yes |
| 3 | `generate-floor-plan-pdf` | 665 | Manual (broken) | Hardcoded | Missing | Yes |
| 4 | `generate-generator-report-pdf` | 940 | Manual (broken) | Hardcoded | Missing | Yes |
| 5 | `generate-cost-report-pdf` | 1224 | pdfmake (server) | pdfmake auto | pdfmake auto | Yes |
| 6 | `generate-bulk-services-pdf` | 569 | Manual (broken) | Hardcoded | Missing | Yes |
| 7 | `generate-electrical-budget-pdf` | ~130 | None (pass-through) | None | None | Via client HTML |
| 8 | `generate-verification-certificate-pdf` | 480 | Manual HTML | Manual | Missing | Partial |
| 9 | `generate-tenant-evaluation-pdf` | ~330 | pdfmake (server) | pdfmake auto | pdfmake auto | Yes |
| 10 | `generate-roadmap-pdf` | ~1100 | pdfmake (server) | pdfmake auto | pdfmake auto | Yes |
| 11 | `generate-template-pdf` | 142 | None | None | None | None |
| 12 | `generate-pdf-pdfshift` | ~140 | Configurable | Configurable | Not enforced | N/A (generic) |
| 13 | `generate-portal-summary-email` | 633 | HTML email only | N/A | N/A | N/A (email) |

### B. Client-Side Generators (in-browser)

| # | Component | Engine | Header/Footer | Page Numbers | Row Break | Cover Page |
|---|-----------|--------|---------------|-------------|-----------|------------|
| 14 | `SpecificationExportPDFButton.tsx` | jsPDF + autoTable | None | Manual loop | None | Yes (legacy) |
| 15 | `GeneratorReportExportPDFButton.tsx` | jsPDF + autoTable | None | Manual loop | None | Yes (legacy) |
| 16 | `TenantCompletionExportPDFButton.tsx` | jsPDF + autoTable | None | Manual loop | None | Yes (legacy) |
| 17 | `TenantReportGenerator.tsx` | jsPDF + autoTable | None | Manual loop | None | Yes (legacy) |
| 18 | `GeneratePayslipDialog.tsx` | jsPDF + autoTable | None | None | None | None |
| 19 | `ProjectOutlineExportPDFButton.tsx` | pdfmake + jsPDF dual | Depends on toggle | Depends | Depends | Yes |
| 20 | `TaskExportPDFButton.tsx` | pdfmake | pdfmake auto | pdfmake auto | pdfmake auto | Yes |
| 21 | `CostPredictor.tsx` (exportPredictionPDF) | jsPDF | None | None | None | Yes (legacy) |
| 22 | `reportBuilderPdfExport.ts` (Lighting) | pdfmake | pdfmake auto | pdfmake auto | pdfmake auto | Yes |
| 23 | `sectionPdfExport.ts` (Final Account) | jsPDF + autoTable | None | Manual | None | Yes (legacy) |
| 24 | `ElectricalBudgetExportPDFButton.tsx` | PDFShift via edge fn | Via HTML | Via HTML | Via HTML | Yes (client HTML) |
| 25 | `BulkServicesExportPDFButton.tsx` | PDFShift via edge fn | Via HTML | Via HTML | Via HTML | Yes (client HTML) |

**Total: 25 distinct PDF generation processes**

---

## Gap Analysis Summary

### Issues Found Across ALL Generators

1. **No running headers on continuation pages** -- affects #1, 2, 3, 4, 6, 7, 8, 14, 15, 16, 17, 18, 21, 23
2. **Hardcoded or missing page numbers** -- affects #1, 2, 3, 4, 6, 7, 8, 11, 14, 15, 16, 17, 18, 21, 23
3. **Table rows splitting across pages** -- affects #1, 2, 3, 4, 6, 7, 8, 14, 15, 16, 17, 18, 23, 24, 25
4. **Three different engines** (jsPDF, pdfmake, PDFShift) with no shared rules
5. **No specification document** that enforces these rules
6. **No validation pipeline** for new PDF generators

---

## Solution: Two-Part Approach

### Part 1 -- PDF Generation Specification Document

Create a single authoritative specification file (`src/utils/pdfmake/PDF_GENERATION_SPEC.md`) that every current and future PDF process must comply with. This becomes the "law" -- referenced in code comments, checked during development.

**Specification Rules:**

1. **Running Header** (all pages except cover): Must display Project Name, Report Title, and Date
2. **Running Footer** (all pages except cover): Must display `Page X of Y` using automatic counters (never hardcoded)
3. **Table Row Integrity**: `page-break-inside: avoid` on all `tr` elements; `thead` must repeat via `display: table-header-group`
4. **Cover Page Exclusion**: Header/footer hidden on page 1 via conditional rendering
5. **Margins**: Top 25mm (header space), Bottom 22mm (footer space), Left/Right 15mm
6. **Font Stack**: System fonts only (no external font loading that could fail)
7. **Engine-Specific Implementation**:
   - PDFShift: Use `displayHeaderFooter`, `headerTemplate`, `footerTemplate`
   - pdfmake: Use `header`, `footer` function callbacks with `currentPage`/`pageCount`
   - jsPDF (legacy): Use `addPageNumbers()` loop + `autoTable.didDrawPage` hooks

### Part 2 -- Apply Fixes Across All 25 Generators

#### Tier 1: PDFShift Edge Functions (highest impact, fixes the email reports)

Apply `displayHeaderFooter` + `headerTemplate` + `footerTemplate` + CSS row-break protection to:
- `generate-tenant-tracker-pdf` (#1)
- `generate-cable-schedule-pdf` (#2)
- `generate-floor-plan-pdf` (#3)
- `generate-generator-report-pdf` (#4)
- `generate-bulk-services-pdf` (#6)
- `generate-electrical-budget-pdf` (#7)
- `generate-verification-certificate-pdf` (#8)

#### Tier 2: Shared PDFShift Utility

Create a shared helper (`supabase/functions/_shared/pdfStandards.ts`) that provides:
- Standard `headerTemplate` builder function
- Standard `footerTemplate` builder function
- Standard CSS block (row-break, thead repeat, margin rules)
- Standard PDFShift payload builder with enforced margins

Every PDFShift edge function imports from this shared file instead of defining its own. This is the **pipeline** -- all future PDFShift functions import and use the shared standards automatically.

#### Tier 3: Client-Side jsPDF Generators

For the 8 legacy jsPDF components (#14-18, 21, 23), add:
- `autoTable` `didDrawPage` callback for running headers
- Post-generation page number loop (already partially exists but inconsistent)
- `rowPageBreak: 'avoid'` in autoTable config

#### Tier 4: Client-Side pdfmake Generators

Already mostly compliant (#19, 20, 22). Verify and add `header`/`footer` callbacks where missing.

---

## Pipeline for Future Development

### Shared Standards File

```text
supabase/functions/_shared/pdfStandards.ts
```

Contains:
- `getStandardHeaderTemplate(projectName, reportTitle)` -- returns HTML string
- `getStandardFooterTemplate(reportDate)` -- returns HTML string
- `getStandardCSS()` -- returns CSS block with all break/repeat rules
- `buildPDFShiftPayload(html, options)` -- returns complete payload with enforced header/footer/margins

Any new edge function that generates a PDF simply calls:
```text
import { buildPDFShiftPayload } from '../_shared/pdfStandards.ts';
const payload = buildPDFShiftPayload(html, { projectName, reportTitle, reportDate });
```

### Client-Side Standards

The existing `src/utils/pdfmake/engine/` already serves as the unified client-side pipeline. For jsPDF legacy code, add a `src/utils/pdf/jspdfStandards.ts` file with:
- `addRunningHeader(doc, text)` -- `didDrawPage` callback factory
- `addRunningFooter(doc)` -- page number loop
- `getAutoTableDefaults()` -- returns config with `rowPageBreak: 'avoid'`

### Compliance Checklist (added to spec doc)

Every PDF generator must pass these checks before deployment:

```text
[ ] Uses shared header/footer templates (not manual HTML)
[ ] Page numbers are automatic (not hardcoded)
[ ] Table rows do not split across pages
[ ] Cover page has no header/footer overlay
[ ] Margins are 25mm top, 22mm bottom, 15mm left/right
[ ] Filename is sanitized via getDownloadFilename or regex
[ ] PDF opens correctly in Chrome, Edge, and Adobe Reader
```

---

## Technical Changes Summary

### New Files
1. `supabase/functions/_shared/pdfStandards.ts` -- Shared PDFShift standards (header, footer, CSS, payload builder)
2. `src/utils/pdf/jspdfStandards.ts` -- Shared jsPDF standards (running header/footer hooks)
3. `src/utils/pdfmake/PDF_GENERATION_SPEC.md` -- The authoritative specification document

### Modified Files (Tier 1 -- Edge Functions)
4. `supabase/functions/generate-tenant-tracker-pdf/index.ts` -- Import shared standards, replace manual footer
5. `supabase/functions/generate-cable-schedule-pdf/index.ts` -- Same
6. `supabase/functions/generate-floor-plan-pdf/index.ts` -- Same
7. `supabase/functions/generate-generator-report-pdf/index.ts` -- Same
8. `supabase/functions/generate-bulk-services-pdf/index.ts` -- Same
9. `supabase/functions/generate-electrical-budget-pdf/index.ts` -- Same
10. `supabase/functions/generate-verification-certificate-pdf/index.ts` -- Same

### Modified Files (Tier 3 -- Client-Side jsPDF)
11. `src/components/specifications/SpecificationExportPDFButton.tsx` -- Add running header/footer
12. `src/components/tenant/GeneratorReportExportPDFButton.tsx` -- Add running header/footer
13. `src/components/handover/TenantCompletionExportPDFButton.tsx` -- Add running header/footer
14. `src/components/tenant/TenantReportGenerator.tsx` -- Add running header/footer
15. `src/components/hr/GeneratePayslipDialog.tsx` -- Add running header/footer
16. `src/utils/sectionPdfExport.ts` -- Add running header/footer
17. `src/utils/exportPredictionPDF.ts` -- Add running header/footer

### No database changes required.

---

## Suggested Follow-Up Improvements

- Migrate all remaining jsPDF generators to pdfmake to reduce the number of standards to maintain from 3 engines to 2
- Add a visual regression test that generates each PDF type and compares page count / structure
- Add the compliance checklist as a comment block at the top of every PDF generator file
- Create a Storybook-style preview page where all report types can be generated and visually inspected side by side
