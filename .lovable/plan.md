

# SVG-to-PDF Report Generation: Proof of Concept + Cost Report Toggle

## Overview

This plan introduces an experimental SVG-based report rendering pipeline alongside the existing pdfmake/PDFShift system. The idea is to build report pages as SVG elements (giving pixel-perfect layout control, native vector graphics, and easy charting), then convert them to PDF using the `svg2pdf.js` + `jsPDF` library combination. A toggle in the Cost Report's "Reports" tab lets users switch between the current PDF engine and the new SVG engine.

## Why SVG-to-PDF?

- **Pixel-perfect control**: SVG gives exact positioning of text, shapes, and graphics -- no pdfmake layout engine quirks.
- **Native vector charts**: Donut charts, bar charts, and KPI cards can be rendered as SVG natively without canvas capture.
- **Browser preview**: The same SVG can be displayed inline as a live preview before converting to PDF.
- **Consistency**: What you see in the SVG is exactly what ends up in the PDF.

## Implementation Steps

### 1. Install `svg2pdf.js` dependency
- Add `svg2pdf.js` (works with the existing `jspdf` package already installed).

### 2. Create SVG Report Engine utility
**New file: `src/utils/svg-pdf/svgToPdfEngine.ts`**
- Core function: takes an array of SVG elements (one per page), converts each to a jsPDF page using `svg2pdf.js`.
- Handles A4 page sizing (595.28 x 841.89 pt).
- Returns a Blob or triggers download.

### 3. Create SVG Cost Report Builder
**New file: `src/utils/svg-pdf/costReportSvgBuilder.ts`**
- Builds SVG strings/elements for each report section:
  - **Cover Page**: Company branding, project name, report number, revision, date.
  - **Executive Summary**: Category table rendered as SVG `<rect>` + `<text>` elements.
- This is a proof-of-concept -- initially only the Cover Page and Executive Summary will be rendered in SVG format.

### 4. Create a test/demo component
**New file: `src/components/cost-reports/SvgPdfTestButton.tsx`**
- A button component that generates a test SVG report and converts it to PDF.
- Includes a live SVG preview panel so users can see the output before downloading.
- Shows generation time and file size for benchmarking against the existing engine.

### 5. Add SVG/PDF toggle to Cost Report "Reports" tab
**Modified file: `src/pages/CostReportDetail.tsx`**
- Add a toggle switch (or segmented control) in the Reports tab card:
  - **Standard PDF** (default): Uses the existing `ExportPDFButton` with the pdfmake fallback chain.
  - **SVG Report (Beta)**: Uses the new `SvgPdfTestButton` to generate via the SVG pipeline.
- The toggle is clearly marked as experimental/beta.

### 6. Update ExportPDFButton to accept engine prop
**Modified file: `src/components/cost-reports/ExportPDFButton.tsx`**
- Add an optional `engine` prop (`'standard' | 'svg'`).
- When `engine === 'svg'`, route through the SVG builder instead of the fallback chain.
- This keeps the same progress UI, settings dialog, and history workflow.

## Technical Details

```text
+------------------+       +-------------------+       +-----------+
| Cost Report Data | ----> | SVG Builder       | ----> | SVG Pages |
|                  |       | (cover, summary)  |       | (in-DOM)  |
+------------------+       +-------------------+       +-----------+
                                                            |
                                                            v
                                                   +----------------+
                                                   | svg2pdf.js     |
                                                   | + jsPDF         |
                                                   +----------------+
                                                            |
                                                            v
                                                   +----------------+
                                                   | PDF Blob       |
                                                   | (download/save)|
                                                   +----------------+
```

### Key technical decisions:
- **svg2pdf.js** is the most mature SVG-to-PDF library (10+ years, maintained by yWorks).
- SVG elements are created programmatically (not from DOM queries) to ensure consistency.
- Each "page" is a separate SVG with dimensions matching A4 in points.
- The existing `jspdf` package is already installed -- `svg2pdf.js` extends it with a `.svg()` method.

## Scope (Proof of Concept)

This is intentionally limited to validate the approach:
- Only **Cover Page** and **Executive Summary** sections in SVG.
- Side-by-side comparison toggle so users can evaluate quality vs. the existing engine.
- Benchmarking output (time, file size) displayed after generation.

Once validated, the SVG engine can be expanded to all report sections and other report types.

