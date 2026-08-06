# PDF Export Documentation Index

> Updated 2026-08-06 as part of the PDF standardization pass. The previous
> version of this index referenced `pdfCoverPage.ts`, `fetchCompanyDetails()`
> and `generateCoverPage()` — none of which exist in this codebase.

## The one true pipeline

All PDF exports in this app run on the **client-side SVG → jsPDF engine**:

| Need | Go to |
|------|-------|
| Generate + download + persist a report (progress, retries, history record, optional preview) | `src/hooks/useSvgPdfReport.ts` |
| Convert SVG pages to a PDF blob / trigger a plain download | `src/utils/svg-pdf/svgToPdfEngine.ts` (`svgPagesToPdfBlob`, `svgPagesToDownload`) |
| Standard cover page, headers/footers, tables, text pages, brand palette | `src/utils/svg-pdf/sharedSvgHelpers.ts` |
| A builder for an existing report type | `src/utils/svg-pdf/<type>PdfBuilder.ts` (29 builders) |
| Supabase fetches inside a build function | `src/utils/svg-pdf/fetchStrict.ts` (`throwOnError` — never export an empty PDF on a failed query) |
| Filenames | `src/utils/pdfFilenameGenerator.ts` (`composeReportStorageFilename` — sanitized, revision + timestamp, single `.pdf`) |
| Preview-before-save dialog | `src/components/pdf/SvgPdfPreviewDialog.tsx` (opt-in with `preview: true` in the persist config) |
| Structural compliance checks | `src/utils/svg-pdf/complianceChecker.ts` (runs in CI: `npm run test:pdf-compliance`; also on the admin /pdf-compliance page) |

## Adding a new PDF export

1. Create `src/utils/svg-pdf/<yourType>PdfBuilder.ts`; compose pages from
   `sharedSvgHelpers` (`buildStandardCoverPageSvg`, `buildTablePages`,
   `buildTextPages`, `applyPageFooters`, ...).
2. In your component, call `useSvgPdfReport().generateAndPersist(buildFn, config)`
   with a storage bucket + history table, or `svgPagesToDownload` for
   download-only exports (always wrap in try/catch + toast).
3. Wrap every Supabase query in the build function with `throwOnError`.
4. Register the builder in `complianceChecker.ts` with mock data so it is
   covered by the automated structural checks.

## Mandatory rules

- One engine: **SVG → jsPDF**. No PDFShift, no pdfmake, no html2canvas, no
  new direct-jsPDF paths.
- The only documented exception is
  `src/components/floor-plan/utils/pdfGenerator.ts` (see its header).
- Portfolio-wide requirements: `APPS/PDF-STANDARD/STANDARD.md`.

## Working examples

- Persisted report with preview: `src/components/cost-reports/SvgPdfExportButton.tsx`
- Persisted report: `src/components/cable-schedules/CableScheduleExportPDFButton.tsx`
- Download-only: `src/components/contractor-portal/ContractorPortalExportButton.tsx`
- Static guide documents: `src/utils/svg-pdf/guidePdfBuilder.ts`
  (used by `BulkServicesSettingsOverview`)

> Note: `PDF_QUICK_START.md` and `PDF_EXPORT_STANDARDS.md` in this directory
> predate the SVG engine and are retained for history only — see the
> deprecation banners at the top of each.
