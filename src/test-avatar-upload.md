# Avatar Upload Troubleshooting

## Current Configuration

### Storage Policies (Verified Working)
- ✅ SELECT: Avatar images are publicly accessible
- ✅ INSERT: Users can upload their own avatar (folder must match user ID)
- ✅ UPDATE: Users can update their own avatar  
- ✅ DELETE: Users can delete their own avatar

### Upload Flow
1. User selects image file
2. File validated (image type, max 5MB)
3. Old avatar deleted if exists
4. New file uploaded to `avatars/{userId}/{timestamp}.{ext}`
5. Public URL generated
6. Profile updated with new avatar_url
7. Success toast shown

## Common Issues & Solutions

### Issue 1: Upload fails silently
**Cause**: User folder path mismatch
**Fix**: Ensure file path is `${userId}/${fileName}` (already correct in code)

### Issue 2: "Failed to upload image" error
**Causes**:
- File too large (>5MB)
- Not an image file
- Storage bucket full
- Network error

**Debug steps**:
1. Check browser console for specific error
2. Verify file size < 5MB
3. Verify file type starts with "image/"
4. Check network tab for failed requests

### Issue 3: Avatar displays but doesn't update
**Cause**: Cache issue
**Fix**: Add cache busting query param or force refresh

### Issue 4: Upload succeeds but profile not updated
**Cause**: RLS policy on profiles table blocking update
**Fix**: Check profiles table UPDATE policy allows user to update their own record

## Testing Checklist
- [ ] Navigate to Settings > Profile
- [ ] Click "Upload Photo" button
- [ ] Select valid image (< 5MB)
- [ ] Verify upload progress shown
- [ ] Verify success toast appears
- [ ] Verify avatar displays immediately
- [ ] Refresh page and verify avatar persists
