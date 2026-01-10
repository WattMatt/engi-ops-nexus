# jsPDF to pdfmake Migration Checklist

Use this checklist when migrating PDF export functionality from jsPDF to pdfmake.

## Pre-Migration

- [ ] Identify all files using jsPDF imports
- [ ] Document current PDF output requirements
- [ ] Note any custom styling or layout requirements
- [ ] Identify chart/image capture requirements

## Core Migration Steps

### 1. Update Imports

```typescript
// Before
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { initializePDF, addSectionHeader } from '@/utils/pdfExportBase';

// After
import { 
  createDocument, 
  heading, 
  paragraph, 
  dataTable,
  sectionHeader 
} from '@/utils/pdfmake';
```

### 2. Replace Document Initialization

```typescript
// Before
const doc = initializePDF({ orientation: 'portrait' });
// or
const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

// After
const doc = createDocument({ orientation: 'portrait' });
```

### 3. Replace Content Creation

| jsPDF Method | pdfmake Replacement |
|--------------|---------------------|
| `doc.text('Title', x, y)` | `heading('Title')` or `paragraph('Title')` |
| `doc.setFontSize(n)` | Style applied automatically |
| `doc.setTextColor(r,g,b)` | Use `PDF_COLORS` or custom style |
| `doc.addPage()` | `pageBreak()` |
| `doc.line(x1,y1,x2,y2)` | `horizontalLine()` |

### 4. Replace Tables

```typescript
// Before (jspdf-autotable)
doc.autoTable({
  head: [['Name', 'Value']],
  body: data.map(d => [d.name, d.value]),
  startY: 60,
  ...getStandardTableStyles()
});

// After
doc.add(dataTable(
  [
    { key: 'name', header: 'Name', width: '*' },
    { key: 'value', header: 'Value', width: 100 }
  ],
  data
));
```

### 5. Replace Image Handling

```typescript
// Before
const canvas = await html2canvas(element);
doc.addImage(canvas, 'JPEG', x, y, width, height);

// After
import { captureElement, createImageContent } from '@/utils/pdfmake';

const imageData = await captureElement(element);
doc.add(createImageContent(imageData, { width: 400 }));
```

### 6. Replace Page Management

```typescript
// Before - Manual page breaks
if (currentY + requiredSpace > pageHeight - margin) {
  doc.addPage();
  currentY = topMargin;
}

// After - Automatic (pdfmake handles this)
// No manual page break logic needed!
// Content flows automatically
```

### 7. Replace Headers/Footers

```typescript
// Before
for (let i = 2; i <= doc.getNumberOfPages(); i++) {
  doc.setPage(i);
  addStandardHeader(doc, 'Title', 'Project');
  addStandardFooter(doc, i, totalPages);
}

// After
doc.withStandardHeader('Title', 'Project')
   .withStandardFooter();
```

### 8. Replace Save/Download

```typescript
// Before
doc.save('report.pdf');
// or
const blob = doc.output('blob');

// After
doc.download('report.pdf');
// or
const blob = await doc.getBlob();
```

## Post-Migration Verification

- [ ] Visual comparison with original PDF output
- [ ] Test all export buttons/features
- [ ] Verify page breaks occur at appropriate places
- [ ] Check table formatting and alignment
- [ ] Verify images/charts render correctly
- [ ] Test header/footer on all pages
- [ ] Verify file sizes are reasonable
- [ ] Performance test (should be similar or faster)

## Common Issues & Solutions

### Issue: Content overlapping
**Solution**: pdfmake handles layout automatically. Remove manual Y position calculations.

### Issue: Tables not matching original
**Solution**: Use explicit column widths. Check `dataTable` column definitions.

### Issue: Images missing
**Solution**: Ensure base64 encoding. Use `loadImageAsBase64()` for URLs.

### Issue: Fonts different
**Solution**: pdfmake uses Roboto by default. Custom fonts require additional setup.

### Issue: Page numbers incorrect
**Solution**: Use `.withStandardFooter()` which handles dynamic page counts.

## Files to Update

After migrating all PDF exports, these legacy files can be simplified or removed:

1. `src/utils/pdfExportBase.ts` - Keep new API, remove legacy jsPDF functions
2. `src/utils/pdfStyleManager.ts` - Simplify to pdfmake-only
3. `src/utils/pdfStandardsHelper.ts` - Simplify to pdfmake-only
4. `src/utils/pdfQualitySettings.ts` - Keep canvas capture, remove jsPDF functions

## Rollback Plan

If issues are found after migration:

1. All legacy functions are preserved with `@deprecated` warnings
2. Parallel exports can be created during transition
3. The `usePdfmake` flag pattern allows A/B testing

```typescript
// Example: Parallel implementation
const handleExport = usePdfmake ? handleExportPdfmake : handleExportJsPDF;
```
