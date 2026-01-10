# PDFMake Utilities - Migration Guide

This module provides a complete, declarative PDF generation system using **pdfmake** as a replacement for jsPDF.

## Quick Start

```typescript
import { 
  createDocument, 
  heading, 
  paragraph, 
  dataTable, 
  fetchCompanyDetails, 
  generateCoverPageContent 
} from '@/utils/pdfmake';

// Create a simple document
const doc = createDocument()
  .add(heading('My Report'))
  .add(paragraph('This is the content of my report.'))
  .withStandardFooter();

doc.download('my-report.pdf');
```

## Architecture Overview

```
src/utils/pdfmake/
├── index.ts              # Main exports (public API)
├── config.ts             # pdfmake initialization & page settings
├── styles.ts             # Colors, fonts, quality presets
├── helpers.ts            # Content primitives (heading, paragraph, table, etc.)
├── documentBuilder.ts    # Fluent API for building documents
├── coverPage.ts          # Cover page generation
├── costReportBuilder.ts  # Cost report specific builders
├── validation.ts         # Document validation utilities
├── testing.ts            # Testing & benchmarking utilities
├── imageUtils.ts         # Image processing & optimization
├── chartUtils.ts         # Chart capture utilities
├── hrExports.ts          # HR document exports (payslips, attendance, etc.)
├── adminExports.ts       # Admin document exports (invoices, audits, etc.)
└── README.md             # This file
```

## Core Concepts

### 1. Document Builder Pattern

The `PDFDocumentBuilder` provides a fluent API for building documents:

```typescript
import { createDocument, heading, paragraph, dataTable } from '@/utils/pdfmake';

const doc = createDocument({ orientation: 'portrait' })
  .add(heading('Section 1'))
  .add(paragraph('Introduction text...'))
  .add(dataTable(
    [
      { key: 'name', header: 'Name', width: '*' },
      { key: 'value', header: 'Value', width: 100 }
    ],
    [{ name: 'Item 1', value: 100 }]
  ))
  .withStandardHeader('My Report', 'Project Name')
  .withStandardFooter();

// Output options
doc.download('report.pdf');        // Download file
doc.open();                        // Open in new tab
const blob = await doc.getBlob();  // Get Blob for upload
```

### 2. Content Primitives

All content is built using composable primitives:

```typescript
import { 
  heading,           // H1, H2, H3 headings
  paragraph,         // Body text
  keyValue,          // Key: Value pairs
  sectionHeader,     // Section titles with underline
  dataTable,         // Data tables with columns
  infoTable,         // Key-value info tables
  twoColumns,        // Two-column layout
  stack,             // Vertical stack of content
  spacer,            // Vertical spacing
  horizontalLine,    // Horizontal rule
  pageBreak,         // Force page break
  image,             // Image content
} from '@/utils/pdfmake';
```

### 3. Styling System

Consistent colors and typography:

```typescript
import { PDF_COLORS, FONT_SIZES, QUALITY_PRESETS } from '@/utils/pdfmake';

// Available colors
PDF_COLORS.primary    // '#334155' - Slate-700
PDF_COLORS.secondary  // '#475569' - Slate-600
PDF_COLORS.text       // '#1e293b' - Dark text
PDF_COLORS.textLight  // '#64748b' - Light text
PDF_COLORS.success    // '#22c55e' - Green
PDF_COLORS.danger     // '#ef4444' - Red
PDF_COLORS.warning    // '#f59e0b' - Amber

// Font sizes
FONT_SIZES.h1    // 24
FONT_SIZES.h2    // 18
FONT_SIZES.h3    // 14
FONT_SIZES.body  // 11
FONT_SIZES.small // 9

// Quality presets for image compression
QUALITY_PRESETS.draft     // Fast, smaller files
QUALITY_PRESETS.standard  // Balanced (default)
QUALITY_PRESETS.high      // Best quality, larger files
```

## Common Use Cases

### Cover Page with Company Details

```typescript
import { 
  createDocument, 
  fetchCompanyDetails, 
  generateCoverPageContent 
} from '@/utils/pdfmake';

const companyDetails = await fetchCompanyDetails();
const coverContent = await generateCoverPageContent(
  {
    title: 'Monthly Report',
    projectName: 'Project Alpha',
    documentNumber: 'RPT-001',
    preparedBy: 'John Doe'
  },
  companyDetails
);

const doc = createDocument()
  .add(coverContent)
  .add(pageBreak())
  .add(heading('Executive Summary'))
  // ... rest of content
  .withStandardFooter();
```

### Tables with Data

```typescript
import { createDocument, dataTable, infoTable } from '@/utils/pdfmake';

// Data table with columns
const columns = [
  { key: 'item', header: 'Item', width: '*' },
  { key: 'qty', header: 'Quantity', width: 60, align: 'right' },
  { key: 'price', header: 'Price', width: 80, align: 'right', format: 'currency' }
];

const data = [
  { item: 'Widget A', qty: 10, price: 99.99 },
  { item: 'Widget B', qty: 5, price: 149.99 }
];

doc.add(dataTable(columns, data));

// Info table for key-value pairs
doc.add(infoTable([
  { label: 'Project', value: 'Alpha Project' },
  { label: 'Client', value: 'Acme Corp' },
  { label: 'Date', value: '2024-01-15' }
]));
```

### Including Charts

