# Word Template Cover Page Setup Guide

## Current Status
✅ Word template support is fully implemented
✅ Placeholder system ready
✅ Edge function for conversion configured
⚠️ **Action Required**: Re-upload your Word template to enable placeholders

## Why Re-upload?
Previously uploaded templates may be missing the `file_name` field required for automatic Word document detection. Re-uploading will fix this.

## Steps to Fix

### 1. Navigate to Settings
Go to **Settings → Cover Page Templates**

### 2. Upload Your Word Template
- Click "Upload" under "Cover Page Template"
- Select your `.docx` file with placeholders
- Click "Upload" button

### 3. Verify Word Template Placeholders
Your Word document should include these placeholders:
```
{{project_name}}     - Auto-fills with project name
{{report_title}}     - Auto-fills with report type (e.g., "Cost Report")
{{report_date}}      - Auto-fills with current date
{{company_name}}     - Auto-fills with your company name
{{contact_name}}     - Auto-fills with contact person
{{contact_phone}}    - Auto-fills with contact phone
{{revision}}         - Auto-fills with report revision
{{subtitle}}         - Auto-fills with report subtitle
```

### 4. Test the Cover Page
1. Go to any Cost Report
2. Click "Export PDF"
3. Check console logs (F12 → Console) for:
   ```
   🎨 Loading cover template: ...
   📄 File detection: { fileName: '...', isWordDoc: true }
   ✏️ Detected Word template, filling placeholders...
   📝 Placeholder data: { project_name: '...', ... }
   ✅ Word template converted to PDF: ...
   🎉 Word template converted and loaded successfully
   ```

## Troubleshooting

### ❌ Template Not Detected as Word
**Console shows**: `isWordDoc: false`
**Fix**: Re-upload the template to ensure `file_name` field is set

### ❌ Placeholders Not Filled
**Console shows**: Error in edge function
**Fix**: Check that:
1. Template is `.docx` (not `.doc`)
2. Placeholders use exact syntax: `{{placeholder_name}}`
3. Edge function `convert-word-to-pdf` is deployed

### ❌ Conversion Fails
**Console shows**: "Failed to fetch converted PDF"
**Fix**: 
1. Check edge function logs
2. Verify template is valid Word document
3. Ensure CloudConvert API is configured

## Console Logging
The system now provides detailed logs during cover page generation:
- 🎨 Template loading
- 📍 URL generation
- 📄 File type detection
- ✏️ Word template processing
- 📝 Placeholder data
- ✅ Conversion success
- 🎉 Final result

Check browser console (F12) during PDF export to see the full flow.

## Next Steps
After re-uploading your Word template:
1. Export a Cost Report to test
2. Check console logs for success messages
3. Verify placeholders are filled correctly in PDF
4. Template will auto-apply to all future PDF exports!

---

**Need Help?** 
Check console logs for detailed error messages. All issues will be logged with emojis for easy identification.
