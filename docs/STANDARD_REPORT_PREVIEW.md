# Standard Report Preview Implementation

## Overview
All PDF report previews in the application use the standardized `StandardReportPreview` component located at `src/components/shared/StandardReportPreview.tsx`.

## Current Implementation Status

### ✅ Completed - All Current Report Types

1. **Tenant Tracker Reports** (`src/components/tenant/SavedReportsList.tsx`)
   - Storage bucket: `tenant-tracker-reports`
   - Multi-page preview with navigation ✓

2. **Generator Reports** (`src/components/tenant/GeneratorSavedReportsList.tsx`)
   - Storage bucket: `tenant-tracker-reports`
   - Multi-page preview with navigation ✓

3. **Floor Plan Reports** (`src/components/floor-plan/components/SavedReportsList.tsx`)
   - Storage bucket: `floor-plan-reports`
   - Multi-page preview with navigation ✓

4. **Cable Schedule Reports** (`src/components/cable-schedules/SavedReportsList.tsx`)
   - Storage bucket: `cable-schedule-reports`
   - Multi-page preview with navigation ✓

5. **Project-Wide Cable Schedule Reports** (`src/components/cable-schedules/ProjectSavedReportsList.tsx`)
   - Storage bucket: `cable-schedule-reports`
   - Multi-page preview with navigation ✓

## Mandatory Standard for All Future Reports

### When Creating New Report Previews

**DO NOT** create custom preview dialogs. **ALWAYS** use `StandardReportPreview`:

```tsx
import { StandardReportPreview } from "@/components/shared/StandardReportPreview";

// In your saved reports list component:
const [previewReport, setPreviewReport] = useState<any>(null);

// Preview button
<Button onClick={() => setPreviewReport(report)}>
  <Eye className="h-4 w-4" />
  Preview
</Button>

// Render the preview
{previewReport && (
  <StandardReportPreview
    report={previewReport}
    open={!!previewReport}
    onOpenChange={(open) => !open && setPreviewReport(null)}
    storageBucket="your-bucket-name"
  />
)}
```

### Features Included in StandardReportPreview

- ✅ Multi-page PDF rendering using react-pdf
- ✅ Page-by-page navigation (Previous/Next buttons)
- ✅ Page counter (Page X of Y)
- ✅ Download button in header
- ✅ Consistent loading states
- ✅ Professional layout and styling
- ✅ Automatic error handling
- ✅ Configurable storage bucket

### Storage Bucket Requirements

The storage bucket used must be **PUBLIC** for the preview to work. Private buckets will cause CORS/access errors.

To check/update bucket permissions:
1. Go to Lovable Cloud → Storage
2. Find your bucket
3. Ensure "Is Public" is set to YES

### Report Object Requirements

The `report` object passed to `StandardReportPreview` must have:
- `file_path`: string - Path to the PDF file in storage
- `report_name`: string - Display name for the report

## Benefits of Standardization

1. **Consistency** - All reports look and behave the same
2. **Maintainability** - Bug fixes apply to all reports automatically
3. **User Experience** - Users learn the interface once, use everywhere
4. **Development Speed** - No need to recreate preview logic
5. **Future-Proof** - New features (zoom, print, etc.) add globally

## Legacy Components (DO NOT USE)

❌ `src/components/tenant/ReportPreviewDialog.tsx` - Has special Live Preview tab for tenant reports, but saved PDF tab uses old iframe method
❌ `src/components/floor-plan/components/ReportPreviewDialog.tsx` - Old implementation (already migrated)
❌ Custom Dialog implementations with iframes

## Migration Checklist for Existing Previews

If you find an old preview implementation:

1. [ ] Import `StandardReportPreview` component
2. [ ] Remove old preview dialog imports
3. [ ] Add `previewReport` state: `useState<any>(null)`
4. [ ] Update preview button: `onClick={() => setPreviewReport(report)}`
5. [ ] Replace old dialog with `StandardReportPreview`
6. [ ] Set correct `storageBucket` prop
7. [ ] Ensure storage bucket is public
8. [ ] Test multi-page navigation
9. [ ] Test download functionality

## Testing Checklist

When implementing/verifying a report preview:

- [ ] Preview button opens the dialog
- [ ] PDF loads and displays correctly
- [ ] Page navigation works (if multi-page PDF)
- [ ] Page counter shows correct numbers
- [ ] Download button downloads the file
- [ ] Close button/overlay closes the dialog
- [ ] Loading state shows while PDF loads
- [ ] Error state shows if PDF fails to load
- [ ] Works on different screen sizes

## Future Enhancements (Planned)

Enhancements to `StandardReportPreview` will automatically benefit ALL reports:

- Zoom controls (zoom in/out/fit to width)
- Keyboard shortcuts (arrows for navigation, D for download, ESC to close)
- Print functionality
- Full-screen mode
- Text search within PDF
- Annotations/comments
- Share/email functionality

---

**Last Updated**: 2025-11-04
**Component Location**: `src/components/shared/StandardReportPreview.tsx`
**Documentation Maintained By**: Development Team