```typescript
import { 
  createDocument, 
  captureChart, 
  buildSingleChartContent,
  waitForCharts 
} from '@/utils/pdfmake';

// Wait for charts to render
await waitForCharts();

// Capture a chart by ID
const chartData = await captureChart('my-chart-id', {
  title: 'Sales Overview',
  description: 'Monthly sales data'
});

if (chartData) {
  doc.add(buildSingleChartContent(chartData));
}

// Or capture multiple charts
const charts = await captureCharts([
  { id: 'chart-1', title: 'Revenue' },
  { id: 'chart-2', title: 'Expenses' }
]);

doc.add(buildChartGridContent(charts, { columns: 2 }));
```

### HR Documents

```typescript
import { 
  generatePayslipPDF,
  createEmployeeReportPDF,
  createAttendanceReportPDF,
  createLeaveReportPDF
} from '@/utils/pdfmake';

// Generate payslip
const payslipBlob = await generatePayslipPDF({
  employee: { name: 'John Doe', id: 'EMP001', ... },
  period: { month: 'January', year: 2024 },
  earnings: [...],
  deductions: [...],
  netPay: 5000
});

// Create employee report
const employeeDoc = await createEmployeeReportPDF({
  employees: [...],
  department: 'Engineering',
  generatedDate: new Date()
});
```

### Admin Documents

```typescript
import { 
  createProjectSummaryPDF,
  createAuditLogPDF,
  createInvoicePDF
} from '@/utils/pdfmake';

// Project summary
const projectDoc = await createProjectSummaryPDF({
  project: { name: 'Alpha', ... },
  phases: [...],
  budget: { ... }
});

// Invoice
const invoiceDoc = await createInvoicePDF({
  invoiceNumber: 'INV-001',
  client: { ... },
  lineItems: [...],
  totals: { ... }
});
```

## Validation & Testing

### Document Validation

```typescript
import { validateDocument, getDocumentSummary } from '@/utils/pdfmake';

const docDef = doc.getDefinition();

// Validate before generating
const validation = validateDocument(docDef);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

// Get document summary
const summary = getDocumentSummary(docDef);
console.log(`Pages: ~${summary.estimatedPages}, Elements: ${summary.stats.totalElements}`);
```

### Testing & Benchmarking

```typescript
import { 
  testPDFGeneration, 
  benchmarkPDFGeneration,
  createTestDocument 
} from '@/utils/pdfmake';

// Test PDF generation
const testResult = await testPDFGeneration(docDef);
if (testResult.success) {
  console.log(`Generated in ${testResult.generationTime}ms, size: ${testResult.fileSize} bytes`);
}

// Benchmark with multiple iterations
const benchmark = await benchmarkPDFGeneration(docDef, 10);
console.log(`Average: ${benchmark.averageTime}ms, Range: ${benchmark.minTime}-${benchmark.maxTime}ms`);

// Create test document for development
const testDoc = createTestDocument('full');
testDoc.download('test-document.pdf');
```

## Migration from jsPDF

### Before (jsPDF)

```typescript
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const doc = new jsPDF();
doc.setFontSize(24);
doc.text('My Report', 20, 30);
doc.setFontSize(11);
doc.text('Introduction text...', 20, 50);
doc.autoTable({
  head: [['Name', 'Value']],
  body: [['Item 1', '100']],
  startY: 60
});
doc.save('report.pdf');
```

### After (pdfmake)

```typescript
import { createDocument, heading, paragraph, dataTable } from '@/utils/pdfmake';

createDocument()
  .add(heading('My Report'))
  .add(paragraph('Introduction text...'))
  .add(dataTable(
    [{ key: 'name', header: 'Name' }, { key: 'value', header: 'Value' }],
    [{ name: 'Item 1', value: 100 }]
  ))
  .download('report.pdf');
```

### Key Differences

| jsPDF | pdfmake |
|-------|---------|
| Imperative (set position, draw) | Declarative (describe content) |
| Manual page breaks | Automatic page flow |
| Manual text wrapping | Automatic text wrapping |
| Coordinates-based | Content-based layout |
| `doc.save()` | `doc.download()` |
| `doc.addPage()` | `pageBreak()` content |

## Deprecated Functions

The following legacy utilities are deprecated and will be removed in a future version:

| Deprecated | Replacement |
|------------|-------------|
| `initializePDF()` | `createDocument()` |
| `addSectionHeader()` | `sectionHeader()` |
| `addBodyText()` | `paragraph()` |
| `addKeyValue()` | `keyValue()` |
| `checkPageBreak()` | Automatic in pdfmake |
| `wrapText()` | Automatic in pdfmake |
| `getStandardTableStyles()` | `getStandardTableLayout()` |
| `addStandardHeader()` | `.withStandardHeader()` |
| `addStandardFooter()` | `.withStandardFooter()` |

## Best Practices

1. **Use the fluent API**: Chain methods for readable code
2. **Reuse content builders**: Create functions that return `Content` arrays
3. **Validate before generating**: Use `validateDocument()` in development
4. **Handle async operations**: Cover pages and charts require `await`
5. **Use quality presets**: Match quality to use case (draft for previews, high for final)
6. **Test with benchmarks**: Use `benchmarkPDFGeneration()` for performance-critical documents

## Troubleshooting

### "Cannot read property 'vfs' of undefined"
Ensure pdfmake fonts are properly initialized. The `config.ts` file handles this automatically.

### Images not appearing
- Ensure images are base64 encoded
- Use `loadImageAsBase64()` for external URLs
- Check CORS settings for cross-origin images

### Table layout issues
- Use explicit widths for predictable layouts
- Use `'*'` for flexible columns
- Ensure data matches column keys

### Performance issues
- Use `QUALITY_PRESETS.draft` for previews
- Compress images before embedding
- Limit chart captures to visible elements
