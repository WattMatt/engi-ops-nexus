# PDF Document Design Standards

> **Master Reference for All Reports and Exports**  
> Version 1.0 | Last Updated: 2026-01-09

This document defines the mandatory design standards for all PDF exports within the application. All new and existing PDF generation code MUST adhere to these guidelines.

---

## 1. Logo Sizing and Placement

### Requirements
- **Master Size**: Maximum 45mm width × 18mm height (maintain aspect ratio)
- **Clear Space**: Minimum 5mm padding around logo
- **Alignment**: Left-aligned to page margin on headers; centered on cover pages
- **Resolution**: Minimum 300 DPI for print quality

### Implementation
```typescript
// Logo sizing calculation
const logoMaxWidth = 45; // mm
const logoMaxHeight = 18; // mm
const aspectRatio = originalWidth / originalHeight;
const logoWidth = Math.min(logoMaxWidth, logoMaxHeight * aspectRatio);
const logoHeight = logoWidth / aspectRatio;
```

---

## 2. Cropped Cards and Figures Prevention

### Requirements
- **Safe Zone**: 5mm minimum from any page edge
- **Column Breaks**: Cards must not split across columns
- **Page Breaks**: Check available space before rendering cards

### Implementation
```typescript
// Before rendering any card/figure
const requiredSpace = cardHeight + marginBottom;
if (currentY + requiredSpace > pageHeight - bottomMargin) {
  doc.addPage();
  currentY = topMargin;
}
```

### Card Specifications
- **Border Radius**: 2mm
- **Shadow**: 0.5mm offset, 10% opacity
- **Internal Padding**: 4mm minimum

---

## 3. Image Scaling and Resolution

### Requirements
- **Minimum Resolution**: 150 DPI for screen, 300 DPI for print
- **Scaling Rule**: Proportional scaling only (maintain aspect ratio)
- **Focal Points**: Center-crop for thumbnails; fit-within for full images

### Quality Settings
```typescript
const QUALITY_SETTINGS = {
  draft: { scale: 1.5, compression: 0.7 },
  standard: { scale: 2, compression: 0.85 },
  high: { scale: 3, compression: 0.95 }
};
```

---

## 4. Typography Standards

### Type Scale
| Element | Size (pt) | Weight | Line Height |
|---------|-----------|--------|-------------|
| Title | 28 | Bold | 1.2 |
| H1 | 18 | Bold | 1.3 |
| H2 | 14 | Bold | 1.4 |
| H3 | 12 | Bold | 1.4 |
| Body | 10 | Normal | 1.5 |
| Caption | 8 | Normal | 1.4 |
| Small | 7 | Normal | 1.3 |

### Font Families
- **Headings**: Helvetica Bold
- **Body**: Helvetica Regular
- **Code/Data**: Courier

### Implementation
```typescript
const PDF_TYPOGRAPHY = {
  fonts: {
    heading: 'helvetica',
    body: 'helvetica',
    mono: 'courier'
  },
  sizes: {
    title: 28,
    h1: 18,
    h2: 14,
    h3: 12,
    body: 10,
    caption: 8,
    small: 7
  },
  lineHeight: 1.5
};
```

---

## 5. Text Spacing

### Paragraph Spacing
- **Line Height**: 1.5× font size
- **Paragraph Gap**: 1× font size after paragraphs
- **Section Gap**: 2× font size between sections

### Orphan/Widow Prevention
- Minimum 2 lines at page bottom before break
- Minimum 2 lines at page top after break
- Headings require minimum 3 lines of content below before page break

### Implementation
```typescript
// Check for orphaned headings
const minContentAfterHeading = headingSize * 3;
if (currentY + headingHeight + minContentAfterHeading > pageHeight - bottomMargin) {
  doc.addPage();
  currentY = topMargin;
}
```

---

## 6. Margins and Grid System

### Page Margins
| Edge | Size (mm) |
|------|-----------|
| Top | 25 |
| Bottom | 22 |
| Left | 18 |
| Right | 18 |

### Content Area
- **A4 Portrait**: 174mm × 250mm usable
- **A4 Landscape**: 259mm × 167mm usable

### Grid
- **Columns**: 12-column grid for complex layouts
- **Gutter**: 5mm between columns
- **Safe Zone**: Additional 3mm from edges for critical content

---

## 7. Charts and Tables

### Chart Requirements
- **Minimum Height**: 60mm
- **Maximum Height**: 120mm (or 50% of usable page height)
- **Aspect Ratio**: Maintain original; prefer 16:9 or 4:3
- **Labels**: Minimum 8pt font size
- **Legends**: Position below or right; never overlap data

### Table Requirements
- **Header**: Bold, contrasting background
- **Row Height**: Minimum 6mm
- **Column Width**: Auto-calculate based on content
- **Alternating Rows**: 5% tint for readability
- **Borders**: 0.1mm lines, subtle color

