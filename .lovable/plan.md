
# Fix PDF Pipeline: Unified Cover Page and Working Headers/Footers

## Problems Found

1. **Headers/footers appear on cover page (page 1)**: The JavaScript `<script>` approach in PDFShift header/footer HTML does NOT work -- PDFShift does not execute JS in header/footer source fragments
2. **Cover pages are totally inconsistent**: 5 different cover page designs across 7 edge functions, 2 functions have no cover page at all
3. **No test/preview mechanism**: Can only verify by generating and emailing, making iteration slow and wasteful

## Solution

### Phase 1: Create a Shared Cover Page HTML Generator

Add a `generateStandardCoverPage()` function to `supabase/functions/_shared/pdfStandards.ts` that produces a single, consistent, branded cover page HTML block used by ALL edge functions.

The cover page will include:
- Company logo (centered, from company_settings)
- Decorative divider line
- Report title (e.g. "TENANT TRACKER REPORT")
- Report subtitle (e.g. "Tenant Schedule and Progress Analysis")
- Project name (prominent, branded color)
- Project number
- PREPARED FOR section (contact details)
- PREPARED BY section (company details)
- Date and revision at bottom
- Gradient accent bar (left side)
- `page-break-after: always` to force the next content onto page 2

### Phase 2: Fix Cover Page Header/Footer Exclusion

Since PDFShift does NOT execute JavaScript in header/footer HTML, we need a different approach:

**Option: Use CSS `@page :first` in the main document body to add extra top/bottom padding on page 1 that "pushes" the header/footer content off the visible cover, combined with PDFShift's `header.start_at` parameter.**

Actually, the correct PDFShift approach is simpler -- PDFShift supports a `start_at` property in header and footer objects that tells it which page number to start displaying them:

```
header: {
  source: headerHtml,
  spacing: '5mm',
  start_at: 2   // Skip page 1
}
footer: {
  source: footerHtml,
  spacing: '5mm',
  start_at: 2   // Skip page 1
}
```

If `start_at` is not supported, we fall back to using CSS `visibility: hidden` with a class-based approach in the header/footer source (no JS needed):

```html
<style>
  .hdr { display: flex; /* ... */ }
</style>
<div class="hdr">...</div>
```

And in the main document, override cover page margins to 0 with `@page :first { margin-top: 0; margin-bottom: 0; }`.

### Phase 3: Refactor All 7 Edge Functions

Each function will be updated to:
1. Import `generateStandardCoverPage` from `_shared/pdfStandards.ts`
2. Remove its bespoke cover page HTML
3. Call the shared function with report-specific data (title, subtitle, contact, etc.)
4. Use shared cover page CSS (also from `_shared/pdfStandards.ts`)

### Phase 4: Add a Test/Preview Endpoint

Create a lightweight mechanism to test PDFs without emailing:
- Use the existing `generate-pdf-pdfshift` generic function as a test harness
- Or add a `?preview=true` query parameter to each function that returns the raw HTML (not PDF) so you can open it in a browser and visually verify before converting

## Technical Details

### Shared Cover Page Function Signature

```typescript
// In supabase/functions/_shared/pdfStandards.ts

interface CoverPageOptions {
  reportTitle: string;       // e.g. "TENANT TRACKER REPORT"
  reportSubtitle?: string;   // e.g. "Tenant Schedule & Progress Analysis"
  projectName: string;
  projectNumber?: string;
  revision?: string;
  reportDate?: string;
  companyLogoUrl?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  contactName?: string;
  contactOrganization?: string;
  contactPhone?: string;
  contactEmail?: string;
}

function generateStandardCoverPage(options: CoverPageOptions): string;
function getStandardCoverPageCSS(): string;
```

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/_shared/pdfStandards.ts` | Add `generateStandardCoverPage()`, `getStandardCoverPageCSS()`, fix header/footer `start_at` |
| `supabase/functions/generate-tenant-tracker-pdf/index.ts` | Replace custom cover page with shared function |
| `supabase/functions/generate-generator-report-pdf/index.ts` | Replace custom cover page with shared function |
| `supabase/functions/generate-cable-schedule-pdf/index.ts` | Replace custom cover page with shared function |
| `supabase/functions/generate-floor-plan-pdf/index.ts` | Replace custom cover page with shared function |
| `supabase/functions/generate-bulk-services-pdf/index.ts` | Replace custom cover page with shared function |
| `supabase/functions/generate-electrical-budget-pdf/index.ts` | Add cover page (currently has none) |
| `supabase/functions/generate-verification-certificate-pdf/index.ts` | Add cover page (currently has none) |

### Testing Approach

After deployment, we will:
1. Call each edge function directly via curl with test data
2. The response includes base64 PDF -- decode and verify visually before sending any emails
3. Only send test emails once all 7 are confirmed working

### Sequence

1. Update `_shared/pdfStandards.ts` with all shared functions
2. Update all 7 edge functions
3. Deploy all 7 + shared
4. Test each one via direct curl call (no email)
5. Review the base64 PDFs for correct cover page, headers on page 2+, no headers on page 1
6. Only then send test emails
