
# Plan: Fix "Bucket Not Found" Error for Drawing Previews

## Problem Summary
Drawing files uploaded to the `handover-documents` bucket cannot be previewed because:
- The bucket is **private** (`public: false`)
- The upload code uses `getPublicUrl()` which generates URLs with `/object/public/` path
- Private buckets reject public URL patterns with "Bucket not found" error
- The `DrawingPreviewPane` component has signed URL logic, but it fails because the URL pattern doesn't match the expected format

## Solution
Fix the URL generation in upload functions to store the **authenticated URL pattern** instead of public URLs. The preview component already handles signed URL generation for private buckets.

---

## Implementation Steps

### Step 1: Fix `useProjectDrawings.ts` Upload Logic
**File**: `src/hooks/useProjectDrawings.ts`

Replace `getPublicUrl()` calls with a helper that constructs the correct authenticated URL pattern for the private `handover-documents` bucket:

**Changes (2 locations)**:
- Line ~221-225: `useAddDrawing` mutation
- Line ~310-314: `useUpdateDrawing` mutation

**Before**:
```typescript
const { data: urlData } = supabase.storage
  .from('handover-documents')
  .getPublicUrl(filePath);
fileUrl = urlData.publicUrl;
```

**After**:
```typescript
// For private buckets, store the authenticated URL pattern
// The preview component will generate signed URLs for access
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
fileUrl = `${supabaseUrl}/storage/v1/object/authenticated/handover-documents/${filePath}`;
```

### Step 2: Fix `LightingHandoverGenerator.tsx`
**File**: `src/components/lighting/handover/LightingHandoverGenerator.tsx`

Same fix - replace `getPublicUrl()` with authenticated URL construction.

### Step 3: Fix `LinkToHandoverDialog.tsx`
**File**: `src/components/tenant/LinkToHandoverDialog.tsx`

Same fix for consistency.

### Step 4: Update `DrawingPreviewPane.tsx` URL Extraction
**File**: `src/components/drawings/review/DrawingPreviewPane.tsx`

The existing `extractBucketFromUrl` function already handles both `/public/` and `/authenticated/` patterns (line 62), so no changes needed here. The signed URL logic will work correctly once the URLs are stored with the authenticated pattern.

### Step 5: Fix Existing Data (Optional Migration Query)
For drawings already stored with incorrect URLs, provide a SQL query to fix them:

```sql
UPDATE project_drawings 
SET file_url = REPLACE(file_url, '/object/public/handover-documents/', '/object/authenticated/handover-documents/')
WHERE file_url LIKE '%/object/public/handover-documents/%';
```

---

## Technical Details

### Why This Works
1. **Authenticated URL Pattern**: `/storage/v1/object/authenticated/bucket/path` is the correct pattern for private buckets
2. **DrawingPreviewPane Logic**: Already checks if bucket is in `PRIVATE_BUCKETS` list and generates signed URLs (lines 115-131)
3. **Signed URL Generation**: Uses `supabase.storage.from(bucket).createSignedUrl(path, 3600)` which works for authenticated users

### Files Modified
| File | Change |
|------|--------|
| `src/hooks/useProjectDrawings.ts` | Replace `getPublicUrl()` with authenticated URL construction (2 places) |
| `src/components/lighting/handover/LightingHandoverGenerator.tsx` | Replace `getPublicUrl()` with authenticated URL construction |
| `src/components/tenant/LinkToHandoverDialog.tsx` | Replace `getPublicUrl()` with authenticated URL construction |

### No Changes Needed
- `DrawingPreviewPane.tsx` - Already handles signed URL generation correctly
- `useDrawingFileUpload.ts` - Uses `project-drawings` bucket which IS public, so `getPublicUrl()` is correct there

---

## Rollback Plan
If issues occur, the URL pattern can be reverted by:
1. Changing back to `getPublicUrl()` calls
2. Making `handover-documents` bucket public (SQL: `UPDATE storage.buckets SET public = true WHERE id = 'handover-documents'`)

---

## Testing Checklist
After implementation:
1. Upload a new drawing file and verify preview works
2. Check existing drawings with files - preview should work after data migration
3. Verify download links function correctly
4. Test in contractor portal to ensure visibility is maintained

