

# Fix: PDF Preview Failing for Floor Plan Reports

## Problem Identified

The PDF preview is failing with a **400 error** because the `floor-plan-reports` storage bucket is **private**, but the `StandardReportPreview` component attempts to load PDFs using `getPublicUrl()`.

```
Error: ResponseException: Unexpected server response (400) while retrieving PDF
URL: https://...supabase.co/storage/v1/object/public/floor-plan-reports/...pdf
```

**Key Finding**: The bucket configuration shows `public: false`, which means public URLs will always fail.

## Solution

Update `StandardReportPreview` to handle both public and private buckets by using `createSignedUrl()` for authenticated access. This creates a temporary secure URL that works with private buckets.

---

## Technical Implementation

### File: `src/components/shared/StandardReportPreview.tsx`

Replace the `loadPdfUrl` function to use signed URLs:

**Current Code (lines 46-70):**
```tsx
const loadPdfUrl = async () => {
  setLoading(true);
  setNumPages(0);
  
  try {
    // Get public URL for the PDF
    const { data } = supabase.storage
      .from(storageBucket)
      .getPublicUrl(report.file_path);

    if (!data.publicUrl) {
      throw new Error("Failed to get PDF URL");
    }

    const cacheBustedUrl = `${data.publicUrl}?t=${Date.now()}`;
    setPdfUrl(cacheBustedUrl);
    setLoading(false);
  } catch (error) {
    console.error('Preview error:', error);
    toast.error('Failed to load PDF preview');
    setLoading(false);
  }
};
```

**New Code:**
```tsx
const loadPdfUrl = async () => {
  setLoading(true);
  setNumPages(0);
  
  try {
    // Create a signed URL that works for both public and private buckets
    // Expires in 1 hour (3600 seconds)
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .createSignedUrl(report.file_path, 3600);

    if (error) {
      console.error('[PDF PREVIEW] Signed URL error:', error);
      throw error;
    }

    if (!data?.signedUrl) {
      throw new Error("Failed to get PDF URL");
    }

    console.log('[PDF PREVIEW] Loading PDF with signed URL');
    setPdfUrl(data.signedUrl);
    setLoading(false);
  } catch (error) {
    console.error('Preview error:', error);
    toast.error('Failed to load PDF preview');
    setLoading(false);
  }
};
```

---

## Why This Works

| Approach | Public Bucket | Private Bucket |
|----------|---------------|----------------|
| `getPublicUrl()` | Works | Fails (400 error) |
| `createSignedUrl()` | Works | Works |
| `download()` + Blob | Works | Works |

Using `createSignedUrl()` is the cleanest solution because:
1. Works for **both** public and private buckets
2. Generates a temporary authenticated URL (1 hour expiry)
3. No need to download the entire file into memory first
4. Maintains the same user experience

---

## Alternative Approach (if signed URLs don't work)

If signed URLs have issues, we can fall back to downloading the blob and creating an object URL:

```tsx
const loadPdfUrl = async () => {
  setLoading(true);
  setNumPages(0);
  
  try {
    // Download the PDF as a blob
    const { data, error } = await supabase.storage
      .from(storageBucket)
      .download(report.file_path);

    if (error) throw error;
    if (!data) throw new Error("No data received");

    // Create a local object URL from the blob
    const objectUrl = URL.createObjectURL(data);
    setPdfUrl(objectUrl);
    setLoading(false);
  } catch (error) {
    console.error('Preview error:', error);
    toast.error('Failed to load PDF preview');
    setLoading(false);
  }
};

// Don't forget to revoke the object URL when dialog closes
useEffect(() => {
  return () => {
    if (pdfUrl && pdfUrl.startsWith('blob:')) {
      URL.revokeObjectURL(pdfUrl);
    }
  };
}, [pdfUrl]);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/components/shared/StandardReportPreview.tsx` | Replace `getPublicUrl()` with `createSignedUrl()` in `loadPdfUrl` function |

This single change will fix PDF preview for all report types that use private storage buckets, including floor plan reports.

