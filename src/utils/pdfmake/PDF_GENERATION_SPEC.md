# PDF Generation Specification v1.0

> **This is the authoritative specification for ALL PDF generation in the application.**
> Every PDF generator — regardless of engine (PDFShift, pdfmake, jsPDF) — MUST comply with these rules.

---

## 1. Running Header (All Pages Except Cover)

Every page after the cover page MUST display a running header containing:
- **Report Title** (left-aligned)
- **Project Name** (right-aligned)

### Engine-Specific Implementation

| Engine | Method |
|--------|--------|
| PDFShift | `headerTemplate` in API payload with `displayHeaderFooter: true` |
| pdfmake | `header` callback function using `currentPage` / `pageCount` |
| jsPDF | `autoTable.didDrawPage` hook or post-generation loop |

---

## 2. Running Footer (All Pages Except Cover)

Every page after the cover page MUST display a running footer containing:
- **Report Date** (left-aligned)
- **Page X of Y** (right-aligned) using automatic counters — **NEVER hardcoded**

### Engine-Specific Implementation

| Engine | Method |
|--------|--------|
| PDFShift | `footerTemplate` with `<span class="pageNumber">` / `<span class="totalPages">` |
| pdfmake | `footer` callback function using `currentPage` / `pageCount` |
| jsPDF | Post-generation `addPageNumbers()` loop |

---

## 3. Cover Page Exclusion

The cover page (page 1) MUST NOT show any running header or footer.

| Engine | Method |
|--------|--------|
| PDFShift | Conditional JS in template: hide when `pageNumber === 1` |
| pdfmake | `if (currentPage === 1) return null` in header/footer callbacks |
| jsPDF | Start page number loop from page 2 |

---

## 4. Page Margins

Standard margins for all reports:

| Position | Value | Purpose |
|----------|-------|---------|
| Top | 25mm | Room for running header |
| Bottom | 22mm | Room for running footer |
| Left | 15mm | Content margin |
| Right | 15mm | Content margin |

**Exception:** Cover pages may use `margin: 0` with full-bleed backgrounds via `@page :first`.

---

## 5. Table Integrity

All tables MUST enforce:

1. **Row break protection**: `page-break-inside: avoid` on all `<tr>` elements
2. **Header repetition**: `thead { display: table-header-group; }` to repeat column headers on every page
3. **Footer grouping**: `tfoot { display: table-footer-group; }` for total rows

### jsPDF autoTable

```typescript
autoTable(doc, {
  // ... columns/data ...
  rowPageBreak: 'avoid',
  showHead: 'everyPage',
});
```

---

## 6. Font Stack

Use system fonts only. External font loading can fail in Edge Functions.

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

**Exception:** pdfmake uses embedded Roboto (bundled, no network dependency).

---

## 7. Page Numbers — Absolute Rules

- Page numbers MUST be automatic (derived from renderer's page counter)
- Page numbers MUST follow format: `Page X of Y`
- Page numbering starts from 1 on the first page AFTER the cover
- **NEVER** hardcode page numbers in HTML (e.g., `<span>Page 3</span>`)

---

## 8. Shared Standards Pipeline

### Server-Side (PDFShift Edge Functions)

All PDFShift edge functions MUST import from the shared standards:

```typescript
import { getStandardHeaderTemplate, getStandardFooterTemplate, getStandardCSS } from '../_shared/pdfStandards.ts';
```

### Client-Side (jsPDF Legacy)

All jsPDF generators MUST import from:

```typescript
import { addRunningHeaders, addRunningFooter, getAutoTableDefaults } from '@/utils/pdf/jspdfStandards';
```

### Client-Side (pdfmake)

pdfmake generators use `withStandardHeader()` and `withStandardFooter()` from `PDFDocumentBuilder`.

---

## 9. Compliance Checklist

Every PDF generator MUST pass these checks before deployment:

- [ ] Uses shared header/footer templates (not manual HTML)
- [ ] Page numbers are automatic (not hardcoded)
- [ ] Table rows do not split across pages
- [ ] Cover page has no header/footer overlay
- [ ] Margins are 25mm top, 22mm bottom, 15mm left/right
- [ ] Filename is sanitized (no special characters, `.pdf` extension enforced)
- [ ] PDF opens correctly in Chrome, Edge, and Adobe Reader

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/pdfStandards.ts` | Server-side PDFShift shared standards |
| `src/utils/pdf/jspdfStandards.ts` | Client-side jsPDF shared standards |
| `src/utils/pdfmake/engine/` | Client-side pdfmake unified engine |
| `src/utils/pdfExportBase.ts` | Legacy compatibility layer |

---

## Changelog

- **v1.0** (2026-02-10): Initial specification. Catalogued 25 PDF generators, established shared standards pipeline.
