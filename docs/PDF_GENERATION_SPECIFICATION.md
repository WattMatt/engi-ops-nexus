# PDF Generation — Architecture Pointer

> **This document was replaced on 2026-08-06.**
>
> The previous content of this file described a **PDFShift (HTML → server-side
> render) architecture that this application does not have and never had** — it
> was cross-pollinated from the greencalc / WM_Solar_Web project. Anyone
> following it would have built the wrong thing.

## The actual architecture of this app

All PDF generation in WM_Office_Web (engi-ops-nexus) is **client-side
SVG → jsPDF**:

| Layer | Where |
|-------|-------|
| Central pipeline hook (build → convert → download → upload → history record, progress, retries, optional preview) | `src/hooks/useSvgPdfReport.ts` |
| Engine (SVG pages → multi-page vector PDF via jsPDF + svg2pdf.js) | `src/utils/svg-pdf/svgToPdfEngine.ts` |
| Shared page furniture (cover page, headers/footers, tables, text pages, palette) | `src/utils/svg-pdf/sharedSvgHelpers.ts` |
| Per-document builders (one file per report type) | `src/utils/svg-pdf/*PdfBuilder.ts` |
| Strict fetch helper for build functions (no silent-empty PDFs) | `src/utils/svg-pdf/fetchStrict.ts` |
| Filename composition (sanitized, revision + timestamp, single `.pdf`) | `src/utils/pdfFilenameGenerator.ts` |
| Preview-before-save dialog (opt-in via `preview: true`) | `src/components/pdf/SvgPdfPreviewDialog.tsx` |
| Structural compliance checks (also run in CI via vitest) | `src/utils/svg-pdf/complianceChecker.ts` |

**Documented exception:** `src/components/floor-plan/utils/pdfGenerator.ts`
still uses direct jsPDF (raster floor-plan imagery); see the header comment in
that file.

## Portfolio standard

The cross-app PDF standard (architecture, data, branding, delivery,
security, UX, and testing requirements) lives at:

```
APPS/PDF-STANDARD/STANDARD.md
```

New PDF features MUST follow that standard and use the SVG engine above —
do **not** introduce PDFShift, pdfmake, html2canvas, or new direct-jsPDF
paths.