### Table Column Proportions
```typescript
// Percentage-based widths for consistency
const tableColumns = {
  label: 0.25,    // 25%
  value: 0.20,    // 20%
  status: 0.15,   // 15%
  description: 0.40 // 40%
};
```

---

## 8. Page Breaks and Flow

### Rules
1. **Never break**:
   - Headings from their first paragraph
   - Table headers from first row
   - Image from its caption
   - Card content mid-element

2. **Preferred breaks**:
   - Between major sections
   - After complete tables
   - Before new projects/items

3. **Smart break detection**:
```typescript
function checkPageBreak(doc, currentY, requiredSpace, margins) {
  const pageHeight = doc.internal.pageSize.height;
  if (currentY + requiredSpace > pageHeight - margins.bottom) {
    doc.addPage();
    return margins.top;
  }
  return currentY;
}
```

---

## 9. UI Element Alignment

### Card Padding
- **Outer**: 3mm
- **Inner**: 4mm
- **Between Cards**: 5mm

### Icon Sizes
- **Inline Icons**: Match text height
- **Status Icons**: 4mm × 4mm
- **Feature Icons**: 8mm × 8mm

### List Alignment
- **Bullet Indent**: 5mm
- **Nested Indent**: Additional 5mm per level
- **Hanging Indent**: Align text after bullet

---

## 10. Brand Colors and Contrast

### Primary Palette
| Name | RGB | Use |
|------|-----|-----|
| Primary | (79, 70, 229) | Headers, accents |
| Secondary | (100, 116, 139) | Subtext, borders |
| Success | (34, 197, 94) | Positive status |
| Warning | (234, 179, 8) | Caution items |
| Danger | (239, 68, 68) | Critical/negative |
| Neutral | (148, 163, 184) | Backgrounds, dividers |

### Contrast Requirements
- **Body Text**: Minimum 4.5:1 ratio on background
- **Headings**: Minimum 3:1 ratio
- **Interactive Elements**: Minimum 3:1 ratio

### Background Usage
- **Cards**: White or 2% tint
- **Alternating Rows**: 5% neutral tint
- **Headers**: Primary at 10-15% tint

---

## 11. Headers, Footers, and Pagination

### Header (all pages except cover)
- **Height**: 18mm
- **Logo**: Left-aligned, within size limits
- **Document Title**: Right-aligned, 10pt
- **Separator Line**: 0.5pt, 50% opacity

### Footer (all pages)
- **Height**: 15mm
- **Page Numbers**: Centered, "Page X of Y" format
- **Confidentiality Notice**: Left-aligned, 7pt italic
- **Date**: Right-aligned, 7pt

### Implementation
```typescript
function addPageFooter(doc, pageNum, totalPages, margins) {
  const y = doc.internal.pageSize.height - margins.bottom + 5;
  
  // Confidentiality notice
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.text('CONFIDENTIAL', margins.left, y);
  
  // Page number
  doc.setFont('helvetica', 'normal');
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, y, { align: 'center' });
  
  // Date
  doc.text(new Date().toLocaleDateString(), pageWidth - margins.right, y, { align: 'right' });
}
```

---

## 12. Preflight and Export QA Checklist

### Before Export
- [ ] All fonts embedded (Helvetica, Courier)
- [ ] Images at correct resolution
- [ ] Colors in RGB mode
- [ ] No content outside safe zone
- [ ] All links validated

### After Export
- [ ] Open and verify all pages
- [ ] Check logo quality on cover and headers
- [ ] Verify no text cutoff
- [ ] Confirm page numbers sequential
- [ ] Test print at 100% scale
- [ ] Verify file size reasonable

### Accessibility
- [ ] Document has title metadata
- [ ] Reading order is logical
- [ ] Alt text for images (where applicable)
- [ ] Sufficient color contrast

---

## Usage in Code

Import the style manager and constants:

```typescript
import { PDFStyleManager } from '@/utils/pdfStyleManager';
import { 
  PDF_TYPOGRAPHY, 
  PDF_COLORS, 
  PDF_LAYOUT 
} from '@/utils/[report]PdfStyles';
```

Reference this document when:
1. Creating new PDF export functionality
2. Updating existing exports
3. Reviewing PDF output quality
4. Debugging layout issues

---

## Related Files

- `src/utils/pdfStyleManager.ts` - Central style management
- `src/utils/pdfExportBase.ts` - Base export utilities
- `src/utils/pdfQualitySettings.ts` - Quality presets
- `src/utils/pdfCoverPage.ts` - Standardized cover page
- `src/utils/PDF_EXPORT_STANDARDS.md` - Export implementation guide

---

*This document should be updated when design standards change. All PDF exports must be tested against these standards before release.*
